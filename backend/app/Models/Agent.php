<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Agent extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'name', 'service_type', 'endpoint_url', 'wallet_id', 'price',
        'quality_score', 'reliability_score', 'avg_response_ms',
        'total_jobs', 'total_earned', 'rank_title', 'status',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function jobs()
    {
        return $this->hasMany(AgentJob::class, 'specialist_agent_id');
    }
}
