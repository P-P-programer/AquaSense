<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceLocation extends Model
{
    protected $fillable = [
        'device_id',
        'captured_at',
        'latitude',
        'longitude',
        'accuracy_m',
        'inside_expected_zone',
        'distance_to_expected_m',
        'source',
        'geo_provider',
        'city',
        'country',
        'address',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'captured_at' => 'datetime',
            'inside_expected_zone' => 'boolean',
            'meta' => 'array',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
