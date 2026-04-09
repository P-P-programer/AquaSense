<!doctype html>
<html lang="es">
<head>
	<meta charset="utf-8">
	<title>Dispositivo Desconectado</title>
</head>
<body style="font-family: Arial, sans-serif; color: #0d2b55; line-height: 1.5;">
	<h2 style="margin: 0 0 12px 0;">⚠️ Dispositivo Desconectado</h2>

	@if($debugMode)
		<p style="margin: 0 0 12px 0; color: #b45309;"><strong>[MODO DEBUG ACTIVO]</strong> Esta alerta está activa solo para pruebas.</p>
	@endif

	<p style="margin: 0 0 12px 0;">El dispositivo <strong>{{ $device->name }}</strong> no ha reportado datos en los últimos minutos.</p>

	<h3 style="margin: 18px 0 8px 0;">Información del Dispositivo</h3>
	<ul>
		<li><strong>Nombre:</strong> {{ $device->name }}</li>
		<li><strong>Identificador:</strong> {{ $device->identifier }}</li>
		<li><strong>Última conexión:</strong> {{ $offlineSince }}</li>
		<li><strong>Estado:</strong> Desconectado</li>
	</ul>

	<h3 style="margin: 18px 0 8px 0;">Sugerencia</h3>
	<p style="margin: 0 0 12px 0;">{{ $suggestion }}</p>

	<h3 style="margin: 18px 0 8px 0;">Acciones Disponibles</h3>
	<ul>
		<li>Verifica que el dispositivo tenga energía.</li>
		<li>Comprueba la conectividad WiFi en la ubicación.</li>
		<li>Revisa los logs del dispositivo si están disponibles.</li>
		<li>Valida que no haya salido de la zona esperada.</li>
	</ul>

	<p style="margin-top: 16px;">
		<a href="{{ config('app.url') . '/admin/devices/' . $device->id }}" style="display: inline-block; background: #0ea5e9; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Ver Dispositivo</a>
	</p>

	<p style="margin-top: 16px; color: #4b6a8a; font-size: 13px;">Este es un mensaje automático del sistema de monitoreo de AquaSense.</p>

	@if($debugMode)
		<p style="margin-top: 8px; color: #b45309; font-size: 13px;"><strong>Nota:</strong> Si ya no necesitas estas alertas, desactívalas en el panel.</p>
	@endif
</body>
</html>
