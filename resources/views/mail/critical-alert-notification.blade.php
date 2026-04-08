@component('mail::message')
# 🚨 ALERTA CRÍTICA DE SEGURIDAD

Una alerta crítica ha sido disparada en tu sistema AquaSense.

## Información del Incidente

| Campo | Valor |
|-------|-------|
| **Tipo de Alerta** | {{ $details['alert_title'] }} |
| **Dispositivo** | {{ $device->name }} ({{ $device->identifier }}) |
| **Usuario** | {{ $user->name }} ({{ $user->email }}) |
| **Token** | {{ substr($device->tokens()->first()?->token_hash ?? 'N/A', 0, 16) }}... |
| **Ubicación** | {{ $location }} |
| **Fecha/Hora** | {{ $timestamp }} |

## Detalles de la Alerta

**Título:** {{ $details['alert_title'] }}

**Mensaje:** {{ $details['alert_message'] }}

@if($details['backup_level'] !== null)
**Nivel de Batería:** {{ $details['backup_level'] }}%
@endif

@if($details['time_in_backup'] !== null)
**Tiempo en Respaldo:** {{ $details['time_in_backup'] }}
@endif

## Acción Recomendada

Por favor revisa el estado del dispositivo inmediatamente. Si esto es parte de una emergencia, verifica:

1. El estado físico del dispositivo
2. La conexión de energía
3. La salud del sensor
4. Consulta el panel de administración para más detalles

---

@component('mail::button', ['url' => config('app.url') . '/admin'])
Ver Panel de Control
@endcomponent

Gracias,<br>
{{ config('app.name') }} - Sistema de Alertas Críticas
@endcomponent
