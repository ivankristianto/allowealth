#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${REPO_ROOT}"

# The compose app service mounts this volume, so seeding it wipes the running app's data.
APP_VOLUME="allowealth-data"
VOLUME="${SEED_VOLUME:-${APP_VOLUME}}"
DB_PATH="/data/allowealth.db"

confirmed=false
forced=false
seed_args=()
for arg in "$@"; do
  case "${arg}" in
    --yes) confirmed=true ;;
    --force) forced=true ;;
    *) seed_args+=("${arg}") ;;
  esac
done

if [ "${#seed_args[@]}" -eq 0 ]; then
  seed_args=(--months=6)
fi

echo "Target: ${DB_PATH} in Docker volume ${VOLUME}"

if [ "${confirmed}" != true ]; then
  echo "Refusing to wipe and reseed ${DB_PATH} in volume ${VOLUME}: re-run with --yes to confirm."
  exit 1
fi

if [ "${VOLUME}" = "${APP_VOLUME}" ] && [ "${forced}" != true ]; then
  echo "Refusing to seed ${DB_PATH} in ${VOLUME}: it is the live app volume."
  echo "Set SEED_VOLUME=<other volume> to seed a scratch volume, or add --force to wipe the app's data."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed"
  echo "Install Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker image inspect allowealth-app >/dev/null 2>&1; then
  echo "Building allowealth-app image..."
  docker compose -f docker/docker-compose.yml build app
fi

guard_args=(--yes)
if [ "${forced}" = true ]; then
  guard_args+=(--force)
fi

echo "Seeding demo data into ${DB_PATH} in Docker volume ${VOLUME}..."

docker run --rm --entrypoint bun \
  -v "${VOLUME}:/data" \
  -e ALLOW_SEED=true \
  -e DATABASE_URL="${DB_PATH}" \
  allowealth-app /app/dist/scripts/seed.js "${guard_args[@]}" "${seed_args[@]}"
