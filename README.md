<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Web Push Setup

El proyecto usa Web Push para notificaciones en navegador con VAPID. Cada entorno debe tener su propio par de claves.

1. Copia `.env.example` a `.env` si todavía no lo hiciste.
2. Genera las claves con `php artisan webpush:generate-vapid-keys`.
3. Pega `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` en tu `.env`.
4. En producción, usa un par estable y no lo versionas.
5. Si rotas las claves, los usuarios deberán volver a suscribirse a push.

`ALERT_PUSH_MIN_SEVERITY` controla desde qué severidad se envían notificaciones push. Para administradores, las alertas críticas por correo quedan forzadas por seguridad.

## Queue Worker Automation (Cron)

En este proyecto los correos y notificaciones usan cola de Laravel. En hosting compartido (como Hostinger), el worker no debe correrse manualmente por SSH porque se apaga al cerrar sesión. La forma correcta es automatizarlo con cron.

### Opción A: Cron desde panel de Hostinger (recomendado)

1. Ve a `Advanced -> Cron Jobs`.
2. Crea un cron con frecuencia `cada minuto`.
3. Usa un comando como este (ajusta rutas y binario PHP):

```bash
/usr/bin/php /home/USER/domains/TU_DOMINIO/public_html/artisan queue:work database --stop-when-empty --max-time=55 --sleep=3 --tries=3 >> /home/USER/domains/TU_DOMINIO/public_html/storage/logs/queue-worker.log 2>&1
```

### Opción B: Cron por SSH (`crontab -e`)

Si prefieres terminal y tu plan lo permite:

```bash
crontab -e
```

Agrega esta línea:

```bash
* * * * * /usr/bin/php /home/USER/domains/TU_DOMINIO/public_html/artisan queue:work database --stop-when-empty --max-time=55 --sleep=3 --tries=3 >> /home/USER/domains/TU_DOMINIO/public_html/storage/logs/queue-worker.log 2>&1
```

### Validación rápida

1. Encola una notificación/correo desde la app.
2. Revisa `jobs` para confirmar que la cola se vacía.
3. Verifica logs en `storage/logs/queue-worker.log`.

### Nota importante

El cron no reemplaza la cola: solo ejecuta periódicamente `queue:work`. Para hosting compartido es la estrategia más estable y de menor consumo.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
