<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->withCount([
                'devices',
                'devices as devices_active_count' => fn ($q) => $q->where('is_active', true),
                'devices as devices_inactive_count' => fn ($q) => $q->where('is_active', false),
            ])
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount([
            'devices',
            'devices as devices_active_count' => fn ($q) => $q->where('is_active', true),
            'devices as devices_inactive_count' => fn ($q) => $q->where('is_active', false),
        ]);

        return response()->json($user);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['admin', 'user'])],
            'is_active' => ['nullable', 'boolean'],
            'alerts_notify_email' => ['nullable', 'boolean'],
            'alerts_notify_push' => ['nullable', 'boolean'],
            'alerts_min_severity' => ['nullable', Rule::in(['leve', 'media', 'alta', 'critica'])],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'is_active' => $data['is_active'] ?? true,
            'alerts_notify_email' => $data['alerts_notify_email'] ?? true,
            'alerts_notify_push' => $data['alerts_notify_push'] ?? true,
            'alerts_min_severity' => $data['alerts_min_severity'] ?? 'media',
        ]);

        return response()->json($user, 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['sometimes', Rule::in(['admin', 'user'])],
            'is_active' => ['sometimes', 'boolean'],
            'alerts_notify_email' => ['sometimes', 'boolean'],
            'alerts_notify_push' => ['sometimes', 'boolean'],
            'alerts_min_severity' => ['sometimes', Rule::in(['leve', 'media', 'alta', 'critica'])],
        ]);

        if (array_key_exists('password', $data) && $data['password'] === null) {
            unset($data['password']);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        return response()->json($user->fresh());
    }
}
