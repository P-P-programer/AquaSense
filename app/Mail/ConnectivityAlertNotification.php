<?php

namespace App\Mail;

use App\Models\Device;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ConnectivityAlertNotification extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly Device $device,
        private readonly string $offlineSince,
        private readonly bool $debugMode,
        private readonly string $suggestion,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->debugMode 
                ? "⚠️ [DEBUG] Dispositivo Desconectado - {$this->device->name} - AquaSense"
                : "⚠️ Dispositivo Desconectado - {$this->device->name} - AquaSense",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.connectivity-alert-notification',
            with: [
                'device' => $this->device,
                'offlineSince' => $this->offlineSince,
                'debugMode' => $this->debugMode,
                'suggestion' => $this->suggestion,
            ],
        );
    }
}
