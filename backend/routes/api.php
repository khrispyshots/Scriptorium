<?php

use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\ArticleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BadgeController;
use App\Http\Controllers\Api\EarningsController;
use App\Http\Controllers\Api\FeedController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\LeaderboardController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProducerController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\TipController;
use App\Http\Controllers\Api\UnlockController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WalletController;
use Illuminate\Support\Facades\Route;

// --- Public ---
Route::post('/auth/signup', [AuthController::class, 'requestOtp']); // alias, same flow as login
Route::post('/auth/request-otp', [AuthController::class, 'requestOtp']);
Route::post('/auth/login', [AuthController::class, 'verifyOtp']);
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
Route::post('/auth/verify-pin', [AuthController::class, 'verifyPin']);
Route::post('/auth/forgot-pin', [AuthController::class, 'forgotPin']);
Route::post('/auth/reset-pin', [AuthController::class, 'resetPin']);

Route::get('/feed', [FeedController::class, 'index']);
Route::get('/feed/trending', [FeedController::class, 'trending']);
Route::get('/feed/category/{category}', [FeedController::class, 'category']);

Route::get('/users/{username}', [UserController::class, 'show']);
Route::get('/articles/{slug}', [ArticleController::class, 'show']);
Route::get('/agents', [AgentController::class, 'index']);
Route::get('/agents/{id}', [AgentController::class, 'show']);
Route::get('/leaderboard', [LeaderboardController::class, 'index']);
Route::get('/badges', [BadgeController::class, 'index']);
Route::get('/follow/{userId}/followers', [FollowController::class, 'followers']);
Route::get('/follow/{userId}/following', [FollowController::class, 'following']);

// --- Authenticated (Bearer JWT) ---
Route::middleware('jwt.auth')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::patch('/users/me', [UserController::class, 'updateMe']);
    Route::post('/users/set-pin', [UserController::class, 'setPin']);

    Route::post('/users/follow', [FollowController::class, 'follow']);
    Route::post('/users/unfollow', [FollowController::class, 'unfollow']);

    Route::post('/articles', [ArticleController::class, 'store']);
    Route::patch('/articles/{id}', [ArticleController::class, 'update']);
    Route::post('/articles/{id}/publish', [ArticleController::class, 'publish']);
    Route::post('/articles/publish-with-ai', [ArticleController::class, 'publishWithAi']);

    Route::post('/articles/{id}/unlock', [UnlockController::class, 'unlock']);
    Route::get('/articles/{id}/access', [UnlockController::class, 'access']);
    Route::post('/articles/{id}/tip', [TipController::class, 'tip']);

    Route::post('/producer/plan', [ProducerController::class, 'plan']);
    Route::post('/producer/run/{id}', [ProducerController::class, 'run']);
    Route::get('/producer/runs/{id}', [ProducerController::class, 'show']);

    Route::get('/payments/{id}', [PaymentController::class, 'show']);
    Route::get('/payments/user/{id}', [PaymentController::class, 'byUser']);
    Route::get('/payments/article/{id}', [PaymentController::class, 'byArticle']);

    Route::get('/wallet/me', [WalletController::class, 'me']);
    Route::post('/wallet/create', [WalletController::class, 'create']);
    Route::post('/wallet/fund', [WalletController::class, 'fund']);
    Route::post('/wallet/withdraw', [WalletController::class, 'withdraw']);
    Route::post('/wallet/export/request-otp', [WalletController::class, 'requestExportOtp']);
    Route::post('/wallet/export/verify-otp', [WalletController::class, 'verifyExportOtp']);
    Route::get('/wallet/export/vault', [WalletController::class, 'getExportVault']);

    Route::get('/referrals/me', [ReferralController::class, 'me']);
    Route::post('/referrals/claim', [ReferralController::class, 'claim']);
    Route::get('/referrals/rewards', [ReferralController::class, 'rewards']);

    Route::get('/badges/me', [BadgeController::class, 'me']);
    Route::post('/badges/evaluate', [BadgeController::class, 'evaluate']);

    Route::get('/earnings/me', [EarningsController::class, 'me']);
    Route::get('/earnings/articles/{id}', [EarningsController::class, 'article']);
    Route::get('/earnings/agents/{id}', [EarningsController::class, 'agent']);
});
