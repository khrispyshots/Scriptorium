<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;

class ArticleContributor extends Model
{
    use HasUuid;

    public $timestamps = false;

    protected $fillable = [
        'article_id', 'contributor_type', 'contributor_id', 'role',
        'split_percentage', 'amount_earned',
    ];

    public function article()
    {
        return $this->belongsTo(Article::class);
    }
}
