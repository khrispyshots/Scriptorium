<?php

namespace App\Services\Ai;

use App\Models\Agent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class GeminiAiProvider implements AiProviderInterface
{
    public function runSpecialist(Agent $agent, array $draft): array
    {
        $text = $this->generate($this->systemInstruction($agent), $this->prompt($agent, $draft));

        return match ($agent->service_type) {
            'research' => ['notes' => trim($text)],
            'edit' => ['edited_body' => trim($text)],
            'factcheck' => [
                'verified' => ! Str::contains(Str::lower($text), ['false', 'unsupported', 'needs review', 'flag']),
                'flags' => $this->extractFlags($text),
                'report' => trim($text),
            ],
            'summary' => ['preview' => Str::limit(trim(strip_tags($text)), 240, '')],
            default => ['note' => trim($text)],
        };
    }

    private function generate(string $systemInstruction, string $prompt): string
    {
        $apiKey = (string) config('ai.gemini.api_key');
        if (blank($apiKey)) {
            throw new RuntimeException('GEMINI_API_KEY is not configured.');
        }

        $baseUrl = rtrim((string) config('ai.gemini.base_url'), '/');
        $model = (string) config('ai.gemini.model', 'gemini-2.0-flash');
        $timeout = (int) config('ai.gemini.timeout', 45);

        $response = Http::timeout($timeout)
            ->acceptJson()
            ->asJson()
            ->post("{$baseUrl}/models/{$model}:generateContent?key={$apiKey}", [
                'systemInstruction' => [
                    'parts' => [
                        ['text' => $systemInstruction],
                    ],
                ],
                'contents' => [[
                    'role' => 'user',
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ]],
                'generationConfig' => [
                    'temperature' => (float) config('ai.gemini.temperature', 0.7),
                    'maxOutputTokens' => (int) config('ai.gemini.max_output_tokens', 2048),
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini request failed: ' . Str::limit($response->body(), 500));
        }

        $parts = data_get($response->json(), 'candidates.0.content.parts', []);
        $text = collect($parts)->pluck('text')->filter()->implode("\n");

        if (blank($text)) {
            throw new RuntimeException('Gemini returned an empty response.');
        }

        return $text;
    }

    private function systemInstruction(Agent $agent): string
    {
        return match ($agent->service_type) {
            'research' => 'You are Scriptorium Researcher, a careful research assistant for a publishing platform. Produce concise background notes, useful angles, caveats, and possible sources to verify. Do not invent citations.',
            'edit' => 'You are Scriptorium Editor, a senior editorial assistant. Rewrite the draft into a polished article while preserving the author voice. Return only the final article body.',
            'factcheck' => 'You are Veritas Fact-Checker. Review claims for unsupported assertions, internal contradictions, and risky wording. Return a concise report. Use clear flags when something needs review.',
            'summary' => 'You are Brevis Summarizer. Write a compelling article preview in one or two sentences. Return only the preview.',
            default => 'You are a helpful publishing assistant for Scriptorium.',
        };
    }

    private function prompt(Agent $agent, array $draft): string
    {
        $title = $draft['title'] ?? 'Untitled';
        $category = $draft['category'] ?? 'General';
        $body = $draft['body'] ?? '';

        return match ($agent->service_type) {
            'research' => "Article title: {$title}\nCategory: {$category}\nDraft:\n{$body}\n\nProduce research notes that can improve this article.",
            'edit' => "Article title: {$title}\nCategory: {$category}\nDraft:\n{$body}\n\nRewrite this into a publishable article body.",
            'factcheck' => "Article title: {$title}\nCategory: {$category}\nDraft:\n{$body}\n\nFact-check this draft. List any claims that need verification.",
            'summary' => "Article title: {$title}\nCategory: {$category}\nDraft:\n{$body}\n\nWrite a short paid-feed preview that does not spoil the full article.",
            default => "Article title: {$title}\nCategory: {$category}\nDraft:\n{$body}",
        };
    }

    private function extractFlags(string $text): array
    {
        return collect(preg_split('/\R+/', $text))
            ->map(fn ($line) => trim($line, " \t\n\r\0\x0B-*•"))
            ->filter(fn ($line) => Str::contains(Str::lower($line), ['flag', 'verify', 'unsupported', 'unclear', 'needs review']))
            ->values()
            ->all();
    }
}
