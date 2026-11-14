# I-ITSM: What changed since your handbook

> **Read this first.** The five handbook PDFs (dated 2026-10-15) are frozen and are not in this repository. This page lists every point where the project now differs from them, per role. Where this page and a handbook disagree, this page wins. Reasons are in `DECISIONS.md` (DEC numbers); the order of work is in `ROADMAP.md` section 5.

Last updated: 2026-11-14 (M9, M10, M11, M12 core)

---

## 1. For everyone

| Topic | Handbook says | Now | Why |
|---|---|---|---|
| Spring Boot | 3.x | **4.1.1** (Spring Security 7, Hibernate 7, Jackson 3) | DEC-02: 3.5 is out of free support with unpatched CVEs |
| Repository | `iitsm/` with the Spring project at the root and `db/`, `deploy/`, `docs/` folders | `sanay7-devv/Frusk-OOPs-Project` with `backend/` and `frontend/`; backend docs in `backend/docs/`. `db/`, `deploy/` and `.github/workflows/` do not exist yet | DEC-41 |
| Scope | Tiers 1 to 3, a cut order, a week-by-week plan and freeze dates | Everything is built, including the "Tier 3" extras; work follows module dependencies | DEC-35 |
| API contract | Hand-edited OpenAPI file, changed first by pull request | Generated from the running code; unbuilt endpoints are listed under the tag **Planned**. Files: `backend/docs/openapi/iitsm-api.yaml` and `.json`. Today 98 operations: 71 built, 27 planned | DEC-36 |
| Assignment weights | Skill 0.40, load 0.30, experience 0.20, priority fit 0.10 | Five factors: skill 0.35, load 0.25, experience 0.15, priority fit 0.10, **service familiarity 0.15** | DEC-28 |
| Skill score | "Best skill proficiency match" | 70% best proficiency + 30% share of required skills held | DEC-29 |
| Team lead visibility | "Team lead sees their team" | Team leads see all incidents (the schema has no team) | DEC-26 |
| SLA calendars | Listed as a Tier 3 extra | Built: a policy is ALWAYS or BUSINESS_HOURS; one company calendar in `app_config` (`sla.business.*`) | DEC-39 |
| Settings | 27 keys in Appendix A.5 | 63 keys (35, plus six `notification.*` with M9, six report and coverage keys with M10, two escalation keys with M11, 14 intelligence keys with M12); defaults live in the code, so seed rows are optional | DEC-18 |
| Demo | Docker Compose | Unchanged: the recorded demo runs locally with Docker Compose. Cloud deployment is the last priority | DEC-45 |
| Grading | Summary table in section 1.2 | Use the rubric in the course brief; our plan against it is `ROADMAP.md` section 8 | DEC-43 |

**Built so far (backend):** M1 to M11 and the core of M12: users and login, catalog and live settings, incidents with the full lifecycle, priority, five assignment strategies with explainable recommendations, SLA monitor with warnings and violations, audit trail, notifications (M9), search and reports (M10), escalation (M11), suggestions, similar incidents and SLA risk (M12 core).
**Not built yet:** the rest of M12 (duplicate check, problem records, Major Incident Mode, chatbot), M13 real-time and graph, M14 hardening, Google sign-in.


### New features accepted on 2026-11-13 (none built yet)

| Feature | What the user sees | Decision |
|---|---|---|
| Major Incident Mode | Related incidents are grouped, the common upstream service is named as probable root cause, employees join a known outage with one click, the priority climbs as they join | DEC-44 |
| Service Desk Simulator | An administrator replays a workload under up to three configurations and compares the results on one chart | DEC-44, DEC-45 |
| Sealed audit trail | A Verify action proves the audit log is intact or names the altered record | DEC-44 |
| Service status board | Every service as Healthy, Degraded or Outage | DEC-47 |
| Recurring-problem detector | A team lead is told when the same failure keeps coming back | DEC-47 |
| Coverage risk report | Critical services only one available technician can handle | DEC-47 |
| Post-incident report | Timeline, time in each status and SLA outcome, as PDF | DEC-47 |
| Reporter tracking view | A progress line with the SLA due time | DEC-47 |
| Chatbot and voice reporting, chat-webhook notifications, priority what-if, escalation preview | | DEC-43 |
| Demo aids (demo profile only) | An administrator moves the clock forward; one action starts a prepared outage | DEC-45 |

