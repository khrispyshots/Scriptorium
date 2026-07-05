<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Auth\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class JwtAuthenticate
{
    public function __construct(private JwtService $jwt)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = $request->header('Authorization', '');

        if (! str_starts_with($header, 'Bearer ')) {
            return response()->json(['error' => 'Missing bearer token'], 401);
        }

        try {
            $claims = $this->jwt->verify(substr($header, 7));
        } catch (Throwable $e) {
            return response()->json(['error' => 'Invalid or expired token'], 401);
        }

        $user = User::find($claims['sub'] ?? null);
        if (! $user) {
            return response()->json(['error' => 'User not found'], 401);
        }

        $request->attributes->set('auth_user', $user);

        return $next($request);
    }
}
