<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\AlertEvaluatorService;
use Illuminate\Console\Command;

class EvaluateDeviceConnectivity extends Command
{
    protected $signature = 'aquasense:evaluate-connectivity {--offline-after-minutes=5}';
    protected $description = 'Evalúa estados de conectividad de dispositivos y crea alertas si están deshabilitadas';

    public function __construct(private readonly AlertEvaluatorService $alertEvaluator)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $offlineAfterMinutes = $this->option('offline-after-minutes');

        $devices = Device::where('is_active', true)
            ->where('connectivity_alerts_enabled', true)
            ->get();

        foreach ($devices as $device) {
            $this->alertEvaluator->evaluateOffline($device, $offlineAfterMinutes);
        }

        $this->info("✓ Connectivity check completed for {$devices->count()} devices");

        return self::SUCCESS;
    }
}
