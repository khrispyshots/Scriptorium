<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class PaymentSplit extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'payment_id', 'recipient_type', 'recipient_id', 'split_percentage', 'amount', 'status',
    ];

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
