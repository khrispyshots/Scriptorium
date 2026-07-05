<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class ProducerRun extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'article_draft_id', 'creator_id', 'status', 'plan', 'logs',
        'total_cost', 'result_article_id', 'completed_at',
    ];

    protected $casts = [
        'plan' => 'array',
        'logs' => 'array',
        'completed_at' => 'datetime',
    ];

    public function jobs()
    {
        return $this->hasMany(AgentJob::class, 'producer_run_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }
}
