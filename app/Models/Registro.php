<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Registro extends Model
{
    protected $table = 'registros';

    protected $fillable = [
        'device_id',
        'captured_at',
        'ph',
        'consumo',
        'turbidez',
        'temperatura',
        'estado',
        'source',
        'power_source',
        'backup_level',
        'power_event_at',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'ph' => 'decimal:2',
            'consumo' => 'decimal:2',
            'turbidez' => 'decimal:2',
            'temperatura' => 'decimal:2',
            'backup_level' => 'decimal:2',
            'power_event_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
