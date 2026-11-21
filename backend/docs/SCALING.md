# I-ITSM scalability: index review and scale-out path (A7)

Written 2026-11-15 (decision DEC-114). This is the Backend Lead's half of A7: an index review and a written scale-out path. The load test itself, with numbers, is the Testing teammate's half (section 5 says what to measure and where to record it).

## 1. What this review is and is not

- It is a **desk review of query shapes against the real schema** (Flyway V1 to V9 on `main`, checked on a migrated database), plus a list of what in the code assumes a single running instance.
- It is **not** a measurement. The seed data has 212 incidents and about 2,000 audit rows; at that size PostgreSQL scans tables whatever indexes exist, so timings would prove nothing. The recommendations are justified by how the queries are written. Test each one with `EXPLAIN (ANALYZE)` on a database filled to 100,000 incidents before adding it for good.
- The system today is designed and demonstrated as **one backend instance and one PostgreSQL database**, which is what the course project needs (DEC-42). Everything below is the path past that.

## 2. Index review

### 2.1 What exists

The schema already indexes every foreign key and the main filter columns. On `incidents`: assignee, category, created_at, duplicate_of, priority, problem, reporter, resolution_due, response_due, service, status, and a unique `code`. On `audit_records`: actor, and (incident_id, created_at). On `notifications`: (user_id, created_at), (user_id, read), incident. `refresh_tokens.token_hash` is indexed. These cover single-incident reads, the incident list filters, the assignee queue and the notification inbox.

### 2.2 Gaps found, in order of value

| # | Query (where it runs) | Why it will not scale as written | Recommended index |
|---|---|---|---|
| 1 | `GET /audit` (admin audit log): filters on `created_at` range, action, actor, incident; orders by `created_at desc, id desc` | `audit_records` is the fastest-growing table (about 10 rows per incident today). Only actor and (incident, created) are indexed, so a date-range or unfiltered listing sorts the whole table | `CREATE INDEX idx_audit_records_created_at ON audit_records (created_at DESC, id DESC);` and, if the action filter is used heavily, `CREATE INDEX idx_audit_records_action ON audit_records (action);` |
| 2 | Anything that asks for resolved incidents since a date: `findResolvedUngroupedSince` (recurring-problem detector), `resolvedAll` and `resolvedOnService` (suggested resolutions), `findResolvedUpTo` (auto-verify, every `verify.monitor.interval.seconds`), coverage risk | `incidents.resolved_at` has no index, so each of these filters the whole table | `CREATE INDEX idx_incidents_resolved_at ON incidents (resolved_at) WHERE resolved_at IS NOT NULL;` |
| 3 | The SLA monitor (`findSlaMonitorCandidates(OPEN)`, every `sla.monitor.interval.seconds`, default 60 s) and the SLA risk scan (`ACTIVE_WORK`) | They read only open incidents, but closed incidents become almost all of the table over time, and the status index is single-column | A partial index over the open statuses: `CREATE INDEX idx_incidents_open ON incidents (id) WHERE status IN ('NEW','CLASSIFIED','ASSIGNED','ACKNOWLEDGED','IN_PROGRESS','PENDING_USER_INFO','REOPENED');`. The queries pass the status list as a parameter, so confirm with `EXPLAIN` that the planner uses it; if it does not, inline the literal list |
| 4 | The escalation monitor (`findEscalationCandidates`): priority P1 or P2 and status ASSIGNED, or CLASSIFIED with no assignee | Runs every `escalation.monitor.interval.seconds` and touches a tiny slice of the table | `CREATE INDEX idx_incidents_escalation ON incidents (id) WHERE priority IN ('P1','P2') AND status IN ('ASSIGNED','CLASSIFIED');` |
| 5 | Duplicate check on create and the known-outage queries (`openOnService`, `openOnServicesWith`): one service, open status, recent `created_at` | Three single-column indexes are combined by the planner; a composite serves the query directly | `CREATE INDEX idx_incidents_service_status_created ON incidents (service_id, status, created_at DESC);` |
| 6 | Free-text search `q` on `GET /incidents` (`lower(title) LIKE '%...%'` on title, description and code) | A leading wildcard cannot use a B-tree index, so every search reads every row. Fine up to roughly 10^5 rows | Only if the data grows: `CREATE EXTENSION pg_trgm;` and GIN trigram indexes on `lower(title)` and `lower(description)` |
| 7 | Global SLA default per priority (`sla_policies.service_id IS NULL`) | Not a speed issue. PostgreSQL treats NULLs as distinct, so the unique key on (service, priority) cannot stop two global defaults. The code checks it (D-009); the database does not (DEC-17) | `CREATE UNIQUE INDEX uk_sla_policies_global_priority ON sla_policies (priority) WHERE service_id IS NULL;` |

