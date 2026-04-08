<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Registro;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $startOfMonth = Carbon::now()->startOfMonth();

        $monthQuery = Registro::query()->where('captured_at', '>=', $startOfMonth);

        $totalConsumo = (float) $monthQuery->sum('consumo');
        $promedioDiario = (float) $monthQuery->avg('consumo');

        $latest = Registro::query()->orderByDesc('captured_at')->first();
        $registrosCount = Registro::query()->count();

        $alertasQuery = Alert::query()->where('status', 'active');

        if ($user?->role !== 'admin') {
            $alertasQuery->whereHas('device', function ($deviceQuery) use ($user) {
                $deviceQuery->where('user_id', $user?->id);
            });
        }

        $alertas = $alertasQuery->count();

        return response()->json([
            'total_consumo' => $totalConsumo,
            'promedio_diario' => round($promedioDiario, 2),
            'ph_actual' => $latest?->ph,
            'turbidez' => $latest?->turbidez,
            'temperatura' => $latest?->temperatura,
            'alertas' => $alertas,
            'has_registros' => $registrosCount > 0,
            'last_captured_at' => optional($latest?->captured_at)->toISOString(),
        ]);
    }
}
