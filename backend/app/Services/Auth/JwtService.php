<?php

namespace App\Services\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;

/**
 * Minimal stateless JWT auth (no Sanctum/Passport needed for an API-only
 * backend). Requires `composer require firebase/php-jwt` -- see
 * README_INTEGRATION.md.
 */
class JwtService
{
    public function issue(User $user): string
    {
        $now = time();
        $ttl = $this->ttlSeconds();

        $payload = [
            'sub' => $user->id,
            'email' => $user->email,
            'iat' => $now,
            'exp' => $now + $ttl,
        ];

        return JWT::encode($payload, config('app.key'), 'HS256');
    }

    public function verify(string $token): array
    {
        $decoded = JWT::decode($token, new Key(config('app.key'), 'HS256'));

        return (array) $decoded;
    }

    private function ttlSeconds(): int
    {
        $expr = config('wallet.jwt_expires_in', '7d');
        if (preg_match('/^(\d+)d$/', $expr, $m)) {
            return ((int) $m[1]) * 86400;
        }
        if (preg_match('/^(\d+)h$/', $expr, $m)) {
            return ((int) $m[1]) * 3600;
        }

        return 604800; // 7 days default
    }
}
