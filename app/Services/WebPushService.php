<?php

namespace App\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Illuminate\Support\Facades\Log;

class WebPushService
{
    private ?WebPush $webPush = null;
    private bool $configured;
    private string $publicKey;
    private string $privateKey;
    private string $subject;

    public function __construct()
    {
        $this->publicKey = (string) config('webpush.vapid_public_key', '');
        $this->privateKey = (string) config('webpush.vapid_private_key', '');
        $this->subject = (string) config('webpush.vapid_subject', 'mailto:' . config('mail.from.address'));

        $this->configured = $this->publicKey !== '' && $this->privateKey !== '';

        if (! $this->configured) {
            Log::warning('WebPush: VAPID keys not configured. Push notifications will not be sent.');
        }
    }

    /**
     * Envía una notificación push a un navegador suscrito
     */
    public function sendToSubscription(
        PushSubscription $subscription,
        string $title,
        string $body,
        ?array $options = null,
    ): bool {
        if (! $this->configured || ! $this->ensureWebPushClient()) {
            Log::info('WebPush: VAPID not configured, skipping push', [
                'subscription_id' => $subscription->id,
            ]);
            return false;
        }

        try {
            $payload = json_encode([
                'title' => $title,
                'body' => $body,
                'icon' => '/icon-192.png',
                'badge' => '/icon-192.png',
                'tag' => 'aquasense-alert',
                ...(array) $options,
            ], JSON_THROW_ON_ERROR);

            $minishlinkSubscription = Subscription::create([
                'endpoint' => $subscription->endpoint,
                'keys' => [
                    'p256dh' => $subscription->keys['p256dh'] ?? '',
                    'auth' => $subscription->keys['auth'] ?? '',
                ],
            ]);

            $this->webPush->queueNotification($minishlinkSubscription, $payload);

            foreach ($this->webPush->flush() as $report) {
                if (! $report->isSuccess()) {
                    Log::warning('WebPush failed', [
                        'subscription_id' => $subscription->id,
                        'reason' => $report->getReason(),
                    ]);

                    return false;
                }
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('WebPush send failed', [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Envía notificaciones a todos los suscriptores admin.
     */
    public function sendToAllAdminSubscriptions(string $title, string $body, ?array $options = null): int
    {
        $subscriptions = PushSubscription::query()->where('is_admin', true)->get();

        $sent = 0;
        foreach ($subscriptions as $subscription) {
            if ($this->sendToSubscription($subscription, $title, $body, $options)) {
                $sent++;
            }
        }

        return $sent;
    }

    private function ensureWebPushClient(): bool
    {
        if ($this->webPush !== null) {
            return true;
        }

        try {
            $this->webPush = new WebPush([
                'VAPID' => [
                    'subject' => $this->subject,
                    'publicKey' => $this->publicKey,
                    'privateKey' => $this->privateKey,
                ],
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::warning('WebPush: invalid VAPID configuration', [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}
