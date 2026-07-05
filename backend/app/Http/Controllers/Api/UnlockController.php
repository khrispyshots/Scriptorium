<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Models\Unlock;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;
use RuntimeException;

class UnlockController extends Controller
{
    public function __construct(private PaymentService $payments)
    {
    }

    public function unlock(Request $request, string $id)
    {
        $user = $request->attributes->get('auth_user');
        $article = Article::findOrFail($id);

        if (!$article->is_paid) {
            return response()->json(['error' => 'Article is not paid'], 422);
        }

        try {
            $payment = $this->payments->unlockArticle($user, $article, $request->header('Idempotency-Key'));
        } catch (RuntimeException $e) {
            $code = $e->getMessage() === 'INSUFFICIENT_FUNDS' ? 402 : 422;

            return response()->json(['error' => $e->getMessage()], $code);
        }

        return response()->json(['payment' => $payment, 'unlocked' => true], 201);
    }

    public function access(Request $request, string $id)
    {
        $user = $request->attributes->get('auth_user');
        $article = Article::findOrFail($id);

        $hasAccess = !$article->is_paid
            || $article->creator_id === $user->id
            || Unlock::where('article_id', $article->id)->where('user_id', $user->id)->exists();

        return response()->json(['has_access' => $hasAccess]);
    }
}
