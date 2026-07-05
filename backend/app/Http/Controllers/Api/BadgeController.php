<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\BadgeProgress;
use App\Models\UserBadge;
use Illuminate\Http\Request;

class BadgeController extends Controller
{
    public function index()
    {
        return response()->json(Badge::all());
    }

    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        return response()->json([
            'earned' => UserBadge::where('user_id', $user->id)->with('badge')->get(),
            'progress' => BadgeProgress::where('user_id', $user->id)->get(),
        ]);
    }

    /**
     * Recompute badge progress/awards for the current user against simple
     * threshold rules. A cron/job should call this after payment events in
     * production; exposed here as a manual trigger for the demo.
     */
    public function evaluate(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $profile = $user->creatorProfile;

        $awarded = [];

        if ($profile && (float) $profile->total_earned >= 100) {
            $badge = Badge::firstOrCreate(
                ['name' => 'Centurion Earner'],
                ['category' => 'earnings', 'description' => 'Earned 100+ USDC total.']
            );
            $userBadge = UserBadge::firstOrCreate(['user_id' => $user->id, 'badge_id' => $badge->id]);
            $awarded[] = $userBadge;
        }

        return response()->json(['awarded' => $awarded]);
    }
}
