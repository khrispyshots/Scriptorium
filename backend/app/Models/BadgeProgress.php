<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class BadgeProgress extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['user_id', 'badge_id', 'progress', 'target', 'updated_at'];

    protected $casts = ['updated_at' => 'datetime'];
}
