#!/usr/bin/env bash
# Shared project configuration: all reset/snapshot operations target iitsm-demo only.
set -euo pipefail
task_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose=(docker compose --project-name iitsm-demo
  --file "$task_root/deploy/docker-compose.yml"
  --file "$task_root/deploy/docker-compose.demo.yml" --profile demo)
