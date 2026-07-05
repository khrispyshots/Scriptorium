<?php

namespace App\Services\Wallet;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Real implementation against Circle's User-Controlled Wallets API
 * (https://developers.circle.com/w3s/reference). Only used once
 * WALLET_PROVIDER=circle and CIRCLE_API_KEY is set in .env -- see
 * config/wallet.php.
 *
 * NOTE: this talks to Circle's *sandbox* base URL by default
 * (CIRCLE_BASE_URL). Point it at the production base URL only once you're
 * ready to move real USDC.
 */
class CircleWalletProvider implements WalletProviderInterface
{
    private string $apiKey;
    private string $baseUrl;
    private string $appId;
    private string $blockchain;

    public function __construct()
    {
        $this->apiKey = (string) config('wallet.circle.api_key');
        $this->baseUrl = rtrim((string) config('wallet.circle.base_url'), '/');
        $this->appId = (string) config('wallet.circle.app_id');
        $this->blockchain = (string) config('wallet.circle.blockchain');

        if (blank($this->apiKey) || blank($this->appId)) {
            throw new RuntimeException(
                'WALLET_PROVIDER=circle but CIRCLE_API_KEY / CIRCLE_APP_ID are not set. '.
                'Fill them in .env, or set WALLET_PROVIDER=mock to keep using the in-app ledger.'
            );
        }
    }

    private function client()
    {
        return Http::withToken($this->apiKey)
            ->baseUrl($this->baseUrl)
            ->acceptJson();
    }

    public function createWallet(string $ownerType, ?string $ownerId): array
    {
        // POST /v1/w3s/developer/wallets — creates a Smart Contract Account (SCA)
        // wallet under our app. See Circle docs for the full user-controlled flow
        // (which normally involves a PIN/passkey challenge on the client first);
        // this simplified server-initiated version is meant for the demo/hackathon.
        $idempotencyKey = (string) Str::uuid();

        $response = $this->client()->post('/v1/w3s/developer/wallets', [
            'idempotencyKey' => $idempotencyKey,
            'entitySecretCiphertext' => config('wallet.circle.entity_secret_ciphertext'),
            'blockchains' => [$this->blockchain],
            'accountType' => config('wallet.circle.account_type', 'SCA'),
            'metadata' => [[
                'name' => "{$ownerType}:{$ownerId}",
            ]],
        ])->throw()->json();

        $wallet = $response['data']['wallets'][0] ?? null;

        if (! $wallet) {
            throw new RuntimeException('Circle did not return a wallet in the response.');
        }

        return [
            'provider' => 'circle',
            'provider_id' => $wallet['id'],
            'address' => $wallet['address'],
            'account_type' => $wallet['accountType'] ?? 'SCA',
            'network' => $wallet['blockchain'] ?? $this->blockchain,
        ];
    }

    public function fundWallet(string $walletAddress, string $amount, string $currency = 'USDC'): array
    {
        // Circle sandbox exposes a testnet faucet endpoint for this
        // (POST /v1/faucet/drips). Production has no equivalent -- funding
        // there happens via on/off-ramp, not this method.
        $response = $this->client()->post('/v1/faucet/drips', [
            'address' => $walletAddress,
            'blockchain' => $this->blockchain,
            'usdc' => true,
        ])->throw()->json();

        return [
            'tx_reference' => $response['data']['txHash'] ?? null,
            'status' => 'pending',
        ];
    }

    public function transfer(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array
    {
        // POST /v1/w3s/developer/transactions/transfer
        $response = $this->client()->post('/v1/w3s/developer/transactions/transfer', [
            'idempotencyKey' => (string) Str::uuid(),
            'entitySecretCiphertext' => config('wallet.circle.entity_secret_ciphertext'),
            'sourceAddress' => $fromAddress,
            'destinationAddress' => $toAddress,
            'amounts' => [$amount],
            'tokenId' => config('wallet.circle.usdc_token_id'),
            'feeLevel' => 'MEDIUM',
        ])->throw()->json();

        return [
            'tx_reference' => $response['data']['id'] ?? null,
            'status' => 'pending',
        ];
    }

    public function withdraw(string $fromAddress, string $toAddress, string $amount, string $currency = 'USDC'): array
    {
        return $this->transfer($fromAddress, $toAddress, $amount, $currency);
    }
}
