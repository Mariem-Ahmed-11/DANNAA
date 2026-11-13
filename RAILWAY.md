# Railway deployment

This project is prepared as two Railway services:

- `backend/` — Laravel API container
- `frontend/` — React/Nginx container

Use a Railway-managed PostgreSQL service. Do not run PostgreSQL inside either application container.

## Production domains

The deployed app is served from a single custom domain:

- Frontend: `https://danna-eg.tech`
- API: proxied by the frontend on the same origin (`/api`, `/sanctum`)

The application uses Laravel Sanctum session cookies. Serving the frontend and API from one origin keeps browser authentication simple, and avoids Railway's `*.up.railway.app` public-suffix cookie restriction. A separate `api.danna-eg.tech` domain is optional; see section 5.

The frontend nginx container reaches the backend through the `BACKEND_ORIGIN` build-time variable (see section 4). Keep the backend's Railway domain available, or point `BACKEND_ORIGIN` at `http://backend.railway.internal:8080` to use Railway private networking.

## 1. Create the Railway project

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Add a backend service from this repository.
4. Add a frontend service from this repository.
5. For the backend service, set the root directory to `/backend`.
6. For the frontend service, set the root directory to `/frontend`.

Railway will use the Dockerfiles in those directories.

## 2. Backend variables

Add these variables to the backend service. Replace placeholders with the values from Railway and your mail provider.

```env
APP_NAME=DANNA
APP_ENV=production
APP_DEBUG=false
APP_KEY=generate-a-new-production-key
APP_URL=https://your-backend.up.railway.app
FRONTEND_URL=https://danna-eg.tech

APP_LOCALE=en
APP_FALLBACK_LOCALE=en

DB_CONNECTION=pgsql
DB_HOST=your-railway-postgres-host
DB_PORT=5432
DB_DATABASE=your-railway-postgres-database
DB_USERNAME=your-railway-postgres-user
DB_PASSWORD=your-railway-postgres-password
DB_SSLMODE=require

CORS_ALLOWED_ORIGINS=https://danna-eg.tech
SANCTUM_STATEFUL_DOMAINS=danna-eg.tech

SESSION_DRIVER=database
SESSION_LIFETIME=120
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax

CACHE_STORE=database
QUEUE_CONNECTION=sync
FILESYSTEM_DISK=local

MAIL_MAILER=smtp
MAIL_HOST=smtp.resend.com
MAIL_PORT=587
MAIL_USERNAME=resend
MAIL_PASSWORD=your-resend-api-key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@danna-eg.tech
MAIL_FROM_NAME=DANNA
```

Generate `APP_KEY` locally from the `backend` directory:

```bash
php artisan key:generate --show
```

Do not commit the key or SMTP password.

Railway can expose PostgreSQL variables to the backend service. Use Railway's variable reference picker, or copy the PostgreSQL service's connection values into the variables above.

If you use the same-origin proxy described in section 4 with Railway's default domains, omit `SESSION_DOMAIN` entirely so the session cookie stays host-only. Only set `SESSION_DOMAIN=.danna-eg.tech` when the frontend calls the API directly on `api.danna-eg.tech`.

## 3. Backend first deployment

The container entrypoint (`backend/docker-entrypoint.sh`) runs `php artisan migrate --force` and `php artisan storage:link` on every start, so the schema is applied automatically on each deploy.

Create the first Super Admin interactively from the Railway shell or over SSH:

```bash
php artisan dhana:create-admin
```

Do not run `migrate:fresh`, `db:wipe`, or other database reset commands. The entrypoint only runs normal migrations, which are safe to repeat.

## 4. Frontend variables

The frontend nginx container proxies `/api/*` and `/sanctum/*` to the backend, so the browser only ever talks to one origin. This keeps Sanctum session cookies working on Railway's `*.up.railway.app` domains, which sit under a public suffix and reject cookies shared across them.

The proxy target is the `BACKEND_ORIGIN` build-time environment variable defined in `frontend/Dockerfile` (defaults to the current backend public domain). Override it on the frontend service when the backend domain changes, then redeploy.

Do not set `VITE_API_BASE_URL` for this deployment. Leaving it unset makes the built bundle use same-origin requests, which is what the proxy expects. Setting it to a different host bypasses the proxy and reintroduces the cross-site cookie problem.

## 5. Custom domains and DNS

In Railway, add:

- `app.danna-eg.tech` to the frontend service
- `api.danna-eg.tech` to the backend service (optional)

Railway will show the required DNS records. Add those records at the DNS provider managing `danna-eg.tech`, then wait for verification and HTTPS certificates.

Because the frontend proxies the API, only the frontend custom domain is required for the app to work; the backend can stay on its Railway domain and remain reachable only through the proxy. If you instead point the frontend directly at `https://api.danna-eg.tech` with `VITE_API_BASE_URL`, set `SESSION_DOMAIN=.danna-eg.tech` on the backend so the session cookie is valid for both hosts.

After the API domain is active, verify:

```text
https://api.danna-eg.tech/up
```

## 6. Email

Railway blocks outbound SMTP, so `smtp.resend.com:587` times out from the backend container (requests hang for the full `MAIL_TIMEOUT` of 20 seconds). Use Resend's HTTP API instead, which this Laravel version supports natively:

```env
MAIL_MAILER=resend
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM_ADDRESS=noreply@danna-eg.tech
MAIL_FROM_NAME=DANNA
```

The `resend/resend-php` package provides the transport, and `config/services.php` reads the key from `RESEND_API_KEY`. Add the key directly in Railway as a secret variable. Do not send the API key in chat, commit it, or place it in a frontend file.

Before sending mail, verify `danna-eg.tech` in Resend and add the DNS records Resend provides. The sender address must use the verified domain.

Do not use `MAIL_MAILER=log` in production. The application intentionally refuses staff invitations when the mail transport writes message contents to logs.

## 7. File uploads

The first deployment uses Laravel's local public disk for hospital logos. This is acceptable for a single-service test deployment, but Railway container storage should not be treated as a permanent backup. Move logos to S3-compatible object storage such as Cloudflare R2 or another provider before scaling or relying on the uploads operationally.

## 8. Authentication smoke test

After the custom domain is active, test:

1. Open `https://danna-eg.tech`.
2. Log in as the Super Admin.
3. Refresh the page.
4. Log out and log in again.
5. Register a hospital.
6. Approve it from the Super Admin workspace.
7. Log in as the Hospital Admin.
8. Test password reset and staff invitation email delivery.

If login fails, inspect the browser Network tab for CORS, CSRF, or cookie errors and verify that the exact HTTPS domains appear in `CORS_ALLOWED_ORIGINS` and `SANCTUM_STATEFUL_DOMAINS`. A login that returns HTTP 500 with "Session store not set on request" means the domain is missing from `SANCTUM_STATEFUL_DOMAINS`.
