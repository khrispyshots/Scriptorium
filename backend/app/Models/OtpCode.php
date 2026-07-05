<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'email', 'code_hash', 'attempts', 'max_attempts', 'consumed', 'expires_at',
    ];

    protected $casts = [
        'consumed' => 'boolean',
        'expires_at' => 'datetime',
    ];
}
