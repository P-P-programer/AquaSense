@component('mail::message')
# ⚠️ Dispositivo Desconectado

@if($debugMode)
**[MODO DEBUG ACTIVO]** - Esta alerta está activa solo para propósitos de desarrollo/debug.
@endif

El dispositivo **{{ $device->name }}** no ha reportado datos en los últimos minutos.

## Información del Dispositivo

| Campo | Valor |
|-------|-------|
| **Nombre** | {{ $device->name }} |
| **Identificador** | {{ $device->identifier }} |
| **Última conexión** | {{ $offlineSince }} |
| **Estado** | ❌ Desconectado |

## Sugerencia

{{ $suggestion }}

## Acciones Disponibles

- Verifica que el dispositivo tenga energía
- Comprueba la conectividad WiFi en la ubicación
- Revisa los logs del dispositivo si está disponible
- Verifica que el dispositivo no haya excedido la zona esperada

@component('mail::button', ['url' => config('app.url') . '/admin/devices/' . $device->id])
Ver Dispositivo
@endcomponent

---

Este es un mensaje automático del sistema de monitoreo de AquaSense.

@if($debugMode)
**Nota:** Si ya no necesitas estas alertas, desactívalas en el panel de configuración del dispositivo.
@endif
@endcomponent
