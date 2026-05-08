<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Carbon;

class ReportesService
{
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

    public function consultar(array $filtros): array
    {
        $metric = $filtros['metric'] ?? 'ph';
        $granularity = $filtros['granularity'] ?? 'day';

        if ($metric !== 'ph') {
            return [
                'meta' => [
                    'mensaje' => 'Métrica no soportada aún',
                    'filtros' => $filtros,
                ],
                'series' => [],
                'rows' => [],
            ];
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
                ],
                'series' => [],
                'rows' => [],
            ];
        }

        $query = DB::table('registros')
            ->selectRaw("{$labelExpr} as label, COUNT(*) as count, AVG(ph) as avg_ph, MIN(ph) as min_ph, MAX(ph) as max_ph")
            ->whereNotNull('ph');

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

        return [
            'meta' => [
                'mensaje' => 'Consulta de reportes ejecutada',
                'filtros' => $filtros,
                'granularity' => $granularity,
                'dataType' => 'aggregated', // Indicador explícito para detección robusta de tipo en frontend
            ],
            'series' => $series,
            'rows' => $rows,
        ];
    }

    public function exportar(array $filtros): array
    {
        return [
            'mensaje' => 'Exportación de reportes en construcción.',
            'estado' => 'accepted',
            'filtros' => $filtros,
        ];
    }

    public function generarResumenIa(array $filtros): array
    {
        return [
            'mensaje' => 'Resumen con IA en construcción.',
            'filtros' => $filtros,
            'resumen' => '',
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
}
