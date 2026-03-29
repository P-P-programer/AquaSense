@php
    $code        = '429';
    $title       = 'Demasiados intentos';
    $message     = 'Has superado el número de intentos permitidos. Espera un momento antes de volver a intentarlo.';
    $backUrl     = route('login');
    $backLabel   = '← VOLVER AL LOGIN';
    $accentColor = '#e05555';
@endphp
@include('errors._layout')