**Behavior that will change** (DEC-46): a reporter can withdraw an incident before work starts; once an incident is assigned, only a team lead or administrator can change impact, urgency and affected users; a resolved incident nobody confirms is verified and closed automatically.

**Escalation (M11, built 2026-11-14, DEC-48 to DEC-53).** An unacknowledged P1 or P2 climbs level by level (team lead, system administrator, IT manager) after the timeouts in `escalation_policies`; one in triage with nobody assigned starts at level 0 and climbs the same way; after level 3 and `escalation.exhausted.minutes` one final "escalation exhausted" alert goes to all administrators (SMS for P1) and the monitor stops. Acknowledging stops everything. The alert reuses the audit action ESCALATED and the notification event type INCIDENT_ESCALATED, so no new schema values are needed. Also built: `POST /incidents/{id}/escalate`, the `escalationPreview` field on the incident detail, the auto-verify job (a resolved incident nobody confirms closes as AUTO_VERIFIED after `verify.auto.hours`) and, in the `demo` profile only, `GET /admin/demo/clock` and `POST /admin/demo/clock/advance`. Settings are now 37 (new: `escalation.exhausted.minutes`, `verify.monitor.interval.seconds`).

---

## 2. Frontend developer

- **Most screens are not connected to the backend yet.** Eleven are placeholders (admin: all incidents, audit log, categories, config, reports, service graph, services, SLA policies, users; employee: my incidents, incident detail). Six run on hardcoded data (admin dashboard, team queue, escalations, technician queue, technician workload, employee home). Login, register and the report form call the API.
- **Suggested order, following the three demo workflows:**
  1. Employee: report form, my incidents, incident detail (use `allowedActions` to show buttons).
  2. Technician: queue, workbench (acknowledge, start, request info, resolve), workload.
  3. Team lead: team queue with assign and recommendations, escalations.
  4. Administrator: all incidents, audit log, SLA violations, config, services, categories, SLA policies, users.
  5. Dashboard, reports, service graph (their endpoints arrive with M10 and M13).
- **Endpoints you can use today** are every operation in the contract without the tag Planned. The report form already calls `/intelligence/*` and `/notifications/*`; those are still Planned (M12, M9).
- **M10 endpoints (live 2026-11-14), all in the standard error body:**
  - `GET /incidents` now also takes `slaState` (`OK`, `WARNING`, `VIOLATED`, `PAUSED`, `MET`; `AT_RISK` is empty until M12). It reads the flags the SLA monitor wrote, so a list can trail the detail view by up to one monitor interval (60 s).
  - Reports, for every logged-in user, counting only the incidents that user may see: `GET /reports/overview`, `/services`, `/trends?bucket=day|week`, `/priority-distribution`, `/category-distribution`, `/sla-compliance?groupBy=priority|service|technician` (all with optional `from`, `to`); `GET /reports/export?type=incidents|overview|services|trends|priority-distribution|category-distribution|sla-compliance|workload` returns CSV. Staff only (team lead, admin): `GET /reports/workload` and `GET /reports/coverage-risk?onlyFlagged=` (E3). Shapes are in `iitsm-api.json`.
  - Post-incident report (E4): `GET /incidents/{id}/post-incident-report` (JSON: timeline, `timeInStatus`, `sla`, `people`, `resolution`) and `.../pdf` (download).
  - Feedback: `POST /incidents/{id}/feedback {rating 1-5, comment}` returns 201; show the form when `allowedActions` contains `GIVE_FEEDBACK`; `IncidentDetail.feedback` is `{rating, comment, createdAt}` or null.
  - Saved views: `GET /saved-filters`, `POST /saved-filters {name, filter}`, `DELETE /saved-filters/{id}`; `filter` holds the same keys as `GET /incidents` (`status` and `priority` as arrays).
  - Priority what-if: `POST /priority/what-if {incidentId | serviceId+categoryId, impact, urgency, affectedUsers}` returns `current`, `whatIf`, `changed`, `scoreDifference`; use it for a live preview while the user moves the sliders. It changes nothing.
- **Rules to follow:**
  - Never re-implement permissions: `IncidentDetail.allowedActions` says which buttons to show.
  - Send `version` on `PUT /incidents/{id}`; on 409 `OPTIMISTIC_LOCK_CONFLICT` reload and retry.
  - Store the new refresh token from every refresh response; reusing an old one logs the user out everywhere.
  - For an error code you do not know, fall back to the HTTP status.
