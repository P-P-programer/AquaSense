<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Contraseña establecida · AquaSense</title>
    @vite(['resources/css/app.css','resources/css/aquasense.css'])
    <style>
        body { background: var(--fondo); font-family: 'IBM Plex Sans', sans-serif; }
        .center { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:2rem }
        .card { background:var(--blanco); border-radius:12px; padding:28px; box-shadow:var(--sombra); border:1px solid var(--borde); max-width:560px; width:100% }
        .card h2 { color:var(--azul-profundo); margin:0 0 8px 0 }
        .card p { color:var(--texto-secundario); margin:0 0 16px 0 }
        .actions { display:flex; gap:0.6rem; margin-top:16px }
        .btn { padding:10px 14px; border-radius:10px; border:none; cursor:pointer }
        .btn-primary { background: linear-gradient(90deg,var(--azul-institucional),var(--azul-agua)); color:var(--blanco); font-weight:700 }
        .btn-link { background:transparent; color:var(--azul-profundo); border:1px solid transparent }
        .note { font-size:0.9rem; color:var(--texto-secundario); margin-top:8px }
    </style>
</head>
<body>
    <div class="center">
        <div class="card">
            <h2>¡Listo!</h2>
            <p>La contraseña para <strong>{{ $email }}</strong> se estableció correctamente y el correo ha sido verificado automáticamente.</p>
            <div class="note">Ya puedes iniciar sesión con tu nueva contraseña. Si no funciona, contacta al administrador.</div>
            <div class="actions">
                <a class="btn btn-primary" href="/login">Ir a iniciar sesión</a>
            </div>
        </div>
    </div>
</body>
</html>
