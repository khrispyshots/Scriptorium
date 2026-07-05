<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agent;

class AgentController extends Controller
{
    public function index()
    {
        return response()->json(
            Agent::where('status', 'active')->orderByDesc('quality_score')->get()
        );
    }

    public function show(string $id)
    {
        return response()->json(Agent::findOrFail($id));
    }
}