- **Additions to the original contract** are listed in `backend/docs/openapi/README.md`. A typed client can be generated from `iitsm-api.json`.
- **Escalation (M11, live):**
  - `POST /incidents/{id}/escalate` with `{reason}` (10 to 1000 characters) returns `IncidentDetail`; show the button when `allowedActions` contains `ESCALATE` (assignee, team lead, administrator; ASSIGNED, ACKNOWLEDGED, IN_PROGRESS; not at level 3). 409 at level 3 or wrong status, 403 for anybody else.
  - `IncidentDetail.escalationPreview` (staff only, otherwise null): `{kind: RAISE | EXHAUSTED, fromLevel, toLevel, targetRole, dueAt, secondsRemaining, recipients: [{id, name}]}`. Draw "escalates to Team Lead in 04:12" from it. `escalationLevel` (0 to 3) is on every incident and list row.
  - An incident in triage (no assignee) also escalates when it is P1 or P2, so the escalations screen should list level 1 to 3 incidents with no assignee too.
  - A resolved incident nobody confirms is closed by the system after `verify.auto.hours`: `status` CLOSED, `closureReason` AUTO_VERIFIED, history entries without an actor.
  - **Demo profile only:** `GET /admin/demo/clock` returns `{now, offsetMinutes}`; `POST /admin/demo/clock/advance` with `{minutes: 1..1440}` moves the clock forward (admin only; any other profile answers 404). Offer it as a small "+10 min" control for the recording. After a large advance the access token can be expired: refresh it and retry.
- **New screens to plan:** everything in the table above, plus the known-outage banner on the report form, the audit Verify button and the demo controls.
- **Root `README.md`:** it describes features that have no backend (for example runbook automation). Please align it with what the demo will show.
- **Still needed from you:** the Google client ID for sign-in.

**M9 notifications (2026-11-13, DEC-54).** All endpoints are live under `/api/v1/notifications`, any logged-in user:
- `GET /notifications?unread=true&page=0&size=20` returns `{items, page, size, totalItems, totalPages}`; item `{id, eventType, title, message, incidentId (null for a digest), channel, read, createdAt}`. Optional `channel=SMS_SIM` lists the simulated text messages (default IN_APP). `GET /notifications/unread-count` returns `{count}`. `POST /notifications/{id}/read` and `POST /notifications/read-all` return 204.
- `GET /notifications/preferences` returns 60 switches `{eventType, channel, enabled, locked}` (15 event types x IN_APP, EMAIL, WEBSOCKET, SMS_SIM). `locked: true` means it cannot be switched off: draw the toggle disabled. `PUT` takes a list of `{eventType, channel, enabled}` and **replaces** the saved set (send only what the user changed from "on"); answers 400 with `fieldErrors` such as `[0].enabled` for a locked switch.
- Live push: STOMP over WebSocket at `ws://localhost:8080/ws`. On CONNECT send the header `Authorization: Bearer <accessToken>`, then subscribe to `/user/queue/notifications`. The message body is the same Notification object, with `channel: "IN_APP"` and the `id` of the inbox row (use it to mark read). The connection is not renewed when the token expires; reconnect after a refresh. Fall back to polling `unread-count` every 10 s if the socket drops.
- Titles are under 60 characters. Wording is in `backend/src/main/resources/notification-templates.properties` (Report teammate: edit the text, keep the `{placeholders}`).

## 3. Testing and DevOps

- **Migrations V1 to V6 are still needed.** Until they arrive the backend runs with the temporary `schema-auto` profile (DEC-07). Differences from Appendix A to include:
  - `users.password_hash` nullable and `users.google_sub VARCHAR(100) NULL UNIQUE` (DEC-04).
  - `sla_policies.calendar_type`: widen beyond VARCHAR(12), or seed the stored value `BUSINESS_HRS` (ERROR_LOG E-022).
  - A partial unique index for the global SLA default (`WHERE service_id IS NULL`) (DEC-17).
  - The trigger that rejects UPDATE and DELETE on `audit_records`.
  - One new table, `audit_seals` (id, from_id, to_id, record_count, hash, prev_hash, created_at), for the sealed audit trail.
  - `sla_violations` as in Appendix A.3.
