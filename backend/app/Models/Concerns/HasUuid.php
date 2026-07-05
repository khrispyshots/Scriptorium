<?php

namespace App\Models\Concerns;

use Illuminate\Support\Str;

/**
 * Every table in this app uses a UUID primary key (to match the original
 * Postgres schema this was ported from). This trait auto-generates one
 * on create and tells Eloquent the key isn't an auto-incrementing int.
 */
trait HasUuid
{
    public static function bootHasUuid(): void
    {
        static::creating(function ($model) {
            if (empty($model->{$model->getKeyName()})) {
                $model->{$model->getKeyName()} = (string) Str::uuid();
            }
        });
    }

    public function getIncrementing(): bool
    {
        return false;
    }

    public function getKeyType(): string
    {
        return 'string';
    }
}
