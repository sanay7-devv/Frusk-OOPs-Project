"""Run the Task 3 A7 load profile against a disposable demo Compose stack.

This intentionally uses only Python's standard library so the load workflow has
no benchmark-tool install step. It logs in with synthetic demo accounts and
never targets the hosted application.
"""
from __future__ import annotations

import concurrent.futures
import csv
import json
import os
import random
import statistics
import subprocess
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get("IITSM_API_URL", "http://localhost:8080/api/v1")
PASSWORD = "Demo@1234"
MIXED_SECONDS = int(os.environ.get("IITSM_MIXED_SECONDS", "300"))
WAVES_PER_LEVEL = int(os.environ.get("IITSM_LOAD_WAVES", "3"))
RUN_TAG = uuid.uuid4().hex[:10]
REQUEST_ID = 0
REQUEST_ID_LOCK = threading.Lock()
RESULT = {
    "date": datetime.now(timezone.utc).isoformat(),
    "commit": os.environ.get("GITHUB_SHA", "local"),
    "environment": {
        "runner": os.environ.get("RUNNER_OS", "local"),
        "architecture": os.environ.get("RUNNER_ARCH", "local"),
        "target": "disposable demo Compose stack",
        "incident_count_before": None,
        "incident_count_after": None,
        "create_rate_limit_override": {"setting": "ratelimit.incident.create.per.minute", "default": 20,
                                       "mixed_test_value": 1000, "restored": False},
    },
    "profile": {
        "waves_per_concurrency": WAVES_PER_LEVEL,
        "mixed_duration_seconds": MIXED_SECONDS,
        "mixed_concurrency": 10,
        "mixed_transaction_weights": {"reads_and_reports": 70, "creates": 20, "lifecycle_create_and_withdraw": 10},
    },
    "levels": {},
    "mixed": {},
    "resource_samples": {"available": False, "samples": 0, "backend_cpu_peak_percent": None, "backend_memory_peak_bytes": None},
}


def api(path: str, token: str | None = None, method: str = "GET", body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(f"{BASE}{path}", headers=headers, method=method, data=payload)
    started = time.perf_counter()
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read()
            status = response.status
    except HTTPError as error:
        raw = error.read()
        status = error.code
    except (URLError, TimeoutError) as error:
        return {"status": 0, "seconds": time.perf_counter() - started, "data": None, "error": type(error).__name__}
    elapsed = time.perf_counter() - started
    try:
        data = json.loads(raw) if raw else None
    except json.JSONDecodeError:
        data = None
    return {"status": status, "seconds": elapsed, "data": data,
            "error": None if 200 <= status < 300 else f"HTTP {status}"}


def login(email: str):
    result = api("/auth/login", method="POST", body={"email": email, "password": PASSWORD})
    if result["status"] != 200 or not result["data"].get("accessToken"):
        raise RuntimeError(f"Demo login failed for {email}: {result['status']}")
    return result["data"]


def flatten_categories(nodes):
    ids = []
    for node in nodes:
        if not node.get("children"):
            ids.append(node["id"])
        else:
            ids.extend(flatten_categories(node["children"]))
    return ids


def next_request_id():
    global REQUEST_ID
    with REQUEST_ID_LOCK:
        REQUEST_ID += 1
        return REQUEST_ID


def create_incident(token: str, service_id: int, category_id: int | None):
    number = next_request_id()
    body = {
        "title": f"Task 3 load {RUN_TAG} {number}",
        "description": f"Synthetic CI performance record {RUN_TAG} request {number}; safe to discard.",
        "serviceId": service_id,
        "impact": 2,
        "urgency": 2,
        "affectedUsers": 1,
        "confirmNotDuplicate": True,
    }
    if category_id is not None:
        body["categoryId"] = category_id
    return api("/incidents", token=token, method="POST", body=body)


def percentile(values, p):
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, int((len(ordered) - 1) * p + 0.5)))
    return ordered[index]


def summarize(observations, elapsed_seconds):
    latencies = [item["seconds"] for item in observations]
    failures = [item for item in observations if item["status"] == 0 or not 200 <= item["status"] < 300]
    return {
        "requests": len(observations),
        "successes": len(observations) - len(failures),
        "errors": len(failures),
        "error_rate_percent": round(100 * len(failures) / len(observations), 3) if observations else 0,
        "p50_ms": round(percentile(latencies, 0.50) * 1000, 2) if latencies else None,
        "p95_ms": round(percentile(latencies, 0.95) * 1000, 2) if latencies else None,
        "mean_ms": round(statistics.fmean(latencies) * 1000, 2) if latencies else None,
        "throughput_requests_per_second": round(len(observations) / elapsed_seconds, 2) if elapsed_seconds else 0,
        "error_statuses": dict(sorted((str(code), sum(1 for item in failures if item["status"] == code))
                                      for code in {item["status"] for item in failures})),
    }