Items 1, 2, 5 and 7 are safe to add now. Items 3, 4 and 6 should be added after an `EXPLAIN` on realistic volume shows a benefit. **The schema belongs to the Testing teammate**: she adds these as a new numbered migration (V11; V10 is taken by A12 and A4), never by editing an applied one. They are listed here so she can copy them.

### 2.3 Already sound

- `pg_advisory_xact_lock(7305001)` serialises audit sealing across instances in the database, so the hash chain stays single-writer even with several backends.
- Incident edits use optimistic locking (`version`), which also works across instances.
- Reports are aggregate SQL computed in the database (DEC-60 to DEC-66), not loops in Java.
- Lists are paged (maximum 100 per page) and `spring.jpa.open-in-view=false` keeps connections short.

## 3. What assumes one running instance

Each row is a real class in `backend/src/main/java/com/iitsm`.

| Component | Where | What breaks with two instances | Fix path | Effort |
|---|---|---|---|---|
| Scheduled jobs | `infrastructure/scheduler`: `SlaMonitorJob`, `EscalationMonitorJob`, `AutoVerifyJob`, `SlaRiskScanJob`, `AuditSealJob`, `DashboardCountersJob` | Every instance runs every job. Fire-once flags and optimistic locking make most runs harmless, but notifications could be sent twice and CPU is wasted | Run jobs on one elected instance: `pg_try_advisory_lock` per job (the pattern the sealing already uses), or ShedLock | Small |
| Settings cache | `ConfigService.current` (a volatile snapshot swapped after commit) | A change made on instance A is not seen by instance B until restart | Re-read `app_config` on a short interval, or PostgreSQL `LISTEN/NOTIFY` on change | Small |
| Rate limiter | `application/ratelimit/RateLimiter` (in-memory `ConcurrentHashMap` windows) | Limits apply per instance, so the real limit is multiplied by the number of instances | A shared counter in the database or Redis behind the same interface | Medium |
| WebSocket broker | `WebSocketConfig`: `enableSimpleBroker("/queue", "/topic")` | A push from instance A never reaches a user connected to B | An external STOMP broker relay (RabbitMQ or ActiveMQ) | Medium |
| Attachments | `DiskAttachmentStorage` behind the `AttachmentStorage` port | Files live on one machine's disk | A shared volume, or an object-storage adapter implementing the same port (the Adapter pattern is already in place) | Small |
| AI cache, circuit breaker, AI rate limit | `application/intelligence`, `domain/intelligence/CircuitBreaker` | Each instance keeps its own: only less efficient, not wrong | None needed | None |
| Demo clock | `AdjustableClock` | Demo profile only; never runs in production | None | None |

JWT access tokens are stateless and refresh tokens are in the database, so login works across instances without change.

## 4. Scale-out path, in stages

| Stage | Setup | What to do | Needed from the list above |
|---|---|---|---|
| 0 (today) | One backend, one PostgreSQL | Nothing | |
| 1 | One backend, a bigger machine | Add the indexes of section 2.2; raise the connection pool (HikariCP defaults to 10 connections; the project sets only `connection-timeout`); tune the scheduler intervals in `app_config` | Section 2.2 |
| 2 | Two or three backends behind a load balancer | Elected job runner, settings refresh, shared rate limiter, external broker, shared attachment storage | All rows of section 3 |
| 3 | Read-heavy load | Point the report and search endpoints at a read replica; move notification sending to a queue; serve the frontend from a CDN | Replica routing is new work |

Honest limit for the report: the system is built and demonstrated at stage 0, and this page is the written route to stage 2. Nothing here has been run on more than one instance.

## 5. Load-test measurements (the Testing teammate's half of A7)

The reproducible CI harness is `deploy/task3_load_test.py`, run by `.github/workflows/task3-load-test.yml` against a disposable `demo` Compose stack. It uses synthetic demo accounts and records the UTC date, commit, concurrency, HTTP status counts, p50/p95 latency, throughput, incident counts and sampled backend CPU/memory in the `task3-load-test-evidence` artifact. Do not use this harness against a hosted or shared deployment. Copy successful run values into `docs/qa/TEST_REPORT.md` and this section.

The baseline run covers 10, 25 and 50 simultaneous create requests and reading/report requests, with three synchronized waves at each level under the default create limit. It also runs a five-minute, ten-worker mixed workload: 70% read/report transactions, 20% creates, and 10% lifecycle transactions (create then reporter withdrawal). For that isolated run, the harness temporarily raises `ratelimit.incident.create.per.minute` from 20 to 1,000 and restores it to 20 afterward so rate-limit responses do not obscure service capacity; the JSON records whether restoration succeeded. The recorded HTTP request mix therefore includes the lifecycle transaction's additional create and withdrawal requests.

**Measured stage-0 result:** [run 44924395273](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395273) passed on 2026-11-21 at commit `b14d229`. The disposable GitHub Linux x64 stack had 212 incidents before the run and 1,543 after. Every request succeeded. The table reports p50/p95 latency in milliseconds; create counts are 30/75/150 and read/report counts are 30/75/150 for 10/25/50 concurrency.

