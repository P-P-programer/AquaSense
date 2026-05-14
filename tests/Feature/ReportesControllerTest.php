<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReportesControllerTest extends TestCase
{
    use RefreshDatabase;

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

        $user = User::factory()->create();

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

        $user = User::factory()->create();

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

        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

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

        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);
        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
        ]);

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
}
