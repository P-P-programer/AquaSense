<?php

namespace App\Services;

use App\Models\Alert;
use App\Models\Device;
use App\Models\Registro;
use Carbon\CarbonInterface;

class AlertEvaluatorService
{
    public function __construct(private readonly AlertNotificationService $alertNotificationService)
    {
    }

    /**
     * @param  array<string, mixed>|null  $locationPayload
     */
    public function evaluate(Device $device, Registro $registro, ?array $locationPayload = null): void
    {
        $this->evaluatePhOutOfRange($device, $registro);
        $this->evaluateOutOfZone($device, $locationPayload);
        $this->evaluatePowerSource($device, $registro);
    }

    public function evaluateOffline(Device $device, int $offlineAfterMinutes): void
    {
        if (! $device->is_active || ! $device->last_seen_at) {
            return;
        }

        $isOffline = $device->last_seen_at->lt(now()->subMinutes($offlineAfterMinutes));

        if (! $isOffline) {
            $this->resolveAlert($device, 'offline');

            return;
        }

        $minutesWithoutHeartbeat = now()->diffInMinutes($device->last_seen_at);

        $this->createOrBumpActiveAlert(
            $device,
            'offline',
            'critica',
            'Dispositivo sin señal',
            sprintf('El dispositivo %s no reporta heartbeat hace %d minutos.', $device->name, $minutesWithoutHeartbeat),
            [
                'last_seen_at' => optional($device->last_seen_at)->toISOString(),
                'offline_after_minutes' => $offlineAfterMinutes,
                'minutes_without_heartbeat' => $minutesWithoutHeartbeat,
            ]
        );
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

    private function evaluatePowerSource(Device $device, Registro $registro): void
    {
        $currentSource = $registro->power_source;

        if (! $currentSource) {
            return;
        }

        $previous = Registro::query()
            ->where('device_id', $device->id)
            ->where('id', '<>', $registro->id)
            ->orderByDesc('captured_at')
            ->orderByDesc('id')
            ->first();

        $previousSource = $previous?->power_source;
        $hasChanged = $previousSource !== null && $previousSource !== $currentSource;

        if ($currentSource === 'backup') {
            $message = $hasChanged
                ? sprintf('El dispositivo %s cambió a energía de respaldo.', $device->name)
                : sprintf('El dispositivo %s sigue en energía de respaldo.', $device->name);

            $this->createOrBumpActiveAlert(
                $device,
                'power_outage',
                'critica',
                'Corte de energía principal',
                $message,
                [
                    'from' => $previousSource,
                    'to' => $currentSource,
                    'backup_level' => $registro->backup_level,
                    'power_event_at' => optional($registro->power_event_at)->toISOString(),
                ]
            );

            return;
        }

        if ($currentSource === 'mains') {
            $this->resolveAlert($device, 'power_outage');

            if ($hasChanged && $previousSource === 'backup') {
                $this->createOrBumpActiveAlert(
                    $device,
                    'power_restored',
                    'leve',
                    'Energía principal restablecida',
                    sprintf('El dispositivo %s volvió a energía principal.', $device->name),
                    [
                        'from' => $previousSource,
                        'to' => $currentSource,
                        'backup_level' => $registro->backup_level,
                        'power_event_at' => optional($registro->power_event_at)->toISOString(),
                    ]
                );
            }

            return;
        }

        if ($hasChanged) {
            $this->createOrBumpActiveAlert(
                $device,
                'power_source_changed',
                'media',
                'Cambio de fuente de energía',
                sprintf('El dispositivo %s cambió su estado de energía (%s -> %s).', $device->name, $previousSource, $currentSource),
                [
                    'from' => $previousSource,
                    'to' => $currentSource,
                    'backup_level' => $registro->backup_level,
                    'power_event_at' => optional($registro->power_event_at)->toISOString(),
                ]
            );
        }
    }

    /**
     * @param  array<string, mixed>|null  $data
     */
    public function createOrBumpActiveAlert(
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

            if ($this->shouldRenotify($alert, $now)) {
                $this->alertNotificationService->notify($alert->fresh(['device']));
            }

            return $alert;
        }

        $newAlert = Alert::create([
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

        $this->alertNotificationService->notify($newAlert->fresh(['device']));

        return $newAlert;
    }

    public function resolveAlert(Device $device, string $type): void
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

    private function shouldRenotify(Alert $alert, CarbonInterface $now): bool
    {
        $cooldownMinutes = max(1, (int) config('alerts.renotify_cooldown_minutes', 30));

        $lastNotificationAt = $alert->notified_email_at;

        if ($alert->notified_push_at && (! $lastNotificationAt || $alert->notified_push_at->gt($lastNotificationAt))) {
            $lastNotificationAt = $alert->notified_push_at;
        }

        if (! $lastNotificationAt) {
            return true;
        }

        return $lastNotificationAt->lte($now->copy()->subMinutes($cooldownMinutes));
    }
}
