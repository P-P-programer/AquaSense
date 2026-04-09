<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SurveyResponse extends Model
{
    protected $fillable = [
        'full_name',
        'document_id',
        'selected_city',
        'education_level',
        'latitude',
        'longitude',
        'notifications_enabled',
        'geocoded_city',
        'country',
        'address',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'notifications_enabled' => 'boolean',
            'meta' => 'array',
        ];
    }
}
