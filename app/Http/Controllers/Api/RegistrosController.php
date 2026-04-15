<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registro;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistrosController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'search' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $rows = Registro::query()
            ->with([
                'device:id,city_id,name,identifier',
                'device.city:id,name,department',
            ])
            ->when(! empty($validated['city_id']), function ($query) use ($validated) {
                $query->whereHas('device', function ($deviceQuery) use ($validated) {
                    $deviceQuery->where('city_id', (int) $validated['city_id']);
                });
            })
            ->when(! empty($validated['search']), function ($query) use ($validated) {
                $search = trim((string) $validated['search']);

                $query->where(function ($searchQuery) use ($search) {
                    $searchQuery->whereHas('device', function ($deviceQuery) use ($search) {
                        $deviceQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('identifier', 'like', "%{$search}%");
                    })
                    ->orWhere('estado', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('captured_at')
            ->limit($validated['limit'] ?? 100)
            ->get();

        $payload = $rows->map(function (Registro $registro) {
            return [
                'id' => $registro->id,
                'fecha' => optional($registro->captured_at)->format('Y-m-d H:i:s'),
                'ph' => $registro->ph,
                'consumo' => (float) ($registro->consumo ?? 0),
                'turbidez' => $registro->turbidez,
                'temperatura' => $registro->temperatura,
                'estado' => $registro->estado ?? 'ok',
                'source' => $registro->source,
                'power_source' => $registro->power_source,
                'backup_level' => $registro->backup_level,
                'power_event_at' => optional($registro->power_event_at)->format('Y-m-d H:i:s'),
                'device_id' => $registro->device_id,
                'device_name' => $registro->device?->name,
                'device_identifier' => $registro->device?->identifier,
                'city_id' => $registro->device?->city_id,
                'city_name' => $registro->device?->city?->name,
                'city_department' => $registro->device?->city?->department,
            ];
        });

        return response()->json($payload);
    }
}
