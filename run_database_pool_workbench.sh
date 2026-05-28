#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PORT="${1:-8775}"
HOST="${HOST:-127.0.0.1}"

echo "Database-pool review workbench: http://${HOST}:${PORT}/"
exec node scripts/database_pool_pilot/review_workbench.js --host "$HOST" --port "$PORT"
