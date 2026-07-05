<?php

namespace App\Services\Funding;

use App\Models\Wallet;
use RuntimeException;
use Symfony\Component\Process\Process;

class OnboardingFunder
{
    public function fund(Wallet $wallet, string $amount): array
    {
        $address = $wallet->wallet_address;
        if (! preg_match('/^0x[a-fA-F0-9]{40}$/', $address)) {
            throw new RuntimeException('INVALID_RECIPIENT_WALLET_ADDRESS');
        }

        $required = [
            'WALLET_RPC_URL' => config('wallet.network.rpc_url'),
            'USDC_ADDRESS' => config('wallet.contracts.usdc_address'),
            'ONBOARDING_FUNDER_ADDRESS' => config('wallet.economics.onboarding_funder_address'),
            'ONBOARDING_FUNDER_PRIVATE_KEY' => config('wallet.economics.onboarding_funder_private_key'),
        ];

        foreach ($required as $name => $value) {
            if (blank($value)) {
                throw new RuntimeException($name . '_NOT_CONFIGURED');
            }
        }

        $script = base_path('scripts/send-usdc-grant.mjs');
        $process = new Process(['node', $script, $address, $amount], base_path(), [
            'WALLET_RPC_URL' => $required['WALLET_RPC_URL'],
            'USDC_ADDRESS' => $required['USDC_ADDRESS'],
            'ONBOARDING_FUNDER_ADDRESS' => $required['ONBOARDING_FUNDER_ADDRESS'],
            'ONBOARDING_FUNDER_PRIVATE_KEY' => $required['ONBOARDING_FUNDER_PRIVATE_KEY'],
        ]);
        $process->setTimeout(90);
        $process->run();

        if (! $process->isSuccessful()) {
            $error = trim($process->getErrorOutput() ?: $process->getOutput());
            throw new RuntimeException($error ?: 'ONBOARDING_FUNDING_FAILED');
        }

        $result = json_decode(trim($process->getOutput()), true);
        if (! is_array($result) || ($result['status'] ?? null) !== 'completed') {
            throw new RuntimeException('ONBOARDING_FUNDING_NOT_COMPLETED');
        }

        return $result;
    }
}
