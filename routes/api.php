<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Api\Admin\DeviceController;
use App\Http\Controllers\Api\Admin\DeviceTokenController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\DeviceIngestController;
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
        Route::get('/admin/users', [UserController::class, 'index']);
        Route::post('/admin/users', [UserController::class, 'store']);
        Route::get('/admin/users/{user}', [UserController::class, 'show']);
        Route::patch('/admin/users/{user}', [UserController::class, 'update']);

        Route::get('/admin/devices', [DeviceController::class, 'index']);
        Route::post('/admin/devices', [DeviceController::class, 'store']);
        Route::get('/admin/devices/{device}', [DeviceController::class, 'show']);
        Route::patch('/admin/devices/{device}', [DeviceController::class, 'update']);
        Route::get('/admin/devices/{device}/locations', [DeviceController::class, 'locations']);

        Route::get('/admin/devices/{device}/tokens', [DeviceTokenController::class, 'index']);
        Route::post('/admin/devices/{device}/tokens', [DeviceTokenController::class, 'store']);
        Route::patch('/admin/device-tokens/{deviceToken}/revoke', [DeviceTokenController::class, 'revoke']);
    });
});

Route::post('/devices/ingest', [DeviceIngestController::class, 'store'])
    ->middleware('throttle:120,1')
    ->name('api.devices.ingest');