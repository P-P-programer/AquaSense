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

    $devices = Device::query()
        ->where('is_active', true)
        ->whereNotNull('last_seen_at')
        ->get();

    foreach ($devices as $device) {
        $alertEvaluatorService->evaluateOffline($device, $offlineAfterMinutes);
    }

    $this->info(sprintf('Offline check completado. Dispositivos verificados: %d', $devices->count()));
})->purpose('Evalúa alertas de dispositivos sin heartbeat.');

Schedule::command('alerts:check-offline')->everyMinute();
