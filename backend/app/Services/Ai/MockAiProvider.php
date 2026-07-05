<?php

namespace App\Services\Ai;

use App\Models\Agent;
use Illuminate\Support\Str;

class MockAiProvider implements AiProviderInterface
{
    public function runSpecialist(Agent $agent, array $draft): array
    {
        $title = $draft['title'] ?? 'Untitled';

        return match ($agent->service_type) {
            'research' => ['notes' => "Background research gathered for \"{$title}\": key facts, sources, and context assembled."],
            'edit' => ['edited_body' => ($draft['body'] ?? '') . "\n\n[Copyedited for clarity and flow.]"],
            'factcheck' => ['verified' => true, 'flags' => []],
            'summary' => ['preview' => Str::limit(strip_tags($draft['body'] ?? ''), 160)],
            default => ['note' => 'No-op'],
        };
    }
}
