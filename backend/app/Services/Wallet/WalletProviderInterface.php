<?php

namespace App\Services\Wallet;

/**
 * Abstraction over "who actually issues wallets and moves USDC".
 *
 * MockWalletProvider (default) keeps everything inside our own Postgres/MySQL
 * ledger with fake addresses -- no external credentials needed, safe for demos.
 *
 * CircleWalletProvider calls the real Circle User-Controlled Wallets API once
 * CIRCLE_API_KEY etc. are supplied in .env and WALLET_PROVIDER=circle.
 *
 * Swapping providers should never require touching a controller -- only
 * config/wallet.php.
 */
interface WalletProviderInterface
{
    /**
     * Create a new wallet for a user or agent. Returns an array with at
     * least: provider, provider_id (nullable), address, account_type, network.
     */
    public function createWallet(string $ownerType, ?string $ownerId): array;

    /**
     * Fund a wallet from an external/test source (e.g. Circle testnet faucet,
     * or in mock mode, simply credit the ledger).
     */
    public function fundWallet(string $walletAddress, string $amount, string $currency = 'USDC'): array;

    /**
     * Move funds between two wallet addresses we manage. Returns a tx reference.
     */
    public function transfer(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array;

    /**
     * Send funds out to an external address (withdrawal).
     */
    public function withdraw(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array;
}
