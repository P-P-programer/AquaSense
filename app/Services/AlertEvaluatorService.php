<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Registro;

class AlertEvaluatorService
{
    /**
     * @param  array<string, mixed>|null  $locationPayload
     */
    public function evaluate(Device $device, Registro $registro, ?array $locationPayload = null): void
    {
        $this->evaluatePhOutOfRange($device, $registro);
        $this->evaluateOutOfZone($device, $locationPayload);
    }

    private function evaluatePhOutOfRange(Device $device, Registro $registro): void
    {
        if ($registro->ph === null) {
            return;
        }

        $ph = (float) $registro->ph;
        $isCritical = $ph < 6.0 || $ph > 8.5;
        $isOutOfRange = $ph < 6.5 || $ph > 8.0;

        if (! $isOutOfRange) {
            $this->resolveAlert($device, 'ph_out_of_range');

            return;
        }

        $severity = $isCritical ? 'critica' : 'alta';

        $this->createOrBumpActiveAlert(
            $device,
            'ph_out_of_range',
            $severity,
            'pH fuera de rango',
            sprintf('El dispositivo %s reportó pH %.2f fuera de rango seguro.', $device->name, $ph),
            [
                'ph' => $ph,
                'thresholds' => [
                    'safe_min' => 6.5,
                    'safe_max' => 8.0,
                    'critical_min' => 6.0,
                    'critical_max' => 8.5,
                ],
                'registro_id' => $registro->id,
                'captured_at' => optional($registro->captured_at)->toISOString(),
            ]
        );
    }

    /**
     * @param  array<string, mixed>|null  $locationPayload
     */
    private function evaluateOutOfZone(Device $device, ?array $locationPayload = null): void
    {
        if (! $locationPayload) {
            return;
        }

        $insideExpectedZone = $locationPayload['inside_expected_zone'] ?? null;

        if ($insideExpectedZone !== false) {
            $this->resolveAlert($device, 'out_of_zone');

            return;
        }

        $distance = (int) ($locationPayload['distance_to_expected_m'] ?? 0);

        $this->createOrBumpActiveAlert(
            $device,
            'out_of_zone',
            'media',
            'Dispositivo fuera de zona',
            sprintf('El dispositivo %s está fuera de la zona esperada (%d m).', $device->name, $distance),
            [
                'distance_to_expected_m' => $distance,
                'expected_radius_m' => (int) ($device->expected_radius_m ?? 0),
                'latitude' => $locationPayload['latitude'] ?? null,
                'longitude' => $locationPayload['longitude'] ?? null,
                'accuracy_m' => $locationPayload['accuracy_m'] ?? null,
            ]
        );
    }

    /**
     * @param  array<string, mixed>|null  $data
     */
    private function createOrBumpActiveAlert(
        Device $device,
        string $type,
        string $severity,
        string $title,
        string $message,
        ?array $data = null,
    ): Alert {
        $now = now();

        $alert = Alert::query()
            ->where('device_id', $device->id)
            ->where('type', $type)
            ->where('status', 'active')
            ->first();

        if ($alert) {
            $alert->forceFill([
                'severity' => $severity,
                'title' => $title,
                'message' => $message,
                'data' => $data,
                'last_triggered_at' => $now,
                'triggered_count' => $alert->triggered_count + 1,
            ])->save();

            return $alert;
        }

        return Alert::create([
            'device_id' => $device->id,
            'type' => $type,
            'severity' => $severity,
            'status' => 'active',
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'first_triggered_at' => $now,
            'last_triggered_at' => $now,
            'triggered_count' => 1,
        ]);
    }

    private function resolveAlert(Device $device, string $type): void
    {
        Alert::query()
            ->where('device_id', $device->id)
            ->where('type', $type)
            ->where('status', 'active')
            ->update([
                'status' => 'resolved',
                'resolved_at' => now(),
            ]);
    }
}
