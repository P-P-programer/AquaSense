@php
    $code        = '404';
    $title       = 'Página no encontrada';
    $message     = 'La página que buscas no existe o fue movida. Verifica la URL e intenta de nuevo.';
    $backUrl     = auth()->check() ? route(auth()->user()->role === 'admin' ? 'admin.dashboard' : 'user.dashboard') : route('login');
    $backLabel   = '← VOLVER AL INICIO';
    $accentColor = 'var(--accent)';
@endphp
@include('errors._layout')
