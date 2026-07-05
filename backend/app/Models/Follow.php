<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Follow extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['follower_id', 'following_id', 'following_type'];
}
