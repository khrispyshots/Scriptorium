<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'payment_type', 'payer_user_id', 'payer_agent_id', 'recipient_user_id',
        'recipient_agent_id', 'article_id', 'agent_job_id', 'amount', 'currency',
        'status', 'tx_reference', 'idempotency_key',
    ];

    public function splits()
    {
        return $this->hasMany(PaymentSplit::class);
    }
}
