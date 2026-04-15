<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Device;
use App\Services\PhThresholdResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DeviceController extends Controller
{
    public function __construct(private readonly PhThresholdResolverService $phThresholdResolver)
    {
    }

    public function index(): JsonResponse
    {
        $devices = Device::query()
            ->with([
                'user:id,name,email',
                'tokens:id,device_id,token_prefix,label,revoked_at,last_used_at,expires_at',
                'latestLocation' => fn ($query) => $query->select([
                    'device_locations.id',
                    'device_locations.device_id',
                    'device_locations.captured_at',
                    'device_locations.inside_expected_zone',
                    'device_locations.distance_to_expected_m',
                    'device_locations.city',
                    'device_locations.country',
                    'device_locations.address',
                ]),
            ])
            ->orderByDesc('last_seen_at')
            ->orderBy('name')
            ->get();

        $devices->each(function (Device $device): void {
            $device->setAttribute('effective_ph_thresholds', $this->phThresholdResolver->resolve($device));
        });

        return response()->json($devices);
    }

    public function locations(Device $device, Request $request): JsonResponse
    {
        $limit = min(500, max(10, (int) $request->integer('limit', 100)));

        $locations = $device->locations()
            ->orderByDesc('captured_at')
            ->limit($limit)
            ->get();

        return response()->json($locations);
    }

    public function show(Device $device): JsonResponse
    {
        $device->load(['user:id,name,email', 'tokens', 'latestLocation']);
        $device->setAttribute('effective_ph_thresholds', $this->phThresholdResolver->resolve($device));

        return response()->json($device);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'name' => ['required', 'string', 'max:255'],
            'identifier' => ['nullable', 'string', 'max:255', 'unique:devices,identifier'],
            'is_active' => ['nullable', 'boolean'],
            'connectivity_alerts_enabled' => ['nullable', 'boolean'],
            'ph_safe_min' => ['nullable', 'numeric', 'between:0,14'],
            'ph_safe_max' => ['nullable', 'numeric', 'between:0,14'],
            'ph_critical_min' => ['nullable', 'numeric', 'between:0,14'],
            'ph_critical_max' => ['nullable', 'numeric', 'between:0,14'],
            'expected_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'expected_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'expected_radius_m' => ['nullable', 'integer', 'min:10', 'max:100000'],
            'metadata' => ['nullable', 'array'],
        ]);

        $device = Device::create([
            'user_id' => $data['user_id'] ?? null,
            'name' => $data['name'],
            'identifier' => $data['identifier'] ?? Str::uuid()->toString(),
            'is_active' => $data['is_active'] ?? true,
            'connectivity_alerts_enabled' => $data['connectivity_alerts_enabled'] ?? false,
            'ph_safe_min' => $data['ph_safe_min'] ?? null,
            'ph_safe_max' => $data['ph_safe_max'] ?? null,
            'ph_critical_min' => $data['ph_critical_min'] ?? null,
            'ph_critical_max' => $data['ph_critical_max'] ?? null,
            'expected_latitude' => $data['expected_latitude'] ?? null,
            'expected_longitude' => $data['expected_longitude'] ?? null,
            'expected_radius_m' => $data['expected_radius_m'] ?? 100,
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
            'connectivity_alerts_enabled' => ['sometimes', 'boolean'],
            'ph_safe_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_safe_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'expected_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'expected_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'expected_radius_m' => ['nullable', 'integer', 'min:10', 'max:100000'],
            'metadata' => ['nullable', 'array'],
        ]);

        $device->update($data);

        return response()->json($device->fresh(['user', 'tokens']));
    }
}
