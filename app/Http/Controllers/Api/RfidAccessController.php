<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RfidCard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RfidAccessController extends Controller
{
    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'uid' => ['required', 'string', 'max:32'],
            'device_identifier' => ['nullable', 'string', 'max:255'],
        ]);

        $uid = $this->normalizeUid($data['uid']);

        if ($uid === '') {
            return response()->json([
                'allowed' => false,
                'message' => 'UID inválido.',
                'uid' => $data['uid'],
            ]);
        }

        $card = RfidCard::query()
            ->where('uid', $uid)
            ->first();

        if (! $card) {
            return response()->json([
                'allowed' => false,
                'message' => 'Tarjeta no registrada.',
                'uid' => $uid,
            ]);
        }

        $card->forceFill([
            'last_seen_at' => now(),
        ])->save();

        if (! $card->is_active) {
            return response()->json([
                'allowed' => false,
                'message' => 'Tarjeta inactiva.',
                'uid' => $uid,
                'card' => [
                    'id' => $card->id,
                    'label' => $card->label,
                    'is_active' => $card->is_active,
                ],
            ]);
        }

        return response()->json([
            'allowed' => true,
            'message' => 'Acceso permitido.',
            'uid' => $uid,
            'card' => [
                'id' => $card->id,
                'label' => $card->label,
                'is_active' => $card->is_active,
            ],
        ]);
    }

    private function normalizeUid(string $uid): string
    {
        $normalized = strtoupper(preg_replace('/[^0-9A-Fa-f]/', '', trim($uid)) ?? '');

        return substr($normalized, 0, 32);
    }
}