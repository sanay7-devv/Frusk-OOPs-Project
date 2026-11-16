# Smoke suites

Python scripts that drive a running backend over HTTP (and the Postgres container through `docker exec ... psql`) and print `PASS`/`FAIL` lines. Each creates its own throwaway data, so run them against a local dev database, never a shared one. Handed over to the Testing teammate; the module numbers match `docs/ROADMAP.md`. This folder in git is the only source of truth.

## Run everything (one command)

```bash
cd backend
./mvnw -q -DskipTests package                  # builds target/iitsm-backend-0.0.1-SNAPSHOT.jar
docker run -d --name iitsm-db -p 5433:5432 -e POSTGRES_DB=iitsm -e POSTGRES_USER=iitsm -e POSTGRES_PASSWORD=iitsm postgres:16   # skip if it exists
docker run -d --name iitsm-mail -p 1025:1025 -p 8025:8025 axllent/mailpit                                                         # only m9 and a12_a4 need it
cd smoke-tests
python -X utf8 run_all.py                      # about 30 minutes; prints a table of PASS/FAIL counts per suite
```

`run_all.py` does the set-up for you: for each group it drops and creates a fresh database, starts the jar with the group's profile and environment (always `LLM_PROVIDER=fake`, `GOOGLE_VERIFIER=fake`, no LLM or embedding key, started in a temporary folder so no `.env` is read), waits for health, runs the group's suites, stops the backend and drops the database. Per-suite output and backend logs go to `_run/` (git-ignored). `python -X utf8 run_all.py --list` shows the plan; `python -X utf8 run_all.py m11 m4_smoke` runs only the groups or suites named exactly.

Environment variables of `run_all.py` (defaults in brackets): `SMOKE_CONTAINER` Postgres container [`iitsm-db`], `SMOKE_PG_PORT` its host port [5433], `SMOKE_PORT` backend port [8081], `SMOKE_JAR` [`../target/iitsm-backend-0.0.1-SNAPSHOT.jar`], `SMOKE_DB_PREFIX` [`smoke`], `SMOKE_OUT` output folder [`_run`], `SMOKE_CONTRACT_OUT` [`_run/contract`], `SMOKE_ALLOW_OUTAGE=1` lets m14 stop the Postgres container for its 503 check (throwaway container only, otherwise that one check is skipped). Several runs can go in parallel if each has its own `SMOKE_PORT`, `SMOKE_DB_PREFIX` and `SMOKE_OUT`.

## Running a single suite by hand

Start the backend yourself (Postgres on 5433, `DB_URL=jdbc:postgresql://localhost:5433/<db>`, `SPRING_PROFILES_ACTIVE=<profile>`, `SERVER_PORT=<port>`, `LLM_PROVIDER=fake`, `GOOGLE_VERIFIER=fake` and `GOOGLE_CLIENT_ID=test-client-id.apps.googleusercontent.com`) on an empty database (Flyway builds the schema and the seed), then, from this folder:

```bash
SMOKE_PORT=8081 SMOKE_DB=<db> SMOKE_CONTAINER=iitsm-db python -X utf8 m4_smoke.py
```

All suites read the same three variables: `SMOKE_PORT` (backend port, default 8081 unless the table says otherwise), `SMOKE_DB` (database name, default `iitsm`) and `SMOKE_CONTAINER` (Postgres container used for `docker exec ... psql`, default `iitsm-db`). `ITSM_PORT` / `ITSM_DB` still work for m11 and e034 as fallbacks. Use plain `python -X utf8` (not `-I`: the suites import `m12_common` and `smoke_setup` from this folder). Python 3.10+, standard library only.

## Suites

