<?php
return [
    'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => [
        'http://localhost:5173',    // Vite dev
        'http://127.0.0.1:5173',   // Vite dev (127.0.0.1)
        'http://localhost:3000',   // CRA dev
        'http://127.0.0.1:3000',   // CRA dev (127.0.0.1)
        'http://localhost:8000',   // Si sirves frontend con Laravel
        'http://127.0.0.1:8000',   // Si sirves frontend con Laravel (127.0.0.1)
        // Agrega aquí tu dominio de producción cuando lo tengas
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => true,  // ← CRÍTICO para cookies de sesión
];

