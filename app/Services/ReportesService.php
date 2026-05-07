<?php

namespace App\Services;

class ReportesService
{
    public function consultar(array $filtros): array
    {
        return [
            'meta' => [
                'mensaje' => 'Consulta de reportes en construcción.',
                'filtros' => $filtros,
            ],
            'series' => [],
            'resumen' => [],
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
}
