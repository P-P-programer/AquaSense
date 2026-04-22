<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Api\Admin\DeviceController;
use App\Http\Controllers\Api\Admin\DeviceTokenController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\ConnectivitySettingsController;
use App\Http\Controllers\Api\DeviceIngestController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\UserAlertPreferenceController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\RegistrosController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\CityController;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
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
        Route::get('/alerts', [AlertController::class, 'index']);
        Route::patch('/alerts/{alert}/resolve', [AlertController::class, 'resolve']);
        Route::get('/me/alert-preferences', [UserAlertPreferenceController::class, 'show']);
        Route::patch('/me/alert-preferences', [UserAlertPreferenceController::class, 'update']);

        // Cities and zones
        Route::get('/cities', [CityController::class, 'index']);
        Route::get('/cities/{city}', [CityController::class, 'show']);

        // Push Notifications
        Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe']);
        Route::post('/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);
        Route::get('/push/status', [PushSubscriptionController::class, 'status']);

        // Email Verification
        Route::get('/email/verify/{id}/{hash}', function (EmailVerificationRequest $request) {
            if (! $request->user()->hasVerifiedEmail()) {
                $request->fulfill();
            }

            return response()->json([
                'message' => 'Correo verificado correctamente.',
                'verified' => true,
            ]);
        })->middleware('signed')->name('verification.verify');

        Route::post('/email/verification-notification', function (Request $request) {
            if ($request->user()->hasVerifiedEmail()) {
                return response()->json([
                    'message' => 'El correo ya está verificado.',
                    'verified' => true,
                ]);
            }

            $request->user()->sendEmailVerificationNotification();

            return response()->json([
                'message' => 'Correo de verificación reenviado.',
                'verified' => false,
            ]);
        })->middleware('throttle:6,1')->name('verification.send');
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

        // Connectivity Settings
        Route::get('/admin/devices/{device}/connectivity-settings', [ConnectivitySettingsController::class, 'show']);
        Route::patch('/admin/devices/{device}/connectivity-settings', [ConnectivitySettingsController::class, 'update']);
        Route::get('/admin/devices/{device}/locations', [DeviceController::class, 'locations']);

        Route::get('/admin/devices/{device}/tokens', [DeviceTokenController::class, 'index']);
        Route::post('/admin/devices/{device}/tokens', [DeviceTokenController::class, 'store']);
        Route::patch('/admin/device-tokens/{deviceToken}/revoke', [DeviceTokenController::class, 'revoke']);
    });
});

Route::post('/devices/ingest', [DeviceIngestController::class, 'store'])
    ->middleware('throttle:120,1')
    ->name('api.devices.ingest');