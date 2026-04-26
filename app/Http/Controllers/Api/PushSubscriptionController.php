<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * Suscribir el navegador a notificaciones push
     */
    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:2048',
            'keys' => 'required|array',
            'keys.auth' => 'required|string',
            'keys.p256dh' => 'required|string',
        ]);

        $user = auth()->user();
        $isAdmin = $user->role === 'admin';

        // Verificar si ya existe esta suscripción
        $existing = PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $validated['endpoint'])
            ->first();

        if ($existing) {
            $existing->update([
                'keys' => $validated['keys'],
                'is_admin' => $isAdmin,
            ]);
            return response()->json(['message' => 'Subscription updated'], 200);
        }

        PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => $validated['endpoint'],
            'keys' => $validated['keys'],
            'is_admin' => $isAdmin,
        ]);

        return response()->json(['message' => 'Subscription created'], 201);
    }

    /**
     * Desuscribir del push
     */
    public function unsubscribe(Request $request)
    {
        $validated = $request->validate([
            'endpoint' => 'required|string|max:2048',
        ]);

        $user = auth()->user();

        PushSubscription::where('user_id', $user->id)
            ->where('endpoint', $validated['endpoint'])
            ->delete();

        return response()->json(['message' => 'Unsubscribed'], 200);
    }

    /**
     * Obtener estado de suscripción del usuario actual
     */
    public function status(Request $request)
    {
        $user = auth()->user();
        $count = PushSubscription::where('user_id', $user->id)->count();

        return response()->json([
            'subscribed' => $count > 0,
            'subscription_count' => $count,
        ]);
    }
}
