<?php

namespace App\Services\Wallet;

use App\Models\Wallet;
use App\Models\WalletBalance;
use App\Models\WalletTransaction;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WalletService
{
    public function __construct(private WalletProviderInterface $provider)
    {
    }

    /**
     * Create a wallet + zero balance row for a user or agent. Idempotent:
     * if one already exists it's returned as-is.
     */
    public function provisionWallet(string $ownerType, ?string $userId = null, ?string $agentId = null): Wallet
    {
        $existing = $ownerType === 'agent'
            ? Wallet::where('agent_id', $agentId)->first()
            : Wallet::where('user_id', $userId)->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($ownerType, $userId, $agentId) {
            $created = $this->provider->createWallet($ownerType, $userId ?? $agentId);

            $wallet = Wallet::create([
                'user_id' => $ownerType === 'user' ? $userId : null,
                'agent_id' => $ownerType === 'agent' ? $agentId : null,
                'owner_type' => $ownerType,
                'wallet_provider' => $created['provider'],
                'wallet_provider_id' => $created['provider_id'],
                'wallet_address' => $created['address'],
                'account_type' => $created['account_type'],
                'network' => $created['network'],
                'currency' => 'USDC',
                'status' => 'active',
            ]);

            WalletBalance::create([
                'wallet_id' => $wallet->id,
                'available_balance' => 0,
                'pending_balance' => 0,
                'currency' => 'USDC',
            ]);

            return $wallet;
        });
    }

    public function balanceFor(Wallet $wallet): WalletBalance
    {
        return $wallet->balance ?? WalletBalance::create([
            'wallet_id' => $wallet->id,
            'available_balance' => 0,
            'pending_balance' => 0,
        ]);
    }

    /**
     * Credit a wallet's ledger balance and record the transaction. Does NOT
     * call the external provider -- used for internal splits that never
     * leave our own book (e.g. agent earnings, referral rewards).
     */
    public function credit(Wallet $wallet, string $amount, string $type, array $meta = []): WalletTransaction
    {
        return DB::transaction(function () use ($wallet, $amount, $type, $meta) {
            $balance = $this->balanceFor($wallet);
            $balance->available_balance = bcadd((string) $balance->available_balance, $amount, 6);
            $balance->save();

            return WalletTransaction::create(array_merge([
                'wallet_id' => $wallet->id,
                'transaction_type' => $type,
                'direction' => 'in',
                'amount' => $amount,
                'currency' => 'USDC',
                'status' => 'completed',
            ], $meta));
        });
    }

    /**
     * Debit a wallet. Throws if the available balance can't cover it --
     * callers should catch this and surface "insufficient funds" rather
     * than letting it become a 500.
     */
    public function debit(Wallet $wallet, string $amount, string $type, array $meta = []): WalletTransaction
    {
        return DB::transaction(function () use ($wallet, $amount, $type, $meta) {
            $balance = $this->balanceFor($wallet);

            if (bccomp((string) $balance->available_balance, $amount, 6) < 0) {
                throw new RuntimeException('INSUFFICIENT_FUNDS');
            }

            $balance->available_balance = bcsub((string) $balance->available_balance, $amount, 6);
            $balance->save();

            return WalletTransaction::create(array_merge([
                'wallet_id' => $wallet->id,
                'transaction_type' => $type,
                'direction' => 'out',
                'amount' => $amount,
                'currency' => 'USDC',
                'status' => 'completed',
            ], $meta));
        });
    }

    public function fund(Wallet $wallet, string $amount): void
    {
        $result = $this->provider->fundWallet($wallet->wallet_address, $amount);

        $this->credit($wallet, $amount, 'wallet_funding', [
            'tx_reference' => $result['tx_reference'] ?? null,
        ]);
    }

    public function withdraw(Wallet $wallet, string $toAddress, string $amount): array
    {
        $this->debit($wallet, $amount, 'withdrawal', ['counterparty_address' => $toAddress]);

        return $this->provider->withdraw($wallet->wallet_address, $toAddress, $amount);
    }

    public function getPrivateKey(Wallet $wallet): string
    {
        throw new RuntimeException('PRIVATE_KEY_UNAVAILABLE_SERVER_SIDE');
    }
}
