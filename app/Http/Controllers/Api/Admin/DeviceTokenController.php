<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Models\DeviceToken;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeviceTokenController extends Controller
{
    public function index(Device $device): JsonResponse
    {
        $tokens = $device->tokens()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($tokens);
    }

    public function store(Request $request, Device $device): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
        ]);

        $plainToken = 'AS-' . Str::random(48);
        $tokenHash = hash('sha256', $plainToken);

        $token = DeviceToken::create([
            'device_id' => $device->id,
            'created_by' => $request->user()?->id,
            'label' => $data['label'] ?? null,
            'token_hash' => $tokenHash,
            'token_prefix' => substr($plainToken, 0, 8),
            'expires_at' => $data['expires_at'] ?? null,
        ]);

        return response()->json([
            'token' => $plainToken,
            'device_token' => $token,
        ], 201);
    }

    public function revoke(DeviceToken $deviceToken): JsonResponse
    {
        $deviceToken->update([
            'revoked_at' => now(),
        ]);

        return response()->json([
            'message' => 'Token revocado correctamente.',
            'device_token' => $deviceToken->fresh(),
        ]);
    }
}
