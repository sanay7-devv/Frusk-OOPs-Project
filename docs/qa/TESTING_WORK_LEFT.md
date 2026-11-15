# Testing and DevOps: what is left, and the optional full test catalogue

**Update, 2026-11-15:** This is the original planning snapshot and several “not yet” items below are now complete in Task 3 PR #21. All six jobs passed in [run 43736234225](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43736234225): 71 Postman requests/149 assertions and 30 security checks. The portable tests, CI reports, dated case matrix, bug closure and test report are also in PR #21. Use [TEST_REPORT.md](TEST_REPORT.md) for current results and [DEMO_RUN_SHEET.md](DEMO_RUN_SHEET.md) for recording. Remaining hands-on work is browser script-text review, sealed-audit demo dry run, fresh-clone/laptop reset timing, final recording, and repository-owner branch protection.

Written 2026-11-15 against `main` (`acce260`). Read together with `docs/qa/README.md` (your evidence so far) and `backend/docs/TEAM_UPDATES.md` (everything that differs from the handbook PDFs).

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
| Migrations match Appendix A and run cleanly from an empty database | **Done** | V1 to V9 applied cleanly on an empty database and Hibernate `validate` accepted the entities (checked 2026-11-15 on merged `main`). |
| Seed data loads in dev and demo; staged demo state present | **Done** | 18 users, 212 incidents, 180 feedback rows, 63 settings loaded. |
| One command starts the system; one command resets the demo | **Done** | `docker compose -f deploy/docker-compose.yml up --build --detach --wait`; `bash db/tools/reset-demo.sh`. Reset time on the recording laptop is **not measured** (R6). |
| CI runs unit, integration, API and frontend tests and blocks bad merges | **Mostly** | Six jobs run and pass. "Blocks bad merges" needs branch protection, which is not enabled (R8). |
| All 26 cases pass and are documented with evidence | **Done** | `docs/qa/test_cases.csv`. The table lacks the date and commit columns the handbook asks for (R7). |
| Bugs triaged; no open blockers at freeze | **Partly** | One open issue (#11), already fixed (R1). Labels `severity:*` and `area:*` do not exist (R8). |
| Test report delivered to the Report teammate | **Not yet** | The pieces exist; the single report does not (R7). |
| No secrets committed; `.env.example` complete; README tells a newcomer what to run | **Partly** | `deploy/README.md` is good. The root README has no CI badge (R8). |

---

## 2. Required work left, in priority order

### R1. Close issue #11
- **What:** issue #11 "QA: Update frontend auth-flow tests for current login controls" is still open.
- **Why:** PRs #15 and #16 fixed it. An open bug that is already fixed looks like unfinished work in the bug record.
- **How:** close it with a link to PR #16.
- **Done when:** no open issues remain for fixed bugs.

### R2. Make the tests run on any machine
Two problems found when the suite was run on a Windows laptop in the India time zone. CI is Linux and UTC, so CI does not see them.

1. **Time zone.** `HandbookIntegrationTest` failed with `FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"`. The application forces UTC in `IitsmBackendApplication.main`, but tests do not start through `main`, so the JVM keeps the machine's zone. Fix in `src/test`: set `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))` once, for example in a shared `@BeforeAll` or a JUnit extension used by every `@SpringBootTest`.
2. **`IitsmBackendApplicationTests`.** It has no Testcontainers, so on a machine without a database on `localhost:5432` it fails with `password authentication failed`. In CI it only passes because of the Postgres service container. Give it the same Testcontainers database as `HandbookIntegrationTest`, or turn it into a unit-level test.

- **Why:** a teammate who runs `mvn test` on their own laptop and sees 22 errors will think the code is broken.
- **Done when:** `./mvnw test` passes on a clean clone with only Docker running, whatever the machine's time zone.

### R3. Record the basic security checks (handbook 2.11)
The handbook asks for a written result of six checks for the report's security section. Run them against the Compose stack and record the result and evidence.

| # | Check | Expected result |
|---|---|---|
| 1 | Read another user's incident by changing the id in `GET /incidents/{id}` | 404 `INCIDENT_NOT_FOUND` (existence is not revealed). The same person trying an action on it gets 403 `UNAUTHORIZED_OPERATION` (T18). |
| 2 | Call an admin endpoint with an employee token | 403 `UNAUTHORIZED_OPERATION`, and an `ACCESS_DENIED` audit row (T17). |
| 3 | Send an expired token, then a garbage token | 401 `TOKEN_EXPIRED`, then 401 `TOKEN_INVALID` (T19). |
| 4 | Send `<script>alert(1)</script>` as a title, description and comment | Record what happens. Expected: accepted as plain text, returned unchanged in JSON, shown as text (never executed) in the UI. |
| 5 | Send a very long input (title over 200 characters, description over 5000, comment over 4000, a password over 72 bytes, a file over 5 MB) | 400 `VALIDATION_FAILED` with `fieldErrors` naming the field; an oversized upload is refused with 400 `fieldErrors` on `file`. |
| 6 | Try five wrong passwords, then keep trying | 423 `ACCOUNT_LOCKED` after the fifth (T20); more than 10 login attempts a minute for one email gives 429 `RATE_LIMITED` with a `Retry-After` header. |

Extra checks worth including because the backend now does them (see `TEAM_UPDATES.md`): reusing an old refresh token revokes every session of that user; a renamed `.exe` upload is refused because the type is read from the file content; common passwords such as `Password1` are refused.

- **Done when:** a table with check, request, observed result, date and evidence is in `docs/qa/` and handed over with the test report.

### R4. Complete the Postman collection (handbook 2.6)
The collection has these folders today: Setup, Auth, Catalog and setup, Workflow 1, Workflow 2, Negative cases, Admin and multi-role authorization (38 requests, 83 assertions). The handbook asks for **one folder per demo workflow** and folders for Intelligence, Reports and Notifications.

Add:

| Folder | Requests (endpoints) | What to assert |
|---|---|---|
| **Workflow 3: Major Incident Mode** | `POST /admin/demo/outage-drill {rootServiceId}` (demo profile only), `GET /problems`, `GET /problems/{id}`, `GET /problems/{id}/root-cause`, `GET /problems/known-outages?serviceId=`, `POST /problems/{id}/join`, `POST /problems/{id}/resolve` | Drill returns 201 with incident codes; root cause names the common upstream service; join returns 201 and the joiner's incident is CLOSED as a duplicate; resolving the problem resolves every open incident of the record. |
| Intelligence | `POST /intelligence/suggest-category`, `/suggest-intake`, `/similar`, `/chat`; `GET /incidents/{id}/similar`, `/suggested-resolutions`, `/sla-risk`; `POST /incidents/{id}/summary` | With no LLM key, `source` is `KEYWORD`; a category is returned only when `categoryId` is not null; SLA risk returns `score`, `level` and factors that add up to the score. |
| Reports | `GET /reports/overview`, `/services`, `/trends`, `/priority-distribution`, `/category-distribution`, `/sla-compliance`, `/workload`, `/coverage-risk`, `/export?type=` | Open + resolved = total; each distribution sums to the overview total; the CSV export starts a formula cell with `'`. |
| Notifications | `GET /notifications`, `/unread-count`, `POST /notifications/{id}/read`, `/read-all`, `GET/PUT /notifications/preferences` | An assignment creates inbox rows; preferences return 60 switches; switching off a locked one is 400 with a `fieldErrors` entry. |

Run the new folders in the existing Newman step of CI.
- **Done when:** each of the three workflows can be dry-run by API alone, as the handbook says.

### R5. Dry-run checklist for all three workflows, and the tamper helper
`docs/qa/README.md` has a 7-step dry run that covers workflows 1 and 2 only. The video run sheet (`backend/docs/DECISIONS.md`, DEC-45) has five segments that need a checklist: workflow 1, workflow 2, workflow 3, administrator, security. For each: the account, the exact input, and what must appear. Run it twice a week and before every take (handbook 2.12).

Specific things the run sheet needs from you:
- **Recording-day checks:** reset before every take; the mail catcher at http://localhost:8025 shows the emails; the demo timers are active (SLA monitor 30 s, escalation monitor 15 s with 1 minute per level, auto-verify about 2 minutes); the Gemini key works or the keyword fallback is acceptable (`source` says `KEYWORD`).
- **Tamper helper for the sealed audit trail demo (S3).** The 30-second security segment edits an audit row in SQL and presses Verify. Your V7 trigger (`audit_records_no_update_delete`) rejects that edit, as it should. Add a small tool in `db/tools/` that, **for the demo database only**, disables the trigger, changes one row, and re-enables it, plus a second command that undoes the change, so the segment can be repeated in every take. The tool must refuse to run against the dev database.
- **Done when:** a teammate who has never seen the system can follow the checklist and get the same result.

### R6. Verify the demo reset on real hardware (handbook 2.12)
- Measure `bash db/tools/reset-demo.sh` on the recording laptop. Target under two minutes; the README says this is still unmeasured.
- Verify the one-command start and the reset from a **fresh clone on a different laptop**.
- **Done when:** both results are written in `deploy/README.md`.

### R7. The test report (handbook 2.11)
This goes into the PDF. Hand it to the Report teammate.

1. Extend `docs/qa/test_cases.csv` with the **date** and **commit id** columns the handbook table requires (ID, category, status, date, commit id, short note). You already link the run.
2. Evidence per case: a screenshot or the Newman output.
3. A summary: total, passed, failed, open bugs, lessons learned.
4. Update the T16 note: the handbook expects similarity thresholds of 0.80 and 0.65, but the backend now uses TF-IDF with a **duplicate threshold of 0.55** and a related threshold of 0.35 (DEC-M12-1). Your test already passes against the real engine; the report must say why the number differs.
5. Add the R3 security table.
- **Done when:** the Report teammate has one document to paste from.

### R8. Bug tracking and repository settings (handbook 2.11, 2.2, 2.10)
- **Labels:** the repository has only GitHub's defaults (`bug`, `documentation` and so on). Create `severity:blocker`, `severity:major`, `severity:minor`, `area:backend`, `area:frontend`, `area:db`, `area:docs`.
- **Issue template** with the fields: title, steps to reproduce, expected, actual, screenshot or log, build or commit, who found it.
- **Project board** with columns To do, Doing, In review, Done.
- **Branch protection on `main`:** pull request required, one review, CI jobs must pass. This needs the repository owner (the repo belongs to `sanay7-devv`); ask them to enable it, since it is not enabled today.
- **CI badge:** add a build-status badge for the workflow to the top of the root `README.md` (one line; handbook 2.10). Do not edit the rest of that README.
- **Done when:** a new bug can be filed with a severity and an area, and a red CI blocks a merge.

### R9. Small CI gaps (handbook 2.10)
- **Upload backend test reports as artifacts** from the `backend-test` job. Today only the seed jobs upload them.
- **Frontend lint step.** The handbook's frontend job includes lint, but `frontend/package.json` has no lint script. Ask the Frontend Developer to add one; then add the step.
- **Time budget:** the handbook wants CI under about 10 minutes. Record the real duration of the longest job (the demo-stack job has a 15 minute limit).
- **Done when:** a failed test leaves a downloadable report.

### R10. Frontend tests: review, run and list (handbook 2.7)
The handbook says the Frontend Developer **writes** 3 or 4 component tests (SLA countdown colours, status chip mapping, login form validation, filter bar) and you review them, run them in CI and list them in the test document. Today there are only the 3 navigation tests in `auth-flow.test.tsx`.
- **Your part:** ask the Frontend Developer for the component tests, review them, and list all frontend tests in the test report. Do not write them yourself.

### R11. Unit tests from the handbook's own list (handbook 2.4)
The handbook's class-level table names these test classes. Five of them do not exist yet. They are required; the optional catalogue is in section 4.

| Handbook class | State | What to cover |
|---|---|---|
| `PriorityStrategyTest` | **Done** (`PriorityEngineTest`, 4 tests) | |
| `EligibilityFilterTest` | **Done** (6 tests) | |
| `WorkloadTrackerTest` | **Done** (3 tests) | |
| `SlaTrackerTest` | **Done** (3 tests) | |
| `IncidentStateTest` | **Missing** | For every state and every action: the allowed ones succeed with the right next state; every other combination throws `InvalidStateTransitionException`. Use a parameterized table test. Classes: `Incident`, `StateFactory`, `OpenState` and the state classes in `com.iitsm.domain.incident`. |
| `AssignmentStrategyTests` | **Missing** | Skill, Load, RoundRobin, ExperiencePriority and Composite weights, and tie-break rotation. Weights are now skill 0.35, load 0.25, experience 0.15, priority fit 0.10, service familiarity 0.15 (they must sum to 1.0). Skill score is 0.7 times best proficiency plus 0.3 times the share of required skills held. A worked example with numbers is in `backend/docs/SYSTEM_GUIDE.md` section 10. Classes in `com.iitsm.domain.assignment`. |
| `EscalationChainTest` | **Missing** | Expected values are in section 4, M11. |
| `SimilarityTest` and `KeywordCategorizerTest` | **Missing** | Use `Tokenizer`, `TfIdfModel` and `KeywordTextAnalysisService` (section 4, M12). Thresholds are **0.55 and 0.35**, not the handbook's 0.80 and 0.65. |
| `SlaRiskScorerTest` | **Missing** | Section 4, M12. |
| `ExceptionMappingTest` | **Missing** | `ItsmException` and its subclasses in `com.iitsm.domain.exception`: each exception maps to its code and HTTP status from Appendix B.2; `GlobalExceptionHandler` renders `ErrorResponse`. |
| `PermissionTest` | **Missing** | Union of permissions for a multi-role user; team lead is a technician with escalation level 1 (section 4, M2). |

- **Done when:** every class in the handbook's table has a test class.

---

## 3. What exists today (so you do not duplicate it)

**Backend tests: 40 run on `main`, 0 failures (2 skipped without a seeded database).**

| Test class | Tests |
|---|---|
| `HandbookIntegrationTest` (real HTTP, Testcontainers PostgreSQL) | 21: T01 to T04, T08, T09, T11 to T15, T17 to T26 |
| `PriorityEngineTest` | 4 (T05, T06) |
| `EligibilityFilterTest` | 6 (T07) |
| `WorkloadTrackerTest` | 3 |
| `SlaTrackerTest` | 3 |
| `IitsmBackendApplicationTests` | 1 (context loads; see R2) |
| `SeedCompatibilityTest` | 2 (run only with a seeded database) |

**Other automated checks:** 3 frontend tests; 7 Python seed-generator tests; `db/checks/verify.sql`; `deploy/api_smoke.py` (40 requests); the Postman collection (38 requests, 83 assertions); `deploy/handbook_contract_checks.py` (T10 and T16, run against the Docker stack).

**CI:** six jobs (backend tests, frontend tests, frontend build, seed integrity for dev and demo, demo stack with snapshot round trip).

**Gap in numbers:** the backend has 119 operations and over 400 classes; the unit tests above cover a handful of the rule classes. The optional catalogue in section 4 fills this.

---

## 4. Optional: unit test catalogue (all plain Java unless noted)

Class names, packages and expected values come from `backend/docs/ROADMAP.md` section 7 and `TEAM_UPDATES.md`. Every class below was checked to exist in `backend/src/main/java/com/iitsm`. Use a fixed `Clock`; scheduling is off in the test profile (`app.scheduling.enabled=false`), so call the monitors directly.

If an expected value here ever disagrees with the code, the code wins for "what exists now": check with the Backend Lead and note the difference.

### M1 and M2: foundations, users, authentication
| Class (package) | Cases |
|---|---|
| `ItsmException` and its 17 subclasses (`domain.exception`), `GlobalExceptionHandler` (`web.handler`), `RequestIdFilter` (`web.filter`), `ErrorResponse` (`web.dto`) | Each exception gives its code and HTTP status; an exception from a test endpoint comes back in the standard body; `X-Request-Id` header present. |
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

- **Smoke scripts.** The Backend Lead has per-module smoke scripts (`auth`, `m3` to `m14`, `calendar`, `endpoint_sweep`, `check_contract`) outside this repository; they show the expected behaviour of every built endpoint and are meant to be turned into automated tests. Ask for the folder. They read `SMOKE_PORT` and `SMOKE_DB`, and some need a fresh database.
- **Where the expected values live.** `backend/docs/ROADMAP.md` section 7, `backend/docs/TEAM_UPDATES.md`, and `backend/docs/SYSTEM_GUIDE.md` for each module's rules.
- **Test naming and independence** (handbook 2.4): `method_condition_expectedResult`, each test builds its own data, time-based logic uses the injected `Clock`.
- **Existing behaviour to remember when writing tests:** creating similar incidents on one service needs `confirmNotDuplicate: true`; the password policy refuses passwords containing a word of the user's name (4 or more characters) or the first part of the email; a category is no longer required on create, and a confident AI suggestion (0.60 or more) is applied.
