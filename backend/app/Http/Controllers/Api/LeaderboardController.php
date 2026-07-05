<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaderboardSnapshot;
use Illuminate\Http\Request;

class LeaderboardController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'category' => 'required|in:creators,most_supported,agents,community_builders',
            'window' => 'nullable|in:today,week,month,all_time',
        ]);

        return response()->json(
            LeaderboardSnapshot::where('category', $data['category'])
                ->where('time_window', $data['window'] ?? 'all_time')
                ->orderBy('rank')
                ->limit(50)
                ->get()
        );
    }
}
