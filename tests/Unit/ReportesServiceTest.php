<?php

namespace Tests\Unit;

use App\Services\ReportesService;
use Tests\TestCase;

class ReportesServiceTest extends TestCase
{
    public function test_construir_mensajes_ia_resumen_incluye_contexto_y_prompt_privado()
    {
        $service = new ReportesService();
        $mensajes = $service->construirMensajesIaResumen([
            'metric' => 'ph',
            'granularity' => 'week',
            'start' => '2026-05-01',
            'end' => '2026-05-07',
        ]);

        $this->assertCount(2, $mensajes);
        $this->assertSame('system', $mensajes[0]['role']);
        $this->assertSame('user', $mensajes[1]['role']);
        $this->assertStringContainsString('AquaSense', $mensajes[0]['content']);
        $this->assertStringContainsString('pH', $mensajes[0]['content']);
        $this->assertStringContainsString('granularity', $mensajes[1]['content']);
        $this->assertStringContainsString('week', $mensajes[1]['content']);
        $this->assertStringContainsString('temperatura', $mensajes[0]['content']);
        $this->assertStringContainsString('turbidez', $mensajes[0]['content']);
    }

    public function test_consultar_agrega_por_semana()
    {
        $service = new ReportesService();

        // Ejecutar una consulta simple por semana (si no hay datos, debe devolver arrays)
        $result = $service->consultar([
            'metric' => 'ph',
            'granularity' => 'week',
            'start' => '2026-01-01',
            'end' => '2026-01-31',
        ]);

        $this->assertArrayHasKey('series', $result);
        $this->assertArrayHasKey('rows', $result);
        $this->assertIsArray($result['series']);
        $this->assertIsArray($result['rows']);
    }
}
