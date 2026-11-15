# Smoke suites

Python scripts that drive a running backend over HTTP (and the Postgres container through `docker exec ... psql`) and print `PASS`/`FAIL` lines. Each creates its own throwaway data, so run them against a local dev database, never a shared one. Handed over to the Testing teammate; the module numbers match `docs/ROADMAP.md`.

## Prerequisites

- Python 3.10+ (standard library only, no `pip install` needed).
- Backend running locally, profile `dev,schema-auto` unless a suite says otherwise (`SPRING_PROFILES_ACTIVE=dev,schema-auto`). Postgres runs in the Docker container `iitsm-db` (host port 5433); the scripts call `docker exec iitsm-db psql`, so Docker must be on `PATH`.
- Mailpit (SMTP 1025, API 8025, container `iitsm-mail`) for `m9_smoke.py` and `a12_a4_smoke.py`.
- Settings by environment variable: `SMOKE_PORT` (backend port, default 8081 in most suites) and `SMOKE_DB` (database name, default `iitsm`). `m11_smoke.py` and `e034_check.py` use `ITSM_PORT` / `ITSM_DB`. Some suites default to another port (m13 8083, m14 8084, m2b 8085); each script's docstring lists its own settings.
- Run from this folder: `python -X utf8 m4_smoke.py`. Use plain `python` (not `-I`) for suites that import `m12_common`.

## Suites

| Script | Covers |
|---|---|
| `auth_smoke.py` | M2 register, login, refresh, logout, lockout |
| `m2b_smoke.py` | M2b Google sign-in with the fake verifier (backend needs `GOOGLE_VERIFIER=fake`, `GOOGLE_CLIENT_ID=test-client-id.apps.googleusercontent.com`) |
| `m3_smoke.py` | M3 catalog and configuration endpoints |
| `m4_smoke.py` | M4 incidents and M5 priority engine |
| `m6_smoke.py` | Admin users/roles/skills and M6 assignment |
| `m7_smoke.py` | M7 SLA monitor (argv[1] = backend log file) |
| `calendar_smoke.py` | Business-hours SLA calendar |
| `m8_smoke.py` | M8 events and the audit trail |
| `m9_smoke.py` | M9 notifications (needs Mailpit; optional `SMOKE_LOG`, `SMOKE_MAIL_CONTAINER`) |
| `m10_smoke.py` | M10 search, reports, PDF export |
| `m11_smoke.py` | M11 escalation, auto-verify, escalation preview, demo clock (argv[1] = backend log file) |
| `e034_check.py` | E-034 escalation notifications; run right after `m11_smoke.py` on the same fresh database |
| `m12_calibrate.py` | Prints TF-IDF similarity of a labelled set and the best thresholds (not pass/fail) |
| `m12_smoke.py` | M12 intelligence (duplicates, summarizer, LLM paths) |
| `m12b_smoke.py` | Rest of M12: withdraw, problems, Major Incident Mode, recurring problems, chatbot |
| `m12b_drill.py` | D2 outage drill |
| `m13_smoke.py` | M13 live dashboard over STOMP, WebSocket permissions, service graph, status board |
| `m14_smoke.py` | M14 hardening: attachments, 503 on DB outage, rate limits, password policy, seals |
| `a12_a4_smoke.py` | A12 password reset and TOTP, A4 simulated push |
| `s1_smoke.py` | S1 Service Desk Simulator |
| `gemini_stub_check.py` | Gemini adapter against a local stub on port 18090 (backend needs `LLM_PROVIDER=gemini LLM_API_KEY=stub-key LLM_BASE_URL=http://localhost:18090`) |
| `endpoint_sweep.py` | Calls every implemented endpoint and measures coverage against `/v3/api-docs` (uses `sweep_parts/`) |
| `check_contract.py` | Structural checks of the live OpenAPI contract; `python check_contract.py <docs/openapi dir>` also exports it (port 8081 is fixed in the script) |
| `gen_planned.py` | Regenerates `planned-endpoints.json`: `python gen_planned.py <output path>` |
| `m12_common.py`, `sweep_parts/` | Shared helpers, not run directly |

## Run order and state

- Most suites are independent; use a fresh database for each run when you can (some change seeded users' passwords or settings).
- `m12_smoke.py` writes `m12_state.txt` (git-ignored) with the incident code it created; delete the file when you start from a fresh database. `M12_MODE=nokey` runs the no-key path against a backend without an LLM key, `M12_LOG` points at the backend log.
- `m11_smoke.py` then `e034_check.py`, same database (default `iitsm_m11`).
- `m12b_drill.py` needs the `demo` profile (`dev,schema-auto,demo`); `m12b_smoke.py` also checks the 404 of the same path on a non-demo backend, so it expects the `dev` profile.
- `m11_smoke.py` needs the demo clock endpoint: 404 on `dev`, working on `demo`; the docstring says which result each profile expects.
- `m13_smoke.py` needs `APP_JWT_ACCESS_TOKEN_MINUTES=1` for the token-expiry check (skipped otherwise).
- `m14_smoke.py` stops its DB container briefly for the 503 check: point `SMOKE_DB_CONTAINER` at a throwaway container, never `iitsm-db`, or set `SMOKE_SKIP_OUTAGE=1`.
- `s1_smoke.py` and `a12_a4_smoke.py` need the Flyway seed (profile `dev` without `schema-auto`); they log in with the seeded demo password `Demo@1234` (already in `db/README.md`).
