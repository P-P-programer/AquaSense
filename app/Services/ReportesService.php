<?php

namespace App\Services;

use App\Models\ReportActivity;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpWord\PhpWord;

class ReportesService
{
    private const EXPORT_DIRECTORY = 'reportes';

    private const IA_SYSTEM_PROMPT = <<<PROMPT
Eres un asistente de analítica para AquaSense.

Tu trabajo es generar un resumen breve, claro y profesional sobre el estado de la operación a partir de métricas agregadas ya calculadas por el sistema.

Reglas:
- Responde siempre en español.
- No menciones temperatura ni turbidez como métricas visuales; si aparecen en datos históricos, trátalos solo como contexto técnico.
- Prioriza pH, dispositivos activos, alertas activas, variaciones por periodo y picos detectados.
- Si el usuario pide un periodo, respeta estrictamente ese filtro.
- Si faltan datos, indícalo sin inventar valores.
- Devuelve un resumen corto con observaciones, tendencias y una lista breve de hallazgos accionables.
- No expongas datos sensibles ni detalles internos del sistema.

Formato sugerido:
1. Resumen general.
2. Tendencia por periodo.
3. Picos o anomalías.
4. Recomendación breve.
PROMPT;

    public function __construct(
        private readonly PeakDetectionService $peakDetectionService,
        private readonly GeminiReportSummaryService $geminiReportSummaryService,
    ) {
    }

