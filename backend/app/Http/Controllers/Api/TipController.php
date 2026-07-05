<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Article;
use App\Services\Payments\PaymentService;
use Illuminate\Http\Request;
use RuntimeException;

class TipController extends Controller
{
    public function __construct(private PaymentService $payments)
    {
    }

    public function tip(Request $request, string $id)
    {
        $user = $request->attributes->get('auth_user');
        $article = Article::findOrFail($id);

        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'destinationMode' => 'nullable|in:entire_team,creator_only',
        ]);

        try {
            $payment = $this->payments->tipArticle(
                $user,
                $article,
                (string) $data['amount'],
                $data['destinationMode'] ?? 'entire_team'
            );
        } catch (RuntimeException $e) {
            $code = $e->getMessage() === 'INSUFFICIENT_FUNDS' ? 402 : 422;

            return response()->json(['error' => $e->getMessage()], $code);
        }

        return response()->json($payment, 201);
    }
}
