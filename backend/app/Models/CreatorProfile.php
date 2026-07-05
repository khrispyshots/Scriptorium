<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class CreatorProfile extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'user_id', 'bio', 'title_rank', 'supporter_rank',
        'total_earned', 'unlock_earned', 'tip_earned', 'referral_earned',
    ];

    protected $casts = [
        'total_earned' => 'decimal:6',
        'unlock_earned' => 'decimal:6',
        'tip_earned' => 'decimal:6',
        'referral_earned' => 'decimal:6',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
