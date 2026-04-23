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
use App\Http\Controllers\Api\RfidAccessController;
use App\Http\Controllers\Api\CityController;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware('web')->group(function () {
    Route::post('/login', [LoginController::class, 'apiLogin'])
        ->middleware('throttle:5,1')
        ->name('api.login');

    Route::post('/logout', [LoginController::class, 'apiLogout'])
        ->name('api.logout');

    // Email Verification (public signed link + resend by email)
    Route::get('/email/verify/{id}/{hash}', function (Request $request, int $id, string $hash) {
        $user = User::findOrFail($id);

        if (! hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return response()->json([
                'message' => 'El enlace de verificación no es válido.',
            ], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json([
            'message' => 'Correo verificado correctamente. Ya puedes iniciar sesión cuando el administrador active tu cuenta.',
            'verified' => true,
        ]);
    })->middleware(['signed', 'throttle:6,1'])->name('verification.verify');

    Route::post('/email/verification-notification', function (Request $request) {
        $user = $request->user();

        if (! $user) {
            $data = $request->validate([
                'email' => ['required', 'email'],
            ]);

            $user = User::where('email', $data['email'])->first();
        }

        if ($user && ! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json([
            'message' => 'Si la cuenta existe y está pendiente, enviamos un nuevo correo de verificación.',
            'resent' => true,
        ]);
    })->middleware('throttle:6,1')->name('verification.send');

    Route::get('/me', function () {
        return response()->json(auth()->user());
    })->middleware(['auth', 'verified'])->name('api.me');

    Route::middleware(['auth', 'verified'])->group(function () {
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
    });

    Route::middleware(['auth', 'verified', 'role:admin'])->group(function () {
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

Route::post('/access/rfid/validate', [RfidAccessController::class, 'validate'])
    ->middleware('throttle:60,1')
    ->name('access.rfid.validate');