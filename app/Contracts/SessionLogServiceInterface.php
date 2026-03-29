<?php

namespace App\Contracts;

use App\Models\SessionLog;
use App\Models\User;
use Illuminate\Http\Request;

interface SessionLogServiceInterface
{
    /**
     * Registra el inicio de sesión de un usuario.
     */
    public function logLogin(User $user, Request $request): SessionLog;

    /**
     * Registra el cierre de sesión de un usuario.
     */
    public function logLogout(User $user, Request $request): void;

    /**
     * Actualiza los datos de geolocalización de una sesión.
     * Preparado para el ESP32 / API de geolocalización.
     *
     * @param  array{lat?: float, lng?: float, city?: string, country?: string, source?: string}  $geoData
     */
    public function updateGeolocation(SessionLog $sessionLog, array $geoData, string $source = 'ip_api'): void;
}
