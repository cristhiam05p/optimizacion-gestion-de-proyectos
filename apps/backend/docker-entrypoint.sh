#!/bin/sh
set -e

max_retries=${DB_CONNECT_MAX_RETRIES:-30}
sleep_seconds=${DB_CONNECT_RETRY_DELAY_SECONDS:-2}

attempt=1
while [ "$attempt" -le "$max_retries" ]; do
  echo "[backend] Running Prisma migrations (attempt ${attempt}/${max_retries})..."
  if npx prisma migrate deploy; then
    echo "[backend] Database is ready."
    exec npm run start
  fi

  if [ "$attempt" -eq "$max_retries" ]; then
    echo "[backend] Could not connect to database after ${max_retries} attempts."
    exit 1
  fi

  echo "[backend] Database not ready yet, retrying in ${sleep_seconds}s..."
  sleep "$sleep_seconds"
  attempt=$((attempt + 1))
done
