<?php

namespace App\Http\Controllers\Auth;

use App\Contracts\LoginServiceInterface;
use App\Contracts\SessionLogServiceInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class LoginController extends Controller
{
    public function __construct(
        private readonly LoginServiceInterface      $loginService,
        private readonly SessionLogServiceInterface $sessionLogService,
    ) {}

    /**
     * Muestra el formulario de login.
     */
    public function showLoginForm(): View|RedirectResponse
    {
        if (auth()->check()) {
            return $this->redirectByRole(auth()->user()->role);
        }

        return view('auth.login');
    }

    /**
     * Procesa el intento de login.
     *
     * Rate limiting: manejado por ThrottleRequests en las rutas.
     * Solo se procesa UNA solicitud (la primera que llegue) — las
     * duplicadas son bloqueadas por el rate limiter antes de llegar aquí.
     */
    public function login(LoginRequest $request): RedirectResponse
    {
        $user = $this->loginService->attempt($request->credentials());

        if (! $user) {
            return back()
                ->withInput($request->only('email', 'remember'))
                ->withErrors(['email' => 'Las credenciales no son correctas o la cuenta está inactiva.']);
        }

        // Regenerar sesión para prevenir session fixation
        $request->session()->regenerate();

        // Registrar sesión en el log de auditoría
        $this->sessionLogService->logLogin($user, $request);

        return $this->redirectByRole($user->role);
    }

    /**
     * Cierra la sesión del usuario.
     */
    public function logout(Request $request): RedirectResponse
    {
        if (auth()->check()) {
            $this->sessionLogService->logLogout(auth()->user(), $request);
        }

        $this->loginService->logout($request);

        return redirect()->route('login')->with('status', 'Sesión cerrada correctamente.');
    }

    public function apiLogin(LoginRequest $request): \Illuminate\Http\JsonResponse
    {
    $user = $this->loginService->attempt($request->credentials());

    if (! $user) {
        return response()->json([
            'message' => 'Las credenciales no son correctas o la cuenta está inactiva.',
        ], 401);
    }

    $request->session()->regenerate();

    $this->sessionLogService->logLogin($user, $request);

    return response()->json([
        'message' => 'Autenticado correctamente.',
        'user'    => $user,
    ]);
    }   

/**
 * Logout para la SPA React (responde JSON).
 * Ruta: POST /api/logout
 */
    public function apiLogout(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
    if (auth()->check()) {
        $this->sessionLogService->logLogout(auth()->user(), $request);
    }

    $this->loginService->logout($request);

    return response()->json(['message' => 'Sesión cerrada.']);
    }

    // ─── Privados ─────────────────────────────────────────────────────────────

    private function redirectByRole(string $role): RedirectResponse
    {
        return match ($role) {
            'admin' => redirect()->intended(route('admin.dashboard')),
            default => redirect()->intended(route('user.dashboard')),
        };
    }
}
