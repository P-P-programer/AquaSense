<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\PasswordResetController;

// Password Setup Route (before wildcard)
Route::get('/auth/set-password/{token}', [PasswordResetController::class, 'showForm'])
    ->middleware('throttle:6,1')
    ->name('password.setup.form');


Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!api).*$');

