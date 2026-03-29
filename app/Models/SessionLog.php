<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionLog extends Model
{
    protected $fillable = [
        'user_id',
        'ip_address',
        'user_agent',
        'browser',
        'browser_version',
        'os',
        'device_type',
        'login_at',
        'logout_at',
        'geolocation_data',
        'geo_source',
        'status',
        'session_id',
    ];

    protected $casts = [
        'login_at'         => 'datetime',
        'logout_at'        => 'datetime',
        'geolocation_data' => 'array',
    ];

    // ─── Relaciones ───────────────────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function sessionDuration(): ?string
    {
        if (! $this->logout_at) {
            return null;
        }

        $minutes = $this->login_at->diffInMinutes($this->logout_at);

        return $minutes < 60
            ? "{$minutes}m"
            : $this->login_at->diffInHours($this->logout_at) . 'h ' . ($minutes % 60) . 'm';
    }
}
