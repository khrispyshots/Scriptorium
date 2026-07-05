<?php

return [
    'provider' => env('AI_PROVIDER', 'mock'),

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.0-flash'),
        'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
        'timeout' => env('GEMINI_TIMEOUT_SECONDS', 45),
        'temperature' => env('GEMINI_TEMPERATURE', 0.7),
        'max_output_tokens' => env('GEMINI_MAX_OUTPUT_TOKENS', 2048),
    ],
];
