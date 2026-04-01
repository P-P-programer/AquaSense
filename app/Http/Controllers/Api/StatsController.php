<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Registro;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function index(): JsonResponse
    {
        $startOfMonth = Carbon::now()->startOfMonth();

        $monthQuery = Registro::query()->where('captured_at', '>=', $startOfMonth);

        $totalConsumo = (float) $monthQuery->sum('consumo');
        $promedioDiario = (float) $monthQuery->avg('consumo');

        $latest = Registro::query()->orderByDesc('captured_at')->first();

        $alertas = Registro::query()
            ->where('captured_at', '>=', Carbon::now()->subDays(7))
            ->whereIn('estado', ['warn', 'danger'])
            ->count();

        return response()->json([
            'total_consumo' => $totalConsumo,
            'promedio_diario' => round($promedioDiario, 2),
            'ph_actual' => $latest?->ph,
            'turbidez' => $latest?->turbidez,
            'temperatura' => $latest?->temperatura,
            'alertas' => $alertas,
        ]);
    }
}
