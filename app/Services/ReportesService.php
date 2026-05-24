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

Tu trabajo es generar un informe analítico detallado, claro y profesional sobre el estado de la operación a partir de métricas agregadas ya calculadas por el sistema y de las imágenes adjuntas.

Reglas:
- Responde siempre en español.
- No menciones temperatura ni turbidez como métricas visuales; si aparecen en datos históricos, trátalos solo como contexto técnico.
- Prioriza pH, dispositivos activos, alertas activas, variaciones por periodo y picos detectados.
- Si el usuario pide un periodo, respeta estrictamente ese filtro.
- Si faltan datos, indícalo sin inventar valores.
- Usa únicamente la información del contexto estructurado, los indicadores calculados y las imágenes adjuntas.
- Explica qué cambió frente al periodo previo y, si aplica, frente al inicio del rango.
- Si hay focos por ciudad o dispositivo, señálalos como posibles zonas con más picos.
- Describe las imágenes adjuntas como soporte visual de la tendencia, no como fuente aislada.
- Devuelve un informe con observaciones, tendencias, hallazgos accionables y una recomendación operativa.
- No expongas datos sensibles ni detalles internos del sistema.

Formato sugerido:
1. Resumen ejecutivo.
2. Comparación temporal del periodo.
3. Picos, anomalías y posibles focos.
4. Lectura visual de las imágenes.
5. Recomendación operativa.
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

    public function exportar(array $filtros, ?User $user = null, array $uploadedCharts = []): array
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
            $iaSummary = $this->generarResumenIaTexto($filtros, $reportData, $user, $uploadedCharts);

            $this->writeWordExport($absolutePath, $filtros, $reportData, $rows, $iaSummary, $uploadedCharts);
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
        $summary = $this->generarResumenIaTexto($filtros, $reportData, $user);

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
            'Genera un resumen analítico de los reportes usando estos filtros:',
            json_encode($filtros, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'Incluye comparación temporal, picos, posibles focos por lugar y una recomendación para operación.',
        ];

        return implode("\n", $partes);
    }

    private function generarResumenIaTexto(array $filtros, array $reportData, ?User $user = null, array $imageFiles = []): string
    {
        $context = $this->buildAiSummaryContext($filtros, $reportData, $user, $imageFiles);
        $contextJson = json_encode($context, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $userPrompt = implode("\n", [
            'Genera un informe operativo detallado con base en este contexto estructurado en JSON.',
            'El informe debe usar cifras concretas, explicar la tendencia temporal, comparar el último periodo contra el anterior y señalar posibles focos por ciudad o dispositivo.',
            'Si hay imágenes adjuntas, descríbelas como soporte visual de la tendencia y de los picos detectados.',
            'Devuelve el resultado en formato de secciones con títulos claros y viñetas cuando ayuden a la lectura.',
            $contextJson,
            'Cierra con una recomendación accionable corta y directa.',
        ]);

        try {
            $imagePaths = $this->normalizeImageFiles($imageFiles);

            return $this->geminiReportSummaryService->generateSummary(self::IA_SYSTEM_PROMPT, $userPrompt, $imagePaths);
        } catch (\Throwable $e) {
            Log::warning('No se pudo generar resumen IA con Gemini; usando fallback.', [
                'error' => $e->getMessage(),
            ]);

            return $this->fallbackResumen($reportData, $context);
        }
    }

    private function fallbackResumen(array $reportData, array $context = []): string
    {
        $meta = $reportData['meta'] ?? [];
        $rows = $reportData['rows'] ?? [];
        $trend = (string) data_get($context, 'period_summary.trend', $meta['trend'] ?? 'flat');
        $anomalyCount = (int) data_get($context, 'peaks_summary.anomaly_count', $meta['anomaly_count'] ?? 0);
        $granularity = (string) ($meta['granularity'] ?? data_get($context, 'granularity', 'week'));

        if (empty($rows)) {
            return (string) ($meta['mensaje'] ?? 'No hay datos suficientes para generar un resumen IA en este momento.');
        }

        $period = data_get($context, 'period_summary', []);
        $locations = data_get($context, 'location_insights', []);
        $topCities = array_slice((array) data_get($locations, 'cities', []), 0, 3);
        $topDevices = array_slice((array) data_get($locations, 'devices', []), 0, 3);

        $parts = [
            "Resumen automático ({$granularity}):",
            data_get($period, 'last_avg') !== null
                ? 'El último periodo registrado quedó en '.data_get($period, 'last_avg').'.'
                : 'No hay promedio concluyente para el último periodo.',
            data_get($period, 'delta') !== null
                ? 'La variación frente al periodo previo fue '.data_get($period, 'delta').(data_get($period, 'delta') >= 0 ? ' al alza.' : ' a la baja.')
                : 'No fue posible calcular comparación temporal.',
            "La tendencia general es ".match ($trend) {
                'up' => 'al alza',
                'down' => 'a la baja',
                default => 'estable',
            }.'.',
            "Se detectaron {$anomalyCount} picos/anomalías.",
        ];

        if (! empty($topCities)) {
            $parts[] = 'Posibles focos por ciudad: '.implode(', ', array_map(static fn (array $item) => ($item['city_name'] ?? 'Ciudad')." ({$item['peak_count']} picos)", $topCities)).'.';
        }

        if (! empty($topDevices)) {
            $parts[] = 'Posibles focos por dispositivo: '.implode(', ', array_map(static fn (array $item) => ($item['device_name'] ?? 'Dispositivo')." ({$item['peak_count']} picos)", $topDevices)).'.';
        }

        $parts[] = 'Recomendación: revisar los focos con mayor conteo de picos, validar el ajuste de umbrales y priorizar los periodos donde la gráfica mostró mayor inestabilidad.';

        return implode(' ', $parts);
    }

    private function buildAiSummaryContext(array $filtros, array $reportData, ?User $user = null, array $imageFiles = []): array
    {
        $rows = array_values($reportData['rows'] ?? []);
        $meta = $reportData['meta'] ?? [];
        $thresholds = $this->resolveThresholdContext($user);
        $comparison = $this->buildPeriodComparison($rows);
        $locationInsights = $this->buildLocationInsights($filtros, $user, $thresholds);
        $peakRows = array_values(array_filter($rows, static fn (array $row): bool => (bool) ($row['is_anomaly'] ?? false)));

        return [
            'filtros' => $filtros,
            'granularity' => $meta['granularity'] ?? ($filtros['granularity'] ?? 'week'),
            'thresholds' => $thresholds,
            'period_summary' => $comparison,
            'peaks_summary' => [
                'anomaly_count' => (int) ($meta['anomaly_count'] ?? count($peakRows)),
                'window' => $meta['anomaly_window'] ?? 5,
                'zscore_threshold' => $meta['anomaly_zscore_threshold'] ?? 2.5,
                'min_samples' => $meta['anomaly_min_samples'] ?? 5,
                'top_anomalies' => array_slice($peakRows, 0, 6),
            ],
            'location_insights' => $locationInsights,
            'sample_rows' => array_slice($rows, 0, 12),
            'report_message' => $meta['mensaje'] ?? null,
            'images' => [
                'count' => count($imageFiles),
                'provided' => ! empty($imageFiles),
            ],
        ];
    }

    private function buildPeriodComparison(array $rows): array
    {
        $numericRows = array_values(array_filter($rows, static fn (array $row): bool => isset($row['avg']) && is_numeric($row['avg'])));

        if (empty($numericRows)) {
            return [
                'rows_count' => count($rows),
                'first_period' => null,
                'last_period' => null,
                'first_avg' => null,
                'last_avg' => null,
                'previous_avg' => null,
                'delta' => null,
                'delta_pct' => null,
                'trend' => 'flat',
                'min_avg_period' => null,
                'max_avg_period' => null,
                'moving_avg' => null,
            ];
        }

        $firstRow = $numericRows[0];
        $lastRow = $numericRows[count($numericRows) - 1];
        $previousRow = count($numericRows) > 1 ? $numericRows[count($numericRows) - 2] : null;
        $values = array_map(static fn (array $row): float => (float) $row['avg'], $numericRows);
        $minRow = $numericRows[array_keys($values, min($values))[0]] ?? $firstRow;
        $maxRow = $numericRows[array_keys($values, max($values))[0]] ?? $lastRow;
        $firstAvg = (float) $firstRow['avg'];
        $lastAvg = (float) $lastRow['avg'];
        $delta = round($lastAvg - $firstAvg, 2);
        $deltaPct = abs($firstAvg) > 0 ? round(($delta / abs($firstAvg)) * 100, 2) : null;
        $movingAvg = round(array_sum($values) / count($values), 2);

        $trend = 'flat';
        if ($delta > 0.03) {
            $trend = 'up';
        } elseif ($delta < -0.03) {
            $trend = 'down';
        }

        return [
            'rows_count' => count($numericRows),
            'first_period' => $firstRow['label'] ?? null,
            'last_period' => $lastRow['label'] ?? null,
            'first_avg' => round($firstAvg, 2),
            'last_avg' => round($lastAvg, 2),
            'previous_period' => $previousRow['label'] ?? null,
            'previous_avg' => $previousRow['avg'] !== null ? round((float) $previousRow['avg'], 2) : null,
            'delta' => $delta,
            'delta_pct' => $deltaPct,
            'trend' => $trend,
            'min_avg_period' => [
                'label' => $minRow['label'] ?? null,
                'avg' => round((float) $minRow['avg'], 2),
            ],
            'max_avg_period' => [
                'label' => $maxRow['label'] ?? null,
                'avg' => round((float) $maxRow['avg'], 2),
            ],
            'moving_avg' => $movingAvg,
        ];
    }

    private function buildLocationInsights(array $filtros, ?User $user, array $thresholds): array
    {
        $baseQuery = $this->buildBaseRegistroQuery($filtros, $user);
        $peakCaseSql = 'SUM(CASE WHEN registros.ph < COALESCE(devices.ph_safe_min, ?) OR registros.ph > COALESCE(devices.ph_safe_max, ?) THEN 1 ELSE 0 END) as peak_count';

        $cityRows = (clone $baseQuery)
            ->selectRaw("cities.id as city_id, COALESCE(cities.name, 'Sin ciudad') as city_name, COALESCE(cities.department, '') as city_department, COUNT(*) as samples, ROUND(AVG(registros.ph), 2) as avg_ph, ROUND(MIN(registros.ph), 2) as min_ph, ROUND(MAX(registros.ph), 2) as max_ph, {$peakCaseSql}", [$thresholds['safe_min'], $thresholds['safe_max']])
            ->groupBy('cities.id', 'cities.name', 'cities.department')
            ->orderByDesc('peak_count')
            ->orderByDesc('samples')
            ->limit(5)
            ->get()
            ->map(static function ($row): array {
                $samples = (int) ($row->samples ?? 0);
                $peakCount = (int) ($row->peak_count ?? 0);

                return [
                    'city_id' => $row->city_id,
                    'city_name' => $row->city_name,
                    'city_department' => $row->city_department,
                    'samples' => $samples,
                    'avg_ph' => $row->avg_ph !== null ? (float) $row->avg_ph : null,
                    'min_ph' => $row->min_ph !== null ? (float) $row->min_ph : null,
                    'max_ph' => $row->max_ph !== null ? (float) $row->max_ph : null,
                    'peak_count' => $peakCount,
                    'peak_ratio' => $samples > 0 ? round($peakCount / $samples, 4) : null,
                ];
            })
            ->all();

        $deviceRows = (clone $baseQuery)
            ->selectRaw("devices.id as device_id, COALESCE(devices.name, 'Sin dispositivo') as device_name, COALESCE(devices.identifier, '') as device_identifier, cities.name as city_name, cities.department as city_department, COUNT(*) as samples, ROUND(AVG(registros.ph), 2) as avg_ph, ROUND(MIN(registros.ph), 2) as min_ph, ROUND(MAX(registros.ph), 2) as max_ph, {$peakCaseSql}", [$thresholds['safe_min'], $thresholds['safe_max']])
            ->groupBy('devices.id', 'devices.name', 'devices.identifier', 'cities.name', 'cities.department')
            ->orderByDesc('peak_count')
            ->orderByDesc('samples')
            ->limit(5)
            ->get()
            ->map(static function ($row): array {
                $samples = (int) ($row->samples ?? 0);
                $peakCount = (int) ($row->peak_count ?? 0);

                return [
                    'device_id' => $row->device_id,
                    'device_name' => $row->device_name,
                    'device_identifier' => $row->device_identifier,
                    'city_name' => $row->city_name,
                    'city_department' => $row->city_department,
                    'samples' => $samples,
                    'avg_ph' => $row->avg_ph !== null ? (float) $row->avg_ph : null,
                    'min_ph' => $row->min_ph !== null ? (float) $row->min_ph : null,
                    'max_ph' => $row->max_ph !== null ? (float) $row->max_ph : null,
                    'peak_count' => $peakCount,
                    'peak_ratio' => $samples > 0 ? round($peakCount / $samples, 4) : null,
                ];
            })
            ->all();

        return [
            'cities' => $cityRows,
            'devices' => $deviceRows,
            'thresholds' => $thresholds,
        ];
    }

    private function buildBaseRegistroQuery(array $filtros, ?User $user)
    {
        $allowedDeviceIds = $this->allowedDeviceIds($user);

        $query = DB::table('registros')
            ->leftJoin('devices', 'registros.device_id', '=', 'devices.id')
            ->leftJoin('cities', 'registros.city_id', '=', 'cities.id')
            ->whereNotNull('registros.ph');

        if (is_array($allowedDeviceIds)) {
            $query->whereIn('registros.device_id', $allowedDeviceIds);
        }

        if (! empty($filtros['start']) && ! empty($filtros['end'])) {
            $start = Carbon::parse($filtros['start'])->startOfDay()->toDateTimeString();
            $end = Carbon::parse($filtros['end'])->endOfDay()->toDateTimeString();
            $query->whereBetween('registros.captured_at', [$start, $end]);
        } elseif (! empty($filtros['start'])) {
            $start = Carbon::parse($filtros['start'])->startOfDay()->toDateTimeString();
            $query->where('registros.captured_at', '>=', $start);
        } elseif (! empty($filtros['end'])) {
            $end = Carbon::parse($filtros['end'])->endOfDay()->toDateTimeString();
            $query->where('registros.captured_at', '<=', $end);
        }

        if (! empty($filtros['device_id'])) {
            $query->where('registros.device_id', (int) $filtros['device_id']);
        }

        if (! empty($filtros['city_id'])) {
            $query->where('registros.city_id', (int) $filtros['city_id']);
        }

        return $query;
    }

    private function resolveThresholdContext(?User $user): array
    {
        $defaults = [
            'safe_min' => (float) config('alerts.ph.safe_min', 6.5),
            'safe_max' => (float) config('alerts.ph.safe_max', 8.0),
            'critical_min' => (float) config('alerts.ph.critical_min', 6.0),
            'critical_max' => (float) config('alerts.ph.critical_max', 8.5),
        ];

        if (! $user) {
            return $defaults + ['source' => 'global'];
        }

        $resolved = [
            'safe_min' => $user->ph_safe_min !== null ? (float) $user->ph_safe_min : $defaults['safe_min'],
            'safe_max' => $user->ph_safe_max !== null ? (float) $user->ph_safe_max : $defaults['safe_max'],
            'critical_min' => $user->ph_critical_min !== null ? (float) $user->ph_critical_min : $defaults['critical_min'],
            'critical_max' => $user->ph_critical_max !== null ? (float) $user->ph_critical_max : $defaults['critical_max'],
            'source' => $user->isAdmin() ? 'global' : 'user',
        ];

        return $resolved;
    }

    private function normalizeImageFiles(array $imageFiles): array
    {
        $paths = [];

        foreach ($imageFiles as $img) {
            if ($img instanceof \Illuminate\Http\UploadedFile) {
                $path = $img->getRealPath();
                if ($path && file_exists($path)) {
                    $paths[] = $path;
                }

                continue;
            }

            if (is_string($img) && file_exists($img)) {
                $paths[] = $img;
            }
        }

        return $paths;
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

    private function writeWordExport(string $absolutePath, array $filtros, array $reportData, array $rows, string $iaSummary, array $imageFiles = []): void
    {
        Storage::disk('public')->makeDirectory(self::EXPORT_DIRECTORY);

        $phpWord = new PhpWord();
        $section = $phpWord->addSection();

        $avgValues = array_values(array_filter(array_map(static fn (array $row) => $row['avg'] ?? null, $rows), static fn ($value) => is_numeric($value)));
        $minValues = array_values(array_filter(array_map(static fn (array $row) => $row['min'] ?? null, $rows), static fn ($value) => is_numeric($value)));
        $maxValues = array_values(array_filter(array_map(static fn (array $row) => $row['max'] ?? null, $rows), static fn ($value) => is_numeric($value)));
        $globalAvg = !empty($avgValues) ? round(array_sum($avgValues) / count($avgValues), 2) : null;
        $globalMin = !empty($minValues) ? round(min($minValues), 2) : null;
        $globalMax = !empty($maxValues) ? round(max($maxValues), 2) : null;
        $trend = (string) ($reportData['meta']['trend'] ?? 'flat');
        $anomalyCount = (int) ($reportData['meta']['anomaly_count'] ?? 0);

        $section->addTitle('Reporte de AquaSense', 1);
        $section->addText('Filtros aplicados:');
        $section->addText(json_encode($filtros, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        $section->addTextBreak(1);
        $section->addText($reportData['meta']['mensaje'] ?? 'Consulta de reportes ejecutada');
        $section->addTextBreak(1);
        $section->addText('Resumen técnico de la consulta:');
        $section->addText('Promedio global: '.($globalAvg !== null ? (string) $globalAvg : 'N/D'));
        $section->addText('Mínimo global: '.($globalMin !== null ? (string) $globalMin : 'N/D'));
        $section->addText('Máximo global: '.($globalMax !== null ? (string) $globalMax : 'N/D'));
        $section->addText('Tendencia: '.match ($trend) {
            'up' => 'al alza',
            'down' => 'a la baja',
            default => 'estable',
        });
        $section->addText('Anomalías detectadas: '.$anomalyCount);
        $section->addTextBreak(1);
        $section->addText('Resumen IA:');
        $section->addText($iaSummary);

        // Insert any provided chart images
        if (! empty($imageFiles)) {
            foreach ($imageFiles as $img) {
                try {
                    $path = null;
                    if ($img instanceof \Illuminate\Http\UploadedFile) {
                        $path = $img->getRealPath();
                    } elseif (is_string($img) && file_exists($img)) {
                        $path = $img;
                    }

                    if ($path && file_exists($path)) {
                        // Add a page break before images for clarity
                        $section->addPageBreak();
                        $section->addImage($path, ['width' => 600]);
                    }
                } catch (\Throwable $e) {
                    Log::warning('No se pudo insertar una imagen en el export Word: '.$e->getMessage());
                    continue;
                }
            }
            $section->addTextBreak(1);
        }

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
