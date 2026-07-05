<?php

namespace App\Services\Auth;

use App\Mail\OtpCodeMail;
use App\Models\OtpCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use Throwable;

/**
 * Sends the real OTP email via Laravel's Mail facade (whatever MAIL_MAILER
 * is configured in .env -- smtp, resend, ses, etc.). In non-production
 * environments the code is also logged and returned in the API response as
 * a dev convenience, mirroring the frontend's old "DEMO_CODE" flow.
 */
class OtpService
{
    public function request(string $email): array
    {
        $code = (string) random_int(100000, 999999);
        $expiryMinutes = (int) config('wallet.otp.expiry_minutes', 5);

        OtpCode::create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'max_attempts' => (int) config('wallet.otp.max_attempts', 5),
            'expires_at' => now()->addMinutes($expiryMinutes),
        ]);

        $emailSent = false;
        try {
            Mail::to($email)->send(new OtpCodeMail($code, $expiryMinutes));
            $emailSent = true;
        } catch (Throwable $e) {
            // Don't let a broken mail provider break signup entirely --
            // log it loudly so it's visible in `railway logs`, and fall
            // through to the dev_code convenience below in non-production.
            Log::error("[OTP] failed to send email to {$email}: {$e->getMessage()}");
        }

        Log::info("[OTP] {$email} -> {$code}" . ($emailSent ? ' (emailed)' : ' (EMAIL FAILED -- see error above)'));

        return [
            'sent' => $emailSent,
            'dev_code' => app()->environment('production') ? null : $code,
        ];
    }

    public function verify(string $email, string $code): bool
    {
        $otp = OtpCode::where('email', $email)
            ->where('consumed', false)
            ->where('expires_at', '>', now())
            ->latest('created_at')
            ->first();

        if (! $otp) {
            throw new RuntimeException('OTP_EXPIRED_OR_NOT_FOUND');
        }

        if ($otp->attempts >= $otp->max_attempts) {
            throw new RuntimeException('OTP_MAX_ATTEMPTS_EXCEEDED');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            throw new RuntimeException('OTP_INVALID');
        }

        $otp->update(['consumed' => true]);

        return true;
    }
}
