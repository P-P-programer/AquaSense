<?php

return [
    'offline_after_minutes' => (int) env('ALERT_OFFLINE_AFTER_MINUTES', 3),
    'renotify_cooldown_minutes' => (int) env('ALERT_RENOTIFY_COOLDOWN_MINUTES', 30),
    'mail_min_severity' => env('ALERT_MAIL_MIN_SEVERITY', 'alta'),
    'push_min_severity' => env('ALERT_PUSH_MIN_SEVERITY', 'critica'),
    'ph' => [
        'safe_min' => (float) env('ALERT_PH_SAFE_MIN', 6.5),
        'safe_max' => (float) env('ALERT_PH_SAFE_MAX', 8.0),
        'critical_min' => (float) env('ALERT_PH_CRITICAL_MIN', 6.0),
        'critical_max' => (float) env('ALERT_PH_CRITICAL_MAX', 8.5),
    ],
];
