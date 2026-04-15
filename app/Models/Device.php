<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Device extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'identifier',
        'is_active',
        'last_seen_at',
        'last_heartbeat_at',
        'connectivity_alerts_enabled',
        'ph_safe_min',
        'ph_safe_max',
        'ph_critical_min',
        'ph_critical_max',
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
            'connectivity_alerts_enabled' => 'boolean',
            'ph_safe_min' => 'float',
            'ph_safe_max' => 'float',
            'ph_critical_min' => 'float',
            'ph_critical_max' => 'float',
            'last_seen_at' => 'datetime',
            'last_heartbeat_at' => 'datetime',
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

    public function alerts(): HasMany
    {
        return $this->hasMany(Alert::class);
    }

    public function latestLocation(): HasOne
    {
        return $this->hasOne(DeviceLocation::class)->latestOfMany('captured_at');
    }
}
