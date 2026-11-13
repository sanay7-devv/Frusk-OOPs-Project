# I-ITSM: What changed since your handbook

> **Read this first.** The five handbook PDFs (dated 2026-10-15) are frozen and are not in this repository. This page lists every point where the project now differs from them, per role. Where this page and a handbook disagree, this page wins. Reasons are in `DECISIONS.md` (DEC numbers); the order of work is in `ROADMAP.md` section 5.

Last updated: 2026-11-13 (M9)

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
| Settings | 27 keys in Appendix A.5 | 41 keys (35 plus six `notification.*` with M9); defaults live in the code, so seed rows are optional | DEC-18 |
| Demo | Docker Compose | Unchanged: the recorded demo runs locally with Docker Compose. Cloud deployment is the last priority | DEC-45 |
| Grading | Summary table in section 1.2 | Use the rubric in the course brief; our plan against it is `ROADMAP.md` section 8 | DEC-43 |

**Built so far (backend):** M1 to M9 (M9 notifications: five channels, inbox API, preferences, WebSocket push): users and login, catalog and live settings, incidents with the full lifecycle, priority, five assignment strategies with explainable recommendations, SLA monitor with warnings and violations, audit trail.
**Not built yet:** M9 notifications, M10 reports, M11 escalation, M12 AI features, M13 real-time and graph, M14 hardening, Google sign-in.

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

**Escalation behavior decided for M11** (DEC-48, DEC-49; not built yet): an unassigned P1 or P2 in triage escalates to the team lead after the normal timeout and then climbs the chain; after level 3 with no acknowledgement, one final "escalation exhausted" alert goes to all administrators (SMS for P1) and the monitor stops. The alert reuses the audit action ESCALATED and the notification event type INCIDENT_ESCALATED, so no new schema values are needed. Testing: expected values for the demo profile (1-minute timeouts) are one escalation per minute, then one exhausted alert.

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
- **Rules to follow:**
  - Never re-implement permissions: `IncidentDetail.allowedActions` says which buttons to show.
  - Send `version` on `PUT /incidents/{id}`; on 409 `OPTIMISTIC_LOCK_CONFLICT` reload and retry.
  - Store the new refresh token from every refresh response; reusing an old one logs the user out everywhere.
  - For an error code you do not know, fall back to the HTTP status.
- **Additions to the original contract** are listed in `backend/docs/openapi/README.md`. A typed client can be generated from `iitsm-api.json`.
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
  - `DECISIONS.md`: 47 decisions with options, reasons and likely examiner questions.
  - `ERROR_LOG.md`: the record of bugs found and fixed; cite it for the rubric's "bug resolution".
  - `ROADMAP.md` section 8: our plan against each rubric line.
  - `DECISIONS.md` DEC-45: the run sheet for the 15 to 20 minute video.
  - `DECISIONS.md` DEC-47: which feature answers which challenge named in the brief.
- **State openly in the report:** team leads see all incidents; the system runs as one instance (settings cache, rate limits and the message broker are in memory); the demo is local.
- **Still needed from you:** notification wording, the AI prompts, the labelled evaluation set, and seed incident text. Demo data should use the institute's own IT services (DEC-43, A14).
