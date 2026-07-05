<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProducerRun;
use App\Services\Agents\ProducerOrchestrator;
use Illuminate\Http\Request;

class ProducerController extends Controller
{
    public function __construct(private ProducerOrchestrator $producer)
    {
    }

    public function plan(Request $request)
    {
        $user = $request->attributes->get('auth_user');

        $data = $request->validate([
            'title' => 'required|string|max:200',
            'body' => 'required|string',
            'category' => 'nullable|string',
            'services' => 'required|array|min:1',
            'services.*' => 'in:research,edit,factcheck,summary',
        ]);

        $run = $this->producer->plan($user, $data, $data['services']);

        return response()->json($run, 201);
    }

    public function run(Request $request, string $id)
    {
        $run = ProducerRun::findOrFail($id);
        $run = $this->producer->run($run);

        $status = $run->status === 'insufficient_funds' ? 402 : 200;

        return response()->json($run, $status);
    }

    public function show(string $id)
    {
        return response()->json(ProducerRun::findOrFail($id));
    }
}
