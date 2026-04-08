<?php

namespace App\Mail;

use App\Models\Alert;
use App\Models\Device;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CriticalAlertNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly Alert $alert,
        private readonly Device $device,
        private readonly User $user,
        private readonly string $location,
        private readonly string $timestamp,
        private readonly array $details,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "🚨 ALERTA CRÍTICA - {$this->alert->title} - AquaSense",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.critical-alert-notification',
            with: [
                'alert' => $this->alert,
                'device' => $this->device,
                'user' => $this->user,
                'location' => $this->location,
                'timestamp' => $this->timestamp,
                'details' => $this->details,
            ],
        );
    }
}
