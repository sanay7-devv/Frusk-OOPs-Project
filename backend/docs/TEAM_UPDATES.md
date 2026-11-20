# I-ITSM: What changed since your handbook

> **Read this first.** The five handbook PDFs (dated 2026-10-15) are frozen and are not in this repository. This page lists every point where the project now differs from them, per role. Where this page and a handbook disagree, this page wins. Reasons are in `DECISIONS.md` (DEC numbers); the order of work is in `ROADMAP.md` section 5.

Last updated: 2026-11-20 (several CORS origins and date-only parameters, DEC-120; contract fixes for the frontend: workload and audit-verify schemas, `incidentId` on audit entries; run profile is Flyway now, `schema-auto` obsolete; S1 simulator, `minEscalationLevel`, A7 review, A12 password reset and TOTP, A4 push, A8 metrics, A13; 129 operations)

---

## 1. For everyone

| Topic | Handbook says | Now | Why |
|---|---|---|---|
| Spring Boot | 3.x | **4.1.1** (Spring Security 7, Hibernate 7, Jackson 3) | DEC-02: 3.5 is out of free support with unpatched CVEs |
| Repository | `iitsm/` with the Spring project at the root and `db/`, `deploy/`, `docs/` folders | `sanay7-devv/Frusk-OOPs-Project` with `backend/` and `frontend/`; backend docs in `backend/docs/`. `db/`, `deploy/` and `.github/workflows/` do not exist yet | DEC-41 |
| Scope | Tiers 1 to 3, a cut order, a week-by-week plan and freeze dates | Everything is built, including the "Tier 3" extras; work follows module dependencies | DEC-35 |
| API contract | Hand-edited OpenAPI file, changed first by pull request | Generated from the running code; unbuilt endpoints are listed under the tag **Planned**. Files: `backend/docs/openapi/iitsm-api.yaml` and `.json`. Today 129 operations, all built, none planned (plus the demo-profile-only clock and outage-drill endpoints, not in the export) | DEC-36 |
| Assignment weights | Skill 0.40, load 0.30, experience 0.20, priority fit 0.10 | Five factors: skill 0.35, load 0.25, experience 0.15, priority fit 0.10, **service familiarity 0.15** | DEC-28 |
| Skill score | "Best skill proficiency match" | 70% best proficiency + 30% share of required skills held | DEC-29 |
| Team lead visibility | "Team lead sees their team" | Team leads see all incidents (the schema has no team) | DEC-26 |
| SLA calendars | Listed as a Tier 3 extra | Built: a policy is ALWAYS or BUSINESS_HOURS; one company calendar in `app_config` (`sla.business.*`) | DEC-39 |
| Settings | 27 keys in Appendix A.5 | 83 keys (five new on 2026-11-15 for embeddings: `dup.embedding.threshold.duplicate`, `dup.embedding.threshold.related`, `embedding.rate.per.minute`, `embedding.backfill.batch`, `embedding.backfill.interval.seconds`; two before that, `auth.password.reset.minutes` and `notification.push.devices.max`); the first 76 were (35, plus six `notification.*` with M9, six report and coverage keys with M10, two escalation keys with M11, 14 intelligence keys with the M12 core, six with the rest of M12, two with M13, four with M14, one with M2b); defaults live in the code, so seed rows are optional | DEC-18 |
| Demo | Docker Compose | Unchanged: the recorded demo runs locally with Docker Compose. Cloud deployment is the last priority | DEC-45 |
| Grading | Summary table in section 1.2 | Use the rubric in the course brief; our plan against it is `ROADMAP.md` section 8 | DEC-43 |

**Built so far (backend):** every module M1 to M14 and M2b: users and login (also with Google), catalog and live settings, incidents with the full lifecycle (withdraw included), priority, five assignment strategies with explainable recommendations, SLA monitor, audit trail with tamper-evident seals, notifications, search and reports, escalation, intelligence (suggestions, duplicates, problem records, Major Incident Mode, chatbot intake), live dashboard, service graph and status board, attachments, rate limits.
**Not built yet:** nothing from the agreed list except the frontend screens; cloud deployment was decided against (DEC-118). Built on 2026-11-15, besides the simulator: password reset and TOTP (A12), simulated mobile push (A4), Prometheus and Grafana (A8), the traceability matrix (A13). The S1 Service Desk Simulator was built on 2026-11-15 (see the section at the end of this page). The A7 load test with numbers is the Testing teammate's half; the index review and scale-out path are in `backend/docs/SCALING.md`. Every endpoint of the agreed contract exists now (129 operations).


### New features accepted on 2026-11-13 (built since: coverage risk, post-incident report, chat webhook, priority what-if, escalation preview, demo clock)

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

**Behavior that will change** (DEC-46): a reporter can withdraw an incident before work starts (built with M12); once an incident is assigned, only a team lead or administrator can change impact, urgency and affected users (built with M12); a resolved incident nobody confirms is verified and closed automatically (built with M11).

**Escalation (M11, built 2026-11-14, DEC-48 to DEC-53).** An unacknowledged P1 or P2 climbs level by level (team lead, system administrator, IT manager) after the timeouts in `escalation_policies`; one in triage with nobody assigned starts at level 0 and climbs the same way; after level 3 and `escalation.exhausted.minutes` one final "escalation exhausted" alert goes to all administrators (SMS for P1) and the monitor stops. Acknowledging stops everything. The alert reuses the audit action ESCALATED and the notification event type INCIDENT_ESCALATED, so no new schema values are needed. Also built: `POST /incidents/{id}/escalate`, the `escalationPreview` field on the incident detail, the auto-verify job (a resolved incident nobody confirms closes as AUTO_VERIFIED after `verify.auto.hours`) and, in the `demo` profile only, `GET /admin/demo/clock` and `POST /admin/demo/clock/advance`. New settings: `escalation.exhausted.minutes`, `verify.monitor.interval.seconds` (63 settings in total after the merge). **Notifications (ERROR_LOG E-034, fixed 2026-11-14):** each hop notifies only the holders of the level it reached (a level nobody holds notifies nobody) plus the assignee, never the person who escalated by hand; the exhausted alert goes to every administrator, titled "Escalation exhausted: ..." (template key `INCIDENT_ESCALATED.admin.*`, Report teammate may reword), with SMS for P1.

---

## 2. Frontend developer

