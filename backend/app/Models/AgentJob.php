<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class AgentJob extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'article_id', 'producer_run_id', 'specialist_agent_id', 'service_type',
        'input_payload', 'output_payload', 'price', 'status', 'payment_id',
        'x402_challenge', 'completed_at',
    ];

    protected $casts = [
        'input_payload' => 'array',
        'output_payload' => 'array',
        'x402_challenge' => 'array',
        'completed_at' => 'datetime',
    ];

    public function agent()
    {
        return $this->belongsTo(Agent::class, 'specialist_agent_id');
    }

    public function producerRun()
    {
        return $this->belongsTo(ProducerRun::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
