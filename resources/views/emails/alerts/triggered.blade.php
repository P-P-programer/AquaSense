<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Alerta AquaSense</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0d2b55; line-height: 1.5;">
    <h2 style="margin: 0 0 12px 0;">{{ $alert->title }}</h2>

    <p style="margin: 0 0 12px 0;">{{ $alert->message }}</p>

    <ul>
        <li><strong>Severidad:</strong> {{ strtoupper($alert->severity) }}</li>
        <li><strong>Estado:</strong> {{ strtoupper($alert->status) }}</li>
        <li><strong>Dispositivo:</strong> {{ $alert->device?->name }} ({{ $alert->device?->identifier }})</li>
        <li><strong>Último evento:</strong> {{ optional($alert->last_triggered_at)->toDateTimeString() }}</li>
        <li><strong>Repeticiones:</strong> {{ $alert->triggered_count }}</li>
    </ul>

    <p style="margin-top: 14px; color: #4b6a8a; font-size: 13px;">
        Este correo fue generado automáticamente por AquaSense.
    </p>
</body>
</html>
