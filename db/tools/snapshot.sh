#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/demo-compose.sh"
snapshot_path="${1:-$task_root/deploy/snapshots/demo.dump}"
mkdir -p "$(dirname "$snapshot_path")"
"${compose[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$snapshot_path"
echo "Saved demo database to $snapshot_path"
