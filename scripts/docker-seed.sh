#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed"
  echo "Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker image inspect allowealth-app >/dev/null 2>&1; then
  echo "Building allowealth-app image..."
  docker compose -f docker/docker-compose.yml build app
fi

if [ "$#" -eq 0 ]; then
  set -- --months=6
fi

echo "Seeding demo data into Docker volume (allowealth-data)..."

docker run --rm --entrypoint bun \
  -v allowealth-data:/data \
  -e ALLOW_SEED=true \
  allowealth-app /app/dist/scripts/seed.js "$@"
