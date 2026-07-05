<?php

namespace App\Providers;

use App\Mail\Transport\BrevoApiTransport;
use App\Services\Ai\AiProviderInterface;
use App\Services\Ai\GeminiAiProvider;
use App\Services\Ai\MockAiProvider;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(AiProviderInterface::class, function () {
            return match (config('ai.provider', 'mock')) {
                'gemini' => new GeminiAiProvider(),
                'mock' => new MockAiProvider(),
                default => throw new RuntimeException('Unsupported AI provider: ' . config('ai.provider')),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Brevo's transactional email HTTP API, used instead of SMTP because
        // Railway blocks outbound SMTP ports. See config/mail.php "brevo" mailer.
        Mail::extend('brevo', function (array $config) {
            return new BrevoApiTransport($config['key'] ?? config('services.brevo.key'));
        });
    }
}
