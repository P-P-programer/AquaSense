<?php

namespace App\Services;

use App\Contracts\LoginServiceInterface;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginService implements LoginServiceInterface
{
    /**
     * Intenta autenticar al usuario verificando también que esté activo.
     *
     * No lanza excepciones — devuelve null si algo falla.
     * El controller decide qué response enviar.
     */
    public function attempt(array $credentials): ?User
    {
        $remember = $credentials['remember'] ?? false;

        $loginCredentials = [
            'email'    => $credentials['email'],
            'password' => $credentials['password'],
        ];

        if (! Auth::attempt($loginCredentials, $remember)) {
            return null;
        }

        /** @var User $user */
        $user = Auth::user();

        // Verificar que la cuenta esté activa
        if (! $user->is_active) {
            Auth::logout();
            return null;
        }

        return $user;
    }

    /**
     * Cierra la sesión, invalida la sesión HTTP y regenera el token CSRF.
     */
    public function logout(Request $request): void
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }
}