- **Round 5 notes (2026-11-19, merged as #60 to #62, checked against `shared/main` `f1361c6`):**
  - New theme tokens on `tokens` (`frontend/src/theme/theme.ts`): `paper`, `danger`, `warning`, `success`, `info`, `textDisabled`, `border`, `borderSubtle`, `hover`, `fontBody`, `fontHeading`, `fontMono`, `minFontSize` (12), and the `priority`, `status` and `sla` objects (the same objects as `priorityColor`, `statusColor` and `slaStateColor`). No existing token was renamed or removed. Use these instead of hex literals in new code.
  - The theme forces 12 px on caption, overline, table head, chip, tooltip and helper text. Do not add `fontSize` 9 to 11 in new code; the `git grep` count is 0 and should stay there.
  - `features/admin/palette.ts`: the admin screens read their colours from the theme through this file. Use it in new admin code instead of a local `COLORS` constant.
  - `features/shared/useLiveRefresh.ts`: the hook behind real-time refresh. It reacts to the `useRealtime` invalidation; the queue screens (TechQueue, TechWorkbench, TeamQueue) poll every 60 s as a fallback. Use it for any new live list.
  - `components/ActionButtons.tsx` has new optional props (`incident`, `exclude`, `labels`, `pending`, `disabled`); `allowed` is optional now. No screen imports it yet.
  - `api/admin.ts` `AdminUser` mirrors the contract. The non-contract fields are optional and commented.
  - Login: the seed-account panel is shown only in `npm run dev` or in a build with `VITE_SHOW_DEMO_ACCOUNTS=true` (the recorded demo). The placeholder email is `employee1@iitsm.demo`.
  - Escalation settings are one editor at `/admin/escalation` (`EscalationSettings.tsx`). The SLA policies screen no longer has an escalation tab.
  - Queue rows (`features/technician/QueueRowActions.tsx`) have a More menu with Escalate, Mark duplicate and Link problem for team-view users.
- **Round 4 notes (2026-11-19, merged as #54 to #57, checked against `shared/main` `9c46cea`):**
  - `Tickets.tsx` is now 235 lines. Its parts are in `features/admin/tickets/` (filters, drawer, saved views, assign dialog), and the create dialog is the shared `components/IncidentCreateDialog.tsx` (used by Tickets and the Dashboard).
  - Users, Services and SlaPolicies are split into `features/admin/users|services|sla`. They call the new `api/adminDirectory.ts`, not `api/admin.ts`.
  - `ServiceStatus.tsx` now reads `open.P1` (uppercase, as the backend sends). The lowercase `p1` type note from round 3 is closed.
  - Small wording nit: `features/technician/WorkloadInsights.tsx:137` reads "(last {done.length || 100})", so it shows "last 100" when the list is empty. Show the real count or "last 100 at most".
  - Round 3 note on `SlaPolicies.tsx` invented action text and the 30-minute fallback: closed by #57 (the screen was rebuilt; the escalation ladder is `features/admin/sla/EscalationLadder.tsx`).
- **Round 3 notes (2026-11-19, merged as #48 to #51, checked against `shared/main`):**
  - Set `VITE_GRAFANA_URL` in the frontend env file (`.env.example` does not list it yet) if Grafana is not on `http://localhost:3001`. The Operations card on the admin Dashboard links there; no token is sent.
  - `Tickets.tsx` should read the `serviceId` query parameter. The service graph's "View tickets" link now goes to `/admin/tickets?serviceId=`, and Tickets ignores it.
  - `SlaPolicies.tsx` still shows invented action text (`p.action || 'Auto-escalate to Tier ... On-Call Queue ...'`, about line 734) and falls back to 30 minutes (`timeoutMinutes || triggerMinutes || 30`, about line 699). `getAdminEscalationPolicies` no longer invents these, so remove both.
  - `api/types.ts` (line 92) types the status-board open counts as lowercase `p1` to `p4`. The backend sends `P1` to `P4` (`OpenCounts` in `ServiceGraphViews.java`). Fix that type. I found no open-count type in `api/services.ts`, so the other option in the request does not exist there.
- **Contract fixes (2026-11-16, ERROR_LOG E-037):** `GET /technicians/me/workload` is `WorkloadView {load, maxLoad, activeIncidents, resolvedThisWeek, upcomingDeadlines[{incidentId, code, type, due, slaState}]}` (the export showed the simulator's shape before; the response itself did not change). The `firstProblem`/`problems` of `GET /audit/verify` are `SealProblemView {recordId, sealId, problem, message}`. Every audit entry (`GET /audit`, `GET /incidents/{id}/history`) now also has `incidentId`, so a row can link to its incident. The full list of frontend work left is `frontend/docs/FRONTEND_WORK_LEFT.md`.
- **Frontend help (2026-11-18):** the work-left list was re-checked against `main` `50794aa` (ticks now match the code). Four helper pieces are merged (PRs #36 to #39): audit Verify & Seal, account security (password reset, two-step login, `/account/security`), Problems / Major Incident screens (`/lead/problems`, `/admin/problems`), and Reports on `/reports/*` with CSV/PDF export; the list is now 283 of 636 done. Who owns which files right now, and what each person has finished, is in `frontend/docs/FRONTEND_PROGRESS.md`; check it before starting an item.
- **`Retry-After` readable in the browser (2026-11-18, DEC-119):** CORS now exposes `Retry-After` beside `X-Request-Id`. On 429 `RATE_LIMITED` and 503 `SERVICE_UNAVAILABLE`, read `error.response.headers['retry-after']` (axios lowercases header names) and show "try again in N seconds". Nothing else in the API changed.

- **Most screens are not connected to the backend yet.** Eleven are placeholders (admin: all incidents, audit log, categories, config, reports, service graph, services, SLA policies, users; employee: my incidents, incident detail). Six run on hardcoded data (admin dashboard, team queue, escalations, technician queue, technician workload, employee home). Login, register and the report form call the API.
- **Suggested order, following the three demo workflows:**
  1. Employee: report form, my incidents, incident detail (use `allowedActions` to show buttons).
  2. Technician: queue, workbench (acknowledge, start, request info, resolve), workload.
  3. Team lead: team queue with assign and recommendations, escalations.
  4. Administrator: all incidents, audit log, SLA violations, config, services, categories, SLA policies, users.
  5. Dashboard, reports, service graph (their endpoints arrive with M10 and M13).
- **Endpoints you can use today** are every operation in the contract without the tag Planned. The report form already calls `/intelligence/*` and `/notifications/*`; both are live now (M12 core, M9). Still Planned: `POST /auth/google`, `mark-duplicate`, `/problems`, `/dashboard/live`, `/services/graph`, `/services/{id}/impact` and the three attachment endpoints.
- **M10 endpoints (live 2026-11-14), all in the standard error body:**
  - `GET /incidents` now also takes `slaState` (`OK`, `WARNING`, `VIOLATED`, `PAUSED`, `MET`; `AT_RISK` was empty until B1, 2026-11-15; see the section at the end). It reads the flags the SLA monitor wrote, so a list can trail the detail view by up to one monitor interval (60 s).
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

- **Regression facts for the Testing teammate (2026-11-16):**
  - Suites set and restore the settings they assume (auto-categorisation off, rate limits raised) through `smoke_setup.py` and read counts from the API instead of assuming them. There are now **83** live settings.
  - `autocat.apply.confidence` (DEC-70) makes the backend apply an AI category and so auto-assign incidents, unless it is set to 1; tests that expect an unassigned incident must set it.
  - The M14 rate limits trip fast scripted runs; raise them for a script (as `smoke_setup.py` does) and restore them afterwards.
  - Audit rows are protected by append-only triggers (V7) and a seal foreign key (V8), so a test that tampers with them must lift the trigger or use `session_replication_role = replica`. Your Flyway migrations and seed must keep those triggers.
  - `./mvnw test` needs the database environment variables and a UTC JVM; CI already sets both (PR #21).

- **Smoke suites are now in the repo (2026-11-15):** the Python smoke and contract scripts are at `backend/smoke-tests/` (README there: prerequisites, run order, state files). Use them as the base for regression runs and the test catalogue; they need a running backend and the Docker Postgres container.
- **Migrations V1 to V10 are in place** (V1 to V9 from you, PR #12; V10 is the backend lead's). The backend runs with Flyway and `ddl-auto=validate` in the normal profiles (`dev`, `demo`, `test`); the temporary `schema-auto` profile (DEC-07) is obsolete and must not be used (a database made with it must be dropped and recreated once). Differences from Appendix A that the migrations carry:
  - `users.password_hash` nullable and `users.google_sub VARCHAR(100) NULL UNIQUE` (DEC-04).
  - `sla_policies.calendar_type`: widen beyond VARCHAR(12), or seed the stored value `BUSINESS_HRS` (ERROR_LOG E-022).
  - A partial unique index for the global SLA default (`WHERE service_id IS NULL`) (DEC-17).
  - The trigger that rejects UPDATE and DELETE on `audit_records`.
  - One new table, `audit_seals` (id, from_id, to_id, record_count, hash, prev_hash, created_at), for the sealed audit trail.
  - `sla_violations` as in Appendix A.3.
- **M10 (2026-11-14):** two new tables from Appendix A.4, `feedback` (`incident_id` PK FK, `rating` SMALLINT CHECK 1 to 5, `comment` TEXT, `created_at`) and `saved_filters` (`id`, `user_id` FK, `name` VARCHAR(60), `filter_json` JSONB, `created_at`); both are now in your migration V6. New settings: `report.export.max.rows`, `report.trend.max.buckets`, `coverage.window.days`, `coverage.min.criticality`, `coverage.min.holders`, `saved.filters.max` (the settings count grows by these six). New smoke suite `m10_smoke.py`; `m4_smoke.py` now expects `GIVE_FEEDBACK` in a closed incident's actions and `endpoint_sweep.py` calls every M10 endpoint. Class names and expected values for unit tests are in `ROADMAP.md` section 7 (M10 line). The reports are native SQL (PostgreSQL), so report tests need the Testcontainers database.
- **M11 escalation (built 2026-11-14), class names and expected values** are in `ROADMAP.md` section 7; the smoke script is `m11_smoke.py`. Schema: no new table or column. Seed and demo data: `escalation_policies` rows for P1 and P2, levels 1 to 3 (demo: 1 minute each); `app_config` demo overrides `escalation.monitor.interval.seconds` 15, `escalation.exhausted.minutes` 1, `verify.auto.hours` 0.033, `verify.monitor.interval.seconds` 30 (the old property `app.autoverify.monitor-interval-seconds` is no longer read). Demo users should include at least one team lead (technician, escalation level 1), one administrator with scope SYSTEM_ADMIN and one with IT_MANAGER; a level nobody holds is passed over. Call `EscalationMonitor.runOnce()` and `AutoVerifyMonitor.runOnce()` directly with a fixed `Clock`; scheduling is off in the test profile. The `demo` profile has an adjustable clock bean; no other profile does.
- **Seed data:** if `app_config` is seeded, values must pass validation: the five assignment weights (including `assignment.weight.familiarity`) must add up to 1.0 and priority bands must descend, or startup fails. A category named "Security" triggers override rule 1.
- **Docker Compose and CI** are not in the repository yet.
- **Tests:** `src/test` holds 43 `@Test` methods in 7 files on 2026-11-16 (yours; the first draft of this page said only one test existed). Everything under `src/test` is yours, as in the handbook: unit, integration and boundary tests for the 26 documented cases. (A version of this page from earlier on 2026-11-13 said the backend lead writes domain unit tests; that was a mistake and is withdrawn.) The backend lead supplies class names and expected values (`ROADMAP.md` section 7) and the smoke scripts. Suggested addition: architecture rule tests proving `domain` imports no Spring or web code. Expected values for assignment use the five-factor weights. For time-based cases use a fixed `Clock`; scheduling is off in the test profile (`app.scheduling.enabled=false`), so call `SlaMonitor.runOnce()` directly.
- **Smoke scripts** (`auth_smoke.py`, `m3_smoke.py`, `m4_smoke.py`, `m6_smoke.py`, `m7_smoke.py`, `m8_smoke.py`, `m9_smoke.py`, `m10_smoke.py`, `m11_smoke.py`, `m12_smoke.py`, `m12_calibrate.py`, `calendar_smoke.py`, `endpoint_sweep.py`, `check_contract.py`) exist on the backend lead's machine, outside the repository. Ask for them; they show the expected behavior of every built endpoint.
- **Vercel:** the deployment check fails for the account `Vishh-t` until it is added to the Vercel team; the project's Root Directory should be `frontend`.

**M9 notifications (2026-11-13, DEC-54).**
- Two new tables as in Appendix A.4: `notifications` (id, user_id, event_type VARCHAR(30), channel VARCHAR(12) CHECK in IN_APP, EMAIL, WEBSOCKET, SMS_SIM, title VARCHAR(150), message TEXT, incident_id NULL, `read` BOOLEAN DEFAULT false, created_at; indexes on (user_id, created_at) and (user_id, read)) and `notification_preferences` (PK user_id, event_type, channel; enabled). Only IN_APP and SMS_SIM rows are written; the entity class names are `Notification` and `NotificationPreference` in `com.iitsm.domain.notification`. The old `schema-auto` profile also created a CHECK that allowed `CHAT` (E-023); your migration V5 has the four values (V10 adds `PUSH_SIM`).
- Six new `app_config` keys with defaults: `notification.digest.threshold` 5, `notification.email.retries` 3, `notification.email.backoff.seconds` 2, `notification.email.from` no-reply@iitsm.local, `notification.link.base.url` http://localhost:5173, `notification.chat.webhook.url` empty. In the test profile set `notification.email.backoff.seconds` to 1.
- Mail catcher: Mailpit, `docker run -d --name iitsm-mail -p 1025:1025 -p 8025:8025 axllent/mailpit` (SMTP 1025, web and API 8025). Add it to the compose file. The app starts without it; mails are retried and then dropped.
- The listener is asynchronous (one thread, `notificationExecutor`): in tests wait for the rows (poll up to 5 s) instead of asserting at once.
- Smoke script `m9_smoke.py` (72 checks) is the reference for expected values; see ROADMAP section 7 for the unit test list.

## 4. Report and content

- **Technology:** Spring Boot **4.1.1**, not 3.x; give the reason (DEC-02). Google sign-in is implemented (M2b, verified with the offline fake verifier); SSO and MFA stay "documented only".
- **Numbers that changed:** the assignment weights and the skill formula (section 1). Use `SYSTEM_GUIDE.md` section 10 for the worked example.
- **Design patterns:** the seven in the handbook, plus Template Method and Command (both in the code; Command since DEC-46 C1). See `SYSTEM_GUIDE.md` sections 14.2 and 14.3.
- **Ready-made material:**
  - `SYSTEM_GUIDE.md`: diagrams and a description of every built module.
  - `DECISIONS.md`: 47 decisions (66 with M10) with options, reasons and likely cross-questions, for the report and the video.
  - `ERROR_LOG.md`: the record of bugs found and fixed; cite it for the rubric's "bug resolution".
  - `ROADMAP.md` section 8: our plan against each rubric line.
  - `DECISIONS.md` DEC-45: the run sheet for the 15 to 20 minute video.
  - `DECISIONS.md` DEC-47: which feature answers which challenge named in the brief.
- **M10 (2026-11-14):** reports are scoped by the viewer's role (an employee's overview counts only their own incidents) and computed in the database, so every number can be proven against a direct count: see `SYSTEM_GUIDE.md` section 12b and `DECISIONS.md` DEC-60 to DEC-66. Good demo material: E3 coverage risk (a critical service with one holder, then that technician goes off duty), E4 post-incident report and PDF, the CSV formula-injection protection (DEC-62), the priority what-if.
- **State openly in the report:** team leads see all incidents; the system runs as one instance (settings cache, rate limits and the message broker are in memory); the demo is local.
- **Still needed from you:** notification wording, the AI prompts, the labelled evaluation set, and seed incident text. Demo data should use the institute's own IT services (DEC-43, A14).

---

## 5. M12 core: intelligence and AI (2026-11-14)

Seven endpoints moved from Planned to built (after the 2026-11-14 merges the contract has 117 operations, all built). Reasons: `DECISIONS.md` DEC-M12-1 to DEC-M12-9; description and verified behavior: `SYSTEM_GUIDE.md` section 12c. **Still to come in M12:** the duplicate check on creation (409 `DUPLICATE_INCIDENT`), `mark-duplicate`, problem records and Major Incident Mode, recurring-problem detector, chatbot intake.

**Frontend**
- `src/api/intelligence.ts` already matches. Calls and answers: `POST /intelligence/suggest-category {title, description, serviceId?}` gives `{categoryId, categoryName, confidence, reason, source}`; `POST /intelligence/suggest-intake {description}` gives the same plus `impact` and `urgency`; `POST /intelligence/similar {title, description, serviceId}` gives `[{incidentId, code, title, similarity, status, match}]`.
- **Show a category only when `categoryId` is not null.** The backend hides it below 0.60 confidence (then `categoryId`, `categoryName` and `reason` are null or empty, `confidence` is still sent). `source` is `LLM` or `KEYWORD`; with no API key it is always `KEYWORD`, so do not promise "AI" wording.
- New field `match` on a similar incident: `DUPLICATE` (likely the same problem, 0.55 or more) or `RELATED`. Titles only, never descriptions, are returned.
- Per incident (detail screen): `GET /incidents/{id}/similar` (any viewer), `GET /incidents/{id}/suggested-resolutions`, `POST /incidents/{id}/summary` (note: **POST**) and `GET /incidents/{id}/sla-risk` for the assignee, team lead and admin. SLA risk answers `{score 0 to 1, level LOW|MEDIUM|HIGH, atRisk, threshold, factors: [{name, contribution, detail}]}`: draw the factors as bars that add up to the score.
- Suggestion calls are limited to 20 per minute per user: on 429 `RATE_LIMITED` wait and retry; debounce typing (the backend also caches identical requests for 60 seconds).
- Generated schema names are `CategorySuggestionView`, `IntakeSuggestionView`, `SimilarIncidentView`, `SuggestedResolutionView`, `ThreadSummaryView`, `SlaRiskView`.

**Testing and DevOps**
- 14 new `app_config` keys (63 in total after the merge with M9, M10 and M11); defaults live in the code, so no seed rows are needed: `dup.tfidf.threshold.duplicate` 0.55, `dup.tfidf.threshold.related` 0.35, `resolution.min.similarity` 0.30, `ai.idf.window.days` 90, `ai.timeout.seconds` 8, `ai.breaker.failures` 3, `ai.breaker.cooloff.seconds` 60, `ai.cache.ttl.seconds` 60, `ai.ratelimit.per.minute` 20, `sla.risk.weight.elapsed|load|priority|history` 0.50 / 0.20 / 0.15 / 0.15 (must add up to 1.0), `sla.risk.scan.interval.seconds` 300. Two cross rules: tf-idf duplicate must exceed related; the four risk weights add up to 1.0.
- No schema change in this part (`incident_embeddings` was unused then; B3 uses it since 2026-11-15, see the section at the end).
- Environment: `LLM_API_KEY` (empty = LLM off), optional `LLM_MODEL`, `LLM_PROVIDER` (`gemini` default since DEC-111, `anthropic`, or `fake`; `fake` is a scripted client that never calls the network, for tests and demos). In the test profile there is no key, so the keyword engine answers, and scheduling is off; call `SlaRiskService.scanOnce()` directly with a fixed `Clock`.
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

### M13 real-time layer, dashboard, graph and the status board (2026-11-14)

**Frontend**
- Dashboard: `GET /dashboard/live` (administrators) for the first load, then STOMP `/ws` with header `Authorization: Bearer <access token>` and `SUBSCRIBE /topic/dashboard`. Two shapes arrive on it: events `{type, incidentId, code, priority, status, at}` and counters `{type: "COUNTERS", counters {total, open, critical, resolved, slaViolations}, byPriority [{label, count}], at}`; tell them apart by `type`. The counters also come every 30 s without any event. Non-administrators get an ERROR frame on that subscription.
- When the access token expires the server closes the socket with close code 4001 `TOKEN_EXPIRED`: refresh the token, reconnect, and poll `GET /dashboard/live` meanwhile.
- Service graph: `GET /services/graph` (`nodes [{id, name, criticality, openIncidents, hasOpenP1}]`, `edges [{from, to}]`, from depends on to) and `GET /services/{id}/impact` (`affected [{id, name, distance}]`), any logged-in user.
- **New screen: service status board (E1)**, visible to employees: `GET /services/status` returns `label` ("Based on reported incidents": show it), `windowDays` and `services [{id, name, criticality, status (OUTAGE, DEGRADED, HEALTHY), reason, causedBy [{id, name, distance}], open {total, P1, P2, P3, P4}, slaCompliancePercent (null when nothing was judged), slaJudged}]`, already sorted worst first. This endpoint is an addition to the handbook contract.

**Testing and DevOps**
- New settings `dashboard.counters.interval.seconds` and `status.sla.window.days`; no schema change. Class names and expected values for unit tests: `ROADMAP.md` section 7 (D-031). Smoke script `m13_smoke.py` (backend lead's machine); its expiry check needs the backend started with `APP_JWT_ACCESS_TOKEN_MINUTES=1`.

**Report and content**
- Patterns to cite: Observer (`DashboardListener`), Adapter (`DashboardPublisher` port with `StompDashboardPublisher`), Decorator (`WebSocketSessions` around Spring's WebSocket handler), plus a plain domain class for graph traversal (`ServiceGraph`). Challenge answered: "poor visibility into service health" (E1, DEC-84).

## M14 hardening and the sealed audit trail (session C, 2026-11-14)

Reasons: `DECISIONS.md` DEC-90 to DEC-94; description and verified behavior: `SYSTEM_GUIDE.md` section 12g.

**Frontend**
- **New status 429 `RATE_LIMITED`** on login (10 a minute per e-mail), incident creation (20 a minute) and the suggestion calls; the standard error body plus a `Retry-After` header (seconds). Show "Too many attempts, try again in N seconds"; do not retry automatically in a loop.
- **New status 503 `SERVICE_UNAVAILABLE`** (any endpoint, standard body, `Retry-After`): show a friendly "try again in a moment" banner; the backend is reachable but its database is not.
- **Password rules** on register and the admin user form: besides 8 to 72 characters with a letter and a digit, the backend refuses common passwords (`Password1`), passwords containing the e-mail's first part or a word of the name, and passwords longer than 72 bytes. The reason arrives in `fieldErrors` on `password`; show it under the field.
- **Attachments** (planned section of the contract is now built): `POST /incidents/{id}/attachments` as `multipart/form-data` with field `file` (png, jpg, jpeg, gif, pdf, txt, log; max 5 MB; max 10 per incident; the type is checked from the file content, so a renamed file is refused), `GET /incidents/{id}/attachments` gives `[{id, incidentId, filename, contentType, sizeBytes, uploadedBy {id, name}, createdAt}]`, `GET /attachments/{id}/download` streams the file (send the Authorization header; use `fetch` and a blob, a plain `<a href>` cannot carry the token). Refusals are 400 with `fieldErrors: [{field: "file", message}]`; people who may not see the incident get 404. Upload actions appear in the history as `ATTACHMENT_ADDED`.
- **Audit verify screen (S3):** `GET /audit/verify` (admin) gives `{intact, sealsChecked, recordsChecked, unsealedRecords, lastSealId, lastSealHash, problemCount, firstProblem {recordId, sealId, problem, message}, problems[]}`; `POST /audit/seal` seals now (200 with the seal, 204 when nothing is new). A Verify button, a green "intact" or a red box naming `firstProblem.message`, is the demo moment. New audit action value `ATTACHMENT_ADDED` in the audit log filter.

**Testing and DevOps**
- **Three new tables beyond Appendix A for the migrations:** `audit_seals (id BIGINT PK identity, from_id BIGINT NOT NULL, to_id BIGINT NOT NULL, record_count INT NOT NULL, hash VARCHAR(64) NOT NULL, prev_hash VARCHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL)` and `audit_seal_entries (record_id BIGINT PK, seal_id BIGINT NOT NULL, digest VARCHAR(64) NOT NULL)` with an index on `seal_id`; neither needs a foreign key. `incident_attachments` is Appendix A.3 (`id, incident_id FK, filename VARCHAR(200), content_type VARCHAR(80), size_bytes BIGINT, storage_path VARCHAR(300), uploaded_by FK users, created_at`); give `uploaded_by` and the content columns `NOT NULL`, and an index on `incident_id`. Also: `audit_records.action` has a new value `ATTACHMENT_ADDED` (if the column has a CHECK, add it).
- If the V5 trigger rejects UPDATE and DELETE on `audit_records`, the S3 demo (edit one row in SQL) needs the trigger disabled on the demo database; the smoke script edits rows directly.
- Four new `app_config` keys (defaults in code, no seed rows needed): `ratelimit.login.per.minute` 10, `ratelimit.incident.create.per.minute` 20, `ratelimit.denied.audit.per.minute` 20, `audit.seal.interval.seconds` 300 (demo: 30).
- New environment and properties: `ATTACHMENTS_DIR` (default `./data/attachments`, must be a persistent, writable volume in Docker; back it up with the database), `DB_CONNECT_TIMEOUT_MS` (default 3000), multipart limit 6 MB.
- Class names and expected values for unit tests (all plain Java unless noted): `AttachmentType.sniff` (PNG, JPEG, GIF, PDF headers; UTF-8 text gives TEXT; bytes with a NUL give empty; `MZ` gives empty), `AttachmentName.sanitize("../../x.png", "f")` is `x.png`, `sanitize("..", "f")` is `f`, a 300-character name is cut to 200 keeping the extension; `PasswordPolicy.check` (`Password1` too common; `asha.rao2026` for asha.rao@x.edu refused; 72 two-byte characters refused; `Tr4in-lamp-91` accepted); `RateLimiter` (limit 3: three pass, the fourth throws `RateLimitedException` with a retry between 1 and 60, one minute later it passes again; `tryAcquire` returns `FIRST_REFUSAL` once, then `REFUSED`), `AuditSealing.digest` and `sealHash` (changing any field changes the hash), `AuditChainVerifier.verify` (changed, missing, inserted, altered seal, broken link, and an intact chain). Smoke script on the backend lead's machine: `m14_smoke.py`.

**Report and content**
- Security section: rate limiting (sliding window), password policy (NIST-style blocklist, DEC-92), safe file handling (magic bytes, random names, outside the web root, `nosniff`), outage behavior (503), and the **tamper-evident audit trail** (hash chain, one external witness in the log; "prevention plus proof", DEC-91). Patterns to cite: Adapter (`AttachmentStorage`), Repository (`AuditSealRepository`, `AttachmentRepository`), Template-free pure domain verifier (`AuditChainVerifier`). Honest limit: rate limits and the seal chain are in memory or single-writer designs; behind several instances a shared store would be needed (DEC-42).

---

## 5a. M12 rest: duplicates, problem records, Major Incident Mode (session A, 2026-11-14)

New and changed endpoints; reasons: `DECISIONS.md` DEC-70 to DEC-78; description: `SYSTEM_GUIDE.md` section 12e.

**Frontend**
- **Report form.** `POST /incidents` can now answer **409 `DUPLICATE_INCIDENT`** with `similar: [{id, code, title, similarity, status}]`. Show "this looks like a duplicate of ..." and a "My problem is different" button that sends the same body again with `confirmNotDuplicate: true`. A category is no longer required: when the reporter gives none, the backend applies a confident suggestion (audit says so) or leaves the incident in triage.
- **Known-outage banner.** Before or while the form is filled call `GET /problems/known-outages?serviceId=`; each entry is `{problemId, title, service, leadCode, leadPriority, affectedUsers, since, alreadyJoined}`. Show "Known outage, being worked on" and a **Join** button: `POST /problems/{problemId}/join` answers 201 with the employee's own incident (already CLOSED as a duplicate of the lead). `alreadyJoined: true` means they have an incident in this outage already.
- **Detail screen.** New action `WITHDRAW` in `allowedActions` (the reporter, before work starts): `POST /incidents/{id}/withdraw {reason 10 to 1000}`. `MARK_DUPLICATE` now appears for team leads and administrators: `POST /incidents/{id}/mark-duplicate {duplicateOfId}`. A closed incident has `closureReason` `WITHDRAWN` or `DUPLICATE` and offers no REOPEN. After assignment the **reporter's impact, urgency and affected-users fields must be read-only** (403 otherwise); the description stays editable. `problemId` and `duplicateOfId` are in the detail.
- **Team lead and admin screens.** `GET /problems?status=OPEN|RESOLVED` and `GET /problems/{id}` give `{id, title, service, status, createdAt, lead, incidentCount, joined, incidents[]}`; `GET /problems/{id}/root-cause` gives `{probable, candidates[{service, maxDistance, totalDistance, affected, paths}], affectedServices, explanation}` (draw the paths on the service graph); `POST /problems/{id}/resolve` (team lead, administrator, same body as resolve; **show a "Resolve whole problem" button for staff on the problem view**, it resolves every open incident of the record with one fix; resolving only the lead no longer resolves the others, they get an internal note instead), `DELETE /problems/{id}/incidents/{incidentId}` (administrator, ungroup), `POST /problems {title?, incidentIds}` (team lead, administrator). `GET /problems/recurring` gives proposals `{kind: REPEATED_FIX|REPEATED_REOPEN, service, category, count, incidents, reason}`.
- **Chatbot (A1).** `POST /intelligence/chat {draft?, expecting?, answer?}` returns `{draft, message, expecting: DESCRIPTION|SERVICE|AFFECTED_USERS|CONFIRM, readyToFile, options[{id,name}], source}`. Send back the `draft` and `expecting` of the previous reply with the person's `answer`; when `readyToFile` is true, file it with `POST /incidents` using the draft (the service and the category come from the draft). Works without an LLM key.
- **Demo controls (D2).** Demo profile only: `POST /admin/demo/outage-drill {rootServiceId}` answers 201 `{rootService, problemId, incidentCodes[], dependents[], note}`.
- Generated schema names: `ProblemView`, `KnownOutageView`, `RootCauseView`, `CauseView`, `RecurringView`, `Reply`, `Draft`, `Option` (chat), `CreateProblemRequest`, `MarkDuplicateRequest`, `DrillRequest`, `DrillResult`.

**Testing and DevOps**
- Six new `app_config` keys with defaults in the code (no seed rows needed): `priority.security.category` (Security), `autocat.apply.confidence` (0.60), `problem.correlation.window.minutes` (60), `recurring.min.count` (3), `recurring.window.days` (30), `recurring.min.reopens` (2). `priority.security.category` is a free-text setting (one line, up to 100 characters): the seed row, if any, must name the real security category.
- **No new table:** `problem_records` and the `problem_id` and `duplicate_of_id` columns are Appendix A. Add the foreign key `incidents.problem_id -> problem_records(id)` in the migration (the code keeps it as a plain id).
- **Existing documented tests that change:** T16 expects similarity 0.80 or more; with TF-IDF the 409 starts at **0.55** (DEC-M12-1). T18 stays 403 (DEC-78). T24 (two simultaneous PUTs of `impact` by the reporter on an assigned incident) now gets 403 from G4: edit the description, or send the PUTs as an administrator. T01 and T02 are not affected when a category is sent.
- **Shared smoke scripts need `confirmNotDuplicate: true` in their create helper** wherever they file several incidents with the same or similar text on one service (the 409 is the new, intended behavior): `m4_smoke.py:114` (`report`), `m6_smoke.py:142` (`create`), `m10_smoke.py:131`, `m11_smoke.py:179`, `m12_common.py:104` (`report`), `m8_smoke.py:110`; recommended, not proven needed: `calendar_smoke.py:119`, `endpoint_sweep.py:221`, `m7_smoke.py:132`, `m9_smoke.py:287`, `m13_smoke.py:218`, `m14_smoke.py:130, 291, 296`. Incidents created **without** a category may now be classified and assigned (a confident suggestion is applied): set `autocat.apply.confidence` to 1 in such suites to keep the triage cases, or send a category. In `m4_smoke.py` the reporter's `allowedActions` now contains `WITHDRAW` (line 141). In `m10_smoke.py` incidents on one service with near-identical text are grouped (no cascade any more, DEC-72), so with `confirmNotDuplicate: true` in its create helper the suite passes 135/135; its SLA checks need the monitor to pick up the 5-second interval the suite sets, so on a backend that has just started run it twice.
- Class names and expected values for unit tests: `ROADMAP.md` section 7. New smoke scripts: `m12b_smoke.py` (`SMOKE_PORT`, `SMOKE_DB`) and `m12b_drill.py` (run against a `demo` backend, which uses Flyway).
- `m11_smoke.py` counts notification recipients: run it on a database no other suite has used. Its triage checks C and D (a P1 filed without a category waits in triage) now see the incident classified and assigned by the applied AI category; set `autocat.apply.confidence` to 1 for that suite, or give those incidents a title the keyword engine cannot match.

**Report and content**
- Patterns to cite: **State** (`OpenState` is the shared parent of the six open states: mark-duplicate, withdraw and resolve-with-problem are written once), **Command** (`WithdrawCommand`), **Strategy** (the similarity engine behind `TextAnalysisService`, the correlation rules), **Observer** (grouping and audit travel as events), **Factory** (`IncidentFactory` also builds the one-click joiner incidents), **Repository** (`ProblemRepository`).
- Brief mapping: demo workflow 3 ("multiple incidents reported, duplicates identified, correlated, escalated") is Major Incident Mode; the challenge "difficulty identifying recurring problems" is E2 (`GET /problems/recurring`); "automated root-cause analysis" and "service dependency graph" are `GET /problems/{id}/root-cause`.
- **Wording you can edit without code:** `backend/src/main/resources/demo/outage-drill.json` (the drill's incident texts); the joiner notice reuses the "resolved" wording of `notification-templates.properties` and would read better with its own text (ask the backend lead to add an audience).
- Honest limits for the report: grouping by text can put incidents with different fixes in one record (the administrator can ungroup; every grouping is audited); the root cause is only as good as the service dependency graph; the chatbot is a guided slot-filling dialogue, not free conversation.

---

## After the integration merge (2026-11-14)

- **Everyone:** every endpoint of the agreed contract is built: `backend/docs/openapi/iitsm-api.*` listed 117 operations, 0 planned on 2026-11-14 (129 operations since 2026-11-15). Settings: 76 `app_config` keys.
- **Frontend:** "INC-x may be a duplicate" (`DUPLICATE_SUSPECTED`) now arrives only when an incident is closed as a duplicate; being grouped into a problem record sends nothing (show `problemId` on the incident detail instead) (DEC-110).
- **Testing:** the password policy (M14) refuses passwords that contain a word of the user's name (4+ characters) or the first part of the e-mail; test and seed passwords must avoid them. Creating similar incidents on one service needs `confirmNotDuplicate: true` (M12). Suites that count recipients, mails or settings need a fresh database. The shared smoke scripts now read `SMOKE_PORT` / `SMOKE_DB` (m11: `ITSM_PORT` / `ITSM_DB`); `endpoint_sweep.py` runs the per-module files in `smoke-tests/sweep_parts/`. Details: ERROR_LOG E-035.

---

## Gemini as the AI provider (2026-11-15, DEC-111)

- **Everyone:** the backend's LLM is now **Google Gemini** by default (`LLM_PROVIDER=gemini`, model `gemini-3.5-flash-lite`). Put a Gemini API key from Google AI Studio in `backend/.env` as `LLM_API_KEY=...` (or `GEMINI_API_KEY=...`); never commit it. With no key everything still works through the keyword engine, and `source` says `KEYWORD`.
- **Frontend:** nothing changes: the `/intelligence/*` answers keep their shape; `source` is `LLM` when Gemini answered.
- **Report:** the AI integration is "Google Gemini API through an Adapter (`GeminiLlmClient`) behind the `LlmClient` port; Anthropic and an offline scripted client are other adapters of the same port". Privacy rules are unchanged (only redacted title, description and category names are sent).

---

## S1 Service Desk Simulator, escalation filter and A7 review (2026-11-15, DEC-112 to DEC-114)

The contract now has **119 operations** (two added). Reasons and details: `DECISIONS.md` DEC-112 to DEC-114; description and verified behavior: `SYSTEM_GUIDE.md` section 12i; the scale-out review: `SCALING.md`.

**Frontend**
- **New screen: Service Desk Simulator** (administrators, one screen, one chart). Two endpoints, both need `CONFIG_MANAGE`:
  - `POST /api/v1/admin/simulations` with `{lastIncidents (10 to 500, default 100), speedUp (1 to 20, default 1), configurations: [{name, strategy, weights {skill, load, experience, priorityFit, familiarity}, technicians}]}`. At most three configurations; anything left out keeps the live value; none means "current settings". Strategy names are `COMPOSITE`, `SKILL`, `LOAD`, `ROUND_ROBIN`, `EXPERIENCE_PRIORITY`. The weights must add up to 1.0 or the answer is 400 with `fieldErrors`.
  - Answer: `{workload {incidents, from, to, speedUp, excluded}, assumptions [text], results [{name, strategy, weights, technicians, incidents, slaViolations, slaViolationPercent, unassigned, meanResolveMinutes, p90ResolveMinutes, meanWaitMinutes, fairness (0 to 1), matchesRealAssigneePercent, perTechnician [{technicianId, name, assigned, busyMinutes, utilizationPercent}]}], best, bestReason}`.
  - Suggested screen: the incident count and a "storm" slider (`speedUp`) on top; up to three configuration cards (strategy dropdown, five weight sliders that must total 100%, optional technician count); a **Run** button; one grouped bar chart comparing the configurations (SLA violation percent first, then mean resolve time, then fairness); the `best` one highlighted; the `assumptions` text shown in a "How this is modelled" panel next to the chart (the report relies on it); a per-technician bar chart for the selected configuration.
  - `POST /api/v1/admin/simulations/apply` with one configuration (`{strategy, weights}`) answers 204 and changes the live settings: the **Apply** button on the best card. Ask for a confirmation first.
  - It writes nothing when simulating (no incidents, audit entries or notifications), so it is safe to run repeatedly in the video.
- **Incident list filter:** `GET /incidents?minEscalationLevel=` (0 to 3, level and above) for the team-lead escalations screen. Combine it with `status` to list only open work. 400 outside 0 to 3. Triage escalation starts at level 0, so a triage incident that has not climbed yet is level 0.
- **Gemini:** the AI answers (`/intelligence/*`) are now verified against the real service with the team's key: `source` is `LLM` when Gemini answered. Nothing changes in the shapes.

**Testing and DevOps**
- **No schema change.** Class names and expected values for unit tests (all plain Java, no Spring):
  - `ServiceTimeModel` (`com.iitsm.domain.simulation`): `fromHistory` takes the median per priority of acknowledged-to-resolved minutes (resolved minus created when nobody acknowledged); an even count averages the two middle values (10, 20, 30, 40 gives 25; 10, 30, 20 gives 20); a priority with no history uses 45, 90, 180, 240 minutes for P1 to P4. `handlingTime(priority, level)` is the base times `1.3 - 0.1 * level`: with a base of 180 minutes level 1 gives 216, level 3 gives 180, level 5 gives 144; never less than one minute.
  - `DeskSimulation.run(workload, workers, scenario)` with a fixed list of incidents and technicians: the same inputs always give the same result; with one technician and two incidents arriving together the higher priority is served first; an incident finishing after `arrival + allowed` counts as a violation; with no eligible technician the incident stays unassigned and counts as a violation; fairness for assigned counts 3, 3, 3 is 1.0 and for 6, 0, 0 is 0.33 (Jain's index).
  - `SimulatorService.simulate` (needs a database): fewer than 10 or more than 500 incidents, more than three configurations, an unknown strategy, an unknown weight name, weights not adding to 1.0 and a speed-up outside 1 to 20 are all 400; the round-robin memory (`technician_profiles.last_assigned_at`), `audit_records`, `incidents` and `app_config` are identical before and after.
  - `GET /incidents?minEscalationLevel=`: level 0 returns everything; 1 returns only incidents at level 1 or above (set `escalation_level` in the fixture); an employee still sees only their own; 4 and -1 are 400.
- Smoke script on the backend lead's machine: `s1_smoke.py` (51 checks; needs the dev profile with the Flyway seed, `SMOKE_PORT`, `SMOKE_DB`).
- **A7 review for the migration you owe (V11; V10 is taken by A12 and A4):** `backend/docs/SCALING.md` section 2.2 lists seven indexes with their SQL (the audit `created_at`, `incidents.resolved_at`, the open-incident and escalation partial indexes, the composite for duplicates, an optional trigram index, and the partial unique index for the global SLA default, DEC-17). Section 5 says what the load test should measure.

**Report and content**
- **Demo segment (administrator, 13:00 on the run sheet):** open the simulator, pick three configurations, press Run, read the chart, press Apply on the winner. A strong line for the report: "the simulator replays real incidents through the same assignment engine that runs live; it writes nothing". Patterns to cite: Strategy (configurations side by side through one engine), a priority queue of timed events (data structure), an immutable settings snapshot (`AppSettings`).
- Honest limits to state: it is a model (one incident at a time per technician, handling times from history, no multitasking); on the seed data the "matches the real assignee" figure is a diagnostic only, because the seed's assignments were generated.
- The scale-out path (`SCALING.md`) answers "is it scalable?": which components assume one instance, and what replaces each.

---

## A12, A4, A8 and A13 (2026-11-15, DEC-115 to DEC-118)

The contract now has **129 operations** (ten added since the simulator). Reasons: `DECISIONS.md` DEC-115 to DEC-118; description and verified behavior: `SYSTEM_GUIDE.md` sections 12j and 12k; requirement mapping: `backend/docs/TRACEABILITY.md`.

**Frontend**
- **Two-step login.** `POST /auth/login` takes an optional `totp` (six digits). When an account has two-step verification on, a right password without it answers **401 `MFA_REQUIRED`**: show a "Enter the code from your authenticator app" field and send the same login again with `totp`. A wrong, expired or reused code is **401 `INVALID_MFA_CODE`** (and counts toward the five-failure lockout, 423). Google sign-in is not asked for a code.
- **Forgot password screen** (public). Email form: `POST /auth/password-reset/request {email}` always answers 202 with an empty body; show "If that address has an account, we have sent a link" whatever the e-mail. The mailed link opens `<frontend>/reset-password?token=<secret>` (the base is the setting `notification.link.base.url`): a new-password form calling `POST /auth/password-reset/confirm {token, newPassword}`. 204 means done (every session was signed out, send them to login); **400 with `fieldErrors`** on `newPassword` (policy) or on `token` (invalid, used or expired: offer to ask for a new link). Asking is rate-limited (429 with `Retry-After`).
- **Account security screen** (any logged-in user): `GET /auth/mfa` gives `{enabled}`. To turn it on: `POST /auth/mfa/setup` gives `{secret, otpauthUri}`; draw `otpauthUri` as a QR code (any QR library) and also show `secret` as text; then `POST /auth/mfa/enable {code}` (204) with the first code the app shows. To turn it off: `POST /auth/mfa/disable {code}`. 400 `fieldErrors` on `code` means wrong or expired. Setup is refused (400) while it is already on.
- **Administrator, users screen:** a "Reset two-step verification" action calling `POST /admin/users/{id}/mfa/reset` (204) for someone who lost their phone.
- **Push devices.** `POST /notifications/devices {token, platform WEB|ANDROID|IOS}` (201 new, 200 when the same device registers again), `GET /notifications/devices`, `DELETE /notifications/devices/{id}`. No push provider is connected: the "push" is simulated, so register any string of 8 to 255 characters in the demo; what was pushed is listed by `GET /notifications?channel=PUSH_SIM` (a good small screen: "Pushed to my devices"). The preference list is unchanged (60 switches): push is not a per-user switch.
- **Incident list filter** `minEscalationLevel` and the simulator endpoints are in the section above.

**Testing and DevOps**
- **Migration V10 is already in the repository** (`V10__password_reset_mfa_push.sql`): `users.totp_secret`, `totp_enabled`, `totp_last_step`; tables `password_reset_tokens` and `push_devices`; the audit action CHECK now allows `PASSWORD_RESET_REQUESTED`, `PASSWORD_CHANGED`, `MFA_ENABLED`, `MFA_DISABLED`; the notifications channel CHECK allows `PUSH_SIM`. Your index migration is therefore **V11**. If a seed or test builds users with SQL, the three new `users` columns have defaults.
- New settings (defaults in code): `auth.password.reset.minutes` 30 (5 to 1440), `notification.push.devices.max` 5 (1 to 20).
- **Docker Compose:** pass `METRICS_TOKEN` (any 16 or more characters) to the backend only if you want the metrics endpoint; without it `/actuator/prometheus` is 404. The same compose file still does not pass `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID`. The ready-made Prometheus and Grafana stack is in `backend/observability` (a compose override, `README.md` inside).
- Class names and expected values for unit tests (plain Java unless noted):
  - `Totp` (`com.iitsm.domain.user`): the RFC 6238 SHA-1 vectors with the secret `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ` (the ASCII text 12345678901234567890): step 1 (time 59) gives `287082`; time 1111111109 gives `081804`; time 1111111111 gives `050471`; time 1234567890 gives `005924`; time 2000000000 gives `279037`; time 20000000000 gives `353130` (the last six digits of the RFC's eight-digit values). `verify` accepts the current step and one either side, refuses two steps away, refuses a step less than or equal to `lastAcceptedStep`, and refuses `12ab56` and a five-digit code. `newSecret` is 32 Base32 characters.
  - `PasswordResetService` (`com.iitsm.application.auth`, needs a database): an unknown e-mail stores nothing and sends nothing; a known one stores one token with a 64-character hash and sends one mail; asking twice leaves one usable token; `confirm` with a used, expired, wrong or empty secret is `InputValidationException` on `token`; a weak password is `InputValidationException` on `newPassword` and leaves the link usable; success changes the hash, marks the link used and revokes every refresh token.
  - `MfaService`: `setup` twice while enabled is refused; `enable` with a wrong code is refused; `disable` needs a code of a later step than the one used to enable.
  - `AuthService.login` with MFA on: no code gives `MfaRequiredException`; a wrong code gives `InvalidMfaCodeException` and one failed login is counted; the fifth wrong code locks the account (`AccountLockedException`).
  - `NotificationRules.pushApplies` (`com.iitsm.domain.notification`): P1 and P2 with INCIDENT_ASSIGNED, TRIAGE_NEEDED, SLA_WARNING, SLA_VIOLATED or INCIDENT_ESCALATED are true; P3 and P4 with those are false; INFO_REQUESTED and INCIDENT_RESOLVED are true at any priority; the chat room (`Audience.ROOM`) is always false.
  - `PushDeviceService`: a sixth device is refused at the default limit; registering a token that exists moves it and answers `created = false`; `remove` of someone else's device is `ResourceNotFoundException`.
  - `MetricsTokenFilter` (`com.iitsm.web.filter`): a token shorter than 16 characters or none means 404 on `/actuator/prometheus`; a wrong token is 401; the right token passes; other paths are untouched.
- Smoke script on the backend lead's machine: `a12_a4_smoke.py` (72 checks; needs the dev profile with the Flyway seed and Mailpit on 8025). `s1_smoke.py` is now 51 checks.

**Report and content**
- Security section: password reset (single-use hashed links, no way to find out who has an account, all sessions signed out), TOTP two-step verification (RFC 6238, replay protection, wrong codes count toward the lockout, administrator reset), the token-guarded metrics endpoint. Honest limits: the TOTP secret is stored as text, there are no recovery codes, no role is forced to use two-step.
- Patterns to cite: Adapter (`PasswordResetNotifier` with `PasswordResetMailer`; `PushGateway` with `SimulatedPushGateway`), Observer (`BusinessMetrics` on the domain events), Strategy-style ports. Mobile push is **simulated**: say so.
- `TRACEABILITY.md` maps every requirement of the brief to its class, endpoint, screen and test; paste from it for the requirements document and the testing section.
- Cloud deployment and microservices were decided against (DEC-118); the answer to "how would it evolve" is `SCALING.md`.

## Run profile is now Flyway (2026-11-15, docs sync)

- **Everyone who runs the backend:** use `SPRING_PROFILES_ACTIVE=dev` (or `demo`), not `dev,schema-auto`. Flyway builds the schema (V1 to V10) and loads the seed; Hibernate only validates. A database made earlier with `schema-auto` must be dropped and recreated once, otherwise Flyway refuses to start.
- **Testing:** your migrations are the single source of the schema now. The file `application-schema-auto.properties` is obsolete and will be removed. Your next migration number is V11.
- **Frontend:** the contract has 129 operations (see the sections above). Nothing else in the API changed.

## B1 to B4: AT_RISK, report PDF, embeddings, `schema-auto` removed (2026-11-16, DEC-M12-10 to DEC-M12-12)

Description and verified behavior: `SYSTEM_GUIDE.md` sections 12b.1, 12b.3 and 12c.9. The contract still has **129 operations** (the code has 132 endpoint methods; the 3 extra exist only in the `demo` profile).

- **Frontend:**
  - `slaState` can now be `AT_RISK` (open, running, not violated, flagged by the SLA risk scan). Show it like WARNING with a different label; `GET /incidents?slaState=AT_RISK` now returns those incidents. It replaces `OK` and `WARNING` for them.
  - Similar matches (`POST /intelligence/similar`, `GET /incidents/{id}/similar`, and the `similar` list in a 409 duplicate answer) carry a new field `source`: `EMBEDDING` or `KEYWORD`. The score scales differ, so do not compare scores across sources; use `match` (`DUPLICATE` or `RELATED`) for wording.
  - `GET /reports/export?type=...&format=pdf` returns a PDF (`application/pdf`, a download). Any `format` other than `csv` or `pdf` is 400 `VALIDATION_FAILED`. The Reports screen could offer both buttons.
- **Testing and DevOps:**
  - The `schema-auto` profile and `SchemaAutoSupport` are gone; only Flyway builds the schema (V1 to V10; your next migration is V11). Use `dev` or `demo`.
  - B3 needs no migration: it uses `incident_embeddings` from your V7. With no key, nothing changes: similarity stays TF-IDF (0.55 and 0.35) and the existing tests and CI do not call Google. If you want to test the embedding path, set `EMBEDDING_API_KEY` (or `LLM_API_KEY` with `LLM_PROVIDER=gemini`); the handbook's T16 thresholds of 0.80 and 0.65 do not apply to embeddings (0.93 and 0.90, see DEC-M12-10).
  - Settings are now **83** (five embedding keys). If a seed or test counts `app_config` keys, update it.
  - New classes you may want to cover (domain, no Spring): `EmbeddingSimilarity` (ranks by cosine; empty if any vector is missing or has another length; scores at or below 0 are dropped), `SlaRiskFlags`. Application: `ReportExportService.requireFormat` (csv, pdf, any case; else `InputValidationException`).
  - **Smoke suites (PR #30, 2026-11-16):** `backend/smoke-tests/` now has `run_all.py` (runs every suite on a fresh database and backend) and a README with one line per suite. All 25 suites pass and no backend bug was found; every earlier failure was a stale suite assumption.
- **Report and content:** similarity now has two engines. Say in the report: "Gemini embeddings when the key and quota allow, TF-IDF cosine otherwise; each answer names its source." Thresholds differ because Gemini vectors are bunched together (calibrated during B3 on the 212 seed incidents, DEC-M12-10: unrelated pairs had a median cosine near 0.85 and same-issue pairs near 0.95 then, not re-measured since); DEC-M12-10 has the reasoning and cross-questions. Report PDF export now exists for all eight report types.
- **Everyone:** the count to quote for the API is **129 operations** in the contract; do not quote 132 (that includes three demo-only methods).

## Reporter contact, SLA calendar and capacity threshold (2026-11-20, DEC-121)

- **Frontend:** `GET /incidents/{id}` adds `reporterContact` {email, department, location} (null unless you are staff on the incident or see all) and `slaCalendar` {type ALWAYS|BUSINESS_HOURS, zone, open, close, days}. `GET /technicians/me/workload` adds `capacityWarnPercent` (use it instead of the 80 constant).
- **Testing / DevOps:** new `app_config` key `workload.capacity.warn.percent` (default 80, 1 to 100); no migration needed, and the seed may add a row (`docs/content/config_defaults.json` lists it).

## Several CORS origins and date-only parameters (2026-11-20, DEC-120)

From Sanay's `fronted-version-final`, merged with review fixes.

- **Everyone / DevOps:** `CORS_ORIGIN` may list several origins, comma-separated (`deploy/.env.example` and `docker-compose.yml` default to `localhost` and `127.0.0.1` on 5173 and 3000). The same list now applies to the WebSocket endpoint `/ws`.
- **Frontend:** `Instant` query parameters (`from`, `to`, `createdFrom`, `createdTo`, ...) still expect an ISO date-time; a plain `YYYY-MM-DD` is now also accepted and means UTC midnight. Keep sending date-times with local-day bounds (`dashboard/dates.ts`, `tickets/filters.ts`, Reports).
- **Testing:** no contract change; class names to cover if wanted: `StringToInstantConverter` (`2026-11-20` gives `2026-11-20T00:00:00Z`, garbage gives 400), `CorsConfig` and `WebSocketConfig` with a two-origin list.
