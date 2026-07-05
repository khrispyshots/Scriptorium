<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function show(string $username)
    {
        $user = User::where('username', $username)
            ->with('creatorProfile')
            ->firstOrFail();

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'creator_profile' => $user->creatorProfile,
            'followers_count' => \App\Models\Follow::where('following_id', $user->id)
                ->where('following_type', 'user')->count(),
            'following_count' => \App\Models\Follow::where('follower_id', $user->id)->count(),
        ]);
    }

    public function updateMe(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'display_name' => 'sometimes|string|max:64',
            'avatar_url' => 'sometimes|nullable|string',
            'username' => 'sometimes|string|max:32|unique:users,username,' . $user->id,
            'bio' => 'sometimes|nullable|string|max:500',
        ]);

        $user->fill(collect($data)->except('bio')->all());
        $user->save();

        if (array_key_exists('bio', $data)) {
            $user->creatorProfile()->updateOrCreate(['user_id' => $user->id], ['bio' => $data['bio']]);
        }

        return response()->json($user->fresh('creatorProfile'));
    }

    public function setPin(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $data = $request->validate([
            'pin' => 'required|string|size:6',
        ]);

        $user->update([
            'pin_hash' => \Illuminate\Support\Facades\Hash::make($data['pin']),
        ]);

        return response()->json(['status' => 'success', 'user' => $user->fresh()]);
    }
}
