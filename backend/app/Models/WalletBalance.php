<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class WalletBalance extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'wallet_id', 'available_balance', 'pending_balance', 'currency', 'last_synced_at',
    ];

    protected $casts = [
        'available_balance' => 'decimal:6',
        'pending_balance' => 'decimal:6',
        'last_synced_at' => 'datetime',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
