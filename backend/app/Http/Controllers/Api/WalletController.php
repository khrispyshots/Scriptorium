<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Withdrawal;
use App\Services\Funding\OnboardingFunder;
use App\Services\Wallet\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use RuntimeException;

class WalletController extends Controller
{
    public function __construct(
        private WalletService $wallets,
        private \App\Services\Auth\OtpService $otp,
        private OnboardingFunder $onboardingFunder,
    ) {
    }

    public function me(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $wallet = \App\Models\Wallet::where('user_id', $user->id)->first();

        if ($wallet) {
            return response()->json([
                'hasWallet' => true,
                'wallet' => [
                    'id' => $wallet->id,
                    'walletAddress' => $wallet->wallet_address,
                    'network' => $wallet->network,
                    'currency' => $wallet->currency,
                    'chainId' => config('wallet.network.chain_id'),
                    'networkName' => config('wallet.network.name'),
                    'explorerUrl' => config('wallet.network.explorer_url'),
                ],
                'balance' => $this->wallets->balanceFor($wallet),
            ]);
        }

        return response()->json([
            'hasWallet' => false,
            'wallet' => null,
        ]);
    }

    public function create(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'walletAddress' => 'required|string',
            'encryptedPrivateKey' => 'required|string',
            'salt' => 'required|string',
            'iv' => 'required|string',
            'kdf' => 'required|string',
            'kdfParams' => 'required|array',
            'algorithm' => 'required|string',
        ]);

        if ($request->hasAny(['privateKey', 'seedPhrase', 'mnemonic'])) {
            return response()->json(['error' => 'Raw private keys or seed phrases must never be sent to the backend.'], 400);
        }

        if (!preg_match('/^0x[a-fA-F0-9]{40}$/', $data['walletAddress'])) {
            return response()->json(['error' => 'Invalid EVM wallet address.'], 422);
        }

        $existing = \App\Models\Wallet::where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json([
                'created' => false,
                'wallet' => $existing,
                'message' => 'Wallet already exists.',
            ]);
        }

        $wallet = \Illuminate\Support\Facades\DB::transaction(function () use ($user, $data) {
            $wallet = \App\Models\Wallet::create([
                'user_id' => $user->id,
                'owner_type' => 'user',
                'wallet_provider' => 'embedded_encrypted',
                'wallet_provider_id' => (string) Str::uuid(),
                'wallet_address' => $data['walletAddress'],
                'account_type' => 'EOA',
                'network' => config('wallet.network.key', 'arc_testnet'),
                'currency' => config('wallet.network.currency_symbol', 'USDC'),
                'status' => 'active',
            ]);

            \App\Models\WalletBalance::create([
                'wallet_id' => $wallet->id,
                'available_balance' => 0,
                'pending_balance' => 0,
                'currency' => 'USDC',
            ]);

            \App\Models\WalletVault::create([
                'wallet_id' => $wallet->id,
                'user_id' => $user->id,
                'encrypted_private_key' => $data['encryptedPrivateKey'],
                'salt' => $data['salt'],
                'iv' => $data['iv'],
                'kdf' => $data['kdf'],
                'kdf_params' => $data['kdfParams'],
                'algorithm' => $data['algorithm'],
                'vault_version' => 1,
            ]);

            return $wallet;
        });

        $grantAmount = (string) config('wallet.economics.onboarding_grant_amount', '0.01');
        $grant = null;
        if (bccomp($grantAmount, '0', 6) > 0) {
            try {
                $funding = $this->onboardingFunder->fund($wallet, $grantAmount);
                $this->wallets->credit($wallet, $grantAmount, 'wallet_funding', [
                    'tx_reference' => $funding['tx_reference'] ?? null,
                    'counterparty_address' => $funding['from'] ?? null,
                ]);
                $grant = [
                    'amount' => $grantAmount,
                    'currency' => $wallet->currency,
                    'status' => 'funded',
                    'tx_reference' => $funding['tx_reference'] ?? null,
                ];
            } catch (RuntimeException $e) {
                $grant = [
                    'amount' => $grantAmount,
                    'currency' => $wallet->currency,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'created' => true,
            'wallet' => $wallet->fresh(),
            'balance' => $this->wallets->balanceFor($wallet->fresh()),
            'onboarding_grant' => $grant,
            'message' => 'Wallet created successfully.',
        ]);
    }

    public function fund(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $data = $request->validate(['amount' => 'required|numeric|min:0.01']);

        $wallet = \App\Models\Wallet::where('user_id', $user->id)->firstOrFail();
        $this->wallets->fund($wallet, (string) $data['amount']);

        return response()->json(['balance' => $this->wallets->balanceFor($wallet->fresh())]);
    }

    public function withdraw(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $data = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'recipient_address' => 'required|string',
        ]);

        $wallet = \App\Models\Wallet::where('user_id', $user->id)->firstOrFail();

        $idempotencyKey = $request->header('Idempotency-Key', (string) Str::uuid());
        if (Withdrawal::where('idempotency_key', $idempotencyKey)->exists()) {
            return response()->json(['error' => 'Duplicate request'], 409);
        }

        $withdrawal = Withdrawal::create([
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'recipient_address' => $data['recipient_address'],
            'amount' => $data['amount'],
            'idempotency_key' => $idempotencyKey,
            'status' => 'pending',
        ]);

        try {
            $result = $this->wallets->withdraw($wallet, $data['recipient_address'], (string) $data['amount']);
        } catch (RuntimeException $e) {
            $withdrawal->update(['status' => 'failed']);
            $code = $e->getMessage() === 'INSUFFICIENT_FUNDS' ? 402 : 422;

            return response()->json(['error' => $e->getMessage()], $code);
        }

        $withdrawal->update([
            'status' => 'completed',
            'tx_reference' => $result['tx_reference'] ?? null,
            'completed_at' => now(),
        ]);

        return response()->json($withdrawal);
    }

    public function requestExportOtp(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $result = $this->otp->request($user->email);

        return response()->json($result);
    }

    public function verifyExportOtp(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $data = $request->validate([
            'code' => 'required|string',
        ]);

        try {
            $this->otp->verify($user->email, $data['code']);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }

        $wallet = \App\Models\Wallet::where('user_id', $user->id)->firstOrFail();

        $session = \App\Models\WalletExportSession::create([
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'otp_verified' => true,
            'expires_at' => now()->addMinutes(5),
            'used' => false,
        ]);

        return response()->json([
            'session_id' => $session->id,
        ]);
    }

    public function getExportVault(Request $request)
    {
        $user = $request->attributes->get('auth_user');
        $sessionId = $request->query('session_id');

        if (!$sessionId) {
            return response()->json(['error' => 'MISSING_SESSION_ID'], 400);
        }

        $session = \App\Models\WalletExportSession::where('id', $sessionId)
            ->where('user_id', $user->id)
            ->where('otp_verified', true)
            ->where('expires_at', '>', now())
            ->where('used', false)
            ->first();

        if (!$session) {
            return response()->json(['error' => 'UNAUTHORIZED_OR_EXPIRED_SESSION'], 401);
        }

        $session->update(['used' => true]);

        $vault = \App\Models\WalletVault::where('wallet_id', $session->wallet_id)->firstOrFail();

        return response()->json($vault);
    }
}
