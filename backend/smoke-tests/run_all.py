"""Runs every smoke suite against a freshly started backend, one fresh database per group, and prints a results table.

    python -X utf8 run_all.py              # everything
    python -X utf8 run_all.py m4_smoke m7   # only the suites or groups with exactly these names
    python -X utf8 run_all.py --list       # show the plan

It needs Docker (a running Postgres container, see SMOKE_CONTAINER) and a built jar (./mvnw -q -DskipTests package).
For each group it drops and creates the database, starts the jar with the group's profile and environment (always
LLM_PROVIDER=fake, GOOGLE_VERIFIER=fake, no LLM or embedding key, so nothing leaves the machine), waits for the
health check, runs the group's suites, and stops the backend. Mailpit (SMTP 1025, API 8025) must be running for m9
and a12_a4; without it those two are reported as SKIPPED.

Settings by environment variable (defaults in brackets):
  SMOKE_CONTAINER   Postgres container to run psql in [iitsm-db]
  SMOKE_PG_PORT     host port of that container [5433]
  SMOKE_PORT        port the backend listens on [8081]
  SMOKE_JAR         path of the jar [../target/iitsm-backend-0.0.1-SNAPSHOT.jar]
  SMOKE_DB_PREFIX   database name prefix; each group uses <prefix>_<group> [smoke]
  SMOKE_OUT         folder for per-suite output and backend logs [./_run]
  SMOKE_CONTRACT_OUT  folder check_contract.py exports the OpenAPI files to [./_run/contract]
  SMOKE_ALLOW_OUTAGE  1 = let m14 stop the Postgres container for its 503 check (throwaway container only)
  SMOKE_MAIL_CONTAINER  Mailpit container, only used by m9 [iitsm-mail]
"""
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
CONTAINER = os.environ.get("SMOKE_CONTAINER", "iitsm-db")
PG_PORT = os.environ.get("SMOKE_PG_PORT", "5433")
PORT = os.environ.get("SMOKE_PORT", "8081")
JAR = os.environ.get("SMOKE_JAR", str(HERE.parent / "target" / "iitsm-backend-0.0.1-SNAPSHOT.jar"))
PREFIX = os.environ.get("SMOKE_DB_PREFIX", "smoke")
CLIENT_ID = "test-client-id.apps.googleusercontent.com"

# (group, profile, extra backend env, [(script, needs backend log as argv[1] / env var, extra suite env)])
# A suite name is the script without .py. "LOG" = pass the backend log as argv[1]; "ENVLOG:NAME" = in env var NAME.
GROUPS = [
    ("core", "dev", {}, [
        ("auth_smoke",), ("m3_smoke",), ("m4_smoke",), ("m6_smoke",), ("calendar_smoke",), ("m8_smoke",),
        ("m10_smoke",), ("s1_smoke",), ("a12_a4_smoke",), ("m9_smoke", "ENVLOG:SMOKE_LOG", {"MAIL": 1}),
    ]),
    ("m7", "dev", {}, [("m7_smoke", "LOG")]),
    ("m11", "dev", {}, [("m11_smoke", "LOG")]),
    ("m11demo", "dev,demo", {}, [("m11_smoke", "LOG"), ("e034_check",)]),
    ("m12", "dev", {}, [("m12_smoke", "ENVLOG:M12_LOG")]),
    ("m12b", "dev", {}, [("m12b_smoke",)]),
    ("m12demo", "dev,demo", {}, [("m12b_drill",)]),
    ("demotimings", "dev,demo", {}, [("demo_timings_check",)]),
    ("m12c", "dev", {"EMBEDDING_API_KEY": "stub-key", "EMBEDDING_BASE_URL": "http://localhost:18091"},
     [("m12c_embedding_smoke",)]),
    ("gemini", "dev", {"LLM_PROVIDER": "gemini", "LLM_API_KEY": "stub-key", "LLM_BASE_URL": "http://localhost:18090"},
     [("gemini_stub_check",)]),
    ("m13", "dev", {"APP_JWT_ACCESS_TOKEN_MINUTES": "1"}, [("m13_smoke",)]),
    ("m14", "dev", {}, [("m14_smoke", "ENVLOG:M14_LOG", {"OUTAGE": 1})]),
    ("m2b", "dev", {}, [("m2b_smoke",)]),
    ("sweep", "dev", {}, [("endpoint_sweep",), ("check_contract", "ARG:" + os.environ.get("SMOKE_CONTRACT_OUT", str(HERE / "_run" / "contract")))]),
]


def psql(sql, db="postgres"):
    return subprocess.run(["docker", "exec", CONTAINER, "psql", "-U", "iitsm", "-d", db, "-tAc", sql],
                          capture_output=True, text=True)


def port_open(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("localhost", int(port))) == 0


