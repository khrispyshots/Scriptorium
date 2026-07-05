<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CreatorProfile;
use App\Models\Referral;
use App\Models\User;
use App\Services\Auth\JwtService;
use App\Services\Auth\OtpService;
use App\Services\Wallet\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class AuthController extends Controller
{
    public function __construct(
        private OtpService $otp,
        private JwtService $jwt,
        private WalletService $wallets,
    ) {
    }

    public function requestOtp(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);

        $result = $this->otp->request($data['email']);

        return response()->json($result);
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'username' => 'nullable|string|max:32',
            'display_name' => 'nullable|string|max:64',
            'referral_code' => 'nullable|string',
        ]);

        try {
            $this->otp->verify($data['email'], $data['code']);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $existingUser = User::where('email', $data['email'])->first();
        if ($existingUser && ! empty($existingUser->pin_hash)) {
            return response()->json([
                'pin_required' => true,
                'email' => $data['email'],
            ]);
        }

        $user = DB::transaction(function () use ($data) {
            $user = User::where('email', $data['email'])->first();

            if (! $user) {
                $referrer = null;
                if (! empty($data['referral_code'])) {
                    $referrer = User::where('username', $data['referral_code'])->first();
                }

                $user = User::create([
                    'email' => $data['email'],
                    'username' => $data['username'] ?? ('user_' . Str::random(8)),
                    'display_name' => $data['display_name'] ?? 'New Scriptor',
                    'role' => 'user',
                    'referred_by' => $referrer?->id,
                ]);

                CreatorProfile::create(['user_id' => $user->id]);

                $this->wallets->provisionWallet('user', $user->id);

                if ($referrer) {
                    Referral::create([
                        'referrer_user_id' => $referrer->id,
                        'referred_user_id' => $user->id,
                        'status' => 'pending',
                    ]);
                }
            }

            return $user;
        });

        return response()->json([
            'token' => $this->jwt->issue($user),
            'user' => $user,
        ]);
    }

    public function verifyPin(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'pin' => 'required|string|size:6',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || empty($user->pin_hash) || ! \Illuminate\Support\Facades\Hash::check($data['pin'], $user->pin_hash)) {
            return response()->json(['error' => 'INVALID_PIN'], 401);
        }

        return response()->json([
            'token' => $this->jwt->issue($user),
            'user' => $user,
        ]);
    }

    public function forgotPin(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        $user = User::where('email', $data['email'])->first();

        if (! $user) {
            return response()->json(['error' => 'USER_NOT_FOUND'], 404);
        }

        $result = $this->otp->request($data['email']);

        return response()->json($result);
    }

    public function resetPin(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string',
            'pin' => 'required|string|size:6',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (! $user) {
            return response()->json(['error' => 'USER_NOT_FOUND'], 404);
        }

        try {
            $this->otp->verify($data['email'], $data['code']);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $user->update([
            'pin_hash' => \Illuminate\Support\Facades\Hash::make($data['pin']),
        ]);

        return response()->json([
            'token' => $this->jwt->issue($user),
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->attributes->get('auth_user'));
    }
}
