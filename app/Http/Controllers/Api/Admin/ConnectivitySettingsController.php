<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\Request;

class ConnectivitySettingsController extends Controller
{
    /**
     * Obtener settings de conectividad del dispositivo
     */
    public function show(Device $device)
    {
        return response()->json([
            'device_id' => $device->id,
            'connectivity_alerts_enabled' => $device->connectivity_alerts_enabled,
            'last_heartbeat_at' => $device->last_heartbeat_at?->toIso8601String(),
        ]);
    }

    /**
     * Actualizar settings de conectividad
     */
    public function update(Request $request, Device $device)
    {
        $validated = $request->validate([
            'connectivity_alerts_enabled' => 'required|boolean',
        ]);

        $device->update($validated);

        return response()->json([
            'message' => 'Connectivity settings updated',
            'device' => $device,
        ]);
    }
}
