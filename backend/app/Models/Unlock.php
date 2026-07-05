<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Unlock extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['article_id', 'user_id', 'payment_id'];
}
