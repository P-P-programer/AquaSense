<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registro;
use Illuminate\Http\JsonResponse;

class RegistrosController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Registro::query()
            ->orderByDesc('captured_at')
            ->limit(100)
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
            ];
        });

        return response()->json($payload);
    }
}
