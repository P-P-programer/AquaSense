<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\RegistrosController;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function () {
    Route::post('/login', [LoginController::class, 'apiLogin'])
        ->middleware('throttle:5,1')
        ->name('api.login');

    Route::post('/logout', [LoginController::class, 'apiLogout'])
        ->name('api.logout');

    Route::get('/me', function () {
        return response()->json(auth()->user());
    })->name('api.me');

    Route::middleware('auth')->group(function () {
        Route::get('/stats', [StatsController::class, 'index']);
        Route::get('/registros', [RegistrosController::class, 'index']);
    });

    Route::middleware(['auth', 'role:admin'])->group(function () {
        // Route::apiResource('users', AdminUserController::class);
    });
});