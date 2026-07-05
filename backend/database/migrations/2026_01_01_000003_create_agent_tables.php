<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->enum('service_type', ['research', 'edit', 'factcheck', 'summary', 'producer']);
            $table->string('endpoint_url')->nullable();
            $table->uuid('wallet_id')->nullable();
            $table->decimal('price', 18, 6)->default(0);
            $table->decimal('quality_score', 5, 2)->default(90);
            $table->decimal('reliability_score', 5, 2)->default(95);
            $table->unsignedInteger('avg_response_ms')->default(800);
            $table->unsignedInteger('total_jobs')->default(0);
            $table->decimal('total_earned', 18, 6)->default(0);
            $table->string('rank_title')->default('Novicius');
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('wallet_id')->references('id')->on('wallets')->nullOnDelete();
        });

        Schema::create('producer_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_draft_id')->nullable();
            $table->uuid('creator_id');
            $table->enum('status', ['planning', 'running', 'completed', 'failed', 'insufficient_funds'])->default('planning');
            $table->json('plan')->nullable();
            $table->json('logs')->nullable();
            $table->decimal('total_cost', 18, 6)->default(0);
            $table->uuid('result_article_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();

            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('agent_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_id')->nullable(); // FK added once `articles` exists
            $table->uuid('producer_run_id')->nullable();
            $table->uuid('specialist_agent_id');
            $table->string('service_type');
            $table->json('input_payload')->nullable();
            $table->json('output_payload')->nullable();
            $table->decimal('price', 18, 6);
            $table->enum('status', [
                'pending_payment', 'payment_required', 'paid', 'running', 'completed', 'failed',
            ])->default('pending_payment');
            $table->uuid('payment_id')->nullable(); // FK added once `payments` exists
            $table->json('x402_challenge')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();

            $table->foreign('specialist_agent_id')->references('id')->on('agents');
            $table->foreign('producer_run_id')->references('id')->on('producer_runs')->nullOnDelete();
            $table->index('producer_run_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_jobs');
        Schema::dropIfExists('producer_runs');
        Schema::dropIfExists('agents');
    }
};
