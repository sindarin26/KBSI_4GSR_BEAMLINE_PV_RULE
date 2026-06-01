#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8212}"
HOST="${HOST:-127.0.0.1}"

if [ "$#" -eq 0 ]; then
  mapfile -t POOLS < <(
    find database_pool -mindepth 2 -maxdepth 2 -name manifest.yaml -print \
      | sed 's#^database_pool/##; s#/manifest.yaml$##' \
      | sort
  )
else
  POOLS=("$@")
fi

if [ "${#POOLS[@]}" -eq 0 ]; then
  echo "FAIL: no database pools found under database_pool/*/manifest.yaml" >&2
  exit 2
fi

ARGS=()
for pool in "${POOLS[@]}"; do
  ARGS+=(--database-pool "$pool")
done

echo "Database-pool review workbench: http://${HOST}:${PORT}/"
echo "Loaded pools: ${POOLS[*]}"
exec node scripts/review_server.js "${ARGS[@]}" --host "$HOST" --port "$PORT"
