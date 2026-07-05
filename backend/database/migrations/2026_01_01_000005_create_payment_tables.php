<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('payment_type', [
                'unlock', 'tip', 'agent_payment', 'referral_reward', 'withdrawal', 'wallet_funding',
            ]);
            $table->uuid('payer_user_id')->nullable();
            $table->uuid('payer_agent_id')->nullable();
            $table->uuid('recipient_user_id')->nullable();
            $table->uuid('recipient_agent_id')->nullable();
            $table->uuid('article_id')->nullable();
            $table->uuid('agent_job_id')->nullable();
            $table->decimal('amount', 18, 6);
            $table->string('currency')->default('USDC');
            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending');
            $table->string('tx_reference')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('payer_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('payer_agent_id')->references('id')->on('agents')->nullOnDelete();
            $table->foreign('recipient_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('recipient_agent_id')->references('id')->on('agents')->nullOnDelete();
            $table->foreign('article_id')->references('id')->on('articles')->nullOnDelete();
            $table->foreign('agent_job_id')->references('id')->on('agent_jobs')->nullOnDelete();
            $table->index('article_id');
        });

        Schema::table('agent_jobs', function (Blueprint $table) {
            $table->foreign('payment_id')->references('id')->on('payments')->nullOnDelete();
        });

        Schema::create('payment_splits', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payment_id');
            $table->enum('recipient_type', ['user', 'agent', 'platform']);
            $table->string('recipient_id');
            $table->decimal('split_percentage', 5, 2);
            $table->decimal('amount', 18, 6);
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('payment_id')->references('id')->on('payments')->cascadeOnDelete();
        });

        Schema::create('unlocks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_id');
            $table->uuid('user_id');
            $table->uuid('payment_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('payment_id')->references('id')->on('payments')->nullOnDelete();
            $table->unique(['article_id', 'user_id']);
        });

        Schema::create('tips', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_id');
            $table->uuid('user_id');
            $table->decimal('amount', 18, 6);
            $table->enum('destination_mode', ['entire_team', 'creator_only'])->default('entire_team');
            $table->uuid('payment_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('payment_id')->references('id')->on('payments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tips');
        Schema::dropIfExists('unlocks');
        Schema::dropIfExists('payment_splits');
        Schema::table('agent_jobs', function (Blueprint $table) {
            $table->dropForeign(['payment_id']);
        });
        Schema::dropIfExists('payments');
    }
};
