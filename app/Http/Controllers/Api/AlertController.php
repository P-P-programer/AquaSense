<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'status' => ['nullable', 'in:active,resolved'],
            'severity' => ['nullable', 'in:leve,media,alta,critica'],
            'device_id' => ['nullable', 'integer', 'exists:devices,id'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = Alert::query()
            ->with([
                'device:id,user_id,city_id,name,identifier,is_active,last_seen_at',
                'device.city:id,name,department',
                'device.user:id,name,email',
            ])
            ->orderByRaw("CASE severity
                WHEN 'critica' THEN 1
                WHEN 'alta' THEN 2
                WHEN 'media' THEN 3
                WHEN 'leve' THEN 4
                ELSE 5 END")
            ->orderByDesc('last_triggered_at');

        if ($user->role !== 'admin') {
            $query->whereHas('device', function ($deviceQuery) use ($user) {
                $deviceQuery->where('user_id', $user->id);
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['severity'])) {
            $query->where('severity', $validated['severity']);
        }

        if (! empty($validated['device_id'])) {
            $query->where('device_id', (int) $validated['device_id']);
        }

        if (! empty($validated['city_id'])) {
            $query->whereHas('device', function ($deviceQuery) use ($validated) {
                $deviceQuery->where('city_id', (int) $validated['city_id']);
            });
        }

        $limit = $validated['limit'] ?? 50;

        return response()->json($query->limit($limit)->get());
    }

    public function resolve(Request $request, Alert $alert): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin' && (int) $alert->device?->user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'No autorizado para gestionar esta alerta.',
            ], 403);
        }

        if ($alert->status === 'resolved') {
            return response()->json([
                'message' => 'La alerta ya estaba resuelta.',
                'alert' => $alert->load(['device:id,user_id,name,identifier']),
            ]);
        }

        $alert->forceFill([
            'status' => 'resolved',
            'resolved_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'Alerta resuelta.',
            'alert' => $alert->fresh(['device:id,user_id,name,identifier']),
        ]);
    }
}