def start_backend(group, profile, env, db, log):
    psql(f"select pg_terminate_backend(pid) from pg_stat_activity where datname='{db}'")
    psql(f'drop database if exists "{db}"')
    r = psql(f'create database "{db}"')
    if r.returncode != 0:
        raise SystemExit("cannot create database: " + r.stderr)
    e = dict(os.environ)
    for k in ("LLM_API_KEY", "GEMINI_API_KEY", "EMBEDDING_API_KEY", "EMBEDDING_BASE_URL", "LLM_BASE_URL"):
        e.pop(k, None)
    e.update({"SPRING_PROFILES_ACTIVE": profile, "SERVER_PORT": PORT, "LLM_PROVIDER": "fake",
              "GOOGLE_VERIFIER": "fake", "GOOGLE_CLIENT_ID": CLIENT_ID,
              "DB_URL": f"jdbc:postgresql://localhost:{PG_PORT}/{db}", "DB_USER": "iitsm", "DB_PASSWORD": "iitsm",
              "ATTACHMENTS_DIR": str(pathlib.Path(tempfile.gettempdir()) / f"smoke_att_{db}")})
    e.update(env)
    work = pathlib.Path(tempfile.mkdtemp(prefix="smoke_cwd_"))  # no .env, no ./data next to the sources
    proc = subprocess.Popen(["java", "-jar", JAR], cwd=work, env=e, stdout=open(log, "w", encoding="utf-8"),
                            stderr=subprocess.STDOUT)
    deadline = time.time() + 300
    while time.time() < deadline:
        if proc.poll() is not None:
            raise SystemExit(f"backend for {group} exited early, see {log}")
        try:
            with urllib.request.urlopen(f"http://localhost:{PORT}/actuator/health", timeout=2) as r:
                if r.status == 200:
                    return proc, work
        except Exception:
            time.sleep(1)
    proc.kill()
    raise SystemExit(f"backend for {group} did not become healthy, see {log}")


def stop_backend(proc, work):
    subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], capture_output=True) if os.name == "nt" \
        else proc.terminate()
    try:
        proc.wait(30)
    except subprocess.TimeoutExpired:
        proc.kill()
    shutil.rmtree(work, ignore_errors=True)


def mail_up():
    return port_open(8025) and port_open(1025)


def run_suite(spec, db, log, out_dir):
    name = spec[0]
    how = spec[1] if len(spec) > 1 else ""
    flags = spec[2] if len(spec) > 2 else {}
    env = dict(os.environ)
    env.update({"SMOKE_PORT": PORT, "SMOKE_DB": db, "SMOKE_CONTAINER": CONTAINER, "SMOKE_DB_CONTAINER": CONTAINER,
                "ITSM_PORT": PORT, "ITSM_DB": db, "PYTHONUTF8": "1", "SMOKE_LOG": "", "M12_STATE": str(out_dir / f"{name}.state")})
    args = [sys.executable, "-X", "utf8", str(HERE / f"{name}.py")]
    if how == "LOG":
        args.append(str(log))
    elif how.startswith("ENVLOG:"):
        env[how.split(":", 1)[1]] = str(log)
    elif how.startswith("ARG:"):
        args.append(how[4:])
    if flags.get("OUTAGE"):
        pass  # m14 stops and restarts SMOKE_DB_CONTAINER: only safe because the container is a throwaway one
    if flags.get("MAIL") and not mail_up():
        return name, None, None, "SKIPPED (no Mailpit on 1025/8025)"
    if name == "m14_smoke" and os.environ.get("SMOKE_ALLOW_OUTAGE") != "1":
        env["SMOKE_SKIP_OUTAGE"] = "1"
    if name == "m12c_embedding_smoke":
        env["SMOKE_CONTAINER"] = CONTAINER
    started = time.time()
    p = subprocess.run(args, cwd=HERE, env=env, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       timeout=1800)
    text = p.stdout + p.stderr
    (out_dir / f"{name}.out").write_text(text, encoding="utf-8")
    passed = len(re.findall(r"^\s*(?:\[?PASS\]?)\b", text, re.M))
    failed = len(re.findall(r"^\s*(?:\[?FAIL\]?)\b", text, re.M))
    note = f"{time.time() - started:.0f}s, exit {p.returncode}"
    return name, passed, failed, note


def main():
    words = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--list" in sys.argv:
        for g, prof, env, suites in GROUPS:
            print(g, prof, env or "", [s[0] for s in suites])
        return
    out_dir = pathlib.Path(os.environ.get("SMOKE_OUT", HERE / "_run"))
    out_dir.mkdir(exist_ok=True)
    for old in out_dir.glob("*.state"):
        old.unlink()  # m12_smoke keeps its incident code here; a new run starts on a new database
    rows = []
    for group, profile, env, suites in GROUPS:
        chosen = [s for s in suites if not words or any(w == group or w == s[0] for w in words)]
        if not chosen:
            continue
        db = f"{PREFIX}_{group}"
        log = out_dir / f"backend_{group}.log"
        print(f"--- {group}: profile {profile}, database {db}", flush=True)
        proc, work = start_backend(group, profile, env, db, log)
        try:
            for spec in chosen:
                row = run_suite(spec, db, log, out_dir)
                rows.append((group,) + row)
                print("   ", row, flush=True)
        finally:
            stop_backend(proc, work)
            psql(f'drop database if exists "{db}"')
    print("\n%-9s %-24s %6s %6s  %s" % ("group", "suite", "PASS", "FAIL", "note"))
    bad = 0
    for g, name, p, f, note in rows:
        print("%-9s %-24s %6s %6s  %s" % (g, name, p if p is not None else "-", f if f is not None else "-", note))
        bad += 1 if (f or (p is None and not note.startswith("SKIPPED"))) else 0
    print("TOTAL PASS %d FAIL %d" % (sum(r[2] or 0 for r in rows), sum(r[3] or 0 for r in rows)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
