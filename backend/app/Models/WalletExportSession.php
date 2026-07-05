<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class WalletExportSession extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id',
        'wallet_id',
        'otp_verified',
        'expires_at',
        'used',
    ];

    protected $casts = [
        'otp_verified' => 'boolean',
        'used' => 'boolean',
        'expires_at' => 'datetime',
    ];
}
