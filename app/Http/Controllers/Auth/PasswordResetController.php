<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\View;

class PasswordResetController extends Controller
{
    /**
     * Mostrar página para establecer contraseña
     */
    public function showForm(string $token)
    {
        $user = User::where('password_reset_token', $token)
            ->where('password_reset_expires_at', '>', now())
            ->firstOrFail();

        return View::make('auth.set-password', [
            'token' => $token,
            'email' => $user->email,
        ]);
    }

    /**
     * Procesar establecimiento de contraseña
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::where('password_reset_token', $data['token'])
            ->where('password_reset_expires_at', '>', now())
            ->firstOrFail();

        $user->update([
            'password' => Hash::make($data['password']),
            'password_reset_token' => null,
            'password_reset_expires_at' => null,
        ]);

        return response()->json([
            'message' => 'Contraseña establecida correctamente. Ya puedes iniciar sesión.',
            'success' => true,
        ]);
    }
}
