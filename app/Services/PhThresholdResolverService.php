<?php

namespace App\Services;

use App\Models\Device;
use App\Models\User;

class PhThresholdResolverService
{
    /**
     * @return array{safe_min: float, safe_max: float, critical_min: float, critical_max: float, source: string}
     */
    public function resolve(Device $device): array
    {
        $user = $device->user;

        $defaults = [
            'safe_min' => (float) config('alerts.ph.safe_min', 6.5),
            'safe_max' => (float) config('alerts.ph.safe_max', 8.0),
            'critical_min' => (float) config('alerts.ph.critical_min', 6.0),
            'critical_max' => (float) config('alerts.ph.critical_max', 8.5),
        ];

        $deviceThresholds = [
            'safe_min' => $device->ph_safe_min !== null ? (float) $device->ph_safe_min : null,
            'safe_max' => $device->ph_safe_max !== null ? (float) $device->ph_safe_max : null,
            'critical_min' => $device->ph_critical_min !== null ? (float) $device->ph_critical_min : null,
            'critical_max' => $device->ph_critical_max !== null ? (float) $device->ph_critical_max : null,
        ];

        $userThresholds = $this->mapUserThresholds($user);

        $resolved = [
            'safe_min' => $deviceThresholds['safe_min'] ?? $userThresholds['safe_min'] ?? $defaults['safe_min'],
            'safe_max' => $deviceThresholds['safe_max'] ?? $userThresholds['safe_max'] ?? $defaults['safe_max'],
            'critical_min' => $deviceThresholds['critical_min'] ?? $userThresholds['critical_min'] ?? $defaults['critical_min'],
            'critical_max' => $deviceThresholds['critical_max'] ?? $userThresholds['critical_max'] ?? $defaults['critical_max'],
            'source' => $this->resolveSource($deviceThresholds, $userThresholds),
        ];

        return $this->normalize($resolved);
    }

    /**
     * @param  array{safe_min: ?float, safe_max: ?float, critical_min: ?float, critical_max: ?float}  $deviceThresholds
     * @param  array{safe_min: ?float, safe_max: ?float, critical_min: ?float, critical_max: ?float}  $userThresholds
     */
    private function resolveSource(array $deviceThresholds, array $userThresholds): string
    {
        if (in_array(true, array_map(static fn ($value) => $value !== null, $deviceThresholds), true)) {
            return 'device';
        }

        if (in_array(true, array_map(static fn ($value) => $value !== null, $userThresholds), true)) {
            return 'user';
        }

        return 'global';
    }

    /**
     * @return array{safe_min: ?float, safe_max: ?float, critical_min: ?float, critical_max: ?float}
     */
    private function mapUserThresholds(?User $user): array
    {
        if (! $user) {
            return [
                'safe_min' => null,
                'safe_max' => null,
                'critical_min' => null,
                'critical_max' => null,
            ];
        }

        return [
            'safe_min' => $user->ph_safe_min !== null ? (float) $user->ph_safe_min : null,
            'safe_max' => $user->ph_safe_max !== null ? (float) $user->ph_safe_max : null,
            'critical_min' => $user->ph_critical_min !== null ? (float) $user->ph_critical_min : null,
            'critical_max' => $user->ph_critical_max !== null ? (float) $user->ph_critical_max : null,
        ];
    }

    /**
     * @param  array{safe_min: float, safe_max: float, critical_min: float, critical_max: float, source: string}  $resolved
     * @return array{safe_min: float, safe_max: float, critical_min: float, critical_max: float, source: string}
     */
    private function normalize(array $resolved): array
    {
        $criticalMin = min($resolved['critical_min'], $resolved['safe_min']);
        $criticalMax = max($resolved['critical_max'], $resolved['safe_max']);

        $safeMin = max($criticalMin, min($resolved['safe_min'], $resolved['safe_max']));
        $safeMax = min($criticalMax, max($resolved['safe_min'], $resolved['safe_max']));

        return [
            'safe_min' => $safeMin,
            'safe_max' => $safeMax,
            'critical_min' => $criticalMin,
            'critical_max' => $criticalMax,
            'source' => $resolved['source'],
        ];
    }
}
