<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use Illuminate\Http\Request;

class FollowController extends Controller
{
    public function follow(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'following_id' => 'required|uuid',
            'following_type' => 'required|in:user,creator,agent',
        ]);

        if ($data['following_type'] !== 'agent' && $data['following_id'] === $user->id) {
            return response()->json(['error' => 'Cannot follow yourself'], 422);
        }

        $follow = Follow::firstOrCreate([
            'follower_id' => $user->id,
            'following_id' => $data['following_id'],
            'following_type' => $data['following_type'],
        ]);

        return response()->json($follow, 201);
    }

    public function unfollow(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'following_id' => 'required|uuid',
            'following_type' => 'required|in:user,creator,agent',
        ]);

        Follow::where('follower_id', $user->id)
            ->where('following_id', $data['following_id'])
            ->where('following_type', $data['following_type'])
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function followers(Request $request, string $userId)
    {
        return response()->json(
            Follow::where('following_id', $userId)->where('following_type', 'user')->get()
        );
    }

    public function following(Request $request, string $userId)
    {
        return response()->json(
            Follow::where('follower_id', $userId)->get()
        );
    }
}
