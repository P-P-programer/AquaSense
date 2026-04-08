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
        // Web Push VAPID Key
        window.__VAPID_PUBLIC_KEY_ = '{{ config("webpush.vapid_public_key") }}';

        if ('serviceWorker' in navigator) {
            const swVersion = '{{ substr(md5_file(public_path("sw.js")), 0, 10) }}';
            const swUrl = `/sw.js?v=${swVersion}`;
            let refreshing = false;

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            navigator.serviceWorker.register(swUrl)
                .then((reg) => {
                    console.log('[PWA] Service Worker registrado:', reg.scope);

                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;

                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    });

                    setInterval(() => {
                        reg.update().catch(() => {});
                    }, 60000);
                })
                .catch(err => console.error('[PWA] Error registrando Service Worker:', err));
        }
    </script>
</body>
</html>