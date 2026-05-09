<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportActivity extends Model
{
    protected $fillable = [
        'user_id',
        'action_type',
        'format',
        'metric',
        'granularity',
        'filters',
        'rows_count',
        'file_name',
        'file_path',
        'download_url',
        'summary_text',
        'status',
    ];

    protected $casts = [
        'filters' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