| Script | Profile | Covers |
|---|---|---|
| `auth_smoke.py` | dev | M2 register, login, refresh, logout, lockout |
| `m2b_smoke.py` | dev | M2b Google sign-in with the fake verifier (default port 8085, database `iitsm_m2b`) |
| `m3_smoke.py` | dev | M3 catalog and configuration endpoints (reads the number of settings from the API) |
| `m4_smoke.py` | dev | M4 incidents and M5 priority engine |
| `m6_smoke.py` | dev | Admin users/roles/skills and M6 assignment |
| `m7_smoke.py` | dev | M7 SLA monitor (argv[1] = backend log file) |
| `calendar_smoke.py` | dev | Business-hours SLA calendar |
| `m8_smoke.py` | dev | M8 events and the audit trail |
| `m9_smoke.py` | dev | M9 notifications (Mailpit on 1025/8025; optional `SMOKE_LOG`, `SMOKE_MAIL_CONTAINER`) |
| `m10_smoke.py` | dev | M10 search, reports, CSV and PDF export, slaState AT_RISK |
| `m11_smoke.py` | dev, also dev,demo | M11 escalation, auto-verify, escalation preview, demo clock (argv[1] = backend log; the clock answers 404 on dev, works on demo) |
| `e034_check.py` | dev | E-034 escalation notifications; run right after `m11_smoke.py` on the same database |
| `m12_calibrate.py` | dev | Prints TF-IDF similarity of a labelled set and the best thresholds (not pass/fail, not run by `run_all.py`) |
| `m12_smoke.py` | dev | M12 intelligence: duplicates, summarizer, LLM paths, AT_RISK (`M12_MODE=nokey` for the no-key path, `M12_LOG`, `M12_STATE`) |
| `m12b_smoke.py` | dev | Rest of M12: withdraw, problems, Major Incident Mode, recurring problems, chatbot; checks the drill path is 404 on dev |
| `m12b_drill.py` | dev,demo | D2 outage drill |
| `m12c_embedding_smoke.py` | dev | Gemini embeddings against a built-in stub on port 18091 (backend needs `EMBEDDING_API_KEY=stub-key EMBEDDING_BASE_URL=http://localhost:18091 LLM_PROVIDER=fake`) |
| `gemini_stub_check.py` | dev | Gemini adapter against a built-in stub on port 18090 (backend needs `LLM_PROVIDER=gemini LLM_API_KEY=stub-key LLM_BASE_URL=http://localhost:18090`) |
| `m13_smoke.py` | dev | M13 live dashboard over STOMP, WebSocket permissions, service graph, status board (needs `APP_JWT_ACCESS_TOKEN_MINUTES=1` for the expiry check, skipped otherwise) |
| `m14_smoke.py` | dev | M14 hardening: attachments, 503 on DB outage, rate limits, password policy, seals (`SMOKE_DB_CONTAINER` = throwaway Postgres container, `SMOKE_SKIP_OUTAGE=1` skips the outage check, optional `M14_LOG`) |
| `a12_a4_smoke.py` | dev | A12 password reset and TOTP, A4 simulated push (Mailpit on 8025) |
| `s1_smoke.py` | dev | S1 Service Desk Simulator |
| `demo_timings_check.py` | dev,demo | Handbook 2.12: demo timings measured in real time (SLA monitor 30 s, escalation 1 minute per level, auto-verify about 2 minutes); takes about 3 minutes |
| `endpoint_sweep.py` | dev | Calls every implemented operation (including the A12, A4 and S1 ones) and measures coverage against `/v3/api-docs` (uses `sweep_parts/`; needs `GOOGLE_VERIFIER=fake`) |
| `check_contract.py` | any | Structural checks of the live OpenAPI contract; `python check_contract.py <dir>` also exports `iitsm-api.json` and `.yaml` there (port from `SMOKE_PORT`) |
| `gen_planned.py` | none | Regenerates `planned-endpoints.json`: `python gen_planned.py <output path>` |
| `smoke_setup.py`, `m12_common.py`, `sweep_parts/`, `run_all.py` | | Shared helpers and the runner, not suites |

## Run order and state

- Suites are independent unless stated. Use a fresh database per group (that is what `run_all.py` does): some suites change seeded users' passwords or settings, and a few count rows in the whole database.
- Settings a suite relies on are set and restored by the suite itself through the admin API (`smoke_setup.py`): `autocat.apply.confidence=1` (otherwise DEC-70 assigns confident incidents on creation and nothing waits in triage) and `ratelimit.incident.create.per.minute` / `ratelimit.login.per.minute` raised to 1000 (the M14 limits answer 429 on bursts). m4, m6 and m9 do this; m11 sets its own monitor intervals.
- The monitors read their interval after each run: the first run comes 10 s after start and the next one a whole default interval later, so a suite that sets 5 s intervals (m10, m11) first waits until the backend is about 75 s old (`smoke_setup.settle_monitors`).
- `m11_smoke.py` then `e034_check.py`: same database. `run_all.py` runs them on `dev`, and `m11_smoke.py` once more on `dev,demo` (demo clock endpoint). Both suites move timers in the database: `audit_records` and `audit_seals` are append-only (triggers V7, V8, and a foreign key from the seal entries), so the suites lift the trigger, or use `session_replication_role = replica`, for those test-only statements; m11 also deactivates the seeded team leads and administrators so its recipient counts are exact.
- `m12_smoke.py` writes `m12_state.txt` (git-ignored; `run_all.py` keeps it in the output folder and deletes it first). Delete it by hand when you restart on a new database.
- `m12b_smoke.py` expects the `dev` profile (the drill endpoint must answer 404); `m12b_drill.py` needs `dev,demo`.
- `m14_smoke.py` stops its Postgres container briefly for the 503 check: only against a throwaway container.
- `s1_smoke.py` and `a12_a4_smoke.py` need the Flyway seed (any `dev` start on an empty database has it) and log in with the seeded demo password (see `db/README.md`).
