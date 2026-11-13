#!/bin/sh
set -e

# Apply pending schema changes before serving traffic. Migrations are
# idempotent, so this is safe to run on every container start.
php artisan migrate --force

# Expose the public storage disk for uploaded hospital logos.
php artisan storage:link >/dev/null 2>&1 || true

exec "$@"