- **M10 (2026-11-14):** two new tables from Appendix A.4, `feedback` (`incident_id` PK FK, `rating` SMALLINT CHECK 1 to 5, `comment` TEXT, `created_at`) and `saved_filters` (`id`, `user_id` FK, `name` VARCHAR(60), `filter_json` JSONB, `created_at`); both are created by the entities under `schema-auto`. New settings: `report.export.max.rows`, `report.trend.max.buckets`, `coverage.window.days`, `coverage.min.criticality`, `coverage.min.holders`, `saved.filters.max` (the settings count grows by these six). New smoke suite `m10_smoke.py`; `m4_smoke.py` now expects `GIVE_FEEDBACK` in a closed incident's actions and `endpoint_sweep.py` calls every M10 endpoint. Class names and expected values for unit tests are in `ROADMAP.md` section 7 (M10 line). The reports are native SQL (PostgreSQL), so report tests need the Testcontainers database.
- **M11 escalation (built 2026-11-14), class names and expected values** are in `ROADMAP.md` section 7; the smoke script is `m11_smoke.py`. Schema: no new table or column. Seed and demo data: `escalation_policies` rows for P1 and P2, levels 1 to 3 (demo: 1 minute each); `app_config` demo overrides `escalation.monitor.interval.seconds` 15, `escalation.exhausted.minutes` 1, `verify.auto.hours` 0.033, `verify.monitor.interval.seconds` 30 (the old property `app.autoverify.monitor-interval-seconds` is no longer read). Demo users should include at least one team lead (technician, escalation level 1), one administrator with scope SYSTEM_ADMIN and one with IT_MANAGER; a level nobody holds is passed over. Call `EscalationMonitor.runOnce()` and `AutoVerifyMonitor.runOnce()` directly with a fixed `Clock`; scheduling is off in the test profile. The `demo` profile has an adjustable clock bean; no other profile does.
- **Seed data:** if `app_config` is seeded, values must pass validation: the five assignment weights (including `assignment.weight.familiarity`) must add up to 1.0 and priority bands must descend, or startup fails. A category named "Security" triggers override rule 1.
- **Docker Compose and CI** are not in the repository yet.
- **Tests:** only one test exists. Everything under `src/test` is yours, as in the handbook: unit, integration and boundary tests for the 26 documented cases. (A version of this page from earlier on 2026-11-13 said the backend lead writes domain unit tests; that was a mistake and is withdrawn.) The backend lead supplies class names and expected values (`ROADMAP.md` section 7) and the smoke scripts. Suggested addition: architecture rule tests proving `domain` imports no Spring or web code. Expected values for assignment use the five-factor weights. For time-based cases use a fixed `Clock`; scheduling is off in the test profile (`app.scheduling.enabled=false`), so call `SlaMonitor.runOnce()` directly.
- **Smoke scripts** (`auth_smoke.py`, `m3_smoke.py`, `m4_smoke.py`, `m6_smoke.py`, `m7_smoke.py`, `m8_smoke.py`, `calendar_smoke.py`, `endpoint_sweep.py`, `check_contract.py`) exist on the backend lead's machine, outside the repository. Ask for them; they show the expected behavior of every built endpoint.
- **Vercel:** the deployment check fails for the account `Vishh-t` until it is added to the Vercel team; the project's Root Directory should be `frontend`.

**M9 notifications (2026-11-13, DEC-54).**
- Two new tables as in Appendix A.4: `notifications` (id, user_id, event_type VARCHAR(30), channel VARCHAR(12) CHECK in IN_APP, EMAIL, WEBSOCKET, SMS_SIM, title VARCHAR(150), message TEXT, incident_id NULL, `read` BOOLEAN DEFAULT false, created_at; indexes on (user_id, created_at) and (user_id, read)) and `notification_preferences` (PK user_id, event_type, channel; enabled). Only IN_APP and SMS_SIM rows are written; the entity class names are `Notification` and `NotificationPreference` in `com.iitsm.domain.notification`. Under `schema-auto` Hibernate also creates a CHECK that allows `CHAT` (E-023); use the four values in the migration.
- Six new `app_config` keys with defaults: `notification.digest.threshold` 5, `notification.email.retries` 3, `notification.email.backoff.seconds` 2, `notification.email.from` no-reply@iitsm.local, `notification.link.base.url` http://localhost:5173, `notification.chat.webhook.url` empty. In the test profile set `notification.email.backoff.seconds` to 1.
- Mail catcher: Mailpit, `docker run -d --name iitsm-mail -p 1025:1025 -p 8025:8025 axllent/mailpit` (SMTP 1025, web and API 8025). Add it to the compose file. The app starts without it; mails are retried and then dropped.
- The listener is asynchronous (one thread, `notificationExecutor`): in tests wait for the rows (poll up to 5 s) instead of asserting at once.
- Smoke script `m9_smoke.py` (72 checks) is the reference for expected values; see ROADMAP section 7 for the unit test list.

