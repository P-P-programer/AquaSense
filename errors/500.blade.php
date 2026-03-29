@php
    $code        = '500';
    $title       = 'Error del servidor';
    $message     = 'Algo salió mal en el servidor. Nuestro equipo ha sido notificado. Intenta de nuevo en unos minutos.';
    $backUrl     = route('login');
    $backLabel   = '← VOLVER AL INICIO';
    $accentColor = '#e05555';
@endphp
@include('errors._layout')
