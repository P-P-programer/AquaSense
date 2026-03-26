<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#10b981">
    <meta name="description" content="Sistema de monitoreo de agua AquaSense">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="AquaSense">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    @if(app()->environment('local'))
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
    @endif

    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" href="/icon-192.png">
    <link rel="apple-touch-icon" href="/icon-192.png">

    <title>AquaSense</title>
    @viteReactRefresh
    @vite(['resources/js/index.jsx', 'resources/css/app.css'])
</head>
<body style="margin:0; padding:0; font-family:sans-serif;">
    <div id="app"></div>
</body>
</html>