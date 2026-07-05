<?php

namespace App\Services\Wallet;

use Illuminate\Support\Str;

/**
 * Default provider. Generates syntactically valid fake 0x hex addresses and
 * fake tx hashes, and never leaves the app -- all balance movement happens
 * in WalletService/PaymentService against our own ledger tables. This lets
 * the entire product work end-to-end (including the x402 agent-payment flow)
 * with zero external setup, then get swapped for CircleWalletProvider later
 * purely via config/wallet.php.
 */
class MockWalletProvider implements WalletProviderInterface
{
    public function createWallet(string $ownerType, ?string $ownerId): array
    {
        return [
            'provider' => 'mock',
            'provider_id' => null,
            'address' => '0x' . bin2hex(random_bytes(20)),
            'account_type' => 'SCA',
            'network' => config('wallet.network.key', 'arc_testnet'),
        ];
    }

    public function fundWallet(string $walletAddress, string $amount, string $currency = 'USDC'): array
    {
        return [
            'tx_reference' => 'mock_fund_' . Str::random(16),
            'status' => 'completed',
        ];
    }

    public function transfer(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array
    {
        return [
            'tx_reference' => 'mock_tx_' . Str::random(16),
            'status' => 'completed',
        ];
    }

    public function withdraw(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array
    {
        return [
            'tx_reference' => 'mock_wd_' . Str::random(16),
            'status' => 'completed',
        ];
    }
}