| Concurrent requests | Create p50 / p95 (ms) | Read/report p50 / p95 (ms) | HTTP errors |
|---:|---:|---:|---:|
| 10 | 460.45 / 571.47 | 57.76 / 86.97 | 0 |
| 25 | 546.86 / 670.08 | 78.86 / 109.66 | 0 |
| 50 | 842.92 / 1,020.09 | 114.17 / 164.81 | 0 |

The 300.8-second mixed profile completed 3,683 transactions: 2,607 reads/reports, 708 creates, and 368 create-and-withdraw lifecycles. All 4,051 HTTP requests succeeded. The configured mix was 70.78% reads/reports, 19.22% creates and 9.99% lifecycle transactions (rounding accounts for the 0.01% difference). The demo create limit was raised from 20 to 1,000 per minute only for this profile and restored to 20 afterward. Docker sampled the backend 43 times: CPU peaked at 316.54% (multi-core) and memory at 754.5 MiB, with no memory parse errors.

The stage-0 results above use the seeded dataset. The separate A7 growth profile below measures the same read/report endpoints at 10,000 and 100,000 incidents and records five query plans before and after temporary indexes.

### A7 data-growth evidence

The dedicated disposable-stack profile [run 44932459781](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44932459781) passed on 2026-11-21 at commit `553306d`. It began with 212 seeded incidents, added 9,788 synthetic incidents to reach 10,000, then added 90,000 to reach exactly 100,000. Each endpoint was sampled 10 times at each stage; all 150 measured requests returned successfully. The experiment used a fresh GitHub Actions demo stack. Candidate indexes were applied only to that throwaway database; no migration was created.

| Endpoint | 10k p50 / p95 (ms) | 100k before indexes p50 / p95 (ms) | 100k after indexes p50 / p95 (ms) |
|---|---:|---:|---:|
| Incident list | 31.59 / 49.35 | 60.68 / 89.47 | 67.34 / 71.98 |
| Reports overview | 33.62 / 40.39 | 346.36 / 352.01 | 332.93 / 347.25 |
| Report trends | 11.16 / 13.73 | 66.83 / 72.88 | 14.80 / 16.91 |
| SLA compliance | 38.10 / 42.90 | 336.81 / 372.62 | 299.13 / 300.32 |
| Audit search | 48.24 / 56.50 | 149.39 / 162.85 | 80.56 / 83.09 |

The five `EXPLAIN (ANALYZE, BUFFERS)` probes changed as follows. Times are PostgreSQL execution time on the same disposable 100k dataset:

| Query | Before index experiment | After temporary indexes |
|---|---|---|
| Audit action and date | Sequential scan; 57.316 ms | `idx_audit_records_created_at`; 10.266 ms |
| Recent resolved incidents | Sequential scan; 37.258 ms | `idx_incidents_resolved_at`; 0.568 ms |
| Open SLA candidates | `idx_incidents_status`; 0.126 ms | `idx_incidents_open`; 0.069 ms |
| Escalation candidates | `idx_incidents_status`; 0.086 ms | `idx_incidents_escalation`; 0.017 ms |
| Service open recent | `idx_incidents_status`; 0.139 ms | `idx_incidents_open`; 0.098 ms |

These are directional CI measurements with 10 samples per endpoint. The trends and audit endpoints improved after the temporary indexes, while the report overview and SLA endpoints remained slower at 100k because the probes do not cover their full aggregate query paths. The Backend Lead should review the query plans before deciding whether any candidate index belongs in a permanent migration.

| Scenario | Request mix | Record |
|---|---|---|
| Reporting | Login, then `POST /incidents` (needs `confirmNotDuplicate: true` for similar text, and stays under the 20 a minute creation limit per user, so spread over users) | p50 and p95 latency, error rate, throughput at 10, 25 and 50 concurrent users |
| Reading | `GET /incidents` with filters and paging, `GET /incidents/{id}`, `GET /notifications/unread-count` | p95 latency at the same loads |
| Reports | `GET /reports/overview`, `/trends`, `/sla-compliance` | p95 latency; whether it grows with data volume |
| Mixed | 70% reads, 20% creates, 10% lifecycle actions for five minutes | Error rate, database connections in use, backend CPU and memory |
| Data growth | 10 samples per read/report endpoint at 10,000 and 100,000 incidents on a fresh disposable stack | Recorded in the A7 evidence tables above, with five `EXPLAIN (ANALYZE, BUFFERS)` probes before and after temporary indexes |

Rate limits (login 10 a minute per email, creation 20 a minute per user) will answer 429; use many users or raise `ratelimit.*` in `app_config` for the test and say so in the write-up.

Interpretation: report trends and audit search improved in the 100k index experiment; report overview and SLA compliance remained slower and need query-path review. These are single-run disposable-CI measurements, not production capacity guarantees.
