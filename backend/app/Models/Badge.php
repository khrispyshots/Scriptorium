<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = ['name', 'category', 'description', 'icon'];
}
