<?php

namespace App\Contracts;

use App\Models\User;
use Illuminate\Http\Request;

interface LoginServiceInterface
{
    /**
     * Intenta autenticar al usuario.
     *
     * @param  array{email: string, password: string, remember?: bool}  $credentials
     * @return User|null  El usuario autenticado o null si falla
     */
    public function attempt(array $credentials): ?User;

    /**
     * Cierra la sesión del usuario actual.
     */
    public function logout(Request $request): void;
}
