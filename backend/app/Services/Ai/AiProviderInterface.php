<?php

namespace App\Services\Ai;

use App\Models\Agent;

interface AiProviderInterface
{
    public function runSpecialist(Agent $agent, array $draft): array;
}
