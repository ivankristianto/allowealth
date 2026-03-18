#!/bin/sh
set -e

# Pre-migration backup: protect against failed migrations
# WAL mode requires backing up -wal and -shm files for consistency
DB_PATH="${DATABASE_URL:-/data/allowealth.db}"
if [ -f "$DB_PATH" ]; then
  BACKUP_SUFFIX="pre-migration-$(date +%Y%m%d-%H%M%S)"
  echo "Creating pre-migration backup: ${DB_PATH}.${BACKUP_SUFFIX}"

  # Copy main database and WAL files atomically
  cp "$DB_PATH" "${DB_PATH}.${BACKUP_SUFFIX}"
  [ -f "${DB_PATH}-wal" ] && cp "${DB_PATH}-wal" "${DB_PATH}-wal.${BACKUP_SUFFIX}"
  [ -f "${DB_PATH}-shm" ] && cp "${DB_PATH}-shm" "${DB_PATH}-shm.${BACKUP_SUFFIX}"

  # Keep only the 5 most recent pre-migration backups to avoid disk bloat
  for suffix in "" "-wal" "-shm"; do
    ls -t "${DB_PATH}${suffix}.pre-migration-"* 2>/dev/null | tail -n +6 | xargs -r rm -f
  done
fi

echo "Running database migrations..."
bunx drizzle-kit migrate

echo "Starting Allowealth..."
exec bun ./dist/server/entry.mjs
