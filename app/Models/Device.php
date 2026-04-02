<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Device extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'identifier',
        'is_active',
        'last_seen_at',
        'expected_latitude',
        'expected_longitude',
        'expected_radius_m',
        'last_latitude',
        'last_longitude',
        'last_accuracy_m',
        'last_location_at',
        'last_location_meta',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_seen_at' => 'datetime',
            'last_location_at' => 'datetime',
            'expected_latitude' => 'float',
            'expected_longitude' => 'float',
            'last_latitude' => 'float',
            'last_longitude' => 'float',
            'expected_radius_m' => 'integer',
            'last_accuracy_m' => 'integer',
            'last_location_meta' => 'array',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(DeviceToken::class);
    }

    public function registros(): HasMany
    {
        return $this->hasMany(Registro::class);
    }

    public function locations(): HasMany
    {
        return $this->hasMany(DeviceLocation::class);
    }
}
