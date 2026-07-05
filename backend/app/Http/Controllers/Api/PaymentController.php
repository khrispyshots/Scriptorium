<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;

class PaymentController extends Controller
{
    public function show(string $id)
    {
        return response()->json(Payment::with('splits')->findOrFail($id));
    }

    public function byUser(string $userId)
    {
        return response()->json(
            Payment::with('splits')
                ->where('payer_user_id', $userId)
                ->orWhere('recipient_user_id', $userId)
                ->orderByDesc('created_at')
                ->paginate(30)
        );
    }

    public function byArticle(string $articleId)
    {
        return response()->json(
            Payment::where('article_id', $articleId)->orderByDesc('created_at')->get()
        );
    }
}
