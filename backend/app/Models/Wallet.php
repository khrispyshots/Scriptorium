<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'agent_id', 'owner_type', 'wallet_provider', 'wallet_provider_id',
        'wallet_address', 'account_type', 'network', 'currency', 'status',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agent()
    {
        return $this->belongsTo(Agent::class);
    }

    public function balance()
    {
        return $this->hasOne(WalletBalance::class);
    }

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }
}
