<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('creator_id');
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('preview')->nullable();
            $table->longText('body');
            $table->string('category')->nullable();
            $table->string('cover_image_url')->nullable();
            $table->decimal('unlock_price', 18, 6)->default(0);
            $table->boolean('is_paid')->default(false);
            $table->boolean('ai_assisted')->default(false);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->unsignedInteger('view_count')->default(0);
            $table->uuid('producer_run_id')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('published_at')->nullable();

            $table->foreign('creator_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('producer_run_id')->references('id')->on('producer_runs')->nullOnDelete();
            $table->index('status');
        });

        Schema::table('agent_jobs', function (Blueprint $table) {
            $table->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
        });

        Schema::create('article_contributors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_id');
            $table->enum('contributor_type', ['user', 'agent', 'system']);
            $table->string('contributor_id'); // uuid of user/agent, or 'platform'
            $table->string('role');
            $table->decimal('split_percentage', 5, 2);
            $table->decimal('amount_earned', 18, 6)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
            $table->index('article_id');
        });

        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('article_id');
            $table->uuid('user_id');
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('article_id')->references('id')->on('articles')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
        Schema::dropIfExists('article_contributors');
        Schema::table('agent_jobs', function (Blueprint $table) {
            $table->dropForeign(['article_id']);
        });
        Schema::dropIfExists('articles');
    }
};
