<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\RegistrosController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Aquasene
|--------------------------------------------------------------------------
| Sanctum SPA auth: las cookies de sesión manejan la autenticación.
| El middleware 'web' es necesario para que Sanctum valide la sesión
| establecida desde el navegador (SPA).
|
| En config/cors.php asegúrate de tener:
|   'supports_credentials' => true,
|   'allowed_origins'       => ['http://localhost:5173'], // tu URL de Vite
|
| En .env:
|   SANCTUM_STATEFUL_DOMAINS=localhost:5173
|   SESSION_DOMAIN=localhost
*/

// ─── Auth (no requiere autenticación previa) ────────────────────────────────
Route::middleware('web')->group(function () {
    // Auth
    Route::post('/login',  [LoginController::class, 'apiLogin'])->middleware('throttle:5,1')->name('api.login');
    Route::post('/logout', [LoginController::class, 'apiLogout'])->name('api.logout');
    Route::get('/me', function () {
        return response()->json(auth()->user());
    })->name('api.me');

    // Dashboard
    Route::get('/stats',     [StatsController::class, 'index']);
    Route::get('/registros', [RegistrosController::class, 'index']);

    // Admin
    Route::middleware('role:admin')->group(function () {
        // Route::apiResource('users', AdminUserController::class);
    });
});