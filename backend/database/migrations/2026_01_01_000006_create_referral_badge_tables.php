<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referrals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('referrer_user_id');
            $table->uuid('referred_user_id')->unique();
            $table->enum('status', ['pending', 'active'])->default('pending');
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('referrer_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('referred_user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('referral_rewards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('referral_id');
            $table->uuid('source_payment_id')->nullable();
            $table->uuid('referrer_user_id');
            $table->decimal('amount', 18, 6);
            $table->enum('status', ['pending', 'completed', 'failed'])->default('completed');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('referral_id')->references('id')->on('referrals')->cascadeOnDelete();
            $table->foreign('source_payment_id')->references('id')->on('payments')->nullOnDelete();
            $table->foreign('referrer_user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('badges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->string('category');
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        Schema::create('user_badges', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('badge_id');
            $table->timestamp('awarded_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('badge_id')->references('id')->on('badges')->cascadeOnDelete();
            $table->unique(['user_id', 'badge_id']);
        });

        Schema::create('badge_progress', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('badge_id');
            $table->decimal('progress', 10, 2)->default(0);
            $table->decimal('target', 10, 2);
            $table->timestamp('updated_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('badge_id')->references('id')->on('badges')->cascadeOnDelete();
            $table->unique(['user_id', 'badge_id']);
        });

        Schema::create('weekly_honors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->nullable();
            $table->uuid('agent_id')->nullable();
            $table->uuid('article_id')->nullable();
            $table->string('honor_type');
            $table->string('week_label');
            $table->unsignedInteger('rank');
            $table->json('metadata')->nullable();
            $table->timestamp('awarded_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('agent_id')->references('id')->on('agents')->nullOnDelete();
            $table->foreign('article_id')->references('id')->on('articles')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('weekly_honors');
        Schema::dropIfExists('badge_progress');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('referral_rewards');
        Schema::dropIfExists('referrals');
    }
};
