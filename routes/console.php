<?php

use App\Models\Device;
use App\Services\AlertEvaluatorService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('alerts:check-offline', function (AlertEvaluatorService $alertEvaluatorService) {
    $offlineAfterMinutes = max(1, (int) config('alerts.offline_after_minutes', 3));

    // LEGACY: solo para dispositivos que NO tengan el nuevo flag de connectivity_alerts_enabled
    $devices = Device::query()
        ->where('is_active', true)
        ->where('connectivity_alerts_enabled', false)
        ->whereNotNull('last_seen_at')
        ->get();

    foreach ($devices as $device) {
        $alertEvaluatorService->evaluateOffline($device, $offlineAfterMinutes);
    }

    $this->info(sprintf('Offline check completado. Dispositivos verificados: %d', $devices->count()));
})->purpose('Evalúa alertas de dispositivos sin heartbeat (legacy).');

Schedule::command('alerts:check-offline')->everyMinute();

// Nuevo: verificar dispositivos con connectivity_alerts_enabled ON
Schedule::command('aquasense:evaluate-connectivity', ['--offline-after-minutes' => 5])->everyMinute();
