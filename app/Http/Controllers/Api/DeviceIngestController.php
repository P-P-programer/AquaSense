<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\DeviceLocation;
use App\Models\DeviceToken;
use App\Models\Registro;
use App\Services\AlertEvaluatorService;
use App\Services\ReverseGeocodingService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DeviceIngestController extends Controller
{
    public function __construct(
        private readonly ReverseGeocodingService $reverseGeocodingService,
        private readonly AlertEvaluatorService $alertEvaluatorService,
    ) {}

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
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'accuracy_m' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ]);

        $ph = $validated['ph'] ?? null;
        $estado = $validated['estado'] ?? $this->resolveEstado($ph);

        $locationPayload = null;

        if (isset($validated['latitude'], $validated['longitude'])) {
            $locationPayload = $this->resolveLocationPayload($deviceToken->device, $validated);
        }

        $registro = DB::transaction(function () use ($deviceToken, $validated, $estado, $locationPayload) {
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

            $deviceUpdate = [
                'last_seen_at' => now(),
            ];

            if ($locationPayload) {
                $deviceUpdate = array_merge($deviceUpdate, [
                    'last_latitude' => $locationPayload['latitude'],
                    'last_longitude' => $locationPayload['longitude'],
                    'last_accuracy_m' => $locationPayload['accuracy_m'],
                    'last_location_at' => $capturedAt,
                    'last_location_meta' => $locationPayload['meta'],
                ]);

                DeviceLocation::create([
                    'device_id' => $deviceToken->device_id,
                    'captured_at' => $capturedAt,
                    'latitude' => $locationPayload['latitude'],
                    'longitude' => $locationPayload['longitude'],
                    'accuracy_m' => $locationPayload['accuracy_m'],
                    'inside_expected_zone' => $locationPayload['inside_expected_zone'],
                    'distance_to_expected_m' => $locationPayload['distance_to_expected_m'],
                    'source' => 'esp32',
                    'geo_provider' => $locationPayload['meta']['provider'] ?? null,
                    'city' => $locationPayload['meta']['city'] ?? null,
                    'country' => $locationPayload['meta']['country'] ?? null,
                    'address' => $locationPayload['meta']['address'] ?? null,
                    'meta' => $locationPayload['meta'],
                ]);
            }

            $deviceToken->device->forceFill($deviceUpdate)->save();

            return $registro;
        });

        $this->alertEvaluatorService->evaluate(
            $deviceToken->device->fresh(),
            $registro,
            $locationPayload
        );

        return response()->json([
            'message' => 'Lectura recibida correctamente.',
            'device_id' => $deviceToken->device_id,
            'registro_id' => $registro->id,
            'state' => 'online',
            'last_seen_at' => optional($deviceToken->device->last_seen_at)->toISOString(),
            'location' => $locationPayload ? [
                'latitude' => $locationPayload['latitude'],
                'longitude' => $locationPayload['longitude'],
                'inside_expected_zone' => $locationPayload['inside_expected_zone'],
                'distance_to_expected_m' => $locationPayload['distance_to_expected_m'],
            ] : null,
        ]);
    }

    /**
     * Resuelve datos de ubicación del ESP32 sin bloquear nunca la ingesta.
     *
     * Nota: Reverse geocoding (ciudad, país, dirección) es completamente OPCIONAL.
     * Si está habilitado pero falla, los datos de lat/lng se guardan igual.
     * Esto desacopla la ingesta de datos sensores de cualquier servicio externo.
     *
     * @param  array<string, mixed>  $validated
     * @return array{latitude: float, longitude: float, accuracy_m: ?int, inside_expected_zone: ?bool, distance_to_expected_m: ?int, meta: array<string, mixed>}|null
     */
    private function resolveLocationPayload(Device $device, array $validated): ?array
    {
        $lat = isset($validated['latitude']) ? (float) $validated['latitude'] : null;
        $lng = isset($validated['longitude']) ? (float) $validated['longitude'] : null;

        if ($lat === null || $lng === null) {
            return null;
        }

        // Cálculos geométricos puros: distancia a punto esperado y si está dentro de zona
        $distanceToExpected = null;
        $insideExpectedZone = null;

        if ($device->expected_latitude !== null && $device->expected_longitude !== null) {
            $distanceToExpected = $this->haversineMeters(
                $lat,
                $lng,
                (float) $device->expected_latitude,
                (float) $device->expected_longitude
            );

            $radius = max(1, (int) ($device->expected_radius_m ?? 100));
            $insideExpectedZone = $distanceToExpected <= $radius;
        }

        // Enriquecimiento opcional: reverse geocoding
        // Si está deshabilitado o falla, no afecta la ingesta de datos.
        $meta = [];
        $enabled = (bool) config('services.geocoding.enabled', false);

        if ($enabled) {
            try {
                $geo = $this->reverseGeocodingService->reverse($lat, $lng);
                if ($geo) {
                    $meta = $geo;
                }
            } catch (\Throwable $e) {
                // Geocoding falla gracefully sin afectar la ingesta.
                // Los datos de ubicación se guardan sin ciudad/país/dirección.
                Log::warning('Reverse geocoding falló para dispositivo (datos de ubicación se guardan igual)', [
                    'device_id' => $device->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'latitude' => $lat,
            'longitude' => $lng,
            'accuracy_m' => isset($validated['accuracy_m']) ? (int) $validated['accuracy_m'] : null,
            'inside_expected_zone' => $insideExpectedZone,
            'distance_to_expected_m' => $distanceToExpected !== null ? (int) round($distanceToExpected) : null,
            'meta' => $meta,
        ];
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

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
