<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class ResendVerificationNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_request_verification_email_by_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/email/verification-notification', ['email' => $user->email]);

        $response->assertOk();
        $response->assertJsonPath('resent', true);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_authenticated_user_can_request_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email_verified_at' => null,
        ]);

        $response = $this->actingAs($user)->postJson('/api/email/verification-notification');

        $response->assertOk();
        $response->assertJsonPath('resent', true);

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_resend_verification_with_nonexistent_email_keeps_generic_response_and_sends_nothing(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/email/verification-notification', [
            'email' => 'no-existe@aquasense.sbs',
        ]);

        $response->assertOk();
        $response->assertJsonPath('resent', true);
        $response->assertJsonPath('message', 'Si la cuenta existe y está pendiente, enviamos un nuevo correo de verificación.');

        Notification::assertNothingSent();
    }

    public function test_resend_verification_returns_html_for_browser_requests(): void
    {
        Notification::fake();

        $response = $this
            ->withHeaders(['Accept' => 'text/html'])
            ->post('/api/email/verification-notification', [
                'email' => 'no-existe@aquasense.sbs',
            ]);

        $response->assertOk();
        $response->assertSee('Solicitud procesada');
        $response->assertSee('Si la cuenta existe y está pendiente, enviamos un nuevo correo de verificación.');
    }
}