    public function consultar(array $filtros, ?User $user = null): array
    {
        $user ??= auth()->user();
        $metric = $filtros['metric'] ?? 'ph';
        $granularity = $filtros['granularity'] ?? 'day';
        $allowedDeviceIds = $this->allowedDeviceIds($user);

        if ($metric !== 'ph') {
            return [
                'meta' => [
                    'mensaje' => 'Métrica no soportada aún',
                    'filtros' => $filtros,
                    'trend' => 'flat',
                    'anomaly_count' => 0,
                ],
                'series' => [],
                'rows' => [],
            ];
        }

        if (is_array($allowedDeviceIds) && empty($allowedDeviceIds)) {
            return $this->buildEmptyReportResponse(
                $filtros,
                $granularity,
                'No tienes dispositivos asignados. Contacta al administrador para habilitar reportes y gráficas.',
                true,
            );
        }

        $driver = DB::connection()->getDriverName();

        // Build DB-specific label and group expressions
        if ($driver === 'sqlite') {
            switch ($granularity) {
                case 'week':
                    $labelExpr = "strftime('%Y-%W', captured_at)";
                    $groupExpr = "strftime('%Y-%W', captured_at)";
                    break;
                case 'month':
                    $labelExpr = "strftime('%Y-%m', captured_at)";
                    $groupExpr = "strftime('%Y-%m', captured_at)";
                    break;
                case 'year':
                    $labelExpr = "strftime('%Y', captured_at)";
                    $groupExpr = "strftime('%Y', captured_at)";
                    break;
                case 'day':
                default:
                    $labelExpr = "strftime('%Y-%m-%d', captured_at)";
                    $groupExpr = "date(captured_at)";
                    break;
            }
        } else {
            switch ($granularity) {
                case 'week':
                    $labelExpr = "DATE_FORMAT(captured_at, '%x-W%v')"; // ISO week-year
                    $groupExpr = "YEAR(captured_at), WEEK(captured_at, 1)";
                    break;
                case 'month':
                    $labelExpr = "DATE_FORMAT(captured_at, '%Y-%m')";
                    $groupExpr = "YEAR(captured_at), MONTH(captured_at)";
                    break;
                case 'year':
                    $labelExpr = "YEAR(captured_at)";
                    $groupExpr = "YEAR(captured_at)";
                    break;
                case 'day':
                default:
                    $labelExpr = "DATE_FORMAT(captured_at, '%Y-%m-%d')";
                    $groupExpr = "DATE(captured_at)";
                    break;
            }
        }

        // If the registros table doesn't exist (e.g. in-memory test DB), return empty result
        if (!Schema::hasTable('registros')) {
            return [
                'meta' => [
                    'mensaje' => 'Consulta de reportes ejecutada (sin datos: tabla registros ausente)',
                    'filtros' => $filtros,
                    'granularity' => $granularity,
                    'trend' => 'flat',
                    'anomaly_count' => 0,
                ],
                'series' => [],
                'rows' => [],
            ];
        }

        if (is_array($allowedDeviceIds) && ! empty($filtros['device_id'])) {
            $requestedDeviceId = (int) $filtros['device_id'];

            if (! in_array($requestedDeviceId, $allowedDeviceIds, true)) {
                return $this->buildEmptyReportResponse(
                    $filtros,
                    $granularity,
                    'El dispositivo seleccionado no pertenece a tu cuenta. Contacta al administrador si necesitas acceso a otros equipos.',
                    true,
                );
            }
        }

        $query = DB::table('registros')
            ->selectRaw("{$labelExpr} as label, COUNT(*) as count, AVG(ph) as avg_ph, MIN(ph) as min_ph, MAX(ph) as max_ph")
            ->whereNotNull('ph');

        if (is_array($allowedDeviceIds)) {
            $query->whereIn('device_id', $allowedDeviceIds);
        }

        if (!empty($filtros['start']) && !empty($filtros['end'])) {
            $start = Carbon::parse($filtros['start'])->startOfDay()->toDateTimeString();
            $end = Carbon::parse($filtros['end'])->endOfDay()->toDateTimeString();
            $query->whereBetween('captured_at', [$start, $end]);
        } elseif (!empty($filtros['start'])) {
            $start = Carbon::parse($filtros['start'])->startOfDay()->toDateTimeString();
            $query->where('captured_at', '>=', $start);
        } elseif (!empty($filtros['end'])) {
            $end = Carbon::parse($filtros['end'])->endOfDay()->toDateTimeString();
            $query->where('captured_at', '<=', $end);
        }

        if (!empty($filtros['device_id'])) {
            $query->where('device_id', $filtros['device_id']);
        }

        if (!empty($filtros['city_id'])) {
            $query->where('city_id', $filtros['city_id']);
        }

        // Group by the same expression used for label to satisfy ONLY_FULL_GROUP_BY
        $query->groupBy(DB::raw($labelExpr))->orderBy('label');

        $results = $query->get();

        if ($results->isEmpty()) {
            return $this->buildEmptyReportResponse(
                $filtros,
                $granularity,
                is_array($allowedDeviceIds)
                    ? 'No hay registros para tus dispositivos asignados con esos filtros.'
                    : 'No hay datos disponibles para los filtros seleccionados.',
                is_array($allowedDeviceIds),
            );
        }

        $series = [];
        $rows = [];

        foreach ($results as $r) {
            $label = $r->label;
            $avg = $r->avg_ph !== null ? round((float) $r->avg_ph, 2) : null;
            $min = $r->min_ph !== null ? round((float) $r->min_ph, 2) : null;
            $max = $r->max_ph !== null ? round((float) $r->max_ph, 2) : null;
            $count = (int) $r->count;

            $series[] = ['label' => $label, 'value' => $avg];
            $rows[] = ['label' => $label, 'avg' => $avg, 'min' => $min, 'max' => $max, 'count' => $count];
        }

        $analysis = $this->peakDetectionService->enrichRows($rows, [
            'window' => $filtros['anomaly_window'] ?? 5,
            'zscore_threshold' => $filtros['anomaly_zscore_threshold'] ?? 2.5,
            'min_samples' => $filtros['anomaly_min_samples'] ?? 5,
            'absolute_spike_threshold' => $filtros['anomaly_absolute_threshold'] ?? 0.5,
        ]);

        $rows = $analysis['rows'];
        $summary = $analysis['summary'];

        return [
            'meta' => [
                'mensaje' => 'Consulta de reportes ejecutada',
                'filtros' => $filtros,
                'granularity' => $granularity,
                'dataType' => 'aggregated', // Indicador explícito para detección robusta de tipo en frontend
                'trend' => $summary['trend'] ?? 'flat',
                'anomaly_count' => $summary['anomaly_count'] ?? 0,
                'anomaly_window' => $summary['window'] ?? 5,
                'anomaly_zscore_threshold' => $summary['zscore_threshold'] ?? 2.5,
                'anomaly_min_samples' => $summary['min_samples'] ?? 5,
                'restricted' => is_array($allowedDeviceIds),
            ],
            'series' => $series,
            'rows' => $rows,
        ];
    }

