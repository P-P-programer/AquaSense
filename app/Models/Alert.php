<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Alert extends Model
{
    protected $fillable = [
        'device_id',
        'type',
        'severity',
        'status',
        'title',
        'message',
        'data',
        'first_triggered_at',
        'last_triggered_at',
        'triggered_count',
        'resolved_at',
        'notified_email_at',
        'notified_push_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'first_triggered_at' => 'datetime',
            'last_triggered_at' => 'datetime',
            'resolved_at' => 'datetime',
            'notified_email_at' => 'datetime',
            'notified_push_at' => 'datetime',
        ];
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
