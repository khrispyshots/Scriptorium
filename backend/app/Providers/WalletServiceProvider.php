<?php

namespace App\Providers;

use App\Services\Wallet\CircleWalletProvider;
use App\Services\Wallet\MockWalletProvider;
use App\Services\Wallet\WalletProviderInterface;
use Illuminate\Support\ServiceProvider;

/**
 * Register this in bootstrap/providers.php (Laravel 11) --
 * see README_INTEGRATION.md step 4.
 *
 * This is the ONE place that decides mock vs real Circle wallets. Flip
 * WALLET_PROVIDER=circle in .env once you have sandbox keys; nothing else
 * in the app needs to change.
 */
class WalletServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(WalletProviderInterface::class, function () {
            return config('wallet.provider') === 'circle'
                ? new CircleWalletProvider()
                : new MockWalletProvider();
        });
    }
}
