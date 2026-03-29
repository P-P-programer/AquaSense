<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'Error' }} — Aquasene</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
            --bg:      #0b1520;
            --surface: #111d2e;
            --border:  rgba(44,140,200,0.18);
            --accent:  #2c8cc8;
            --text:    #d0e8f5;
            --muted:   #5a7a95;
            --mono:    'Space Mono', monospace;
            --sans:    'DM Sans', sans-serif;
        }
        body {
            background: var(--bg);
            font-family: var(--sans);
            color: var(--text);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-image: radial-gradient(circle, rgba(44,140,200,0.06) 1px, transparent 1px);
            background-size: 32px 32px;
        }
        .error-code {
            font-family: var(--mono);
            font-size: 6rem;
            font-weight: 700;
            color: {{ $accentColor ?? 'var(--accent)' }};
            opacity: 0.15;
            line-height: 1;
            letter-spacing: -0.05em;
            user-select: none;
        }
        .error-title {
            font-family: var(--mono);
            font-size: 1rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: {{ $accentColor ?? 'var(--accent)' }};
            margin-top: 0.5rem;
            margin-bottom: 1rem;
        }
        .error-message {
            font-size: 1rem;
            color: var(--muted);
            text-align: center;
            max-width: 380px;
            line-height: 1.6;
            margin-bottom: 2rem;
        }
        .divider {
            width: 40px;
            height: 1px;
            background: var(--border);
            margin: 1.5rem auto;
        }
        .btn-back {
            display: inline-block;
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.7rem 1.5rem;
            font-family: var(--mono);
            font-size: 0.8rem;
            letter-spacing: 0.08em;
            color: var(--accent);
            text-decoration: none;
            transition: background 0.2s, border-color 0.2s;
        }
        .btn-back:hover {
            background: rgba(44,140,200,0.08);
            border-color: var(--accent);
        }
        .logo-footer {
            position: fixed;
            bottom: 1.5rem;
            font-family: var(--mono);
            font-size: 0.7rem;
            color: var(--muted);
            letter-spacing: 0.1em;
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="error-code">{{ $code }}</div>
    <div class="error-title">{{ $title }}</div>
    <div class="divider"></div>
    <p class="error-message">{{ $message }}</p>
    <a href="{{ $backUrl ?? url()->previous() }}" class="btn-back">{{ $backLabel ?? '← VOLVER' }}</a>
    <div class="logo-footer">AQUASENE &mdash; SISTEMA DE MONITOREO</div>
</body>
</html>
