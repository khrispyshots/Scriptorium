<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Scriptorium is fully passwordless (OTP-only auth via OtpService/JwtService).
 * The original users migration created `password` as NOT NULL with no
 * default, which is fine for a normal Laravel/Breeze app but breaks
 * User::create() here since no password is ever supplied. Make it nullable
 * so signup stops throwing a not-null constraint violation.
 *
 * Uses raw per-driver SQL rather than Blueprint::change() so it doesn't
 * require the doctrine/dbal package.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        match ($driver) {
            'pgsql' => DB::statement('ALTER TABLE users ALTER COLUMN password DROP NOT NULL'),
            'mysql', 'mariadb' => DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NULL'),
            'sqlite' => null, // SQLite doesn't enforce column-level NOT NULL changes this way; fresh dev DBs are unaffected.
            default => null,
        };
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        match ($driver) {
            'pgsql' => DB::statement("ALTER TABLE users ALTER COLUMN password SET NOT NULL"),
            'mysql', 'mariadb' => DB::statement('ALTER TABLE users MODIFY password VARCHAR(255) NOT NULL'),
            default => null,
        };
    }
};
