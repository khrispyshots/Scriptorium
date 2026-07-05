<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_vaults', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('wallet_id')->unique();
            $table->uuid('user_id')->unique();
            $table->text('encrypted_private_key');
            $table->text('salt');
            $table->text('iv');
            $table->string('kdf')->default('PBKDF2-SHA256');
            $table->json('kdf_params')->nullable();
            $table->string('algorithm')->default('AES-256-GCM');
            $table->integer('vault_version')->default(1);
            $table->timestamps();

            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });

        Schema::create('wallet_export_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('wallet_id');
            $table->boolean('otp_verified')->default(false);
            $table->timestamp('expires_at');
            $table->boolean('used')->default(false);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('wallet_id')->references('id')->on('wallets')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_export_sessions');
        Schema::dropIfExists('wallet_vaults');
    }
};
