<?php

namespace App\Services;

use App\Mail\AlertTriggeredMail;
use App\Mail\CriticalAlertNotification;
use App\Models\Alert;
use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AlertNotificationService
{
    public function __construct(private readonly WebPushService $webPushService) {}

    /**
     * @return array<string, int>
     */
    public function notify(Alert $alert): array
    {
        $mailCount = $this->notifyByEmail($alert);
        $pushCount = $this->notifyByPush($alert);

        return [
            'mail' => $mailCount,
            'push' => $pushCount,
        ];
    }

    private function notifyByEmail(Alert $alert): int
    {
        $device = $alert->device;
        $user = $device?->user;

        // CRÍTICAS: Email al admin SIEMPRE (obligatorio por seguridad)
        if ($alert->severity === 'critica' && $device && $user) {
            $admin = User::where('role', 'admin')->where('is_active', true)->first();

            if ($admin) {
                Mail::to($admin->email)->queue(
                    new CriticalAlertNotification(
                        alert: $alert,
                        device: $device,
                        user: $user,
                        location: "{$device->last_latitude}, {$device->last_longitude}",
                        timestamp: now()->format('Y-m-d H:i:s'),
                        details: [
                            'alert_type' => $alert->type,
                            'alert_title' => $alert->title,
                            'alert_message' => $alert->message,
                            'backup_level' => $alert->data['backup_level'] ?? null,
                            'time_in_backup' => $alert->data['time_in_backup'] ?? null,
                        ]
                    )
                );
            }
        }

        // Otros niveles: respectar preferencias globales y del usuario
        if (! $this->matchesGlobalMinSeverity($alert->severity, (string) config('alerts.mail_min_severity', 'alta'))) {
            $alert->forceFill(['notified_email_at' => now()])->save();
            return 1; // Contabilizar al admin
        }

        $recipients = $this->eligibleUsers($alert, true, false);

        if ($recipients->isEmpty()) {
            $alert->forceFill(['notified_email_at' => now()])->save();
            return 1; // Contabilizar al admin
        }

        foreach ($recipients as $rec) {
            if (! $this->matchesUserMinSeverity($alert->severity, (string) $rec->alerts_min_severity)) {
                continue;
            }

            Mail::to($rec->email)->queue(new AlertTriggeredMail($alert));
        }

        $alert->forceFill(['notified_email_at' => now()])->save();

        return $recipients->count() + 1; // +1 por el admin
    }

    private function notifyByPush(Alert $alert): int
    {
        if (! $this->matchesGlobalMinSeverity($alert->severity, (string) config('alerts.push_min_severity', 'critica'))) {
            return 0;
        }

        $device = $alert->device;
        $pushed = 0;

        // Web Push a Admin (críticas siempre)
        if ($alert->severity === 'critica') {
            $adminSubs = PushSubscription::where('is_admin', true)->get();
            foreach ($adminSubs as $sub) {
                if ($this->webPushService->sendToSubscription(
                    $sub,
                    "🚨 {$alert->title}",
                    "Dispositivo: {$device->name} • {$alert->message}",
                    ['requireInteraction' => true]
                )) {
                    $pushed++;
                }
            }
        }

        // Web Push a Usuario (si tiene suscripciones activas)
        if ($device->user) {
            $userSubs = PushSubscription::where('user_id', $device->user->id)
                ->where('is_admin', false)
                ->get();

            foreach ($userSubs as $sub) {
                if ($this->webPushService->sendToSubscription(
                    $sub,
                    $alert->title,
                    $alert->message,
                    ['tag' => "alert-{$alert->id}"]
                )) {
                    $pushed++;
                }
            }
        }

        Log::info('WebPush notifications sent', [
            'alert_id' => $alert->id,
            'severity' => $alert->severity,
            'count' => $pushed,
        ]);

        $alert->forceFill(['notified_push_at' => now()])->save();

        return $pushed;
    }

    /**
     * @return Collection<int, User>
     */
    private function eligibleUsers(Alert $alert, bool $forEmail, bool $forPush): Collection
    {
        $query = User::query()
            ->where('is_active', true)
            ->where('id', $alert->device?->user_id);

        if ($forEmail) {
            $query->where('alerts_notify_email', true);
        }

        if ($forPush) {
            $query->where('alerts_notify_push', true);
        }

        return $query->get();
    }

    private function matchesUserMinSeverity(string $severity, string $threshold): bool
    {
        return $this->severityRank($severity) >= $this->severityRank($threshold);
    }

    private function matchesGlobalMinSeverity(string $severity, string $threshold): bool
    {
        return $this->severityRank($severity) >= $this->severityRank($threshold);
    }

    private function severityRank(string $severity): int
    {
        return match ($severity) {
            'leve' => 1,
            'media' => 2,
            'alta' => 3,
            'critica' => 4,
            default => 0,
        };
    }
}
