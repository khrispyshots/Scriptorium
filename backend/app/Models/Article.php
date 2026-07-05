<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'creator_id', 'title', 'slug', 'preview', 'body', 'category',
        'cover_image_url', 'unlock_price', 'is_paid', 'ai_assisted',
        'status', 'view_count', 'producer_run_id', 'published_at',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'ai_assisted' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'creator_id');
    }

    public function contributors()
    {
        return $this->hasMany(ArticleContributor::class);
    }

    public function comments()
    {
        return $this->hasMany(Comment::class);
    }

    public function unlocks()
    {
        return $this->hasMany(Unlock::class);
    }

    public function tips()
    {
        return $this->hasMany(Tip::class);
    }
}
