<?php
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/stats', function () {
    return [
        'total_consumo' => 1234,
        'promedio_diario' => 56,
        'alertas' => 2,
    ];
});

Route::get('/registros', function () {
    return [
        ['fecha' => '2026-03-25', 'consumo' => 50],
        ['fecha' => '2026-03-24', 'consumo' => 60],
        // ...
    ];
});