<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class WalletVault extends Model
{
    use HasUuid;

    protected $fillable = [
        'wallet_id',
        'user_id',
        'encrypted_private_key',
        'salt',
        'iv',
        'kdf',
        'kdf_params',
        'algorithm',
        'vault_version',
    ];

    protected $casts = [
        'kdf_params' => 'array',
    ];
}
