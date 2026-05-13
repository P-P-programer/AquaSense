<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Establecer Contraseña - AquaSense</title>
    @vite(['resources/css/app.css','resources/css/aquasense.css'])
    <style>
        body { background: var(--fondo); }
        .container {
            max-width: 480px;
            width: 100%;
            background: var(--blanco);
            border-radius: 12px;
            padding: 28px;
            box-shadow: var(--sombra);
            border: 1px solid var(--borde);
        }
        .logo h1 { color: var(--azul-institucional); margin:0; }
        .logo p { color: var(--texto-secundario); margin:4px 0 0 0; font-size:0.92rem }
        label { display:block; margin-bottom:6px; color:var(--texto-primario); font-weight:600 }
        .form-group { margin-bottom:16px }
        input { width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--borde); font-size:0.95rem }
        input:focus { outline: none; box-shadow: 0 6px 18px rgba(10,40,90,0.06); border-color: var(--azul-agua) }
        .password-hint { font-size:0.82rem; color:var(--texto-secundario); margin-top:6px }
        .btn-primary { width:100%; padding:12px 14px; border-radius:10px; background: linear-gradient(90deg,var(--azul-institucional),var(--azul-agua)); color:var(--blanco); border:none; font-weight:700; font-size:1rem }
        .error-message { color: var(--alerta-danger); font-size:0.95rem; margin-top:10px; display:none }
        .success-message { color: var(--alerta-ok); font-size:0.95rem; margin-top:10px; display:none }
        .info-box { background: var(--azul-claro); border-left:4px solid var(--azul-agua); padding:12px; border-radius:8px; margin-bottom:18px }
        .loading { display:none }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>AquaSense</h1>
            <p>Sistema de Monitoreo de Agua</p>
        </div>

        <div class="info-box">
            <strong>Bienvenido/a</strong><br>
            Establece tu contraseña para acceder al sistema.
        </div>

        <form id="passwordForm">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">

            <div class="form-group">
                <label for="email">Correo Electrónico</label>
                <input type="email" id="email" name="email" value="{{ $email }}" disabled>
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" name="password" required>
                <div class="password-hint">Mínimo 8 caracteres</div>
            </div>

            <div class="form-group">
                <label for="password_confirmation">Confirmar Contraseña</label>
                <input type="password" id="password_confirmation" name="password_confirmation" required>
            </div>

            <button type="submit" class="btn-primary">
                <span id="buttonText">Establecer contraseña y verificar correo</span>
                <span id="buttonLoading" class="loading">Procesando...</span>
            </button>

            <div id="errorMessage" class="error-message"></div>
            <div id="successMessage" class="success-message"></div>
        </form>
    </div>

    <script>
        const form = document.getElementById('passwordForm');
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        const buttonText = document.getElementById('buttonText');
        const buttonLoading = document.getElementById('buttonLoading');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password_confirmation').value;

            if (password !== passwordConfirm) {
                errorDiv.textContent = 'Las contraseñas no coinciden.';
                errorDiv.style.display = 'block';
                return;
            }

            if (password.length < 8) {
                errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres.';
                errorDiv.style.display = 'block';
                return;
            }

            buttonText.style.display = 'none';
            buttonLoading.style.display = 'inline';

            try {
                const response = await fetch('/api/auth/set-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        token: form.token.value,
                        password: password,
                        password_confirmation: passwordConfirm,
                    }),
                });

                if (response.ok) {
                    successDiv.textContent = '✓ Contraseña establecida. Redirigiendo al login...';
                    successDiv.style.display = 'block';
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    const error = await response.json();
                    errorDiv.textContent = error.message || 'Error al establecer la contraseña.';
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
                errorDiv.style.display = 'block';
            } finally {
                buttonText.style.display = 'inline';
                buttonLoading.style.display = 'none';
            }
        });
    </script>
</body>
</html>