## 4. Report and content

- **Technology:** Spring Boot **4.1.1**, not 3.x; give the reason (DEC-02). Google sign-in is planned; SSO and MFA stay "documented only".
- **Numbers that changed:** the assignment weights and the skill formula (section 1). Use `SYSTEM_GUIDE.md` section 10 for the worked example.
- **Design patterns:** the seven in the handbook, plus Template Method (already in the code) and Command (planned). See `SYSTEM_GUIDE.md` sections 14.2 and 14.3.
- **Ready-made material:**
  - `SYSTEM_GUIDE.md`: diagrams and a description of every built module.
  - `DECISIONS.md`: 47 decisions (66 with M10) with options, reasons and likely examiner questions.
  - `ERROR_LOG.md`: the record of bugs found and fixed; cite it for the rubric's "bug resolution".
  - `ROADMAP.md` section 8: our plan against each rubric line.
  - `DECISIONS.md` DEC-45: the run sheet for the 15 to 20 minute video.
  - `DECISIONS.md` DEC-47: which feature answers which challenge named in the brief.
- **M10 (2026-11-14):** reports are scoped by the viewer's role (an employee's overview counts only their own incidents) and computed in the database, so every number can be proven against a direct count: see `SYSTEM_GUIDE.md` section 12b and `DECISIONS.md` DEC-60 to DEC-66. Good demo material: E3 coverage risk (a critical service with one holder, then that technician goes off duty), E4 post-incident report and PDF, the CSV formula-injection protection (DEC-62), the priority what-if.
- **State openly in the report:** team leads see all incidents; the system runs as one instance (settings cache, rate limits and the message broker are in memory); the demo is local.
- **Still needed from you:** notification wording, the AI prompts, the labelled evaluation set, and seed incident text. Demo data should use the institute's own IT services (DEC-43, A14).

---

## 5. M12 core: intelligence and AI (2026-11-14)

Seven endpoints moved from Planned to built (contract: 72 operations built, 26 planned). Reasons: `DECISIONS.md` DEC-M12-1 to DEC-M12-9; description and verified behavior: `SYSTEM_GUIDE.md` section 12c. **Still to come in M12:** the duplicate check on creation (409 `DUPLICATE_INCIDENT`), `mark-duplicate`, problem records and Major Incident Mode, recurring-problem detector, chatbot intake.

**Frontend**
- `src/api/intelligence.ts` already matches. Calls and answers: `POST /intelligence/suggest-category {title, description, serviceId?}` gives `{categoryId, categoryName, confidence, reason, source}`; `POST /intelligence/suggest-intake {description}` gives the same plus `impact` and `urgency`; `POST /intelligence/similar {title, description, serviceId}` gives `[{incidentId, code, title, similarity, status, match}]`.
- **Show a category only when `categoryId` is not null.** The backend hides it below 0.60 confidence (then `categoryId`, `categoryName` and `reason` are null or empty, `confidence` is still sent). `source` is `LLM` or `KEYWORD`; with no API key it is always `KEYWORD`, so do not promise "AI" wording.
- New field `match` on a similar incident: `DUPLICATE` (likely the same problem, 0.55 or more) or `RELATED`. Titles only, never descriptions, are returned.
- Per incident (detail screen): `GET /incidents/{id}/similar` (any viewer), `GET /incidents/{id}/suggested-resolutions`, `POST /incidents/{id}/summary` (note: **POST**) and `GET /incidents/{id}/sla-risk` for the assignee, team lead and admin. SLA risk answers `{score 0 to 1, level LOW|MEDIUM|HIGH, atRisk, threshold, factors: [{name, contribution, detail}]}`: draw the factors as bars that add up to the score.
- Suggestion calls are limited to 20 per minute per user: on 429 `RATE_LIMITED` wait and retry; debounce typing (the backend also caches identical requests for 60 seconds).
- Generated schema names are `CategorySuggestionView`, `IntakeSuggestionView`, `SimilarIncidentView`, `SuggestedResolutionView`, `ThreadSummaryView`, `SlaRiskView`.

