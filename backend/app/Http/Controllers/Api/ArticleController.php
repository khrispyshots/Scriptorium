<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\ArticleContributor;
use App\Services\Agents\ProducerOrchestrator;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ArticleController extends Controller
{
    public function __construct(private ProducerOrchestrator $producer)
    {
    }

    public function store(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'title' => 'required|string|max:200',
            'body' => 'required|string',
            'preview' => 'nullable|string',
            'category' => 'nullable|string',
            'cover_image_url' => 'nullable|string',
            'unlock_price' => 'nullable|numeric|min:0',
        ]);

        $article = Article::create(array_merge($data, [
            'creator_id' => $user->id,
            'slug' => Str::slug($data['title']) . '-' . Str::random(6),
            'is_paid' => ($data['unlock_price'] ?? 0) > 0,
            'status' => 'draft',
        ]));

        return response()->json($article, 201);
    }

    public function show(string $slug)
    {
        $article = Article::where('slug', $slug)
            ->with(['creator:id,username,display_name,avatar_url', 'contributors'])
            ->firstOrFail();

        $article->increment('view_count');

        return response()->json($article);
    }

    public function update(Request $request, string $id)
    {
        $user = $request->attributes->get('auth_user');
        $article = Article::where('id', $id)->where('creator_id', $user->id)->firstOrFail();

        $data = $request->validate([
            'title' => 'sometimes|string|max:200',
            'body' => 'sometimes|string',
            'preview' => 'sometimes|nullable|string',
            'category' => 'sometimes|nullable|string',
            'cover_image_url' => 'sometimes|nullable|string',
            'unlock_price' => 'sometimes|numeric|min:0',
        ]);

        $article->fill($data);
        if (array_key_exists('unlock_price', $data)) {
            $article->is_paid = $data['unlock_price'] > 0;
        }
        $article->save();

        return response()->json($article);
    }

    public function publish(Request $request, string $id)
    {
        $user = $request->attributes->get('auth_user');
        $article = Article::where('id', $id)->where('creator_id', $user->id)->firstOrFail();

        $article->update(['status' => 'published', 'published_at' => now()]);

        ArticleContributor::firstOrCreate([
            'article_id' => $article->id,
            'contributor_type' => 'user',
            'contributor_id' => $user->id,
        ], [
            'role' => 'creator',
            'split_percentage' => 100,
        ]);

        return response()->json($article);
    }

    /**
     * The "Publish with AI" button: hands the draft to the Producer Agent,
     * which pays and runs the requested specialist agents (x402 flow) and
     * publishes the resulting article.
     */
    public function publishWithAi(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'title' => 'required|string|max:200',
            'body' => 'required|string',
            'category' => 'nullable|string',
            'cover_image_url' => 'nullable|string',
            'unlock_price' => 'nullable|numeric|min:0',
            'services' => 'required|array|min:1',
            'services.*' => 'in:research,edit,factcheck,summary',
        ]);

        $run = $this->producer->plan($user, $data, $data['services']);
        $run = $this->producer->run($run);

        if ($run->status === 'insufficient_funds') {
            return response()->json([
                'error' => 'INSUFFICIENT_FUNDS',
                'message' => 'Not enough USDC in your wallet to pay the requested agents.',
                'total_cost' => $run->total_cost,
                'run' => $run,
            ], 402);
        }

        return response()->json([
            'run' => $run,
            'article' => $article = Article::with('contributors')->find($run->result_article_id),
        ], 201);
    }
}
