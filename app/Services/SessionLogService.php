<?php

namespace App\Services;

use App\Contracts\SessionLogServiceInterface;
use App\Models\SessionLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SessionLogService implements SessionLogServiceInterface
{
    /**
     * Registra el inicio de sesión con todos los datos del cliente.
     */
    public function logLogin(User $user, Request $request): SessionLog
    {
        // Marcar cualquier sesión activa previa como expirada
        // (evita doble registro — la primera solicitud es la que se valida)
        SessionLog::where('user_id', $user->id)
            ->where('status', 'active')
            ->update(['status' => 'expired', 'logout_at' => now()]);

        $parsed = $this->parseUserAgent($request->userAgent() ?? '');

        return SessionLog::create([
            'user_id'          => $user->id,
            'ip_address'       => $request->ip(),
            'user_agent'       => $request->userAgent(),
            'browser'          => $parsed['browser'],
            'browser_version'  => $parsed['browser_version'],
            'os'               => $parsed['os'],
            'device_type'      => $parsed['device_type'],
            'login_at'         => now(),
            'status'           => 'active',
            'session_id'       => $request->session()->getId(),
        ]);
    }

    /**
     * Registra el cierre de sesión buscando el log activo.
     */
    public function logLogout(User $user, Request $request): void
    {
        SessionLog::where('user_id', $user->id)
            ->where('status', 'active')
            ->update([
                'status'    => 'logged_out',
                'logout_at' => now(),
            ]);
    }

    /**
     * Actualiza datos de geolocalización en una sesión existente.
     * Preparado para recibir datos del ESP32 o una API de geo.
     *
     * @param  array{lat?: float, lng?: float, city?: string, country?: string, source?: string}  $geoData
     */
    public function updateGeolocation(SessionLog $sessionLog, array $geoData, string $source = 'ip_api'): void
    {
        try {
            $sessionLog->update([
                'geolocation_data' => $geoData,
                'geo_source'       => $source,
            ]);
        } catch (\Throwable $e) {
            // El log de geo nunca debe romper el flujo principal
            Log::warning('SessionLogService: no se pudo guardar geolocalización', [
                'session_log_id' => $sessionLog->id,
                'error'          => $e->getMessage(),
            ]);
        }
    }

    // ─── Utilidades privadas ──────────────────────────────────────────────────

    /**
     * Parsea el User-Agent de forma liviana sin dependencias externas.
     * Para producción se puede reemplazar con `jenssegers/agent`.
     *
     * @return array{browser: string, browser_version: string, os: string, device_type: string}
     */
    private function parseUserAgent(string $ua): array
    {
        return [
            'browser'         => $this->detectBrowser($ua),
            'browser_version' => $this->detectBrowserVersion($ua),
            'os'              => $this->detectOS($ua),
            'device_type'     => $this->detectDeviceType($ua),
        ];
    }

    private function detectBrowser(string $ua): string
    {
        return match (true) {
            str_contains($ua, 'Edg/')     => 'Edge',
            str_contains($ua, 'OPR/')     => 'Opera',
            str_contains($ua, 'Chrome/')  => 'Chrome',
            str_contains($ua, 'Firefox/') => 'Firefox',
            str_contains($ua, 'Safari/')  => 'Safari',
            default                       => 'Unknown',
        };
    }

    private function detectBrowserVersion(string $ua): string
    {
        $patterns = [
            'Edg/'     => '/Edg\/([\d.]+)/',
            'OPR/'     => '/OPR\/([\d.]+)/',
            'Chrome/'  => '/Chrome\/([\d.]+)/',
            'Firefox/' => '/Firefox\/([\d.]+)/',
            'Safari/'  => '/Version\/([\d.]+)/',
        ];

        foreach ($patterns as $needle => $pattern) {
            if (str_contains($ua, $needle) && preg_match($pattern, $ua, $m)) {
                return $m[1];
            }
        }

        return 'Unknown';
    }

    private function detectOS(string $ua): string
    {
        return match (true) {
            str_contains($ua, 'Windows NT') => 'Windows',
            str_contains($ua, 'Mac OS X')   => 'macOS',
            str_contains($ua, 'Android')    => 'Android',
            str_contains($ua, 'iPhone')     => 'iOS',
            str_contains($ua, 'iPad')       => 'iPadOS',
            str_contains($ua, 'Linux')      => 'Linux',
            default                         => 'Unknown',
        };
    }

    private function detectDeviceType(string $ua): string
    {
        return match (true) {
            str_contains($ua, 'Mobile') || str_contains($ua, 'iPhone') => 'mobile',
            str_contains($ua, 'iPad') || str_contains($ua, 'Tablet')   => 'tablet',
            default                                                      => 'desktop',
        };
    }
}
