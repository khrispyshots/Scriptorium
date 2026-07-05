<?php

namespace App\Services\Agents;

use App\Models\Agent;
use App\Models\AgentJob;
use App\Models\Article;
use App\Models\ArticleContributor;
use App\Models\Payment;
use App\Models\ProducerRun;
use App\Models\User;
use App\Services\Ai\AiProviderInterface;
use App\Services\Wallet\WalletService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * The "Producer Agent" from the product spec. A creator hands it a draft +
 * a list of services they want (research / edit / factcheck / summary).
 * For each service, the Producer:
 *
 *   1. Picks the best available specialist Agent for that service type.
 *   2. Issues an x402-style 402 Payment Required challenge for that agent's price.
 *   3. Pays it out of the creator's wallet (agent-to-agent payment, RFB 3).
 *   4. Runs the specialist through the configured AI provider (Gemini in
 *      production, mock locally when no API key is configured).
 *   5. Registers the agent as an article_contributor with a revenue split,
 *      so it keeps earning a cut every time the article is unlocked/tipped.
 *
 * This does NOT yet speak real x402 over HTTP to *external* agent services --
 * challenge/response happens inside one process against our own DB. The
 * shape (402 challenge payload, payment-then-retry) mirrors the real protocol.
 */
class ProducerOrchestrator
{
    private const CREATOR_BASE_SPLIT = 70; // % of future revenue that stays with the creator
    private const AGENT_POOL_SPLIT = 30;   // % split evenly across agents that contributed

    public function __construct(
        private WalletService $wallets,
        private \App\Services\Payments\PaymentService $payments,
        private AiProviderInterface $ai,
    ) {
    }

    /**
     * POST /api/producer/plan -- estimate cost without charging anything.
     */
    public function plan(User $creator, array $draft, array $requestedServices): ProducerRun
    {
        $agents = $this->pickAgentsFor($requestedServices);
        $totalCost = array_reduce($agents, fn ($carry, $agent) => bcadd($carry, (string) $agent->price, 6), '0');

        return ProducerRun::create([
            'creator_id' => $creator->id,
            'status' => 'planning',
            'plan' => [
                'requested_services' => $requestedServices,
                'agents' => collect($agents)->map(fn (Agent $a) => [
                    'agent_id' => $a->id,
                    'name' => $a->name,
                    'service_type' => $a->service_type,
                    'price' => (string) $a->price,
                ])->values()->all(),
                'draft' => $draft,
            ],
            'logs' => [],
            'total_cost' => $totalCost,
        ]);
    }

