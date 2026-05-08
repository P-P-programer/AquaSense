<?php

namespace Tests\Feature;

use Tests\TestCase;

class ReportesControllerTest extends TestCase
{
    public function test_query_returns_reportes_payload()
    {
        $response = $this->withoutMiddleware()->postJson('/api/reportes/query', [
            'metric' => 'ph',
            'granularity' => 'week',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'meta' => ['mensaje', 'filtros'],
            'series',
            'rows',
        ]);
    }

    public function test_export_returns_accepted_payload()
    {
        $response = $this->withoutMiddleware()->postJson('/api/reportes/export', [
            'metric' => 'ph',
            'format' => 'xlsx',
        ]);

        $response->assertAccepted();
        $response->assertJsonStructure([
            'mensaje',
            'estado',
            'filtros',
        ]);
    }

    public function test_ia_summary_returns_placeholder_payload()
    {
        $response = $this->withoutMiddleware()->postJson('/api/reportes/ia/resumen', [
            'metric' => 'ph',
            'granularity' => 'week',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'mensaje',
            'filtros',
            'resumen',
        ]);
    }
}
