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

        $users->each(fn (User $user) => $user->setAttribute('verification_status', $this->resolveVerificationStatus($user)));

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount([
            'devices',
            'devices as devices_active_count' => fn ($q) => $q->where('is_active', true),
            'devices as devices_inactive_count' => fn ($q) => $q->where('is_active', false),
        ]);

        $user->setAttribute('verification_status', $this->resolveVerificationStatus($user));

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
            'ph_safe_min' => ['nullable', 'numeric', 'between:0,14'],
            'ph_safe_max' => ['nullable', 'numeric', 'between:0,14'],
            'ph_critical_min' => ['nullable', 'numeric', 'between:0,14'],
            'ph_critical_max' => ['nullable', 'numeric', 'between:0,14'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            // Sprint 3: los usuarios nuevos inician pendientes hasta verificar correo y activación admin.
            'is_active' => false,
            'alerts_notify_email' => $data['alerts_notify_email'] ?? true,
            'alerts_notify_push' => $data['alerts_notify_push'] ?? true,
            'alerts_min_severity' => $data['alerts_min_severity'] ?? 'media',
            'ph_safe_min' => $data['ph_safe_min'] ?? null,
            'ph_safe_max' => $data['ph_safe_max'] ?? null,
            'ph_critical_min' => $data['ph_critical_min'] ?? null,
            'ph_critical_max' => $data['ph_critical_max'] ?? null,
        ]);

        $user->sendEmailVerificationNotification();

        $user->setAttribute('verification_status', $this->resolveVerificationStatus($user));

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
            'ph_safe_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_safe_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_min' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
            'ph_critical_max' => ['sometimes', 'nullable', 'numeric', 'between:0,14'],
        ]);

        if (array_key_exists('password', $data) && $data['password'] === null) {
            unset($data['password']);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        $freshUser = $user->fresh();
        $freshUser->setAttribute('verification_status', $this->resolveVerificationStatus($freshUser));

        return response()->json($freshUser);
    }

    private function resolveVerificationStatus(User $user): string
    {
        if (! $user->hasVerifiedEmail()) {
            return 'pendiente';
        }

        if ($user->is_active) {
            return 'activo';
        }

        return 'verificado';
    }
}
