<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable()->unique();
            // agent_id FK added later once `agents` table exists (2026_01_01_000009)
            $table->uuid('agent_id')->nullable();
            $table->enum('owner_type', ['user', 'agent', 'platform'])->default('user');
            $table->string('wallet_provider')->default('mock'); // mock | circle
            $table->string('wallet_provider_id')->nullable();
            $table->string('wallet_address')->unique();
            $table->string('account_type')->default('SCA');
            $table->string('network')->default('arc_testnet');
            $table->string('currency')->default('USDC');
            $table->enum('status', ['active', 'syncing', 'needs_attention', 'suspended'])->default('active');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index('owner_type');
        });

        Schema::create('wallet_balances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wallet_id')->unique();
            $table->decimal('available_balance', 18, 6)->default(0);
            $table->decimal('pending_balance', 18, 6)->default(0);
            $table->string('currency')->default('USDC');
            $table->timestamp('last_synced_at')->useCurrent();

            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wallet_id');
            $table->enum('transaction_type', [
                'content_unlock', 'content_tip', 'creator_earning', 'agent_payment',
                'agent_earning', 'referral_reward', 'wallet_funding', 'withdrawal',
                'platform_fee', 'split_distribution', 'sponsorship',
            ]);
            $table->enum('direction', ['in', 'out']);
            $table->decimal('amount', 18, 6);
            $table->string('currency')->default('USDC');
            $table->string('counterparty_address')->nullable();
            $table->uuid('related_article_id')->nullable();
            $table->uuid('related_payment_id')->nullable();
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed');
            $table->string('tx_reference')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
            $table->index('transaction_type');
        });

        Schema::create('withdrawals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('wallet_id');
            $table->string('recipient_address');
            $table->decimal('amount', 18, 6);
            $table->string('currency')->default('USDC');
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->string('tx_reference')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
        });

        Schema::create('sponsorship_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('wallet_id')->nullable();
            $table->string('action_type');
            $table->string('policy_used');
            $table->decimal('sponsored_amount', 18, 6)->default(0);
            $table->boolean('success')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('wallet_id')->references('id')->on('wallets')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sponsorship_logs');
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallet_balances');
        Schema::dropIfExists('wallets');
    }
};
