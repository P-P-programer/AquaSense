<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserAlertPreferenceController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'alerts_notify_email' => (bool) $user->alerts_notify_email,
            'alerts_notify_push' => (bool) $user->alerts_notify_push,
            'alerts_min_severity' => (string) ($user->alerts_min_severity ?? 'media'),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'alerts_notify_email' => ['sometimes', 'boolean'],
            'alerts_notify_push' => ['sometimes', 'boolean'],
            'alerts_min_severity' => ['sometimes', 'in:leve,media,alta,critica'],
        ]);

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
            ],
        ]);
    }
}
