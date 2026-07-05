<?php

namespace App\Services\Payments;

use App\Models\Article;
use App\Models\ArticleContributor;
use App\Models\Payment;
use App\Models\PaymentSplit;
use App\Models\Referral;
use App\Models\ReferralReward;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PaymentService
{
    public function __construct(private WalletService $wallets)
    {
    }

    /**
     * Reader unlocks a paid article. Splits the unlock price across the
     * article's contributors (creator + any agents that worked on it,
     * per article_contributors.split_percentage), takes the platform fee,
     * and pays the referrer (if any) their cut.
     */
    public function unlockArticle(User $reader, Article $article, ?string $idempotencyKey = null): Payment
    {
        if ($article->creator_id === $reader->id) {
            throw new RuntimeException('OWNER_NO_UNLOCK_NEEDED');
        }

        return DB::transaction(function () use ($reader, $article, $idempotencyKey) {
            $readerWallet = $this->wallets->provisionWallet('user', $reader->id);

            $payment = Payment::create([
                'payment_type' => 'unlock',
                'payer_user_id' => $reader->id,
                'recipient_user_id' => $article->creator_id,
                'article_id' => $article->id,
                'amount' => $article->unlock_price,
                'currency' => 'USDC',
                'status' => 'pending',
                'idempotency_key' => $idempotencyKey,
            ]);

            $this->wallets->debit($readerWallet, (string) $article->unlock_price, 'content_unlock', [
                'related_article_id' => $article->id,
                'related_payment_id' => $payment->id,
            ]);

            $this->distributeToContributors($payment, $article, (string) $article->unlock_price, 'unlock_earned');

            $payment->update(['status' => 'completed']);

            $article->unlocks()->create([
                'user_id' => $reader->id,
                'payment_id' => $payment->id,
            ]);

            return $payment;
        });
    }

    /**
     * Reader tips an article. Either the whole team (per contributor split)
     * or the creator only, per destinationMode.
     */
    public function tipArticle(User $reader, Article $article, string $amount, string $destinationMode = 'entire_team'): Payment
    {
        return DB::transaction(function () use ($reader, $article, $amount, $destinationMode) {
            $readerWallet = $this->wallets->provisionWallet('user', $reader->id);

            $payment = Payment::create([
                'payment_type' => 'tip',
                'payer_user_id' => $reader->id,
                'recipient_user_id' => $article->creator_id,
                'article_id' => $article->id,
                'amount' => $amount,
                'currency' => 'USDC',
                'status' => 'pending',
            ]);

            $this->wallets->debit($readerWallet, $amount, 'content_tip', [
                'related_article_id' => $article->id,
                'related_payment_id' => $payment->id,
            ]);

            if ($destinationMode === 'creator_only') {
                $creatorWallet = $this->wallets->provisionWallet('user', $article->creator_id);
                $this->wallets->credit($creatorWallet, $amount, 'creator_earning', [
                    'related_article_id' => $article->id,
                    'related_payment_id' => $payment->id,
                ]);
                PaymentSplit::create([
                    'payment_id' => $payment->id,
                    'recipient_type' => 'user',
                    'recipient_id' => $article->creator_id,
                    'split_percentage' => 100,
                    'amount' => $amount,
                ]);
                $this->bumpCreatorEarnings($article->creator_id, 'tip_earned', $amount);
            } else {
                $this->distributeToContributors($payment, $article, $amount, 'tip_earned');
            }

            $payment->update(['status' => 'completed']);

            $article->tips()->create([
                'user_id' => $reader->id,
                'amount' => $amount,
                'destination_mode' => $destinationMode,
                'payment_id' => $payment->id,
            ]);

            return $payment;
        });
    }

    /**
     * Split a payment amount across an article's registered contributors
     * (article_contributors rows -- creator + any agents from the Producer
     * run), applying the platform fee and referral cut on top.
     */
    private function distributeToContributors(Payment $payment, Article $article, string $amount, string $creatorEarningBucket): void
    {
        $platformFeePercent = (string) config('wallet.economics.platform_fee_percent', 5);
        $referralFeePercent = (string) config('wallet.economics.referral_fee_percent', 2);

        $platformCut = bcmul($amount, bcdiv($platformFeePercent, '100', 6), 6);
        $remaining = bcsub($amount, $platformCut, 6);

        PaymentSplit::create([
            'payment_id' => $payment->id,
            'recipient_type' => 'platform',
            'recipient_id' => 'platform',
            'split_percentage' => $platformFeePercent,
            'amount' => $platformCut,
        ]);

        // Referral cut comes out of the platform's share, paid to whoever referred the creator.
        $referral = Referral::where('referred_user_id', $article->creator_id)->where('status', 'active')->first();
        if ($referral) {
            $referralAmount = bcmul($amount, bcdiv($referralFeePercent, '100', 6), 6);
            $referrerWallet = $this->wallets->provisionWallet('user', $referral->referrer_user_id);
            $this->wallets->credit($referrerWallet, $referralAmount, 'referral_reward', [
                'related_article_id' => $article->id,
                'related_payment_id' => $payment->id,
            ]);
            ReferralReward::create([
                'referral_id' => $referral->id,
                'source_payment_id' => $payment->id,
                'referrer_user_id' => $referral->referrer_user_id,
                'amount' => $referralAmount,
                'status' => 'completed',
            ]);
        }

        $contributors = ArticleContributor::where('article_id', $article->id)->get();

        if ($contributors->isEmpty()) {
            // No producer-run contributors recorded (e.g. non-AI article) -- 100% to creator.
            $creatorWallet = $this->wallets->provisionWallet('user', $article->creator_id);
            $this->wallets->credit($creatorWallet, $remaining, 'creator_earning', [
                'related_article_id' => $article->id,
                'related_payment_id' => $payment->id,
            ]);
            PaymentSplit::create([
                'payment_id' => $payment->id,
                'recipient_type' => 'user',
                'recipient_id' => $article->creator_id,
                'split_percentage' => bcsub('100', $platformFeePercent, 2),
                'amount' => $remaining,
            ]);
            $this->bumpCreatorEarnings($article->creator_id, $creatorEarningBucket, $remaining);

            return;
        }

        foreach ($contributors as $contributor) {
            $share = bcmul($remaining, bcdiv((string) $contributor->split_percentage, '100', 6), 6);

            if ($contributor->contributor_type === 'agent') {
                $agentWallet = Wallet::where('agent_id', $contributor->contributor_id)->first();
                if ($agentWallet) {
                    $this->wallets->credit($agentWallet, $share, 'agent_earning', [
                        'related_article_id' => $article->id,
                        'related_payment_id' => $payment->id,
                    ]);
                }
            } elseif ($contributor->contributor_type === 'user') {
                $userWallet = $this->wallets->provisionWallet('user', $contributor->contributor_id);
                $this->wallets->credit($userWallet, $share, 'creator_earning', [
                    'related_article_id' => $article->id,
                    'related_payment_id' => $payment->id,
                ]);
                $this->bumpCreatorEarnings($contributor->contributor_id, $creatorEarningBucket, $share);
            }

            PaymentSplit::create([
                'payment_id' => $payment->id,
                'recipient_type' => $contributor->contributor_type === 'agent' ? 'agent' : 'user',
                'recipient_id' => $contributor->contributor_id,
                'split_percentage' => $contributor->split_percentage,
                'amount' => $share,
            ]);

            $contributor->increment('amount_earned', $share);
        }
    }

    private function bumpCreatorEarnings(string $userId, string $bucket, string $amount): void
    {
        $profile = User::find($userId)?->creatorProfile;
        if (! $profile) {
            return;
        }
        $profile->increment($bucket, $amount);
        $profile->increment('total_earned', $amount);
    }
}
