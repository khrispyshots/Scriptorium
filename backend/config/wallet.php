<?php

return [
    // "mock" runs entirely inside our own DB with fake addresses/balances
    // (default, no external creds needed). "circle" calls the real Circle
    // User-Controlled Wallets API once keys below are supplied.
    'provider' => env('WALLET_PROVIDER', 'mock'),

    'network' => [
        'name' => env('WALLET_NETWORK_NAME', 'Arc Testnet'),
        'key' => env('WALLET_NETWORK_KEY', 'arc_testnet'),
        'rpc_url' => env('WALLET_RPC_URL', 'https://rpc.testnet.arc.network'),
        'chain_id' => env('WALLET_CHAIN_ID', '5042002'),
        'currency_symbol' => env('WALLET_CURRENCY_SYMBOL', 'USDC'),
        'explorer_url' => env('WALLET_EXPLORER_URL', 'https://testnet.arcscan.app'),
    ],

    'contracts' => [
        'split_router_address' => env('SCRIPTORIUM_SPLIT_ROUTER_ADDRESS'),
        'usdc_address' => env('USDC_ADDRESS'),
        'platform_treasury' => env('PLATFORM_TREASURY'),
    ],

    'circle' => [
        'api_key' => env('CIRCLE_API_KEY'),
        'base_url' => env('CIRCLE_BASE_URL', 'https://api.circle.com'),
        'app_id' => env('CIRCLE_APP_ID'),
        'entity_secret_ciphertext' => env('CIRCLE_ENTITY_SECRET_CIPHERTEXT'),
        'account_type' => env('CIRCLE_ACCOUNT_TYPE', 'SCA'),
        'blockchain' => env('CIRCLE_BLOCKCHAIN', env('WALLET_NETWORK_KEY', 'arc_testnet')),
        'usdc_token_id' => env('CIRCLE_USDC_TOKEN_ID'),
        'paymaster_enabled' => env('CIRCLE_PAYMASTER_ENABLED', true),
    ],

    'otp' => [
        'provider' => env('OTP_PROVIDER', 'console'),
        'expiry_minutes' => env('OTP_EXPIRY_MINUTES', 5),
        'max_attempts' => env('OTP_MAX_ATTEMPTS', 5),
        'resend_cooldown_seconds' => env('OTP_RESEND_COOLDOWN_SECONDS', 30),
    ],

    'economics' => [
        'platform_fee_percent' => env('PLATFORM_FEE_PERCENT', 5),
        'referral_fee_percent' => env('REFERRAL_FEE_PERCENT', 2),
        'onboarding_grant_amount' => env('ONBOARDING_GRANT_AMOUNT', '0.01'),
        'onboarding_funder_address' => env('ONBOARDING_FUNDER_ADDRESS'),
        'onboarding_funder_private_key' => env('ONBOARDING_FUNDER_PRIVATE_KEY'),
    ],

    'jwt_expires_in' => env('JWT_EXPIRES_IN', '7d'),
];