    /**
     * POST /api/producer/run -- actually execute the plan: pay every
     * specialist agent (x402 flow) and assemble the final article.
     */
    public function run(ProducerRun $run): ProducerRun
    {
        if ($run->status === 'completed') {
            return $run;
        }

        $creator = User::findOrFail($run->creator_id);
        $creatorWallet = $this->wallets->provisionWallet('user', $creator->id);
        $creatorBalance = $this->wallets->balanceFor($creatorWallet);

        if (bccomp((string) $creatorBalance->available_balance, (string) $run->total_cost, 6) < 0) {
            $run->update(['status' => 'insufficient_funds']);

            return $run;
        }

        $run->update(['status' => 'running']);
        $logs = [];
        $agentIds = collect($run->plan['agents'] ?? [])->pluck('agent_id');
        $agents = Agent::whereIn('id', $agentIds)->get()->keyBy('id');
        $jobResults = [];

        foreach ($run->plan['agents'] ?? [] as $planned) {
            $agent = $agents->get($planned['agent_id']);
            if (! $agent) {
                continue;
            }

            [$job, $agentWallet] = DB::transaction(function () use ($run, $creator, $creatorWallet, $agent) {
                $job = AgentJob::create([
                    'producer_run_id' => $run->id,
                    'specialist_agent_id' => $agent->id,
                    'service_type' => $agent->service_type,
                    'input_payload' => ['draft' => $run->plan['draft'] ?? []],
                    'price' => $agent->price,
                    'status' => 'payment_required',
                    'x402_challenge' => [
                        'x402Version' => 1,
                        'accepts' => [[
                            'scheme' => 'exact',
                            'network' => config('wallet.network.key', 'arc_testnet'),
                            'maxAmountRequired' => (string) $agent->price,
                            'resource' => "/agents/{$agent->service_type}",
                            'payTo' => optional($agent->wallet)->wallet_address,
                            'asset' => 'USDC',
                        ]],
                    ],
                ]);

                $agentWallet = $this->wallets->provisionWallet('agent', null, $agent->id);

                $payment = Payment::create([
                    'payment_type' => 'agent_payment',
                    'payer_user_id' => $creator->id,
                    'recipient_agent_id' => $agent->id,
                    'agent_job_id' => $job->id,
                    'amount' => $agent->price,
                    'currency' => 'USDC',
                    'status' => 'pending',
                ]);

                $this->wallets->debit($creatorWallet, (string) $agent->price, 'agent_payment', [
                    'related_payment_id' => $payment->id,
                ]);
                $this->wallets->credit($agentWallet, (string) $agent->price, 'agent_earning', [
                    'related_payment_id' => $payment->id,
                ]);

                $payment->update(['status' => 'completed']);
                $job->update(['payment_id' => $payment->id, 'status' => 'paid']);

                return [$job, $agentWallet];
            });

            $logs[] = "402 Payment Required -> {$agent->name} ({$agent->service_type}) wants {$agent->price} USDC";
            $logs[] = "Payment settled: {$agent->price} USDC -> {$agentWallet->wallet_address}";

            try {
                $output = $this->ai->runSpecialist($agent, $run->plan['draft'] ?? []);
            } catch (\Throwable $e) {
                $job->update(['status' => 'failed', 'output_payload' => ['error' => $e->getMessage()]]);
                $logs[] = "{$agent->name} failed {$agent->service_type} job: {$e->getMessage()}";
                $run->update(['status' => 'failed', 'logs' => $logs]);

                throw $e;
            }

            $job->update([
                'status' => 'completed',
                'output_payload' => $output,
                'completed_at' => now(),
            ]);
            $agent->increment('total_jobs');
            $agent->increment('total_earned', $agent->price);

            $jobResults[$agent->service_type] = $output;
            $logs[] = "{$agent->name} completed {$agent->service_type} job";
        }

        $article = DB::transaction(fn () => $this->assembleArticle($creator, $run, $jobResults, $agents->values()->all()));

        $run->update([
            'status' => 'completed',
            'result_article_id' => $article->id,
            'logs' => $logs,
            'completed_at' => now(),
        ]);

        return $run->fresh();
    }

    private function pickAgentsFor(array $requestedServices): array
    {
        $agents = [];
        foreach ($requestedServices as $service) {
            $agent = Agent::where('service_type', $service)->where('status', 'active')
                ->orderByDesc('quality_score')
                ->first();
            if ($agent) {
                $agents[] = $agent;
            }
        }

        return $agents;
    }

    private function assembleArticle(User $creator, ProducerRun $run, array $jobResults, array $agents): Article
    {
        $draft = $run->plan['draft'] ?? [];
        $title = $draft['title'] ?? 'Untitled Article';
        $body = $jobResults['edit']['edited_body'] ?? ($draft['body'] ?? '');
        $preview = $jobResults['summary']['preview'] ?? Str::limit(strip_tags($body), 160);

        $article = Article::create([
            'creator_id' => $creator->id,
            'title' => $title,
            'slug' => Str::slug($title) . '-' . Str::random(6),
            'preview' => $preview,
            'body' => $body,
            'category' => $draft['category'] ?? null,
            'cover_image_url' => $draft['cover_image_url'] ?? null,
            'unlock_price' => $draft['unlock_price'] ?? 0,
            'is_paid' => (float) ($draft['unlock_price'] ?? 0) > 0,
            'ai_assisted' => count($agents) > 0,
            'status' => 'published',
            'producer_run_id' => $run->id,
            'published_at' => now(),
        ]);

        ArticleContributor::create([
            'article_id' => $article->id,
            'contributor_type' => 'user',
            'contributor_id' => $creator->id,
            'role' => 'creator',
            'split_percentage' => count($agents) > 0 ? self::CREATOR_BASE_SPLIT : 100,
        ]);

        if (count($agents) > 0) {
            $perAgentSplit = round(self::AGENT_POOL_SPLIT / count($agents), 2);
            foreach ($agents as $agent) {
                ArticleContributor::create([
                    'article_id' => $article->id,
                    'contributor_type' => 'agent',
                    'contributor_id' => $agent->id,
                    'role' => $agent->service_type,
                    'split_percentage' => $perAgentSplit,
                ]);
            }
        }

        return $article;
    }
}
