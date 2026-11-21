"""Measure Task 3 A7 read/report behavior at 10k and 100k incidents.

This is an opt-in CI experiment for a disposable demo Compose stack. Synthetic
historical rows are loaded directly through the existing validated CSV-to-SQL
generator; the application API is used only for read measurements.
"""
from __future__ import annotations

import csv
import json
import os
import statistics
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
API_BASE = os.environ.get("IITSM_API_URL", "http://localhost:8080/api/v1").rstrip("/")
PASSWORD = "Demo@1234"
BATCH_SIZE = 5_000
SAMPLES = int(os.environ.get("IITSM_GROWTH_SAMPLES", "10"))
COMPOSE = [
    "docker", "compose", "--project-name", "iitsm-demo",
    "--file", str(ROOT / "deploy/docker-compose.yml"),
    "--file", str(ROOT / "deploy/docker-compose.demo.yml"),
    "--profile", "demo",
]
READ_ENDPOINTS = {
    "incident_list": "/incidents?page=0&size=50&status=CLOSED",
    "report_overview": "/reports/overview",
    "report_trends": "/reports/trends?bucket=day",
    "sla_compliance": "/reports/sla-compliance",
    "audit_search": "/audit?action=INCIDENT_CREATED&size=50",
}
PLAN_QUERIES = {
    "audit_action_and_date": """
        SELECT id, incident_id, actor_id, action, created_at
        FROM audit_records
        WHERE action = 'INCIDENT_CREATED'
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        ORDER BY created_at DESC, id DESC LIMIT 100
    """,
    "recent_resolved_incidents": """
        SELECT id, service_id, priority, status, resolved_at
        FROM incidents
        WHERE resolved_at IS NOT NULL
          AND resolved_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        ORDER BY resolved_at DESC LIMIT 100
    """,
    "open_sla_candidates": """
        SELECT id, status, resolution_due FROM incidents
        WHERE status IN ('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED',
                         'IN_PROGRESS','PENDING_USER_INFO','REOPENED')
          AND resolution_due <= CURRENT_TIMESTAMP
        ORDER BY resolution_due LIMIT 100
    """,
    "escalation_candidates": """
        SELECT id, priority, status FROM incidents
        WHERE priority IN ('P1','P2') AND status IN ('ASSIGNED','CLASSIFIED')
        ORDER BY id LIMIT 100
    """,
    "service_open_recent": """
        SELECT id, service_id, status, created_at FROM incidents
        WHERE service_id = (SELECT min(id) FROM services)
          AND status IN ('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED',
                         'IN_PROGRESS','PENDING_USER_INFO','REOPENED')
          AND created_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
        ORDER BY created_at DESC LIMIT 100
    """,
}
INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_audit_records_created_at ON audit_records (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_records_action ON audit_records (action);
CREATE INDEX IF NOT EXISTS idx_incidents_resolved_at ON incidents (resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_open ON incidents (id)
  WHERE status IN ('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS','PENDING_USER_INFO','REOPENED');
CREATE INDEX IF NOT EXISTS idx_incidents_escalation ON incidents (id)
  WHERE priority IN ('P1','P2') AND status IN ('ASSIGNED','CLASSIFIED');
CREATE INDEX IF NOT EXISTS idx_incidents_service_status_created
  ON incidents (service_id, status, created_at DESC);
ANALYZE incidents;
ANALYZE audit_records;
"""
RESULT = {
    "status": "running",
    "date": datetime.now(timezone.utc).isoformat(),
    "commit": os.environ.get("GITHUB_SHA", "local"),
    "target": "disposable demo Compose stack only",
    "counts": {},
    "api_measurements": {},
    "query_plans": {"before_indexes": {}, "after_indexes": {}},
    "index_experiment": "Indexes are temporary to this disposable database; no migration is created.",
}


def write_growth_csv(source: Path, output: Path, count: int, offset: int = 0) -> None:
    with source.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        fields = reader.fieldnames
        rows = list(reader)
    if not fields or not rows:
        raise ValueError(f"No historical seed rows found in {source}")
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for index in range(count):
            number = offset + index + 1
            row = rows[index % len(rows)].copy()
            suffix = f" A7-growth-{number:06d}"
            row["title"] = row["title"][:200 - len(suffix)] + suffix
            row["description"] = (f"Synthetic A7 growth fixture {number}. " + row["description"])[:5000]
            writer.writerow(row)


def compose_psql(sql: str, timeout: int = 600) -> str:
    command = COMPOSE + ["exec", "-T", "db", "psql", "-U", "iitsm", "-d", "iitsm",
                         "-v", "ON_ERROR_STOP=1", "-X", "-qAt", "-c", sql]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"Disposable PostgreSQL command failed: {result.stderr[-4000:]}")
    return result.stdout.strip()


def incident_count() -> int:
    return int(compose_psql("SELECT count(*) FROM incidents;"))


def grow_to(target: int, temp: Path) -> int:
    current = incident_count()
    if current > target:
        raise RuntimeError(f"Fresh demo has {current} incidents, already above target {target}")
    added = 0
    source = ROOT / "docs/content/historical_incidents.csv"
    while current < target:
        batch = min(BATCH_SIZE, target - current)
        csv_path = temp / "growth.csv"
        sql_path = temp / "growth.sql"
        write_growth_csv(source, csv_path, batch, offset=added)
        subprocess.run([
            sys.executable, str(ROOT / "db/tools/generate_history_sql.py"),
            "--input", str(csv_path), "--output", str(sql_path),
        ], cwd=ROOT, check=True, capture_output=True, text=True)
        command = COMPOSE + ["exec", "-T", "db", "psql", "-U", "iitsm", "-d", "iitsm",
                             "-v", "ON_ERROR_STOP=1", "-X", "-q"]
        with sql_path.open("rb") as sql_file:
            loaded = subprocess.run(command, cwd=ROOT, stdin=sql_file, capture_output=True,
                                    timeout=600)
        if loaded.returncode:
            detail = loaded.stderr.decode("utf-8", errors="replace")[-4000:]
            raise RuntimeError(f"Synthetic history load failed: {detail}")
        added += batch
        current = incident_count()
    compose_psql("ANALYZE incidents; ANALYZE audit_records;")
    if current != target:
        raise RuntimeError(f"Expected {target} incidents after growth; found {current}")
    return added


def request(path: str, token: str) -> dict:
    req = Request(f"{API_BASE}{path}", headers={"Authorization": f"Bearer {token}"})
    started = time.perf_counter()
    try:
        with urlopen(req, timeout=120) as response:
            response.read()
            status = response.status
    except HTTPError as error:
        status = error.code
    except (URLError, TimeoutError) as error:
        return {"status": 0, "ms": round((time.perf_counter() - started) * 1000, 2),
                "error": type(error).__name__}
    return {"status": status, "ms": round((time.perf_counter() - started) * 1000, 2),
            "error": None if 200 <= status < 300 else f"HTTP {status}"}


def login() -> str:
    payload = json.dumps({"email": "asha.rao@iitsm.demo", "password": PASSWORD}).encode()
    req = Request(f"{API_BASE}/auth/login", data=payload,
                  headers={"Content-Type": "application/json"}, method="POST")
    with urlopen(req, timeout=30) as response:
        data = json.loads(response.read())
    return data["accessToken"]


def percentile(values: list[float], ratio: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int((len(ordered) - 1) * ratio + 0.5)))
    return round(ordered[index], 2)


def measure_api(token: str, label: str) -> None:
    stage = {}
    errors = []
    for name, path in READ_ENDPOINTS.items():
        request(path, token)  # one warm-up request per endpoint
        samples = [request(path, token) for _ in range(SAMPLES)]
        failures = [item for item in samples if item["error"]]
        if failures:
            errors.extend(f"{label}/{name}: {item['error']}" for item in failures)
        values = [item["ms"] for item in samples]
        stage[name] = {
            "path": path,
            "requests": len(samples),
            "http_errors": len(failures),
            "p50_ms": percentile(values, 0.50),
            "p95_ms": percentile(values, 0.95),
        }
    RESULT["api_measurements"][label] = stage
    if errors:
        raise RuntimeError("Read measurement failed: " + "; ".join(errors))


def explain_queries() -> dict:
    plans = {}
    for name, query in PLAN_QUERIES.items():
        raw = compose_psql(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}", timeout=180)
        parsed = json.loads(raw)
        plans[name] = parsed[0]
    return plans


def main() -> None:
    host = urlparse(API_BASE).hostname
    if host not in {"localhost", "127.0.0.1"}:
        raise RuntimeError("A7 growth test only permits a localhost disposable stack")
    output = Path(os.environ.get("IITSM_GROWTH_EVIDENCE", "/tmp/iitsm-data-growth.json"))
    try:
        with tempfile.TemporaryDirectory(prefix="iitsm-a7-growth-") as directory:
            temp = Path(directory)
            initial = incident_count()
            RESULT["counts"]["before"] = initial
            RESULT["counts"]["10k_added"] = grow_to(10_000, temp)
            RESULT["counts"]["at_10k"] = incident_count()
            token = login()
            measure_api(token, "10k")

            RESULT["counts"]["to_100k_added"] = grow_to(100_000, temp)
            RESULT["counts"]["at_100k"] = incident_count()
            RESULT["query_plans"]["before_indexes"] = explain_queries()
            measure_api(token, "100k_before_indexes")

            compose_psql(INDEX_SQL, timeout=600)
            RESULT["query_plans"]["after_indexes"] = explain_queries()
            measure_api(token, "100k_after_indexes")
        RESULT["status"] = "passed"
    except Exception as error:
        RESULT["status"] = "failed"
        RESULT["error"] = f"{type(error).__name__}: {error}"
        raise
    finally:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(RESULT, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(RESULT, indent=2))


if __name__ == "__main__":
    main()
