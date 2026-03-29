@php
    $code      = '403';
    $title     = 'No autorizado';
    $message   = 'No tienes permisos para acceder a esta sección. Si crees que esto es un error, contacta al administrador.';
    $backUrl   = auth()->check() ? route(auth()->user()->role === 'admin' ? 'admin.dashboard' : 'user.dashboard') : route('login');
    $backLabel = auth()->check() ? '← VOLVER AL INICIO' : '← IR AL LOGIN';
    $accentColor = '#e08030';
@endphp
@include('errors._layout')
