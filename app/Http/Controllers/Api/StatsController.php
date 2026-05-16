<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Device;
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
        $startOfWeek = Carbon::now()->startOfWeek();

        $allowedDeviceIds = $user?->isAdmin() ? null : $user?->devices()->pluck('id')->all();

        $monthQuery = Registro::query()->where('captured_at', '>=', $startOfMonth);
        $weekQuery = Registro::query()->where('captured_at', '>=', $startOfWeek);
        $latestQuery = Registro::query();
        $devicesQuery = Device::query();

        if (is_array($allowedDeviceIds)) {
            $monthQuery->whereIn('device_id', $allowedDeviceIds);
            $weekQuery->whereIn('device_id', $allowedDeviceIds);
            $latestQuery->whereIn('device_id', $allowedDeviceIds);
            $devicesQuery->whereIn('id', $allowedDeviceIds);
        }

        if (is_array($allowedDeviceIds) && empty($allowedDeviceIds)) {
            return response()->json([
                'total_consumo' => 0,
                'promedio_diario' => 0,
                'promedio_semanal_ph' => 0,
                'ph_actual' => null,
                'dispositivos_activos' => 0,
                'alertas' => 0,
                'has_registros' => false,
                'last_captured_at' => null,
                'message' => 'No tienes dispositivos asignados. Contacta al administrador para habilitar reportes y gráficas.',
                'restricted' => true,
            ]);
        }

        $totalConsumo = (float) $monthQuery->sum('consumo');
        $promedioDiario = (float) $monthQuery->avg('consumo');
        $promedioSemanalPh = (float) $weekQuery->avg('ph');

        $latest = $latestQuery->orderByDesc('captured_at')->first();
        $registrosCount = $latestQuery->count();
        $dispositivosActivos = $devicesQuery->where('is_active', true)->count();

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
            'promedio_semanal_ph' => round($promedioSemanalPh, 2),
            'ph_actual' => $latest?->ph,
            'dispositivos_activos' => $dispositivosActivos,
            'alertas' => $alertas,
            'has_registros' => $registrosCount > 0,
            'last_captured_at' => optional($latest?->captured_at)->toISOString(),
            'restricted' => is_array($allowedDeviceIds),
            'message' => is_array($allowedDeviceIds) && ! empty($allowedDeviceIds)
                ? null
                : 'No tienes dispositivos asignados. Contacta al administrador para habilitar reportes y gráficas.',
        ]);
    }
}
