<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class ReferralReward extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['referral_id', 'source_payment_id', 'referrer_user_id', 'amount', 'status'];
}
