<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\City;
use App\Models\Device;
use App\Models\PushSubscription;
use App\Models\User;
use App\Services\AlertNotificationService;
use App\Services\WebPushService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;
use Tests\TestCase;

class PushNotificationFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_opt_in_to_push_notifications_and_check_status(): void
    {
        $user = User::factory()->create([
            'alerts_notify_push' => true,
        ]);

        $this->actingAs($user);

        $payload = [
            'endpoint' => 'https://push.example.test/endpoint-1',
            'keys' => [
                'auth' => 'auth-token',
                'p256dh' => 'p256dh-token',
            ],
        ];

        $response = $this->postJson('/api/push/subscribe', $payload);

        $response->assertCreated();
        $response->assertJsonPath('message', 'Subscription created');

        $this->assertDatabaseHas('push_subscriptions', [
            'user_id' => $user->id,
            'endpoint' => $payload['endpoint'],
            'is_admin' => false,
        ]);

        $statusResponse = $this->getJson('/api/push/status');
        $statusResponse->assertOk();
        $statusResponse->assertJsonPath('subscribed', true);
        $statusResponse->assertJsonPath('subscription_count', 1);
    }

    public function test_critical_alert_triggers_web_push_for_subscribed_user_without_hardware(): void
    {
        $city = City::create([
            'name' => 'Ibagué',
            'department' => 'Tolima',
            'country' => 'Colombia',
            'dane_code' => 73001000,
            'latitude' => 4.4388890,
            'longitude' => -75.2322220,
            'description' => 'Ciudad base del laboratorio',
        ]);

        $user = User::factory()->create([
            'role' => 'user',
            'is_active' => true,
            'alerts_notify_email' => false,
            'alerts_notify_push' => true,
        ]);

        $device = Device::create([
            'user_id' => $user->id,
            'city_id' => $city->id,
            'name' => 'ESP32 laboratorio',
            'identifier' => 'esp32-lab-001',
            'is_active' => true,
            'metadata' => [],
        ]);

        $subscription = PushSubscription::create([
            'user_id' => $user->id,
            'endpoint' => 'https://push.example.test/critical-endpoint',
            'keys' => [
                'auth' => 'auth-token',
                'p256dh' => 'p256dh-token',
            ],
            'is_admin' => false,
        ]);

        $alert = Alert::create([
            'device_id' => $device->id,
            'type' => 'ph_out_of_range',
            'severity' => 'critica',
            'status' => 'active',
            'title' => 'pH fuera de rango',
            'message' => 'El dispositivo reportó pH 9.10 fuera de rango seguro.',
            'data' => [
                'ph' => 9.1,
            ],
            'first_triggered_at' => now(),
            'last_triggered_at' => now(),
            'triggered_count' => 1,
        ]);

        $webPushService = Mockery::mock(WebPushService::class);
        $webPushService
            ->shouldReceive('sendToSubscription')
            ->once()
            ->withArgs(function ($receivedSubscription, string $title, string $body, array $options) use ($subscription, $alert, $device) {
                return $receivedSubscription->is($subscription)
                    && $title === $alert->title
                    && $body === $alert->message
                    && $options === ['tag' => "alert-{$alert->id}"];
            })
            ->andReturn(true);

        $service = new AlertNotificationService($webPushService);

        $result = $service->notify($alert->fresh(['device.user']));

        $this->assertSame(['mail' => 0, 'push' => 1], $result);
        $this->assertDatabaseHas('alerts', [
            'id' => $alert->id,
        ]);

        $this->assertNotNull(DB::table('alerts')->where('id', $alert->id)->value('notified_push_at'));
    }
}
