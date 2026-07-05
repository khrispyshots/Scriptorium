<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;
use App\Models\Article;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EarningsController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        return response()->json($user->creatorProfile);
    }

    public function article(string $id)
    {
        $row = DB::table('article_earnings_summary')->where('article_id', $id)->first();

        return response()->json($row ?: ['article_id' => $id, 'unlock_revenue' => 0, 'tip_revenue' => 0]);
    }

    public function agent(string $id)
    {
        $agent = Agent::findOrFail($id);

        return response()->json([
            'agent_id' => $agent->id,
            'total_jobs' => $agent->total_jobs,
            'total_earned' => $agent->total_earned,
            'quality_score' => $agent->quality_score,
            'rank_title' => $agent->rank_title,
        ]);
    }
}
