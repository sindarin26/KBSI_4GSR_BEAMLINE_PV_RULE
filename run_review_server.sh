#!/usr/bin/env sh
set -eu

BEAMLINE="${1:-ID10}"
PORT="${2:-8765}"
HOST="${HOST:-127.0.0.1}"

cd "$(dirname "$0")"

if [ "${BEAMLINE}" = "--help" ] || [ "${BEAMLINE}" = "-h" ]; then
  echo "Usage: ./run_review_server.sh [beamline] [port]"
  echo ""
  echo "Examples:"
  echo "  ./run_review_server.sh"
  echo "  ./run_review_server.sh ID10"
  echo "  ./run_review_server.sh ID10 8766"
  echo "  HOST=0.0.0.0 ./run_review_server.sh ID10 8765"
  exit 0
fi

echo "Starting PV review server"
echo "  beamline: ${BEAMLINE}"
echo "  url:      http://${HOST}:${PORT}/"
echo ""
echo "Stop with Ctrl-C."
echo ""

exec node scripts/review_server.js "${BEAMLINE}" --host "${HOST}" --port "${PORT}"
