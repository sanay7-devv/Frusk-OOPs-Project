#!/usr/bin/env bash
# Demo-only sealed audit trail exercise. Never points at the dev Compose project.
set -euo pipefail
source "$(dirname "$0")/demo-compose.sh"

mode="${1:-}"
if [[ "$mode" != "tamper" && "$mode" != "restore" ]]; then
  echo "Usage: bash db/tools/tamper-demo-audit.sh tamper|restore" >&2
  exit 2
fi

# The demo-only V200 migration is absent from dev and production databases.
demo_marker="$("${compose[@]}" exec -T db psql -X -U iitsm -d iitsm -Atc "SELECT count(*) FROM flyway_schema_history WHERE version='200' AND success")"
if [[ "$demo_marker" != "1" ]]; then
  echo "Refusing audit exercise: this database has no successful demo-only V200 migration." >&2
  exit 1
fi

if [[ "$mode" == "tamper" ]]; then
  "${compose[@]}" exec -T db psql -X -U iitsm -d iitsm -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DO $$
DECLARE chosen BIGINT;
DECLARE affected INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM audit_records WHERE description LIKE '% [DEMO_TAMPER]') THEN
    RAISE EXCEPTION 'A demo audit record is already altered; restore it first';
  END IF;
  SELECT record_id INTO chosen FROM audit_seal_entries ORDER BY record_id LIMIT 1;
  IF chosen IS NULL THEN
    RAISE EXCEPTION 'No sealed audit record exists; use POST /api/v1/audit/seal first';
  END IF;
  EXECUTE 'ALTER TABLE audit_records DISABLE TRIGGER audit_records_no_update_delete';
  UPDATE audit_records SET description = description || ' [DEMO_TAMPER]' WHERE id = chosen;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Expected to alter one audit record'; END IF;
  EXECUTE 'ALTER TABLE audit_records ENABLE TRIGGER audit_records_no_update_delete';
  RAISE NOTICE 'Demo audit record % altered; GET /api/v1/audit/verify should now report failure', chosen;
END $$;
COMMIT;
SQL
else
  "${compose[@]}" exec -T db psql -X -U iitsm -d iitsm -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DO $$
DECLARE chosen BIGINT;
DECLARE affected INTEGER;
BEGIN
  SELECT a.id INTO chosen FROM audit_records a
    JOIN audit_seal_entries s ON s.record_id = a.id
    WHERE a.description LIKE '% [DEMO_TAMPER]'
    ORDER BY a.id LIMIT 1;
  IF chosen IS NULL THEN RAISE EXCEPTION 'No demo audit alteration to restore'; END IF;
  EXECUTE 'ALTER TABLE audit_records DISABLE TRIGGER audit_records_no_update_delete';
  UPDATE audit_records
    SET description = left(description, length(description) - length(' [DEMO_TAMPER]'))
    WHERE id = chosen;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION 'Expected to restore one audit record'; END IF;
  EXECUTE 'ALTER TABLE audit_records ENABLE TRIGGER audit_records_no_update_delete';
  RAISE NOTICE 'Demo audit record % restored; GET /api/v1/audit/verify should now pass', chosen;
END $$;
COMMIT;
SQL
fi
