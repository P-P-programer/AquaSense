<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RfidCard extends Model
{
    protected $fillable = [
        'uid',
        'label',
        'is_active',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }
}