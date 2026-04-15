<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserAlertPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'alerts_notify_email' => (bool) $user->alerts_notify_email,
            'alerts_notify_push' => (bool) $user->alerts_notify_push,
            'alerts_min_severity' => (string) ($user->alerts_min_severity ?? 'media'),
            'ph_safe_min' => $user->ph_safe_min,
            'ph_safe_max' => $user->ph_safe_max,
            'ph_critical_min' => $user->ph_critical_min,
            'ph_critical_max' => $user->ph_critical_max,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'alerts_notify_email' => ['sometimes', 'boolean'],
            'alerts_notify_push' => ['sometimes', 'boolean'],
            'alerts_min_severity' => ['sometimes', 'in:leve,media,alta,critica'],
            'ph_safe_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_safe_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
        ]);

        $this->validatePhThresholdRanges($data);

        if ($user->role === 'admin') {
            // Seguridad: para admins, alertas críticas por email siempre activadas.
            $data['alerts_notify_email'] = true;
        }

        $user->forceFill($data)->save();

        return response()->json([
            'message' => 'Preferencias de alertas actualizadas.',
            'preferences' => [
                'alerts_notify_email' => (bool) $user->alerts_notify_email,
                'alerts_notify_push' => (bool) $user->alerts_notify_push,
                'alerts_min_severity' => (string) ($user->alerts_min_severity ?? 'media'),
                'ph_safe_min' => $user->ph_safe_min,
                'ph_safe_max' => $user->ph_safe_max,
                'ph_critical_min' => $user->ph_critical_min,
                'ph_critical_max' => $user->ph_critical_max,
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function validatePhThresholdRanges(array $data): void
    {
        $safeMin = array_key_exists('ph_safe_min', $data) ? $data['ph_safe_min'] : null;
        $safeMax = array_key_exists('ph_safe_max', $data) ? $data['ph_safe_max'] : null;
        $criticalMin = array_key_exists('ph_critical_min', $data) ? $data['ph_critical_min'] : null;
        $criticalMax = array_key_exists('ph_critical_max', $data) ? $data['ph_critical_max'] : null;

        if ($safeMin !== null && $safeMax !== null && $safeMin > $safeMax) {
            throw ValidationException::withMessages([
                'ph_safe_min' => ['ph_safe_min no puede ser mayor que ph_safe_max.'],
            ]);
        }

        if ($criticalMin !== null && $criticalMax !== null && $criticalMin > $criticalMax) {
            throw ValidationException::withMessages([
                'ph_critical_min' => ['ph_critical_min no puede ser mayor que ph_critical_max.'],
            ]);
        }

        if ($criticalMin !== null && $safeMin !== null && $criticalMin > $safeMin) {
            throw ValidationException::withMessages([
                'ph_critical_min' => ['ph_critical_min debe ser menor o igual al ph_safe_min.'],
            ]);
        }

        if ($criticalMax !== null && $safeMax !== null && $criticalMax < $safeMax) {
            throw ValidationException::withMessages([
                'ph_critical_max' => ['ph_critical_max debe ser mayor o igual al ph_safe_max.'],
            ]);
        }
    }
}