    public function exportar(array $filtros, ?User $user = null): array
    {
        $user ??= auth()->user();
        $format = $filtros['format'] ?? 'xlsx';
        $reportData = $this->consultar($filtros, $user);
        $rows = $reportData['rows'] ?? [];

        if (empty($rows)) {
            return [
                'mensaje' => $reportData['meta']['mensaje'] ?? 'No hay datos disponibles para exportar.',
                'estado' => 'empty',
                'formato' => $format,
                'filtros' => $filtros,
                'activity_id' => null,
                'filename' => null,
                'rows_count' => 0,
            ];
        }

        if ($format === 'docx') {
            $fileName = $this->buildExportFileName($filtros, 'docx');
            $relativePath = self::EXPORT_DIRECTORY.'/'.$fileName;
            $absolutePath = Storage::disk('public')->path($relativePath);
            $iaSummary = $this->generarResumenIaTexto($filtros, $reportData);

            $this->writeWordExport($absolutePath, $filtros, $reportData, $rows, $iaSummary);
            $activity = $this->recordReportActivity(
                user: $user,
                actionType: 'export',
                format: 'docx',
                filtros: $filtros,
                rowsCount: count($rows),
                fileName: $fileName,
                relativePath: $relativePath,
                downloadUrl: null, // No incluir URL pública
            );

            return [
                'mensaje' => 'Exportación Word generada correctamente.',
                'estado' => 'completed',
                'formato' => 'docx',
                'filtros' => $filtros,
                'activity_id' => $activity->id,
                'filename' => $fileName,
                'rows_count' => count($rows),
            ];
        }

        $fileName = $this->buildExportFileName($filtros, 'xlsx');
        $relativePath = self::EXPORT_DIRECTORY.'/'.$fileName;
        $absolutePath = Storage::disk('public')->path($relativePath);

        $this->writeSpreadsheetExport($absolutePath, $filtros, $reportData, $rows);
        $activity = $this->recordReportActivity(
            user: $user,
            actionType: 'export',
            format: 'xlsx',
            filtros: $filtros,
            rowsCount: count($rows),
            fileName: $fileName,
            relativePath: $relativePath,
            downloadUrl: null, // No incluir URL pública
        );

        return [
            'mensaje' => 'Exportación Excel generada correctamente.',
            'estado' => 'completed',
            'formato' => 'xlsx',
            'filtros' => $filtros,
            'activity_id' => $activity->id,
            'filename' => $fileName,
            'rows_count' => count($rows),
        ];
    }

    public function generarResumenIa(array $filtros, ?User $user = null): array
    {
        $user ??= auth()->user();
        $reportData = $this->consultar($filtros, $user);
        $summary = $this->generarResumenIaTexto($filtros, $reportData);

        $this->recordReportActivity(
            user: $user,
            actionType: 'ia_summary',
            format: null,
            filtros: $filtros,
            rowsCount: null,
            fileName: null,
            relativePath: null,
            downloadUrl: null,
            summaryText: $summary,
        );

        return [
            'mensaje' => $summary,
            'filtros' => $filtros,
            'resumen' => $summary,
        ];
    }

    public function construirMensajesIaResumen(array $filtros): array
    {
        return [
            [
                'role' => 'system',
                'content' => self::IA_SYSTEM_PROMPT,
            ],
            [
                'role' => 'user',
                'content' => $this->construirMensajeUsuario($filtros),
            ],
        ];
    }

