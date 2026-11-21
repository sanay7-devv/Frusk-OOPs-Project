Warning: truncated output (original token count: 14420)
Total output lines: 466

# Testing and DevOps: what is left, and the optional full test catalogue

## Handoff update — 2026-11-21

The Task 3 follow-up was merged into `main` through [PR #83](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/83) on 2026-11-21 (merge commit `cdaddef`). The latest pre-merge CI run (44917367587) passed all six jobs: 62 backend tests (60 passed and 2 demo-only checks skipped in the normal backend job; both seed jobs ran all 62), 45 frontend tests across 9 files, 71 Postman requests / 149 assertions, and 30 security checks. The follow-up documentation correction was merged through [PR #84](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/84); its CI run (44920118833) passed. The seven requested severity/area labels are now created. GitHub shows no project board linked and no projects available to link; the branch settings page is unavailable to this collaborator account.

PRs #83 and #84 merged the earlier Task 3 tests and documentation. PR #85 was merged on 2026-11-21. Its follow-up CI run [44924395271](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395271) passed all six jobs, including Chromium verification of script text. The dedicated A7 load run [44924395273](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395273) also passed; its stage-0 measurements are recorded in `TEST_REPORT.md` and `backend/docs/SCALING.md`. The memory-sampling and report update was merged through [PR #89](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/89) on 2026-11-21 (merge commit `3cc9567`). PR #88 was closed unmerged after #89 resolved the conflict. Post-merge CI [run 44928290284](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44928290284) passed all six jobs. At the time PR #89 merged, PR #88 was closed; this handoff clarification is now open for review as PR #90.

- **R11: Done, 12 of 12 classes.** `IncidentStateTest` covers every status, its legal actions, invalid moves, successful lifecycle moves and alternate actions. `ExceptionMappingTest` checks all 22 `ItsmException` subclasses. `GlobalExceptionHandlerTest` checks the standard field-validation response. The PR CI run passes these checks.
- **Backend count:** the PR CI run reports 62 tests: 60 passed and 2 demo-only `SeedCompatibilityTest` checks skipped in the normal backend job. Both dev and demo seed jobs run all 62.
- **R10 frontend tests: Done on PR #83.** 45 frontend tests in 9 files pass; the production build and type check pass. Coverage includes audit verification errors, MFA enable/disable and field errors, password reset, problem tabs, report charts, priority/filter interactions, SLA violations and SLA colors. Login-form validation (empty and malformed credentials are rejected before the API call) and the rendered incident-filter interaction (selecting priority updates the URL and server request) are also covered. The build warns that the main JS chunk is about 1.9 MB before gzip.

### What is left now (2026-11-21), in order

This list replaces the 2026-11-19 table below, which is kept as history.

| # | Item | What is left | Who |
|---|---|---|---|
| 1 | R6 reset time, fresh clone | Time the demo reset on the recording laptop and record a fresh-clone setup on a second machine; then replace "unmeasured" in `deploy/README.md`. | Testing; second-machine owner |
| 2 | A7 data growth | Stage-0 load results are recorded. Still measure at 10,000 and 100,000 incidents and compare the proposed indexes with `EXPLAIN (ANALYZE)` on a disposable database. | Testing with Backend Lead |
| 3 | R5 demo rehearsal | The five-segment checklist and recording-day preflight are ready. Rehearse all five segments, fill the dated dry-run log, and record the final demo. | Testing, whole team |
| 4 | R8 repo settings | **Labels done:** all seven `severity:*` and `area:*` labels exist. The project board is not linked; the repository owner/team needs to create or link it if required. Branch protection settings return 404 for this collaborator account; the repository owner must verify or enable them. | Team; owner for protection |

Done: R1–R4 and R9 are complete; R10 frontend tests (45 across 9 files, including login validation and rendered priority-filter interaction) and all R11 unit-test classes are in PR #83. R3 browser evidence and stage-0 A7 measurements are recorded. Remaining work is R5 demo rehearsal/final recording, R6 laptop and second-machine measurements, A7 10k/100k growth testing with the Backend Lead, and R8 board/branch-protection settings with the team/repository owner.

## Status on 2026-11-18 (checked against `main` at `2bd1c61`)

**Update on 2026-11-19** (checked on `shared/main` at `638e42b`, the merge of PR #46):

- **R3 security checks: Partly done.** The table now has request, result, date and evidence for each check ([TEST_REPORT.md](TEST_REPORT.md), dated 2026-11-15, commit `3bc8ab6`). Left: the browser check of script text (check 4).
- **R5 dry-run checklist: Partly done.** [DEMO_RUN_SHEET.md](DEMO_RUN_SHEET.md) now has recording-day checks (mail catcher, timers, AI key or `KEYWORD` fallback), all five segments, and an evidence table. Left: the dry-run log has no rows yet, so nothing has been rehearsed.
- **R7 test report: Partly done.** The security table is corrected (see R3). Left: per-case evidence (the index points at the Surefire XML of `HandbookIntegrationTest`, not one output per case) and a re-run of the 26 cases on the final commit.
- **R9 CI gaps: Done.** `frontend/package.json` has `"lint": "tsc --noEmit"`, and CI runs `npm run lint` in the frontend job. This is a type check, not ESLint.
- **R10 frontend tests: Partly done.** Seven tests in two files: `auth-flow.test.tsx` (4, including the empty and malformed credential check) and `incident-ui.test.tsx` (3, status labels and SLA states). Not covered: the SLA colours (the test checks text only), the filter bar, and the screens from #36 to #39 (audit seal, account security, problems, reports).
- **R11 handbook unit-test classes: Partly done, 10 of 12.** Now present: `PriorityEngineTest`, `EligibilityFilterTest`, `WorkloadTrackerTest`, `SlaTrackerTest`, `AssignmentStrategyTests`, `EscalationChainTest`, `SimilarityTest`, `KeywordCategorizerTest`, `SlaRiskScorerTest`, `PermissionTest`. Missing: `IncidentStateTest` and `ExceptionMappingTest`. I did not check the new classes against the "what to cover" column.
- **Backend test count, not reconciled.** `backend/src/test` has 56 `@Test` methods in 13 files on `shared/main`. `SeedCompatibilityTest` (2) runs only when `VERIFY_DEMO_SEEDS=true`, so a normal run should give 54. [TEST_REPORT.md](TEST_REPORT.md) says 53 run. Check the Surefire XML before the report is handed over.
- **Still open, from PR #46:** R6 (reset time and fresh clone on the recording laptop); the visual check that script text renders safely; rehearsing and recording the demo; branch protection (repository owner, R8); the two missing unit-test classes; frontend screen tests (R10).

**What was left on 2026-11-19 (history; see the 2026-11-20 list above).** This list replaced the older summary table below, which is kept as history (its R9 and R11 rows are out of date).

| # | Item | What is left | Who |
|---|---|---|---|
| 1 | R6 reset time, fresh clone | Time the demo reset and a fresh-clone setup on the recording laptop; replace "unmeasured" in `deploy/README.md`; re-check the JDK runtime image from `50794aa`. | Testing |
| 2 | R11 unit-test classes (10 of 12) | Add `IncidentStateTest` (every state and action; invalid moves throw `InvalidStateTransitionException`) and `ExceptionMappingTest` (each `ItsmException` subclass gives its code and HTTP status, Appendix B.2). | Testing |
| 3 | R10 frontend tests (7 tests) | Screen tests for Audit Verify & Seal (#36), forgot/reset password and two-step login (#37), Problems / Major Incident (#38), Reports (#39), and the round-3 screens once merged (simulator, admin settings, service graph). | Testing, with the Frontend Developer |
| 4 | A7 load test | Run it and record the numbers; the index review and scale-out path are already in `backend/docs/SCALING.md`. | Testing |
| 5 | R5 demo | Fill the dry-run log in `DEMO_RUN_SHEET.md`, rehearse, record. | Testing, whole team |
| 6 | R3 / R7 evidence | Browser check that script text renders safely (check 4); per-case evidence; re-run the 26 cases on the final commit; reconcile the 53 vs 54 test count. | Testing |
| 7 | R8 repo settings | Create `severity:*` and `area:*` labels (0 today); verify the project board; branch protection on `main` (404 today) needs the repository owner. | Testing; owner for protection |

Done: R1, R2, R4, R9.

Checked with git, grep and `gh` on `main` at `2bd1c61`. Since 2026-11-15 no commit has touched `backend/src/test`, `docs/qa`, `db`, `.github` or the Postman collection. The only change under `deploy/` is `deploy/backend.Dockerfile` in `50794aa` (Sanay: CRLF fix for `mvnw`, runtime image JRE → JDK). Re-check it on a fresh build (R6).

CI: six jobs per run (frontend build, frontend tests, backend tests with PostgreSQL migrations, seed integrity dev and demo, demo stack and snapshot round trip). Green on every PR merged on 2026-11-18 (#34 to #40).

| Item | Status | One line |
|---|---|---|
| R1 close issue #11 | **Done** | Unchanged. Nothing left. |
| R2 portable tests | **Done (merged, PR #21)** | Unchanged. A run on a non-UTC Windows laptop is still not recorded. |
| R3 security checks | **Partly done** | Unchanged. Left: browser check for check 4 and the table with request and date. |
| R4 Postman | **Done (merged, PR #21)** | Collection not changed since 2026-11-15, so the new backend and frontend behaviour listed below is not in it. |
| R5 dry-run checklist, tamper helper | **Partly done** | Unchanged. Left: administrator and security segments, recording-day checks. |
| R6 reset time, fresh clone | **Not done** | Nothing timed. `deploy/README.md` still says "unmeasured". Also re-check the `deploy/backend.Dockerfile` change (JDK image, larger). |
| R7 test report | **Partly done** | Unchanged. Left: per-case evidence, re-run of the 26 cases on the final commit, corrected security table. |
| R8 bug tracking, repo settings | **Partly done** | Still no `severity:*` or `area:*` labels; branch protection on `main` still 404; project board not verified. |
| R9 CI gaps | **Partly done** | Still no lint script in `frontend/package.json` and no lint step. |
| R10 frontend tests | **Not done** | Still one test file (`frontend/src/auth-flow.test.tsx`, 3 tests). Untested new screens: Audit Verify & Seal (#36); forgot and reset password, two-step login, account security (#37); Problems / Major Incident Mode (#38); Reports on `/reports/*` with CSV and PDF export (#39). |
| R11 handbook unit-test classes | **Not done** | Still 4 of 12 classes; 8 missing. |

What is left, in order: R6; R11; R10 for the four new screens above (with the Frontend Developer); R8 (labels, board, owner's branch protection); finish R3, R5 and R7 gaps; R9 lint once a `lint` script exists. Sections 4 to 6 stay optional.

### What changed since 2026-11-15
- **Backend (no tests added for these):** `slaState` AT_RISK from the SLA risk score (#28); Gemini embeddings for similarity with TF-IDF fallback (#29); PDF format for report exports (#27); obsolete `schema-auto` profile removed (#26); CORS exposes `Retry-After` (#35).
- **Frontend (no tests added for these):** the four screens in R10 (#36 to #39).
- **Counts:** backend `@Test` methods are still 40 in 7 files (the count of 43 in the supervisor's note included `@TestConfiguration` and `@Testcontainers`). Frontend is still 3 tests.

---

## Status on 2026-11-15 (checked against the code at `260d159`, kept as history)

Checked against `main` at `260d159` (PR #21 merged as `b15a166`; the tests, CI, deploy, db and docs/qa files are identical to PR #21 head `efbd419`, which is what was inspected), the GitHub repository `sanay7-devv/Frusk-OOPs-Project`, and the CI runs on that branch. Only code, CI logs and GitHub state count as evidence here; the claims in `TEST_REPORT.md` and the READMEs were re-checked against them.

**PR #21 is merged into `main`.** "Done (merged, PR #21)" below means it is on `main` now. The checks listed were made on PR #21 head `efbd419`; no test, CI or deploy file differs on `main`.

CI evidence: [run 43736234225](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43736234225) (commit `3bc8ab6`) and the two runs on `efbd419` itself (43736502715 and 43736498088) all succeeded. Six jobs, whole run 2 min 9 s, longest job (demo stack) 2 min 6 s. The run shows: backend 40 tests, 0 failures (2 skipped in the schema-only job, 0 in the two seed jobs), frontend 3 tests, 7 seed-generator tests, 40 API smoke checks, Postman 71 requests and 149 assertions, security checks 30/30, T10/T16 contract checks, tamper helper round trip.

| Item | Status | One line |
|---|---|---|
| R1 close issue #11 | **Done** | Closed 2026-11-15 09:27 UTC. |
| R2 portable tests | **Done (merged, PR #21)** | UTC and Testcontainers fixed in code; not run on a non-UTC laptop by this check. |
| R3 security checks | **Partly done (merged, PR #21)** | Run and green (30/30); the written table lacks the exact request and a date, and the browser check is open. |
| R4 Postman | **Done (merged, PR #21)** | 11 folders, 71 requests, 149 assertions in CI; one expected value in this doc was wrong. |
| R5 dry-run checklist, tamper helper | **Partly done (merged, PR #21)** | Helper done and tested in CI; run sheet covers workflows 1 to 3 but not the administrator and security segments or the recording-day checks. |
| R6 reset time, fresh clone | **Not done** | Nothing measured. Blank table in `DEMO_RUN_SHEET.md`; `deploy/README.md` says "unmeasured". |
| R7 test report | **Partly done (merged, PR #21)** | Columns, summary and T16 note done; evidence is a CI link per case, no screenshots or Newman output per case; security table not final. |
| R8 bug tracking, repo settings | **Partly done** | Template and badge on the PR branch; labels, board and branch protection not done. |
| R9 CI gaps | **Partly done** | Reports upload done; lint not done (no script); time budget recorded below. |
| R10 frontend tests | **Not done** | Still the same 3 navigation tests. |
| R11 handbook unit-test classes | **Not done** | 4 of 12 classes exist; 8 missing. |

What is left, in order: R6; R11; R8 (labels, board, owner's branch protection); finish R3, R5 and R7 gaps; R10 and the lint step once the Frontend Developer adds them. Sections 4 to 6 stay optional.

### Done (nothing more to do)
- **R1** issue #11 closed.
- **R2** `IitsmBackendApplicationTests` uses Testcontainers PostgreSQL and `HandbookIntegrationTest` was already on it; both set `TimeZone` to UTC in a static block (`backend/src/test/java/com/iitsm/IitsmBackendApplicationTests.java:21`, `HandbookIntegrationTest.java:42`). A new `@SpringBootTest` class must copy that block, since there is no shared extension.
- **R4** all three workflows and the Intelligence, Reports and Notifications folders (details under R4).
- **R9, reports upload:** `backend-test-reports` artifact (`if: always()`), plus `seed-tests-dev`, `seed-tests-demo` and `demo-stack-evidence`.
- **Handbook 2.15, tests in CI:** unit, integration (Testcontainers), API (Newman, smoke, security) and frontend tests all run on every push and on pull requests to `main`.

---

## 0. How to read this

**Scope.** This page lists only work that Handbook 3 gives to the Testing and DevOps role: everything under `src/test`, the Postman collection, the Flyway SQL and seed files, Docker Compose, the CI pipeline, bug tracking, demo database snapshots and demo support (handbook 1.4 and 2.1 to 2.15). Work that belongs to the Backend Lead, the Frontend Developer or the Report teammate is listed once, at the end, so nobody does it by mistake.

**Priority.**

| Label | Meaning |
|---|---|
| **R** | Required: named in the handbook as your deliverable. |
| **O** | Optional: extra marks or extra safety, nothing in the handbook requires it. |

**What matters for grading.** Testing is 5 of 120 marks, and Documentation and presentation is 10. The group is graded from the PDF report and a 15 to 20 minute recorded demo. So the tests earn their marks in two places: the test report you hand to the Report teammate, and the few seconds of a green CI run in the video. Quantity helps less than a clear, honest test report.

---

## 1. Where you are against the final checklist (handbook 2.15)

| Checklist item | State | Evidence or note |
|---|---|---|
| Migrations match Appendix A and run cleanly from an empty database | **Done** | Migrations V1 to V10 (V10 is the Backend Lead's, password reset, TOTP and push), seed V100 to V102, demo-only V200. `IitsmBackendApplicationTests` starts the full context on an empty Testcontainers database and Hibernate `validate` accepts the entities (CI run 43736234225, backend job). The handbook text says V1 to V6; the real set is larger. |
| Seed data loads in dev and demo; staged demo state present | **Done** | Both seed jobs pass in CI; `db/checks/verify.sql` passes; the demo job checks `verify.auto.hours` is `0.033` in demo and `48` in dev. |
| One command starts the system; one command resets the demo | **Done**, reset time **not measured** | `docker compose -f deploy/docker-compose.yml up --build --detach --wait`; `bash db/tools/reset-demo.sh` (runs in CI). No timing on a laptop, no fresh-clone run on a second machine (R6). |
| CI runs unit, integration, API and frontend tests and blocks bad merges | **Partly** | The tests run (six jobs, green). Nothing blocks a bad merge: `GET /branches/main/protection` returns 404 and the repository has no rulesets. 404 is consistent with "no protection" but this check could not prove it; needs the repository owner (R8). The frontend job has no lint step (R9). |
| All 26 cases pass and are documented with evidence | **Done (merged, PR #21)**, evidence thin | 26 rows, all `PASS`, each with date `2026-11-14` and commit `86096c4`. Evidence per row is a CI run link, not a screenshot or Newman output as the handbook asks (R7). The cases were last tied to commit `86096c4`, not to the current head. |
| Bugs triaged; no open blockers at freeze | **Partly** | The only issue (#11) is closed. The labels `severity:*` and `area:*` do not exist, so triage cannot be recorded (R8). |
| Test report delivered to the Report teammate | **Partly (merged, PR #21)** | `docs/qa/TEST_REPORT.md` is on `main`. Not yet handed over, security table incomplete (R7). |
| No secrets committed; `.env.example` complete; README tells a newcomer what to run | **Partly** | `deploy/README.md` explains the run. The CI badge and the issue template are on the PR branch only (R8). Secrets and `.env.example` were not audited by this check. |

---

## 2. Required work, with status

### R1. Close issue #11 — Done
- Issue #11 "QA: Update frontend auth-flow tests for current login controls" is CLOSED (2026-11-15 09:27 UTC). It is the only issue in the repository.
- Left: nothing.

### R2. Make the tests run on any machine — Done (merged, PR #21)
1. **Time zone — Done.** Static `TimeZone.setDefault(UTC)` in `IitsmBackendApplicationTests` and `HandbookIntegrationTest`.
2. **`IitsmBackendApplicationTests` — Done.** Uses `PostgreSQLContainer("postgres:16")` with `@Testcontainers`, `app.scheduling.enabled=false`, and asserts the JVM zone is UTC.
- **Not verified:** CI is Linux and UTC, so it cannot show the fix works. Nobody has recorded `./mvnw test` on a clean clone of a non-UTC Windows laptop. If you do that once, write the result in `docs/qa/TEST_REPORT.md`.

### R3. Record the basic security checks (handbook 2.11) — Partly done (merged, PR #21)
The checks run as `deploy/security_checks.py` against the demo stack in CI (30/30, evidence JSON `iitsm-security-checks.json` in the `demo-stack-evidence` artifact). `docs/qa/TEST_REPORT.md` has a table of results. Mapping to the six checks:

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Another user's incident by id | **Done** | `security_checks.py`: other employee gets 404 on read and 403 on `acknowledge`. Also T18. |
| 2 | Admin endpoint with an employee token | **Done** | 403 on `GET /admin/users`, and an `ACCESS_DENIED` audit row is asserted. Also T17 (two audit rows). |
| 3 | Expired then garbage token | **Done** | Garbage token 401 `TOKEN_INVALID`; the demo clock is advanced 16 minutes and the old token gets 401 `TOKEN_EXPIRED`. Also T19. |
| 4 | `<script>alert(1)</script>` | **Partly** | Title, description and comment are stored and returned unchanged by the API. The "shown as text, never executed in the UI" half was never checked in a browser (`TEST_REPORT.md` says so too). |
| 5 | Very long input | **Done** | Title 201, description 5001, comment 4001 characters and a password over 72 bytes give 400 `VALIDATION_FAILED` naming the field (`security_checks.py`). The oversized and the `.exe` upload are covered by `deploy/handbook_contract_checks.py` (T10), not by the security script. |
| 6 | Wrong passwords, lockout, rate limit | **Done** | Five wrong passwords then 423 `ACCOUNT_LOCKED` for the correct password; login rate probe gets 429 `RATE_LIMITED` with `Retry-After`. Also T20. |

Extras: common password `Password1` is refused (`security_checks.py`); renamed `.exe` refused (T10); reuse of an old refresh token returns 401 `TOKEN_INVALID` and the rotated token is revoked as well (T19 in `HandbookIntegrationTest`, not in the script).

**Left:**
- Browser check for check 4: open an incident whose title is `<script>alert(1)</script>` in the running frontend and note that the text is shown, not run.
- Make the report table match the handbook's ask: for each check, the request, the observed result, the date and the evidence. The current table has no request and no date column and merges some checks.
- **Done when:** a table with check, request, observed result, date and evidence is in `docs/qa/` and handed over with the test report.

### R4. Complete the Postman collection (handbook 2.6) — Done (merged, PR #21)
`deploy/postman/iitsm.postman_collection.json` (generated by `build_collection.py`) has 11 folders and 71 requests; Newman reported 149 assertions in CI (the file holds 138 `pm.test` calls; the rest come from the repeated login requests):

| Folder | Requests |
|---|---|
| Setup (real seeded accounts) | 18 |
| Auth | 1 |
| Catalog and setup | 3 |
| Workflow 1, report and assign | 1 |
| Negative cases | 3 |
| Workflow 2, investigate and resolve | 9 |
| Admin and multi-role authorization | 4 |
| **Workflow 3, major incident mode** | 7 |
| **Intelligence** | 8 |
| **Reports** | 10 |
| **Notifications** | 7 |

Every endpoint listed in the earlier version of this section is called. Newman runs in the CI demo-stack job against the Compose stack. Intelligence asserts `source` is `KEYWORD`; Reports asserts open + resolved = total, each distribution sums to the overview total and the CSV cell starts with `'`; Notifications asserts 60 switches and a 400 with a field error for the locked switch.

**One correction to the earlier expected value.** This page used to say the joiner's incident is CLOSED as a duplicate. The collection (and the passing CI run) asserts it stays `ASSIGNED` until the problem is resolved, and `DEMO_RUN_SHEET.md` says the same. `KnownOutageService.join` still calls `markDuplicate`, and its audit text mentions "Closed as a duplicate", so the Backend Lead should confirm which behaviour is intended (`SYSTEM_GUIDE.md` DEC-72 says "as changed"). Until then the Postman assertion is the working specification.

**Not covered by Postman** (backend operations added after this list was written): password reset and TOTP (A12), simulated push (A4), Google sign-in, attachments, audit seal and verify (these are in the run sheet and `check_audit_tamper.py`), feedback and the status board. Optional.

### R5. Dry-run checklist for all three workflows, and the tamper helper — Partly done (merged, PR #21)
- **Tamper helper — Done.** `db/tools/tamper-demo-audit.sh tampe…2420 tokens truncated…ip and all API checks).

**Gap in numbers:** the backend has about 130 mapped operations (129 per the project docs) and 466 Java files; the unit tests above cover a handful of the rule classes. The optional catalogue in section 4 fills this. None of the catalogue classes below exists as a test yet, except the four listed in the R11 table and the integration cases T01 to T26.

---

## 4. Optional: unit test catalogue (all plain Java unless noted)

Class names, packages and expected values come from `backend/docs/ROADMAP.md` section 7 and `TEAM_UPDATES.md`. On 2026-11-15 every class below was re-checked against `backend/src/main/java/com/iitsm`: all exist in the stated packages, with two notes (`GoogleIdentity` is a nested record of `GoogleIdTokenVerifier`; `InvalidLlmResponseException` is a package-private nested class of `LlmTextAnalysisService`, so its test must sit in `com.iitsm.infrastructure.ai`). The expected values quoted from `ConfigKey` (weights, thresholds, `escalation.exhausted.minutes` 15, `verify.auto.hours` 48, `verify.monitor.interval.seconds` 300) still match. **Test status: none of these catalogue classes has a test yet** except those marked Done in the R11 table above. Use a fixed `Clock`; scheduling is off in the test profile (`app.scheduling.enabled=false`), so call the monitors directly.

If an expected value here ever disagrees with the code, the code wins for "what exists now": check with the Backend Lead and note the difference.

### M1 and M2: foundations, users, authentication
| Class (package) | Cases |
|---|---|
| `ItsmException` and its 22 direct subclasses (`domain.exception`), `GlobalExceptionHandler` (`web.handler`), `RequestIdFilter` (`web.filter`), `ErrorResponse` (`web.dto`) | Each exception gives its code and HTTP status; an exception from a test endpoint comes back in the standard body; `X-Request-Id` header present. |
| `User`, `Role`, `EmployeeRole`, `TechnicianRole`, `AdministratorRole`, `SkillSet`, `UserFactory`, `PermissionKey` (`domain.user`) | Permission union for a multi-role user; team lead = technician with escalation level 1; every new user starts as EMPLOYEE. |
| `User.recordFailedLogin(now, maxAttempts, lockDuration)`, `User.isLockedAt(now)` | Clock-driven lockout. |

### M5 to M8: priority, assignment, SLA, audit
| Class (package) | Cases |
|---|---|
| `AssignmentEngine`, `CompositeStrategy`, `SkillBasedStrategy`, `LoadBasedStrategy`, `RoundRobinStrategy`, `ExperiencePriorityStrategy` (`domain.assignment`) | Changing `assignment.strategy` changes who gets the next incident (T04 is the integration version). Priority fit prefers juniors for P3 and P4; round-robin tie-break. |
| `SlaMonitor.runOnce()` (`application.sla`) | Warnings at 75 and 90 percent, each fires once; a late run raises only the highest alert. |
| `WorkCalendar`, `AlwaysCalendar`, `BusinessHoursCalendar` (`domain.sla`) | Business hours default to Asia/Kolkata, 09:00 to 18:00, Monday to Friday (`sla.business.*`). A deadline that crosses closing time rolls to the next open day. Confirm exact figures with `calendar_smoke.py` before asserting them. |
| `SlaPolicyResolver` (`domain.sla`) | Service policy first, then the global default, else `SLA_NOT_CONFIGURED` (T15). |
| `ConfigService`, `AppSettings` (`application.config`, `domain.config`) | Weights must sum to 1.0 and priority bands must descend or startup fails; changing a setting applies without a restart. |
| `AuditRecord` (`domain.audit`) | `AuditRecord.internal(...)` prefixes "Internal note" and `isInternal()` is true; `AuditRecord.of(...)` throws `IllegalArgumentException` for text starting with that prefix. |
| Integration | Count `audit_records` for an incident before and after one transition: exactly +1; after a refused one: +0. |

### M9: notifications
| Class (package) | Cases |
|---|---|
| `NotificationEventType.forAction` (`domain.notification`) | ASSIGNED and REASSIGNED give INCIDENT_ASSIGNED; CLASSIFIED, PRIORITY_CALCULATED, WORK_STARTED and COMMENT_ADDED give none; ESCALATED gives none; every one of the 15 types has at least one audience. |
| `NotificationRules` | `smsApplies`: P1 + ASSIGNED + ASSIGNEE true, P1 + REPORTER false, P2 false. `neverBatched`: P1 true, SLA_VIOLATED true, P3 SLA_WARNING false. `cannotSwitchOff`: IN_APP always true; SLA_VIOLATED EMAIL true for an administrator and false for an employee. |
| `NotificationFactory` | `{code}` and `{priority}` filled; an unknown placeholder becomes empty; a title is cut to 59 characters ending in an ellipsis; `<EVENT>.<audience>` wins over `<EVENT>`. |
| `DigestCollector` (`application.notification`) | With threshold 1, two P4 SLA warnings give one digest row; two P1 warnings give two rows. |
| `NotificationDispatcher` with fake channels | A channel that throws does not stop the next; IN_APP goes first and the inbox id is passed on. |
| `NotificationPlanner.plan` | For an escalation with `recipientIds [lead]`, an assignee and `actorId` equal to the assignee: one OWNER request to the lead and none to the assignee. For the exhausted alert with two admin ids: two ADMIN requests titled "Escalation exhausted", plus one chat-room request. |
| Note | The listener is asynchronous: in integration tests poll for the rows for up to 5 seconds. |

### M10: search and reports
| Class (package) | Cases |
|---|---|
| `CsvWriter` (`application.report`) | `cell("=1+1")` is `'=1+1`; `"+x"` gives `'+x`; `"-x"` gives `'-x`; `"@x"` gives `'@x`; the number `-5` stays `-5`; `"a,b"` is quoted; null is empty. |
| `ReportService`, `ReportExportService`, `CoverageRiskService`, `PostIncidentReportService` (`application.report`), `NativeReportRepository` (`infrastructure.persistence`) | Report invariants: open + resolved = total; met + violated = total per compliance row; the priority distribution, the category distribution and the services report each sum to the overview total; trends fill empty days with zero. Coverage: one available holder on a criticality 4 or 5 service is `SINGLE_HOLDER`; none is `NO_COVERAGE`; two holders is `COVERED`. Needs the Testcontainers database (native SQL). |
| `FeedbackService` (`application.feedback`) | Stranger 404; a viewer who is not the reporter 403; before RESOLVED 409; a second rating 409; rating 0 or 6 gives 400. |
| `SavedFilterService` (`application.search`), `PriorityWhatIfService` (`application.priority`) | What-if with the same inputs as a real incident gives its priority and score, and leaves `version` and the audit rows unchanged. |
| `CriteriaIncidentSearch` (`infrastructure.persistence`), `OpenPdfPostIncidentRenderer` (`infrastructure.report`) | The `slaState` filters; the PDF renders with the incident code. |

### M11: escalation
Package `domain.escalation`: `EscalationChain.due(request, now)` and `next(request)`; handlers `TechnicianHandler` (level 0), `TeamLeadHandler` (1), `SystemAdminHandler` (2), `ItManagerHandler` (3); value types `EscalationRequest(priority, currentLevel, levelSince, exhaustedRaised, timeouts)`, `EscalationTimeouts(toReach, exhaustedWait)`, `EscalationStep(kind, fromLevel, toLevel, dueAt, allowed)`.

With P1 timeouts of 10, 10 and 10 minutes, an exhausted wait of 15 minutes and an incident at level 0 since T:
- `due` at T+9:59 is empty; at T+10:00 it is RAISE from 0 to 1.
- At level 1 since T+10, the next RAISE (to 2) is due at T+20.
- At level 3 since T the step is EXHAUSTED due at T+15; with `exhaustedRaised = true` there is no step at all.
- A priority with no policy rows (P3, or P2 when only P1 has rows) never has a step.

Also:
- `Incident.escalate` (manual) is legal in ASSIGNED, ACKNOWLEDGED and IN_PROGRESS, and throws `InvalidStateTransitionException` in every other status and at level 3. `Incident.escalateUnattended` works in ASSIGNED and in CLASSIFIED with no assignee only. `Incident.recordEscalationExhausted` needs level 3. Each records one fact with action ESCALATED.
- `EscalationMonitor.runOnce()` (`application.escalation`) returns `RunResult(checked, escalated, exhausted, failed)`: one unacknowledged P1 aged 11 minutes with policies 10/10/10 gives `escalated = 1`, and a second call gives `escalated = 0`.
- `AutoVerifyMonitor.runOnce()` (`application.incident`) returns `RunResult(checked, closed, failed)`: a RESOLVED incident resolved 49 hours ago with the default 48 closes with `ClosureReason.AUTO_VERIFIED` (status CLOSED, audit VERIFIED then CLOSED, no actor); one resolved 47 hours ago is untouched.
- `AdjustableClock` (`application.demo`): `advance(10 minutes)` makes `instant()` at least 10 minutes ahead of the base clock; zero or negative throws `IllegalArgumentException`.
- `IncidentAccessPolicy.permits` (`application.incident`): ESCALATE is true for the assignee with INCIDENT_HANDLE, for INCIDENT_VIEW_TEAM and for INCIDENT_VIEW_ALL; false for the reporter and other technicians.
- Settings: `escalation.exhausted.minutes` (default 15, range 1 to 1440) and `verify.monitor.interval.seconds` (default 300, range 5 to 3600).

### M12: intelligence and AI (package `domain.intelligence` unless noted)
| Class | Cases |
|---|---|
| `Tokenizer` | "disconnects", "disconnected" and "disconnecting" give the same token; "the" and "my" are dropped. |
| `TfIdfModel` | Identical texts give cosine 1.0; no shared word gives 0.0; a word seen in more incidents weighs less. |
| `TextRedactor` | `a@b.com` becomes `[email]`; `10.1.2.3` becomes `[ip]`; `password=abc` becomes `password=[redacted]`; a JWT or a 32-character mixed token becomes `[token]`; other text is unchanged. |
| `KeywordTextAnalysisService` with `KeywordDictionary` (built from `ai/keywords.json`) | "VPN drops every few minutes" suggests the category named Network at 0.65; one weight-1.0 word gives 0.50; "not urgent" beats "urgent"; "everyone ... urgent" gives impact 5 and urgency 5; paraphrase pairs of the labelled set score at least 0.55. |
| `CircuitBreaker` | Opens at the Nth consecutive failure; `allowRequest` is false until the cool-off ends; one success closes it. |
| `SlaRiskScorer` | Contributions are weight times ratio and add up to the score; priority ratios P1 1.0, P2 0.75, P3 0.5, P4 0.25; HIGH from the threshold, MEDIUM from threshold minus 0.30. |
| `IntelligenceService` (`application.intelligence`) | Category hidden below `autocat.min.confidence`; `similarTo` marks DUPLICATE from `dup.tfidf.threshold.duplicate` (0.55) and RELATED from `dup.tfidf.threshold.related` (0.35). |
| `AiRateLimiter` (`application.intelligence`) | With a limit of 3, the 4th request in a minute throws `RateLimitedException`. |
| `SlaRiskService.scanOnce()` | Flags once per threshold crossing. |
| `LlmTextAnalysisService` with a fake `LlmClient` (`infrastructure.ai`) | Non-JSON, an unknown category id and out-of-range numbers all throw `InvalidLlmResponseException`. |
| `FallbackTextAnalysisService` (`infrastructure.ai`) | A failing LLM gives source `KEYWORD`; with `ai.primary` set to KEYWORD, or no key, the LLM is never called. |
| `ChatIntakeService` (`application.intelligence`) | `countOf`: "about 12 people" is 12, "just me" is 1, "everyone" is 100. `titleOf`: first sentence, at most 80 characters. `matchService`. |

Settings in play: `dup.tfidf.threshold.duplicate` 0.55, `dup.tfidf.threshold.related` 0.35, `autocat.apply.confidence` 0.60, `sla.risk.weight.elapsed|load|priority|history` 0.50, 0.20, 0.15, 0.15 (must add up to 1.0).

### M12 rest: duplicates, withdraw, problem records, Major Incident Mode
| Class (package) | Cases |
|---|---|
| `OpenState` and its children `ClassifiedState`, `AssignedState`, `AcknowledgedState`, `InProgressState`, `PendingUserInfoState`, `ReopenedState` (`domain.incident`) | `Incident.withdraw(reason, now)` is legal in CLASSIFIED, ASSIGNED and ACKNOWLEDGED only (IN_PROGRESS throws `InvalidStateTransitionException`), closes with `ClosureReason.WITHDRAWN`, reason 10 to 1000 characters (`InputValidationException` otherwise). `Incident.markDuplicate(original, now)` is legal in every open status, closes with DUPLICATE and sets `duplicateOf`, refuses itself and an original closed as DUPLICATE. `Incident.resolveWithProblem` is legal in every open status. `ClosedState` offers REOPEN only for VERIFIED and AUTO_VERIFIED closures. |
| `Category.isWithin("Security")` (`domain.category`) | True for Security and for Phishing under it, ignoring case; false for a blank name. |
| `IncidentAccessPolicy.requirePriorityInputEdit` | A reporter is refused from ASSIGNED on; team lead and administrator are allowed. |
| `ProblemService.lead` (`application.problem`) | Highest priority, then earliest; joiners never lead. |
| `ProblemCorrelator.correlate` | Same-service match groups; P4 never groups by graph; an anchor of a RESOLVED record does not group. |
| `KnownOutageService.join` | The lead's affected users go up by 1; 9 users at P3 becomes 10 users at P2 (impact 4, urgency 3, criticality 2); a second join returns the first incident. |
| `RecurringProblemService.proposals` | 3 resolved incidents of one service and category in 30 days, or 2 reopens, give a proposal. |
| `IncidentCreationService.create` (`application.incident`) | A 409 duplicate at similarity 0.55; an AI category is applied at 0.60. |

### M13: real-time, graph, status board
| Class (package) | Cases |
|---|---|
| `ServiceGraph` (`domain.service`) | With Payment to Auth, Portal to Auth, Auth to Database, Mail to Database: `impactOf(Database)` is Auth 1, Mail 1, Payment 2, Portal 2; `upstreamOf(Payment)` is Auth 1, Database 2; `commonUpstream([Payment, Portal])` is Auth (distance 1) then Database (2); `commonUpstream([Payment, Mail])` is Database only; `commonUpstream([Payment, Auth])` ranks Auth first; unknown ids are ignored; a cycle inserted by hand terminates. |
| `DashboardService` (`application.dashboard`) | `typeOf`: SLA_WARNING and SLA_VIOLATED map to their own types; CLASSIFIED, PRIORITY_CALCULATED, WORK_STARTED and COMMENT_ADDED give none. `pushCountersIfDue` pushes once after a change, not again until the interval passes. |
| `ServiceGraphService.status` (`application.graph`) | Open P1 gives OUTAGE; open P2 or an upstream OUTAGE gives DEGRADED; only P3 and P4 gives HEALTHY with counts. |
| `StompDestinationPolicy`, `StompPrincipal`, `WebSocketSessions` (`infrastructure.realtime`) | An administrator may use both destinations; an employee only the notifications queue; an unknown destination is refused; `StompPrincipal.expiredAt`; `WebSocketSessions.closeAtExpiry` (close code 4001). |

### M14: hardening, audit seals, attachments
| Class (package) | Cases |
|---|---|
| `AttachmentType.sniff` (`domain.attachment`) | PNG, JPEG, GIF and PDF headers are recognised; UTF-8 text gives TEXT; bytes with a NUL give empty; `MZ` (an executable) gives empty. |
| `AttachmentName.sanitize` | `sanitize("../../x.png", "f")` is `x.png`; `sanitize("..", "f")` is `f`; a 300-character name is cut to 200 keeping the extension. |
| `PasswordPolicy.check` (`domain.user`) | `Password1` refused as too common; `asha.rao2026` for `asha.rao@x.edu` refused; 72 two-byte characters refused; `Tr4in-lamp-91` accepted. |
| `RateLimiter` (`application.ratelimit`) | Limit 3: three pass; the fourth throws `RateLimitedException` with a retry between 1 and 60; one minute later it passes again. `tryAcquire` returns `FIRST_REFUSAL` once, then `REFUSED`. |
| `AuditSealing.digest` and `sealHash` (`domain.audit`) | Changing any field changes the hash. |
| `AuditChainVerifier.verify` | Detects a changed record, a missing record, an inserted record, an altered seal and a broken link; an intact chain passes. |
| `AttachmentService`, `AuditSealService` (need a database) | Upload limits (png, jpg, jpeg, gif, pdf, txt, log; 5 MB; 10 per incident); seal then verify then tamper then verify. |

### M2b: Google sign-in
`GoogleSignInService.signIn(idToken)` (`application.auth`) with a stubbed `GoogleIdTokenVerifier`; `GoogleIdentity(subject, email, emailVerified, name)`:
- Existing email, verified, no `google_sub` yet: `google_sub` stored and tokens issued. A second sign-in with another email but the same sub returns the same user.
- `emailVerified = false`: `InvalidCredentialsException`, nothing linked.
- Unknown email with `auth.google.autoregister = false`: `InvalidCredentialsException`, no row. With `true`: a new user, EMPLOYEE only, `password_hash` NULL, name from the token or the part before `@`.
- Deactivated user: `InvalidCredentialsException`. Email already linked to a different sub: `InvalidCredentialsException`. Locked user: `AccountLockedException` (423). A rejected token: `TokenInvalidException` (401 `TOKEN_INVALID`).
- Failures never change `failed_logins`; a success resets it to 0.
- `GoogleClaimsChecker` (`infrastructure.google`, package-private): wrong issuer, wrong audience (or blank `GOOGLE_CLIENT_ID`), missing expiry, subject or email are rejected; issuer `accounts.google.com` and `https://accounts.google.com` both pass; `email_verified` accepts boolean `true` and the string `"true"`.
- For HTTP tests use `GOOGLE_VERIFIER=fake` (profiles dev, demo and test only): tokens are HS256 JWTs signed with the key in `FakeGoogleIdTokenVerifier`, audience equal to `GOOGLE_CLIENT_ID`, issuer `https://accounts.google.com`, claims `sub`, `email`, `email_verified`, `name`, `exp`.

---

## 5. Optional: more integration (HTTP) tests beyond T01 to T26

**Status 2026-11-15:** none of these is a JUnit test yet (`HandbookIntegrationTest` still holds only T01 to T26 minus T05 to T07, T10, T16). The Postman folders now cover some of the same ground over HTTP (problem records and demo outage drill, notifications and preferences, reports invariants, the CSV formula escape, password policy and rate limit in `security_checks.py`).

Use the same setup as `HandbookIntegrationTest` (real HTTP, Testcontainers, fixed clock, each test creates its own data). Several of these also fit the Postman collection.

| Area | Scenario | Expected |
|---|---|---|
| Duplicates | Create two similar incidents on one service; resend with `confirmNotDuplicate: true` | First 201, second 409 `DUPLICATE_INCIDENT` with a `similar` list; the resend 201. |
| Withdraw | Reporter withdraws an incident in CLASSIFIED; again from IN_PROGRESS | `closureReason WITHDRAWN`; then 409 `INVALID_STATE_TRANSITION`. Someone else withdrawing gets 403. |
| Reporter edit lock | Reporter changes impact after ASSIGNED | 403; changing the description is allowed; an administrator may change impact. |
| Mark duplicate | Team lead marks an incident as a duplicate of another | Closed with `DUPLICATE`; offers no REOPEN. |
| Problem records | Join a known outage; resolve the problem | `POST /problems/{id}/join` 201; resolving the problem resolves every open incident of the record. |
| Demo endpoints | `POST /admin/demo/outage-drill`, `/admin/demo/clock/advance` | 201 and 200 in the `demo` profile; **404 in every other profile**. |
| Escalation | Manual `POST /incidents/{id}/escalate` | 200 with a reason of 10 to 1000 characters; 409 at level 3 or wrong status; 403 for anybody else. |
| Feedback | `POST /incidents/{id}/feedback` | 201; second rating 409; rating 0 or 6 gives 400. |
| Notifications | Assign an incident; read the inbox; switch a locked preference off | Rows for the assignee and reporter; the locked switch gives 400 with `fieldErrors`; `GET /notifications/preferences` returns 60 switches. |
| Rate limits | 11 logins in a minute for one email; 21 incident creations in a minute | 429 `RATE_LIMITED` with `Retry-After`. |
| Password policy | Register with `Password1`; with the email's first part | 400 with a `fieldErrors` entry on `password`. |
| Attachments | Upload a renamed `.exe`; a 6 MB file; a valid text file; download as a non-viewer | 400 on `file`; 400; 201; 404. |
| Audit seals | `POST /audit/seal`, then `GET /audit/verify`, then edit a row (trigger disabled, see R5), then verify | Intact, then not intact with `firstProblem` naming the row. |
| Google sign-in | `POST /auth/google` with a fake-verifier token | The same `AuthResponse` as login; a forged unsigned token gives 401 `TOKEN_INVALID`. |
| Reports | `GET /reports/overview` against the seed | `total` 212 on the seeded database; the invariants of section 4, M10. |
| CSV export | An incident titled `=1+1` | The CSV cell starts with `'`. |
| Status board and graph | `GET /services/status`, `/services/graph`, `/services/{id}/impact` | An open P1 on a service makes it OUTAGE and its dependents DEGRADED. |
| Real time | STOMP connect to `/ws` with a bearer token; an employee subscribes to `/topic/dashboard` | The employee receives an ERROR frame; an administrator receives counters. |
| Priority what-if | `POST /priority/what-if` | Same result as a real incident with the same inputs; nothing is saved. |

---

## 6. Optional: shared extras from the accepted plan (DEC-43)

**Status 2026-11-15:** A9 not done (`backend/pom.xml` has no ArchUnit or JaCoCo; CI has no coverage or static-analysis step). A10 not done. A7 not done: no load-test script or result in the repository (`backend/docs/SCALING.md` only mentions the tools). A14 not checked.

| # | Item | Yours | Notes |
|---|---|---|---|
| A9 | Architecture rule tests (ArchUnit) | Yours | `domain` imports no Spring or web code; controllers never touch repositories. Needs `archunit-junit5` as a test dependency: ask the Backend Lead to add it to `backend/pom.xml`. |
| A10 | CI quality gate | Yours | Add a coverage report (JaCoCo can run from the command line without a `pom.xml` change) and a static analysis step to the CI backend job. |
| A7 | Load test with numbers | Shared with the Backend Lead | You run it against the Compose stack (k6, JMeter or Gatling) and record p95 latency for incident creation and listing at a stated load. The index review and the written scale-out path are the Backend Lead's. |
| A14 | Campus-flavoured demo data | Shared with the Report teammate | The Report teammate supplies the wording of the institute's real IT services; you load it through the seed SQL. |

---

## 7. Not yours (so nobody does it by mistake)

| Item | Owner |
|---|---|
| Any Java under `backend/src/main/java` and the OpenAPI contract | Backend Lead |
| Wiring the technician, employee and team-lead screens, and every other `frontend/` change (see `frontend/FRONTEND_GUIDE.md`) | Frontend Developer |
| Writing the frontend component tests (you review and run them, R10) | Frontend Developer |
| The root README's feature text (you only add the CI badge, R8) | Frontend Developer |
| The PDF report, UML and ER diagrams, slides, video editing, notification wording, AI prompts | Report teammate |
| Rotating the cloud database password that was committed on `sanay-branch` (its author), and the Vercel team setup | Repository owner |
| The requirement traceability matrix (A13) | Backend Lead and Report teammate (give them your test ids) |

---

## 8. Handover and tips

- **Smoke scripts (not in the repository; PR #24 hands them over).** The Backend Lead has per-module smoke scripts (`auth`, `m3` to `m14`, `calendar`, `endpoint_sweep`, `check_contract`) outside this repository; they show the expected behaviour of every built endpoint and are meant to be turned into automated tests. Ask for the folder. They read `SMOKE_PORT` and `SMOKE_DB`, and some need a fresh database.
- **Where the expected values live.** `backend/docs/ROADMAP.md` section 7, `backend/docs/TEAM_UPDATES.md`, and `backend/docs/SYSTEM_GUIDE.md` for each module's rules.
- **Test naming and independence** (handbook 2.4): `method_condition_expectedResult`, each test builds its own data, time-based logic uses the injected `Clock`.
- **Existing behaviour to remember when writing tests:** creating similar incidents on one service needs `confirmNotDuplicate: true`; the password policy refuses passwords containing a word of the user's name (4 or more characters) or the first part of the email; a category is no longer required on create, and a confident AI suggestion (0.60 or more) is applied.
