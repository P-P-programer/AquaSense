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

        // Marcar correo verificado automáticamente ya que el usuario accedió al enlace enviado al email
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new \Illuminate\Auth\Events\Verified($user));
        }

        // Si la petición espera JSON (API/fetch), responder JSON; si no, mostrar una vista bonita HTML
        if ($request->wantsJson() || $request->isJson() || $request->ajax()) {
            return response()->json([
                'message' => 'Contraseña establecida correctamente. Ya puedes iniciar sesión.',
                'success' => true,
            ]);
        }

        return view('auth.set-password-success', ['email' => $user->email]);
    }
}
