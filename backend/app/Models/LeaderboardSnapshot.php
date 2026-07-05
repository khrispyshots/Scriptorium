<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class LeaderboardSnapshot extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'category', 'time_window', 'entity_id', 'entity_type', 'rank', 'score', 'metrics',
    ];

    protected $casts = ['metrics' => 'array'];
}
