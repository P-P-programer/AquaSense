<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#10b981">
    <meta name="description" content="AquaSense — Sistema de monitoreo IoT para calidad y consumo de agua">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="AquaSense">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/png" href="/icon-192.png">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <title>AquaSense</title>
    @viteReactRefresh
    @vite(['resources/js/index.jsx', 'resources/css/app.css'])
</head>
<body>
    <div id="app"></div>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
                .catch(err => console.error('[PWA] Error registrando Service Worker:', err));
        }
    </script>
</body>
</html>