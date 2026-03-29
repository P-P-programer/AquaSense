@php
    $code        = '419';
    $title       = 'Sesión expirada';
    $message     = 'Tu sesión ha expirado por inactividad. Por seguridad, recarga la página e intenta de nuevo.';
    $backUrl     = route('login');
    $backLabel   = '← RECARGAR';
    $accentColor = '#c8882c';
@endphp
@include('errors._layout')
