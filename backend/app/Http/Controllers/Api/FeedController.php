<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use Illuminate\Http\Request;

class FeedController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            Article::where('status', 'published')
                ->with('creator:id,username,display_name,avatar_url')
                ->withCount(['unlocks', 'tips'])
                ->orderByDesc('published_at')
                ->paginate((int) $request->query('per_page', 20))
        );
    }

    public function trending(Request $request)
    {
        return response()->json(
            Article::where('status', 'published')
                ->with('creator:id,username,display_name,avatar_url')
                ->withCount(['unlocks', 'tips'])
                ->orderByDesc('view_count')
                ->limit(50)
                ->get()
        );
    }

    public function category(Request $request, string $category)
    {
        return response()->json(
            Article::where('status', 'published')
                ->where('category', $category)
                ->with('creator:id,username,display_name,avatar_url')
                ->orderByDesc('published_at')
                ->paginate((int) $request->query('per_page', 20))
        );
    }
}