def run_waves(concurrency, waves, action):
    observations = []
    started = time.perf_counter()
    for wave in range(waves):
        barrier = threading.Barrier(concurrency)

        def run(slot):
            barrier.wait(timeout=30)
            return action(slot, wave)

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = [pool.submit(run, slot) for slot in range(concurrency)]
            for future in concurrent.futures.as_completed(futures):
                observations.extend(future.result())
    elapsed = time.perf_counter() - started
    return summarize(observations, elapsed), observations, elapsed


def parse_memory_bytes(value):
    number, unit = value.strip().split(maxsplit=1)
    factor = {"B": 1, "kB": 1000, "KB": 1000, "KiB": 1024, "MB": 1000**2,
              "MiB": 1024**2, "GB": 1000**3, "GiB": 1024**3, "TB": 1000**4, "TiB": 1024**4}
    return int(float(number) * factor[unit])


class ResourceSampler:
    def __init__(self):
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.sample, daemon=True)

    def start(self):
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        self.thread.join(timeout=10)

    def sample(self):
        while not self.stop_event.is_set():
            try:
                output = subprocess.run(
                    ["docker", "stats", "--no-stream", "--format", "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}"],
                    capture_output=True, text=True, timeout=10, check=True,
                ).stdout
                for line in output.splitlines():
                    name, cpu, memory = line.split("|", maxsplit=2)
                    if "backend" not in name.lower():
                        continue
                    used = memory.split("/", maxsplit=1)[0].strip()
                    data = RESULT["resource_samples"]
                    data["available"] = True
                    data["samples"] += 1
                    data["backend_cpu_peak_percent"] = max(data["backend_cpu_peak_percent"] or 0, float(cpu.rstrip("%")))
                    data["backend_memory_peak_bytes"] = max(data["backend_memory_peak_bytes"] or 0, parse_memory_bytes(used))
            except (OSError, subprocess.SubprocessError, ValueError):
                pass
            self.stop_event.wait(5)


def read_path(path, token):
    return api(path, token=token)


