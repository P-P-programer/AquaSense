<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Registro extends Model
{
    protected $table = 'registros';

    protected $fillable = [
        'captured_at',
        'ph',
        'consumo',
        'turbidez',
        'temperatura',
        'estado',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'ph' => 'decimal:2',
            'consumo' => 'decimal:2',
            'turbidez' => 'decimal:2',
            'temperatura' => 'decimal:2',
        ];
    }
}
