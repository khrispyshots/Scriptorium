<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Referral;
use App\Models\ReferralReward;
use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        return response()->json([
            'code' => $user->username,
            'referrals' => Referral::where('referrer_user_id', $user->id)->get(),
        ]);
    }

    public function claim(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $referral = Referral::where('referred_user_id', $user->id)->where('status', 'pending')->first();

        if (! $referral) {
            return response()->json(['error' => 'No pending referral to activate'], 422);
        }

        $referral->update(['status' => 'active', 'activated_at' => now()]);

        return response()->json($referral);
    }

    public function rewards(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        return response()->json(
            ReferralReward::where('referrer_user_id', $user->id)->orderByDesc('created_at')->get()
        );
    }
}
