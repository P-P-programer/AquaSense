<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $title ?? 'Notificación' }} · AquaSense</title>
    @vite(['resources/css/app.css', 'resources/css/aquasense.css'])
    <style>
        body { background: var(--fondo); font-family: 'IBM Plex Sans', sans-serif; }
        .center { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .card { background: var(--blanco); border: 1px solid var(--borde); border-radius: 12px; box-shadow: var(--sombra); max-width: 620px; width: 100%; padding: 1.8rem; }
        .title { color: var(--azul-profundo); margin: 0 0 .6rem 0; }
        .message { color: var(--texto-secundario); margin: 0; line-height: 1.5; }
        .badge { display: inline-block; font-size: .78rem; font-weight: 700; border-radius: 999px; padding: .25rem .65rem; margin-bottom: .8rem; }
        .badge-success { color: #0a5c2b; background: #ddf5e7; }
        .badge-error { color: #8b1c1c; background: #fde8e8; }
        .badge-info { color: #164e63; background: #e0f2fe; }
        .actions { margin-top: 1.2rem; }
        .btn { text-decoration: none; display: inline-block; background: linear-gradient(90deg, var(--azul-institucional), var(--azul-agua)); color: var(--blanco); padding: .62rem .95rem; border-radius: 10px; font-weight: 700; }
    </style>
</head>
<body>
    @php
        $kind = $type ?? 'info';
    @endphp
    <div class="center">
        <div class="card">
            <span class="badge badge-{{ $kind }}">{{ strtoupper($kind) }}</span>
            <h2 class="title">{{ $title ?? 'Notificación' }}</h2>
            <p class="message">{{ $message ?? 'La operación fue procesada.' }}</p>
            <div class="actions">
                <a class="btn" href="/">Ir al inicio</a>
            </div>
        </div>
    </div>
</body>
</html>
