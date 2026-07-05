<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['user_id', 'type', 'title', 'body', 'read_at', 'metadata'];

    protected $casts = ['metadata' => 'array', 'read_at' => 'datetime'];
}
