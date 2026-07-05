<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'wallet_id', 'transaction_type', 'direction', 'amount', 'currency',
        'counterparty_address', 'related_article_id', 'related_payment_id',
        'status', 'tx_reference', 'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }
}
