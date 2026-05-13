<?php

namespace Tests\Feature\Api\Admin;

use App\Mail\SetPasswordEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ResendSetPasswordEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_resend_set_password_email_and_token_is_refreshed(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'email_verified_at' => now(),
        ]);

        $user = User::factory()->create([
            'role' => 'user',
            'email_verified_at' => now(),
            'password_reset_token' => 'old-token',
            'password_reset_expires_at' => now()->addHour(),
        ]);

        Mail::fake();

        $response = $this->actingAs($admin)->postJson("/api/admin/users/{$user->id}/resend-set-password");

        $response->assertOk();
        $response->assertJsonPath('resent', true);
        $response->assertJsonPath('message', 'Correo de establecimiento de contraseña enviado.');

        $user->refresh();

        $this->assertNotSame('old-token', $user->password_reset_token);
        $this->assertNotNull($user->password_reset_expires_at);
        $this->assertTrue($user->password_reset_expires_at->greaterThan(now()));

        Mail::assertQueued(SetPasswordEmail::class, function (SetPasswordEmail $mail) use ($user) {
            return $mail->userName === $user->name
                && $mail->resetToken === $user->password_reset_token
                && $mail->resetUrl === url("/auth/set-password/{$user->password_reset_token}");
        });
    }
}