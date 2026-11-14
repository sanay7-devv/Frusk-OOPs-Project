#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/demo-compose.sh"
snapshot_path="${1:-$task_root/deploy/snapshots/demo.dump}"
test -s "$snapshot_path"
"${compose[@]}" stop backend
"${compose[@]}" exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --exit-on-error --single-transaction' < "$snapshot_path"
"${compose[@]}" start backend
echo "Restored demo database. Allow the backend health check to finish."
