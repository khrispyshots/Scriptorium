<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

/**
 * Sends mail via Brevo's transactional email HTTP API
 * (https://api.brevo.com/v3/smtp/email) instead of SMTP.
 *
 * Railway (and several other PaaS hosts) block outbound SMTP ports, so a
 * regular MAIL_MAILER=smtp setup silently times out there. This transport
 * makes a normal HTTPS POST request instead, which always works.
 */
class BrevoApiTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $payload = [
            'sender' => $this->formatSender($email),
            'to' => $this->formatAddresses($email->getTo()),
            'subject' => (string) $email->getSubject(),
        ];

        if ($cc = $this->formatAddresses($email->getCc())) {
            $payload['cc'] = $cc;
        }

        if ($bcc = $this->formatAddresses($email->getBcc())) {
            $payload['bcc'] = $bcc;
        }

        if ($replyTo = $this->formatAddresses($email->getReplyTo())) {
            $payload['replyTo'] = $replyTo[0];
        }

        if ($html = $email->getHtmlBody()) {
            $payload['htmlContent'] = $html;
        }

        if ($text = $email->getTextBody()) {
            $payload['textContent'] = $text;
        }

        $attachments = $this->formatAttachments($email);
        if (! empty($attachments)) {
            $payload['attachment'] = $attachments;
        }

        $maskedKey = $this->apiKey === ''
            ? '(EMPTY)'
            : substr($this->apiKey, 0, 6) . '...' . substr($this->apiKey, -4);

        Log::info('[Brevo] sending', [
            'to' => array_column($payload['to'], 'email'),
            'sender' => $payload['sender'],
            'api_key' => $maskedKey,
        ]);

        $response = Http::withHeaders([
            'api-key' => $this->apiKey,
            'accept' => 'application/json',
        ])->post('https://api.brevo.com/v3/smtp/email', $payload);

        // Always log the raw response -- Brevo can return a 2xx with a
        // messageId even when the account/sender has a problem that
        // silently drops the email (e.g. unverified sender, account still
        // under review, out of credits). The status/body here is the
        // ground truth; check it against Transactional > Logs in Brevo.
        Log::info('[Brevo] response', [
            'status' => $response->status(),
            'body' => $response->body(),
        ]);

        if ($response->failed()) {
            throw new TransportException(
                "Brevo API error ({$response->status()}): {$response->body()}"
            );
        }

        $messageId = $response->json('messageId');
        if ($messageId) {
            $message->setMessageId($messageId);
        }
    }

    private function formatSender(Email $email): array
    {
        $from = $email->getFrom()[0] ?? null;

        if (! $from) {
            throw new TransportException('Brevo transport requires a "from" address on the message.');
        }

        return array_filter([
            'email' => $from->getAddress(),
            'name' => $from->getName() ?: null,
        ]);
    }

    /**
     * @param \Symfony\Component\Mime\Address[] $addresses
     */
    private function formatAddresses(array $addresses): array
    {
        return array_map(fn ($address) => array_filter([
            'email' => $address->getAddress(),
            'name' => $address->getName() ?: null,
        ]), $addresses);
    }

    private function formatAttachments(Email $email): array
    {
        $attachments = [];

        foreach ($email->getAttachments() as $attachment) {
            $headers = $attachment->getPreparedHeaders();
            $filename = $headers->getHeaderParameter('Content-Disposition', 'filename') ?? 'attachment';

            $attachments[] = [
                'content' => base64_encode($attachment->getBody()),
                'name' => $filename,
            ];
        }

        return $attachments;
    }

    public function __toString(): string
    {
        return 'brevo+api';
    }
}
