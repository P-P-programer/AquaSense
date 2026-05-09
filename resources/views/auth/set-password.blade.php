<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Establecer Contraseña - AquaSense</title>
    @vite('resources/css/app.css')
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            padding: 40px;
            max-width: 400px;
            width: 100%;
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 {
            color: #667eea;
            font-size: 24px;
            margin: 0;
        }
        .logo p {
            color: #666;
            font-size: 14px;
            margin: 5px 0 0 0;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 500;
        }
        input {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }
        input:focus {
            outline: none;
            border-color: #667eea;
        }
        .password-hint {
            font-size: 12px;
            color: #999;
            margin-top: 5px;
        }
        button {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:active {
            transform: translateY(0);
        }
        .error-message {
            color: #e74c3c;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }
        .success-message {
            color: #27ae60;
            font-size: 14px;
            margin-top: 10px;
            display: none;
        }
        .info-box {
            background: #f0f4ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            border-radius: 5px;
            font-size: 14px;
            color: #333;
            margin-bottom: 25px;
        }
        .loading {
            display: none;
        }
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

            <button type="submit">
                <span id="buttonText">Establecer Contraseña</span>
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