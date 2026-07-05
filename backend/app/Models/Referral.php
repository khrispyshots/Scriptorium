<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Referral extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['referrer_user_id', 'referred_user_id', 'status', 'activated_at'];

    protected $casts = ['activated_at' => 'datetime'];

    public function rewards()
    {
        return $this->hasMany(ReferralReward::class);
    }
}
