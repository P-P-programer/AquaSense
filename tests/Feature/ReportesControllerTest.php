<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Device;
use App\Models\Registro;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReportesControllerTest extends TestCase
{
    use RefreshDatabase;

    private function createScopedReportData(): array
    {
        $city = City::create([
            'name' => 'Ibagué',
            'department' => 'Tolima',
            'country' => 'Colombia',
            'dane_code' => 73001,
            'latitude' => 4.4389,
            'longitude' => -75.2322,
            'description' => 'Ciudad de prueba',
        ]);

        $otherCity = City::create([
            'name' => 'Espinal',
            'department' => 'Tolima',
            'country' => 'Colombia',
            'dane_code' => 73268,
            'latitude' => 4.1497,
            'longitude' => -74.8840,
            'description' => 'Ciudad de prueba 2',
        ]);

        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $otherUser = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

        $ownDevice = Device::create([
            'user_id' => $user->id,
            'city_id' => $city->id,
            'name' => 'ESP32 Propio',
            'identifier' => 'own-device-'.str()->uuid()->toString(),
            'is_active' => true,
            'last_seen_at' => now(),
        ]);

        $otherDevice = Device::create([
            'user_id' => $otherUser->id,
            'city_id' => $otherCity->id,
            'name' => 'ESP32 Ajeno',
            'identifier' => 'other-device-'.str()->uuid()->toString(),
            'is_active' => true,
            'last_seen_at' => now(),
        ]);

        return compact('city', 'otherCity', 'user', 'otherUser', 'ownDevice', 'otherDevice');
    }

    private function seedScopedReportRows(array $data): void
    {
        Registro::create([
            'device_id' => $data['ownDevice']->id,
            'city_id' => $data['city']->id,
            'captured_at' => Carbon::now()->subHour(),
            'ph' => 6.50,
            'consumo' => 12.5,
            'estado' => 'ok',
            'source' => 'test',
        ]);

        Registro::create([
            'device_id' => $data['otherDevice']->id,
            'city_id' => $data['otherCity']->id,
            'captured_at' => Carbon::now()->subMinutes(30),
            'ph' => 9.50,
            'consumo' => 50.0,
            'estado' => 'ok',
            'source' => 'test',
        ]);
    }

    public function test_query_returns_reportes_payload()
    {
        $response = $this->withoutMiddleware()->postJson('/api/reportes/query', [
            'metric' => 'ph',
            'granularity' => 'week',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'meta' => ['mensaje', 'filtros', 'trend', 'anomaly_count'],
            'series',
            'rows',
        ]);
    }

    public function test_export_returns_accepted_payload()
    {
        Storage::fake('public');

        $data = $this->createScopedReportData();
        $this->seedScopedReportRows($data);

        $user = $data['user'];

        $response = $this->actingAs($user)->postJson('/api/reportes/export', [
            'metric' => 'ph',
            'format' => 'xlsx',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'mensaje',
            'estado',
            'filtros',
            'activity_id',
            'filename',
            'rows_count',
        ]);

        $filename = $response->json('filename');
        $this->assertNotEmpty($filename);
        Storage::disk('public')->assertExists('reportes/'.$filename);
    }

    public function test_export_docx_returns_downloadable_file()
    {
        Storage::fake('public');

        $data = $this->createScopedReportData();
        $this->seedScopedReportRows($data);

        $user = $data['user'];

        $response = $this->actingAs($user)->postJson('/api/reportes/export', [
            'metric' => 'ph',
            'format' => 'docx',
        ]);

        $response->assertOk();
        $response->assertJsonStructure([
            'mensaje',
            'estado',
            'filtros',
            'activity_id',
            'filename',
            'rows_count',
        ]);

        $filename = $response->json('filename');
        $this->assertNotEmpty($filename);
        Storage::disk('public')->assertExists('reportes/'.$filename);
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

    public function test_export_is_recorded_in_history_for_authenticated_user()
    {
        Storage::fake('public');

        $data = $this->createScopedReportData();
        $this->seedScopedReportRows($data);

        $user = $data['user'];

        $this->actingAs($user);

        $response = $this->postJson('/api/reportes/export', [
            'metric' => 'ph',
            'format' => 'xlsx',
        ]);

        $response->assertOk();

        $history = $this->getJson('/api/reportes/historial');

        $history->assertOk();
        $history->assertJsonPath('meta.count', 1);
        $history->assertJsonPath('items.0.user.id', $user->id);
        $history->assertJsonPath('items.0.action_type', 'export');
        $history->assertJsonPath('items.0.format', 'xlsx');
    }

    public function test_admin_can_view_all_report_history()
    {
        Storage::fake('public');

        $data = $this->createScopedReportData();
        $this->seedScopedReportRows($data);

        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $user = $data['user'];

        $this->actingAs($user)->postJson('/api/reportes/export', [
            'metric' => 'ph',
            'format' => 'xlsx',
        ])->assertOk();

        $this->actingAs($admin)->postJson('/api/reportes/ia/resumen', [
            'metric' => 'ph',
            'granularity' => 'week',
        ])->assertOk();

        $history = $this->actingAs($admin)->getJson('/api/reportes/historial?scope=all');

        $history->assertOk();
        $history->assertJsonPath('meta.scope', 'all');
        $history->assertJsonPath('meta.count', 2);
    }

    public function test_normal_user_only_sees_assigned_device_data_in_reports()
    {
        $data = $this->createScopedReportData();
        $this->seedScopedReportRows($data);

        $user = $data['user'];
        $ownDevice = $data['ownDevice'];

        $stats = $this->actingAs($user)->getJson('/api/stats');
        $stats->assertOk();
        $stats->assertJsonPath('dispositivos_activos', 1);
        $stats->assertJsonPath('ph_actual', '6.50');

        $registros = $this->actingAs($user)->getJson('/api/registros?limit=10');
        $registros->assertOk();
        $registros->assertJsonCount(1);
        $registros->assertJsonPath('0.device_id', $ownDevice->id);

        $reporte = $this->actingAs($user)->postJson('/api/reportes/query', [
            'metric' => 'ph',
            'granularity' => 'day',
        ]);

        $reporte->assertOk();
        $reporte->assertJsonPath('meta.restricted', true);
        $reporte->assertJsonPath('series.0.value', 6.5);
        $reporte->assertJsonCount(1, 'rows');
    }
}