    private function construirMensajeUsuario(array $filtros): string
    {
        $partes = [
            'Genera un resumen de los reportes usando estos filtros:',
            json_encode($filtros, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'Incluye tendencias, picos y una recomendación breve para operación.',
        ];

        return implode("\n", $partes);
    }

    private function generarResumenIaTexto(array $filtros, array $reportData): string
    {
        $rows = array_values(array_slice($reportData['rows'] ?? [], 0, 12));
        $meta = $reportData['meta'] ?? [];

        $userPromptPayload = [
            'filtros' => $filtros,
            'meta' => [
                'mensaje' => $meta['mensaje'] ?? null,
                'granularity' => $meta['granularity'] ?? null,
                'trend' => $meta['trend'] ?? null,
                'anomaly_count' => $meta['anomaly_count'] ?? null,
                'anomaly_window' => $meta['anomaly_window'] ?? null,
                'anomaly_zscore_threshold' => $meta['anomaly_zscore_threshold'] ?? null,
                'anomaly_min_samples' => $meta['anomaly_min_samples'] ?? null,
            ],
            'rows_top' => $rows,
        ];

        $userPrompt = implode("\n", [
            'Genera un resumen ejecutivo con recomendaciones accionables usando este contexto JSON.',
            json_encode($userPromptPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'Sé breve (máximo 180 palabras), claro y enfocado en operación.',
        ]);

        try {
            return $this->geminiReportSummaryService->generateSummary(self::IA_SYSTEM_PROMPT, $userPrompt);
        } catch (\Throwable $e) {
            Log::warning('No se pudo generar resumen IA con Gemini; usando fallback.', [
                'error' => $e->getMessage(),
            ]);

            return $this->fallbackResumen($reportData);
        }
    }

    private function fallbackResumen(array $reportData): string
    {
        $meta = $reportData['meta'] ?? [];
        $rows = $reportData['rows'] ?? [];
        $trend = (string) ($meta['trend'] ?? 'flat');
        $anomalyCount = (int) ($meta['anomaly_count'] ?? 0);
        $granularity = (string) ($meta['granularity'] ?? 'week');

        if (empty($rows)) {
            return (string) ($meta['mensaje'] ?? 'No hay datos suficientes para generar un resumen IA en este momento.');
        }

        $avgValues = array_values(array_filter(array_map(static fn (array $row) => $row['avg'] ?? null, $rows), static fn ($value) => is_numeric($value)));
        $globalAvg = !empty($avgValues) ? round(array_sum($avgValues) / count($avgValues), 2) : null;
        $trendLabel = match ($trend) {
            'up' => 'al alza',
            'down' => 'a la baja',
            default => 'estable',
        };

        return implode(' ', [
            "Resumen automático ({$granularity}):",
            $globalAvg !== null ? "El pH promedio observado es {$globalAvg}." : 'No hay promedio concluyente.',
            "La tendencia general es {$trendLabel}.",
            "Se detectaron {$anomalyCount} picos/anomalías.",
            'Recomendación: revisar periodos con anomalías y validar umbrales de operación para prevenir desviaciones repetidas.',
        ]);
    }

    private function allowedDeviceIds(?User $user): ?array
    {
        if (! $user || $user->isAdmin()) {
            return null;
        }

        return $user->devices()->pluck('id')->all();
    }

    private function buildEmptyReportResponse(array $filtros, string $granularity, string $message, bool $restricted): array
    {
        return [
            'meta' => [
                'mensaje' => $message,
                'filtros' => $filtros,
                'granularity' => $granularity,
                'dataType' => 'aggregated',
                'trend' => 'flat',
                'anomaly_count' => 0,
                'anomaly_window' => 5,
                'anomaly_zscore_threshold' => 2.5,
                'anomaly_min_samples' => 5,
                'restricted' => $restricted,
            ],
            'series' => [],
            'rows' => [],
        ];
    }

    private function buildExportFileName(array $filtros, string $extension): string
    {
        $metric = Str::slug((string) ($filtros['metric'] ?? 'ph'));
        $granularity = Str::slug((string) ($filtros['granularity'] ?? 'week'));
        $timestamp = now()->format('Ymd_His');

        return "reporte_{$metric}_{$granularity}_{$timestamp}.{$extension}";
    }

    private function writeSpreadsheetExport(string $absolutePath, array $filtros, array $reportData, array $rows): void
    {
        Storage::disk('public')->makeDirectory(self::EXPORT_DIRECTORY);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Reporte');

        $sheet->setCellValue('A1', 'Reporte de AquaSense');
        $sheet->setCellValue('A2', 'Filtros aplicados');
        $sheet->setCellValue('A3', json_encode($filtros, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $sheet->setCellValue('A5', 'Período');
        $sheet->setCellValue('B5', 'Promedio');
        $sheet->setCellValue('C5', 'Mínimo');
        $sheet->setCellValue('D5', 'Máximo');
        $sheet->setCellValue('E5', 'Muestras');

        $rowIndex = 6;
        foreach ($rows as $row) {
            $sheet->setCellValue("A{$rowIndex}", $row['label'] ?? '—');
            $sheet->setCellValue("B{$rowIndex}", $row['avg'] ?? null);
            $sheet->setCellValue("C{$rowIndex}", $row['min'] ?? null);
            $sheet->setCellValue("D{$rowIndex}", $row['max'] ?? null);
            $sheet->setCellValue("E{$rowIndex}", $row['count'] ?? 0);
            $rowIndex++;
        }

        $sheet->setCellValue('G1', 'Resumen');
        $sheet->setCellValue('G2', $reportData['meta']['mensaje'] ?? 'Consulta de reportes ejecutada');
        $sheet->setCellValue('G3', 'Resultados');
        $sheet->setCellValue('H3', count($rows));

        foreach (range('A', 'H') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($absolutePath);
    }

    private function writeWordExport(string $absolutePath, array $filtros, array $reportData, array $rows, string $iaSummary): void
    {
        Storage::disk('public')->makeDirectory(self::EXPORT_DIRECTORY);

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $section->addTitle('Reporte de AquaSense', 1);
        $section->addText('Filtros aplicados:');
        $section->addText(json_encode($filtros, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $section->addTextBreak(1);
        $section->addText($reportData['meta']['mensaje'] ?? 'Consulta de reportes ejecutada');
        $section->addTextBreak(1);
        $section->addText('Resumen IA:');
        $section->addText($iaSummary);

        $phpWord->addTableStyle('ReporteTable', [
            'borderSize' => 6,
            'borderColor' => '999999',
            'cellMargin' => 80,
        ]);
        $table = $section->addTable('ReporteTable');

        $table->addRow();
        $table->addCell(2500)->addText('Período');
        $table->addCell(1200)->addText('Promedio');
        $table->addCell(1200)->addText('Mínimo');
        $table->addCell(1200)->addText('Máximo');
        $table->addCell(1200)->addText('Muestras');

        foreach ($rows as $row) {
            $table->addRow();
            $table->addCell(2500)->addText((string) ($row['label'] ?? '—'));
            $table->addCell(1200)->addText((string) ($row['avg'] ?? '—'));
            $table->addCell(1200)->addText((string) ($row['min'] ?? '—'));
            $table->addCell(1200)->addText((string) ($row['max'] ?? '—'));
            $table->addCell(1200)->addText((string) ($row['count'] ?? 0));
        }

        $section->addTextBreak(1);
        $section->addText('Total de filas: '.count($rows));

        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($absolutePath);
    }

    private function recordReportActivity(
        ?User $user,
        string $actionType,
        ?string $format,
        array $filtros,
        ?int $rowsCount,
        ?string $fileName,
        ?string $relativePath,
        ?string $downloadUrl,
        ?string $summaryText = null,
    ): ?ReportActivity {
        if (! $user) {
            return null;
        }

        return ReportActivity::create([
            'user_id' => $user->id,
            'action_type' => $actionType,
            'format' => $format,
            'metric' => (string) ($filtros['metric'] ?? 'ph'),
            'granularity' => $filtros['granularity'] ?? null,
            'filters' => $filtros,
            'rows_count' => $rowsCount,
            'file_name' => $fileName,
            'file_path' => $relativePath,
            'download_url' => $downloadUrl,
            'summary_text' => $summaryText,
            'status' => 'completed',
        ]);
    }
}
