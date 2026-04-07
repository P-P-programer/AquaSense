<?php

namespace App\Mail;

use App\Models\Alert;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertTriggeredMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Alert $alert)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: sprintf('[AquaSense] %s (%s)', $this->alert->title, strtoupper($this->alert->severity)),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.alerts.triggered',
            with: [
                'alert' => $this->alert,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
