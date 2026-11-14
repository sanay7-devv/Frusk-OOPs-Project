#!/usr/bin/env bash
# Explicitly resets the disposable iitsm-demo project, including its database volume.
set -euo pipefail
source "$(dirname "$0")/demo-compose.sh"
"${compose[@]}" down --volumes --remove-orphans
"${compose[@]}" up --build --detach --wait --wait-timeout 180
echo "Fresh demo: http://localhost:3000; mail: http://localhost:8025"
