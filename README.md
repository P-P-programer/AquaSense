# AquaSense

AquaSense es una aplicación web (Laravel backend + React/Vite frontend) que funciona como PWA, soporta notificaciones Web Push (VAPID) y utiliza colas (driver: database) junto con un patrón Outbox para sincronización offline.

**Requisitos mínimos**
- PHP 8.1+
- Composer
- Node.js 18+ y pnpm (recomendado)
- Base de datos compatible (MySQL / MariaDB recomendados)
- HTTPS en producción (service workers y Web Push requieren origen seguro). `localhost` es seguro para desarrollo.

## Instalación rápida (desarrollo)

1. Clona el repositorio y entra en la carpeta:

```bash
git clone <repo> && cd AquaSense
```

2. Copia el env y ajusta variables (`DB_*`, `APP_URL`, etc.):

```bash
cp .env.example .env
```

3. Instala dependencias PHP y JS:

```bash
composer install
pnpm install
```

4. Genera la `APP_KEY`:

```bash
php artisan key:generate
```

5. Ejecuta migraciones y seeders:

```bash
php artisan migrate --seed
```

6. En desarrollo: arranca Vite:

```bash
pnpm run dev
```

En producción: construye los assets:

```bash
pnpm run build
```

## Migración a pnpm

Si ya venías usando `npm`, el cambio recomendado es:

```bash
corepack enable
corepack prepare pnpm@10.24.0 --activate
pnpm install
```

Después de eso, usa `pnpm run dev` y `pnpm run build` como comandos habituales.

Si usas almacenamiento público, crea el enlace simbólico:

```bash
php artisan storage:link
```

## Web Push (VAPID)

El proyecto usa Web Push para notificaciones en navegador. Cada entorno debería usar su propio par de claves VAPID.

1. Genera las claves VAPID:

```bash
php artisan webpush:generate-vapid-keys
```

2. Añade al `.env`:

- `VAPID_PUBLIC_KEY=`
- `VAPID_PRIVATE_KEY=`
- `VAPID_SUBJECT=mailto:ops@example.com`

3. Verificación rápida (longitud de la clave pública):

```bash
php artisan tinker --execute="echo strlen(config('webpush.vapid_public_key'));." 
```

Notas:
- El backend guarda `endpoint` como `string` (longitud límite) porque algunos proveedores devuelven URLs que validadores `url` estrictos rechazan.
- El payload de suscripción esperado desde el frontend tiene esta forma:

```json
{
	"endpoint": "https://fcm.googleapis.com/fcm/send/..",
	"keys": { "p256dh": "...", "auth": "..." }
}
```

Si el backend rechaza la petición revisa la respuesta HTTP y `storage/logs/laravel.log`.

## PWA / Instalación

- Entrada del frontend: `resources/js/index.jsx`.
- Service worker: `public/sw.js` (registrado desde `resources/views/welcome.blade.php`).
- Banner de instalación: `resources/js/components/PwaInstallBanner.jsx` (manejador de `beforeinstallprompt` y fallback para iOS).

Requisitos mínimos para que navegadores promuevan la instalación (Chrome/Chromium):
- Servir por HTTPS (o `localhost`).
- Manifest con `name`/`short_name`, `icons` que incluyan 192×192 y 512×512, `start_url`, y `display` en `standalone`/`fullscreen`/`minimal-ui`.
- Interacción/engagement del usuario (navegadores piden mínimo de interacción/tiempo antes de lanzar `beforeinstallprompt`).

Recomendación: añade `description` y `screenshots` en `manifest.json` para mejorar la experiencia de instalación en Android.

## Queue / Worker (Hostinger u hosting compartido)

Se recomienda usar cron para ejecutar periódicamente el worker en entornos compartidos. Ejemplo de cron (ajusta rutas/usuario):

```bash
/usr/bin/php /home/USER/domains/TU_DOMINIO/public_html/artisan queue:work database --stop-when-empty --max-time=55 --sleep=3 --tries=3 >> /home/USER/domains/TU_DOMINIO/public_html/storage/logs/queue-worker.log 2>&1
```

Validación rápida:
1. Crea una notificación/job desde la app.
2. Comprueba que la tabla `jobs` se vacía.
3. Revisa `storage/logs/queue-worker.log`.

## Depuración y troubleshooting rápido

- Logs: `storage/logs/laravel.log`.
- Service worker: Chrome DevTools → Application → Service Workers (ver estado, scope y errores).
- Web Push: DevTools → Network → filtra `/push/subscribe` y revisa `endpoint` y `keys` en la petición.
- VAPID: comprobar longitud de `VAPID_PUBLIC_KEY` con Tinker (ver arriba).

## Tests y checks

- Ejecutar tests PHP:

```bash
php artisan test
```

- Build frontend:

```bash
npm run build
```

## Contribuir

- Crea una rama por feature: `git checkout -b feat/mi-cambio`.
- Haz PR con descripción y pasos para reproducir.
- Ejemplo de mensaje de commit para cambios PWA/push:

```
feat(pwa): add install banner UX and fix push subscription handling
```

---

Si quieres, puedo añadir más detalles (ej. `manifest.json` mínimo, ejemplo de `.env` solo con claves VAPID, o pasos para debug de service worker).
