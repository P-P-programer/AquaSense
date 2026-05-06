<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportSummary extends Model
{
    protected $fillable = [
        'metric', 'entity_type', 'entity_id', 'period_start', 'period_type',
        'min', 'max', 'avg', 'median', 'count', 'peak_count', 'peaks_mean',
        'anomalies', 'metadata'
    ];

    protected $casts = [
        'anomalies' => 'array',
        'metadata' => 'array',
        'period_start' => 'datetime',
    ];
}