**Testing and DevOps**
- 14 new `app_config` keys (35 to 49); defaults live in the code, so no seed rows are needed: `dup.tfidf.threshold.duplicate` 0.55, `dup.tfidf.threshold.related` 0.35, `resolution.min.similarity` 0.30, `ai.idf.window.days` 90, `ai.timeout.seconds` 8, `ai.breaker.failures` 3, `ai.breaker.cooloff.seconds` 60, `ai.cache.ttl.seconds` 60, `ai.ratelimit.per.minute` 20, `sla.risk.weight.elapsed|load|priority|history` 0.50 / 0.20 / 0.15 / 0.15 (must add up to 1.0), `sla.risk.scan.interval.seconds` 300. Two cross rules: tf-idf duplicate must exceed related; the four risk weights add up to 1.0.
- No schema change: `incident_embeddings` stays unused (no embeddings in this part).
- Environment: `LLM_API_KEY` (empty = LLM off), optional `LLM_MODEL`, `LLM_PROVIDER` (`anthropic` or `fake`; `fake` is a scripted client that never calls the network, for tests and demos). In the test profile there is no key, so the keyword engine answers, and scheduling is off; call `SlaRiskService.scanOnce()` directly with a fixed `Clock`.
- Class names and expected values for unit tests: `ROADMAP.md` section 7. New smoke scripts (backend lead's machine): `m12_smoke.py`, `m12_calibrate.py`, `m12_common.py`; the endpoint sweep gained a section for the seven endpoints (72 operations).

**Report and content**
- **Prompts you can refine without code changes:** `backend/src/main/resources/ai/prompts/suggest-category.txt`, `suggest-intake.txt`, `summarize-thread.txt`. They must keep asking for the same JSON fields: the backend rejects any other shape and uses the keyword answer instead.
- **Keyword dictionary:** `backend/src/main/resources/ai/keywords.json` (topics, weighted words, impact and urgency phrases); edit it when the real category names are known.
- **Labelled evaluation set:** `m12_calibrate.py` holds a first set of 20 labelled pairs and prints the scores; add your pairs there and rerun to update the table in `SYSTEM_GUIDE.md` 12c.6 (DEC-42 asks for a repeatable evaluation of both paths).
- Patterns to cite: Strategy (`TextAnalysisService` with three implementations), Adapter (`LlmClient`, `LlmTextAnalysisService`), plus a circuit breaker (DEC-M12-5).

---

## M2b Google sign-in (2026-11-14, DEC-100 to DEC-103)

**Frontend**
- New endpoint `POST /api/v1/auth/google` with body `{ "idToken": "<Google ID token>" }`; the answer is the same `AuthResponse` as `/auth/login`, so reuse your login success handler (store tokens, load the user).
- Add the Google Sign-In button (Google Identity Services, `https://accounts.google.com/gsi/client`) to the login screen. Its callback gives a `credential`: that string is the `idToken`. The **client id** you give the button must be the same one the backend has in `GOOGLE_CLIENT_ID` (still needed from the team: create the OAuth web client in the Google Cloud console and add the frontend origin, for example `http://localhost:5173`, as an authorized JavaScript origin).
- Errors to show: 401 `INVALID_CREDENTIALS` (use one message such as "This Google account cannot sign in here; ask an administrator or use your password"), 401 `TOKEN_INVALID` (try again), 423 `ACCOUNT_LOCKED`, 503 (Google could not be reached; use the password form). A first-time Google user only gets an account when an administrator has set `auth.google.autoregister` to `true`; otherwise the person must already have an account with the same email.
- Password login stays. A Google-only account has no password, so its password login answers `INVALID_CREDENTIALS`.

**Testing and DevOps**
- New `app_config` key `auth.google.autoregister` (default `false`; the default lives in code, no seed row needed). No schema change.
- Environment: `GOOGLE_CLIENT_ID` (empty = every Google sign-in refused) and `GOOGLE_VERIFIER` (`google` or `fake`). With `fake` (profiles dev, demo and test only) tokens are HS256 JWTs signed with the key in `FakeGoogleIdTokenVerifier`, audience equal to `GOOGLE_CLIENT_ID`, issuer `https://accounts.google.com`, claims `sub`, `email`, `email_verified`, `name`, `exp`. Never set `fake` in production: the app refuses to start.
- Class names and expected values for unit tests: `ROADMAP.md` section 7 (M2b note). Smoke script on the backend lead's machine: `m2b_smoke.py` (32 checks).

**Report and content**
- Security section: Google sign-in is implemented through a port with a real and a fake adapter (Adapter pattern); the backend verifies signature (Google's published RSA keys), expiry, issuer, audience and `email_verified`; accounts link only by a verified email; failures are audited and answered identically so emails cannot be probed. SSO and MFA stay documented-only.
