<?php

namespace App\Services;

use App\Mail\AlertTriggeredMail;
use App\Models\Alert;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AlertNotificationService
{
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
        if (! $this->matchesGlobalMinSeverity($alert->severity, (string) config('alerts.mail_min_severity', 'alta'))) {
            return 0;
        }

        $recipients = $this->eligibleUsers($alert, true, false);

        if ($recipients->isEmpty()) {
            return 0;
        }

        foreach ($recipients as $user) {
            if (! $this->matchesUserMinSeverity($alert->severity, (string) $user->alerts_min_severity)) {
                continue;
            }

            Mail::to($user->email)->queue(new AlertTriggeredMail($alert));
        }

        $alert->forceFill([
            'notified_email_at' => now(),
        ])->save();

        return $recipients->count();
    }

    private function notifyByPush(Alert $alert): int
    {
        if (! $this->matchesGlobalMinSeverity($alert->severity, (string) config('alerts.push_min_severity', 'critica'))) {
            return 0;
        }

        $recipients = $this->eligibleUsers($alert, false, true);

        if ($recipients->isEmpty()) {
            return 0;
        }

        // Placeholder de canal push: deja trazabilidad y marca de envío.
        Log::info('AquaSense push notification pending implementation (web push provider)', [
            'alert_id' => $alert->id,
            'severity' => $alert->severity,
            'recipients' => $recipients->pluck('id')->all(),
        ]);

        $alert->forceFill([
            'notified_push_at' => now(),
        ])->save();

        return $recipients->count();
    }

    /**
     * @return Collection<int, User>
     */
    private function eligibleUsers(Alert $alert, bool $forEmail, bool $forPush): Collection
    {
        $query = User::query()
            ->where('is_active', true)
            ->where(function ($q) use ($alert) {
                $q->where('role', 'admin')
                    ->orWhere('id', $alert->device?->user_id);
            });

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
