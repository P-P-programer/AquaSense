<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<title>Alerta Crítica AquaSense</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0d2b55; line-height: 1.5;">
	<h2 style="margin: 0 0 12px 0;">🚨 ALERTA CRÍTICA DE SEGURIDAD</h2>
	<p style="margin: 0 0 12px 0;">Una alerta crítica ha sido disparada en tu sistema AquaSense.</p>

	<h3 style="margin: 18px 0 8px 0;">Información del Incidente</h3>
	<ul>
		<li><strong>Tipo de Alerta:</strong> {{ $details['alert_title'] }}</li>
		<li><strong>Dispositivo:</strong> {{ $device->name }} ({{ $device->identifier }})</li>
		<li><strong>Usuario:</strong> {{ $user->name }} ({{ $user->email }})</li>
		<li><strong>Token:</strong> {{ substr($device->tokens()->first()?->token_hash ?? 'N/A', 0, 16) }}...</li>
		<li><strong>Ubicación:</strong> {{ $location }}</li>
		<li><strong>Fecha/Hora:</strong> {{ $timestamp }}</li>
	</ul>

	<h3 style="margin: 18px 0 8px 0;">Detalles de la Alerta</h3>
	<p style="margin: 0 0 8px 0;"><strong>Título:</strong> {{ $details['alert_title'] }}</p>
	<p style="margin: 0 0 8px 0;"><strong>Mensaje:</strong> {{ $details['alert_message'] }}</p>

	@if($details['backup_level'] !== null)
		<p style="margin: 0 0 8px 0;"><strong>Nivel de Batería:</strong> {{ $details['backup_level'] }}%</p>
	@endif

	@if($details['time_in_backup'] !== null)
		<p style="margin: 0 0 8px 0;"><strong>Tiempo en Respaldo:</strong> {{ $details['time_in_backup'] }}</p>
	@endif

	<h3 style="margin: 18px 0 8px 0;">Acción Recomendada</h3>
	<ol>
		<li>Verifica el estado físico del dispositivo.</li>
		<li>Revisa la conexión de energía.</li>
		<li>Valida la salud del sensor.</li>
		<li>Consulta el panel de administración para más detalles.</li>
	</ol>

	<p style="margin-top: 16px;">
		<a href="{{ config('app.url') . '/admin' }}" style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Ver Panel de Control</a>
	</p>

	<p style="margin-top: 16px; color: #4b6a8a; font-size: 13px;">
		{{ config('app.name') }} - Sistema de Alertas Críticas
	</p>
</body>
</html>
