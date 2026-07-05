<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create the users table structure
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->unique();
            $table->string('username')->unique();
            $table->string('display_name');
            $table->string('avatar_url')->nullable();
            $table->enum('role', ['user', 'creator', 'admin'])->default('user');
            $table->uuid('referred_by')->nullable();
            $table->enum('status', ['active', 'suspended'])->default('active');
            $table->boolean('onboarding_complete')->default(false);
            
            // 👇 Placed password field and remember token directly here
            $table->string('password')->nullable();
            $table->rememberToken();
            
            $table->timestamps();
        });

        // 2. Attach self-referencing constraint safely for Postgres
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('referred_by')->references('id')->on('users')->nullOnDelete();
        });

        // 3. Create creator profiles table
        Schema::create('creator_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->text('bio')->nullable();
            $table->string('title_rank')->default('Civis');
            $table->string('supporter_rank')->default('Amicus');
            $table->decimal('total_earned', 18, 6)->default(0);
            $table->decimal('unlock_earned', 18, 6)->default(0);
            $table->decimal('tip_earned', 18, 6)->default(0);
            $table->decimal('referral_earned', 18, 6)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        // 4. Create OTP verification table
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('email')->index();
            $table->string('code_hash');
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedInteger('max_attempts')->default(5);
            $table->boolean('consumed')->default(false);
            $table->timestamp('expires_at');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
        Schema::dropIfExists('creator_profiles');
        
        // Remove constraint securely before wiping table dropping paths
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['referred_by']);
            });
        }
        
        Schema::dropIfExists('users');
    }
};