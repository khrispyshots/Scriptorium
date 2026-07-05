<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follows', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('follower_id');
            $table->uuid('following_id');
            $table->enum('following_type', ['user', 'creator', 'agent']);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('follower_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['follower_id', 'following_id', 'following_type']);
            $table->index(['following_id', 'following_type']);
            // Note: MySQL does not support the "can't follow yourself" CHECK constraint used in the
            // original Postgres schema. This rule is enforced in FollowController instead.
        });

        Schema::create('leaderboard_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('category', ['creators', 'most_supported', 'agents', 'community_builders']);
            $table->enum('time_window', ['today', 'week', 'month', 'all_time']);
            $table->uuid('entity_id');
            $table->enum('entity_type', ['user', 'creator', 'agent', 'article']);
            $table->unsignedInteger('rank');
            $table->decimal('score', 18, 6)->default(0);
            $table->json('metrics')->nullable();
            $table->timestamp('calculated_at')->useCurrent();

            $table->index(['category', 'time_window', 'rank']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaderboard_snapshots');
        Schema::dropIfExists('follows');
    }
};
