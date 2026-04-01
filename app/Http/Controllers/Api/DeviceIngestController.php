<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\DeviceToken;
use App\Models\Registro;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DeviceIngestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $plainToken = $this->extractToken($request);

        if (! $plainToken) {
            return response()->json([
                'message' => 'Token de dispositivo requerido.',
            ], 401);
        }

        $tokenHash = hash('sha256', $plainToken);

        $deviceToken = DeviceToken::query()
            ->with('device')
            ->where('token_hash', $tokenHash)
            ->whereNull('revoked_at')
            ->first();

        if (! $deviceToken || ! $deviceToken->device || ! $deviceToken->device->is_active) {
            return response()->json([
                'message' => 'Token inválido o dispositivo inactivo.',
            ], 401);
        }

        $validated = $request->validate([
            'captured_at' => ['nullable', 'date'],
            'ph' => ['nullable', 'numeric', 'between:0,14'],
            'consumo' => ['nullable', 'numeric', 'min:0'],
            'turbidez' => ['nullable', 'numeric', 'min:0'],
            'temperatura' => ['nullable', 'numeric'],
            'estado' => ['nullable', 'in:ok,warn,danger'],
        ]);

        $ph = $validated['ph'] ?? null;
        $estado = $validated['estado'] ?? $this->resolveEstado($ph);

        $registro = DB::transaction(function () use ($deviceToken, $validated, $estado) {
            $capturedAt = isset($validated['captured_at'])
                ? Carbon::parse($validated['captured_at'])
                : now();

            $registro = Registro::create([
                'device_id' => $deviceToken->device_id,
                'captured_at' => $capturedAt,
                'ph' => $validated['ph'] ?? null,
                'consumo' => $validated['consumo'] ?? 0,
                'turbidez' => $validated['turbidez'] ?? null,
                'temperatura' => $validated['temperatura'] ?? null,
                'estado' => $estado,
                'source' => 'esp32',
            ]);

            $deviceToken->forceFill([
                'last_used_at' => now(),
            ])->save();

            $deviceToken->device->forceFill([
                'last_seen_at' => now(),
            ])->save();

            return $registro;
        });

        return response()->json([
            'message' => 'Lectura recibida correctamente.',
            'device_id' => $deviceToken->device_id,
            'registro_id' => $registro->id,
            'state' => 'online',
            'last_seen_at' => optional($deviceToken->device->last_seen_at)->toISOString(),
        ]);
    }

    private function extractToken(Request $request): ?string
    {
        $header = $request->header('X-Device-Token');

        if ($header) {
            return trim($header);
        }

        $bearer = $request->bearerToken();

        return $bearer ? trim($bearer) : null;
    }

    private function resolveEstado(?float $ph): string
    {
        if ($ph === null) {
            return 'ok';
        }

        if ($ph < 6.0 || $ph > 8.5) {
            return 'danger';
        }

        if ($ph < 6.5 || $ph > 8.0) {
            return 'warn';
        }

        return 'ok';
    }
}
