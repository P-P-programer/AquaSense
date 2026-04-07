<?php

return [
    'offline_after_minutes' => (int) env('ALERT_OFFLINE_AFTER_MINUTES', 3),
    'renotify_cooldown_minutes' => (int) env('ALERT_RENOTIFY_COOLDOWN_MINUTES', 30),
    'mail_min_severity' => env('ALERT_MAIL_MIN_SEVERITY', 'alta'),
    'push_min_severity' => env('ALERT_PUSH_MIN_SEVERITY', 'critica'),
];