def main():
    with (ROOT / "docs/content/seed_accounts.csv").open(newline="", encoding="utf-8") as handle:
        accounts = [row for row in csv.DictReader(handle) if "EMPLOYEE" in row["roles"].split(";")]
    sessions = {row["email"]: login(row["email"]) for row in accounts}
    admin_email = "asha.rao@iitsm.demo"
    admin = sessions[admin_email]
    service_result = api("/services", token=admin["accessToken"])
    categories_result = api("/categories", token=admin["accessToken"])
    if service_result["status"] != 200 or not service_result["data"]:
        raise RuntimeError("Unable to read demo services for load data")
    if categories_result["status"] != 200:
        raise RuntimeError("Unable to read demo categories for lifecycle workload")
    service_id = service_result["data"][0]["id"]
    category_ids = flatten_categories(categories_result["data"])
    if not category_ids:
        raise RuntimeError("No active demo category available for lifecycle workload")
    category_id = category_ids[0]
    admin_token = admin["accessToken"]

    initial_page = api("/incidents?page=0&size=1", token=admin_token)
    if initial_page["status"] != 200 or not initial_page["data"].get("items"):
        raise RuntimeError("Demo incident list is empty; cannot run read scenarios")
    existing_incident_id = initial_page["data"]["items"][0]["id"]
    RESULT["environment"]["incident_count_before"] = initial_page["data"]["totalItems"]

    for concurrency in (10, 25, 50):
        level = {}
        create_index = [0]
        create_lock = threading.Lock()

        def report_create(slot, wave):
            with create_lock:
                account_index = create_index[0] % len(accounts)
                create_index[0] += 1
            token = sessions[accounts[account_index]["email"]]["accessToken"]
            result = create_incident(token, service_id, category_id)
            return [{"endpoint": "POST /incidents", "status": result["status"], "seconds": result["seconds"]}]

        level["reporting_create"] = run_waves(concurrency, WAVES_PER_LEVEL, report_create)[0]

        read_paths = [
            "/incidents?page=0&size=20",
            f"/incidents/{existing_incident_id}",
            "/notifications/unread-count",
            "/reports/overview",
            "/reports/trends?bucket=day",
            "/reports/sla-compliance",
        ]

        def read_mix(slot, wave):
            path = read_paths[(slot + wave) % len(read_paths)]
            result = read_path(path, admin_token)
            return [{"endpoint": f"GET {path}", "status": result["status"], "seconds": result["seconds"]}]

        read_summary, read_observations, read_elapsed = run_waves(concurrency, WAVES_PER_LEVEL, read_mix)
        level["reading_and_reports"] = read_summary
        level["reading_and_reports_by_endpoint"] = {
            endpoint: summarize([item for item in read_observations if item["endpoint"] == endpoint], read_elapsed)
            for endpoint in sorted({item["endpoint"] for item in read_observations})
        }
        RESULT["levels"][str(concurrency)] = level

    limit_change = api("/admin/config", token=admin_token, method="PUT", body=[
        {"key": "ratelimit.incident.create.per.minute", "value": "1000"},
    ])
    if limit_change["status"] != 200:
        raise RuntimeError(f"Unable to raise the disposable create limit for mixed load: {limit_change['status']}")

    read_paths = [
        "/incidents?page=0&size=20",
        f"/incidents/{existing_incident_id}",
        "/notifications/unread-count",
        "/reports/overview",
        "/reports/trends?bucket=day",
        "/reports/sla-compliance",
    ]
    mix_duration = MIXED_SECONDS
    concurrency = RESULT["profile"]["mixed_concurrency"]
    deadline = time.monotonic() + mix_duration
    observations = {"reads_and_reports": [], "creates": [], "lifecycle_create": [], "lifecycle_withdraw": []}
    observation_lock = threading.Lock()
    sampler = ResourceSampler()
    sampler.start()
    mixed_started = time.perf_counter()

    def mixed_worker(worker_id):
        local = {name: [] for name in observations}
        rng = random.Random(f"{RUN_TAG}-{worker_id}")
        iteration = 0
        while time.monotonic() < deadline:
            account = accounts[(worker_id + iteration) % len(accounts)]
            token = sessions[account["email"]]["accessToken"]
            choice = rng.randrange(100)
            if choice < 70:
                result = read_path(rng.choice(read_paths), admin_token)
                local["reads_and_reports"].append({"status": result["status"], "seconds": result["seconds"]})
            elif choice < 90:
                result = create_incident(token, service_id, category_id)
                local["creates"].append({"status": result["status"], "seconds": result["seconds"]})
            else:
                created = create_incident(token, service_id, category_id)
                local["lifecycle_create"].append({"status": created["status"], "seconds": created["seconds"]})
                if created["status"] == 201 and created["data"] and created["data"].get("id"):
                    withdrawn = api(
                        f"/incidents/{created['data']['id']}/withdraw",
                        token=token,
                        method="POST",
                        body={"reason": "Synthetic CI lifecycle test; discard this demo record."},
                    )
                    local["lifecycle_withdraw"].append({"status": withdrawn["status"], "seconds": withdrawn["seconds"]})
            iteration += 1
            # Keep each seeded user comfortably below the API's 20-create/minute cap.
            time.sleep(0.8)
        with observation_lock:
            for key, items in local.items():
                observations[key].extend(items)

    try:
        sampler.start()
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = [pool.submit(mixed_worker, worker_id) for worker_id in range(concurrency)]
            for future in concurrent.futures.as_completed(futures):
                future.result()
    finally:
        sampler.stop()
        restored = api("/admin/config", token=admin_token, method="PUT", body=[
            {"key": "ratelimit.incident.create.per.minute", "value": "20"},
        ])
        RESULT["environment"]["create_rate_limit_override"]["restored"] = restored["status"] == 200

    mixed_elapsed = time.perf_counter() - mixed_started
    RESULT["mixed"]["elapsed_seconds"] = round(mixed_elapsed, 2)
    RESULT["mixed"]["transactions"] = sum(len(observations[key]) for key in ("reads_and_reports", "creates", "lifecycle_create"))
    RESULT["mixed"]["transaction_mix_percent"] = {
        key: round(100 * len(observations[key]) / RESULT["mixed"]["transactions"], 2)
        if RESULT["mixed"]["transactions"] else 0
        for key in ("reads_and_reports", "creates", "lifecycle_create")
    }
    RESULT["mixed"]["request_results"] = {
        key: summarize(items, mixed_elapsed) for key, items in observations.items()
    }
    final_page = api("/incidents?page=0&size=1", token=admin_token)
    RESULT["environment"]["incident_count_after"] = (
        final_page["data"]["totalItems"] if final_page["status"] == 200 else None
    )

    output_path = Path(os.environ.get("IITSM_LOAD_EVIDENCE", "/tmp/iitsm-load-test.json"))
    output_path.write_text(json.dumps(RESULT, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(RESULT, indent=2))

    failures = []
    for concurrency, level in RESULT["levels"].items():
        for scenario, metrics in level.items():
            if "errors" in metrics and metrics["errors"]:
                failures.append(f"{concurrency} concurrency {scenario}: {metrics['errors']} errors")
    for scenario, metrics in RESULT["mixed"]["request_results"].items():
        if metrics["errors"]:
            failures.append(f"mixed {scenario}: {metrics['errors']} errors")
    if not RESULT["environment"]["create_rate_limit_override"]["restored"]:
        failures.append("could not restore the disposable demo create limit to its default")
    if failures:
        raise SystemExit("Load run completed with HTTP errors: " + "; ".join(failures))


if __name__ == "__main__":
    main()
