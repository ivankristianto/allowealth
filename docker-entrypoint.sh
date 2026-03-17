#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit migrate

echo "Starting Allowealth..."
exec bun ./dist/server/entry.mjs
