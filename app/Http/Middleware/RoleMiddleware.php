<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Valida que el usuario autenticado tenga al menos uno de los roles indicados.
     *
     * Uso en rutas:
     *   ->middleware('role:admin')
     *   ->middleware('role:admin,user')   // cualquiera de los dos
     *
     * No necesitas un Guard adicional — el Guard 'web' de Laravel maneja
     * la autenticación. Este middleware solo verifica el campo 'role' del user.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Sin autenticar: redirect al login
        if (! $request->user()) {
            return redirect()->route('login');
        }

        // Sin rol requerido: acceso libre para autenticados
        if (empty($roles)) {
            return $next($request);
        }

        // Verificar que el rol del usuario esté en los roles permitidos
        if (! in_array($request->user()->role, $roles, strict: true)) {
            abort(403);
        }

        return $next($request);
    }
}
