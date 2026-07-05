<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Withdrawal extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'wallet_id', 'recipient_address', 'amount', 'currency',
        'status', 'tx_reference', 'idempotency_key', 'completed_at',
    ];

    protected $casts = [
        'completed_at' => 'datetime',
    ];
}
