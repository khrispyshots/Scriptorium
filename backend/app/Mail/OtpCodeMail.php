<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public int $expiryMinutes = 5)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Scriptorium code: {$this->code}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.otp-code',
            with: [
                'code' => $this->code,
                'expiryMinutes' => $this->expiryMinutes,
            ],
        );
    }
}
