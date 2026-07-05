<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Factories\HasFactory; // <-- Add this import
use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    use HasUuid, HasFactory; // <-- Add HasFactory here

    public $timestamps = true;

    protected $fillable = [
        'email', 'username', 'display_name', 'avatar_url', 'role',
        'referred_by', 'status', 'onboarding_complete', 'pin_hash',
    ];

    protected $casts = [
        'onboarding_complete' => 'boolean',
    ];

    protected $hidden = ['email', 'pin_hash'];

    public function creatorProfile()
    {
        return $this->hasOne(CreatorProfile::class);
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    public function articles()
    {
        return $this->hasMany(Article::class, 'creator_id');
    }
}