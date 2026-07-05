<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Tip extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['article_id', 'user_id', 'amount', 'destination_mode', 'payment_id'];
}
