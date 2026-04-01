<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    public function index(): JsonResponse
    {
        $devices = Device::query()
            ->with(['user:id,name,email', 'tokens:id,device_id,token_prefix,label,revoked_at,last_used_at,expires_at'])
            ->orderByDesc('last_seen_at')
            ->orderBy('name')
            ->get();

        return response()->json($devices);
    }

    public function show(Device $device): JsonResponse
    {
        $device->load(['user:id,name,email', 'tokens']);

        return response()->json($device);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'name' => ['required', 'string', 'max:255'],
            'identifier' => ['nullable', 'string', 'max:255', 'unique:devices,identifier'],
            'is_active' => ['nullable', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ]);

        $device = Device::create([
            'user_id' => $data['user_id'] ?? null,
            'name' => $data['name'],
            'identifier' => $data['identifier'] ?? Str::uuid()->toString(),
            'is_active' => $data['is_active'] ?? true,
            'metadata' => $data['metadata'] ?? null,
        ]);

        return response()->json($device, 201);
    }

    public function update(Request $request, Device $device): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'identifier' => ['sometimes', 'string', 'max:255', Rule::unique('devices', 'identifier')->ignore($device->id)],
            'is_active' => ['sometimes', 'boolean'],
            'metadata' => ['nullable', 'array'],
        ]);

        $device->update($data);

        return response()->json($device->fresh(['user', 'tokens']));
    }
}
