<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'alerts_notify_email',
        'alerts_notify_push',
        'alerts_min_severity',
        'ph_safe_min',
        'ph_safe_max',
        'ph_critical_min',
        'ph_critical_max',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_active'         => 'boolean',
            'alerts_notify_email' => 'boolean',
            'alerts_notify_push' => 'boolean',
            'ph_safe_min' => 'float',
            'ph_safe_max' => 'float',
            'ph_critical_min' => 'float',
            'ph_critical_max' => 'float',
        ];
    }

    // ─── Helpers de rol ───────────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    // ─── Relaciones ───────────────────────────────────────────────────────────

    public function sessionLogs()
    {
        return $this->hasMany(SessionLog::class);
    }

    public function activeSession()
    {
        return $this->hasOne(SessionLog::class)->where('status', 'active')->latest('login_at');
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function alerts(): HasManyThrough
    {
        return $this->hasManyThrough(Alert::class, Device::class);
    }
}
