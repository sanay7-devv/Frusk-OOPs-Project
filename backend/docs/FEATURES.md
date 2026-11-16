# I-ITSM feature catalogue

Written for the Report teammate. Built from the code on `shared/main` (commit `909213d`, 2026-11-16), not from the older docs. Where a doc or a screen disagrees with the code, section 21 says so.

## 1. What this is and how to read it

I-ITSM is an IT help desk. An employee reports a problem ("incident"). The system works out how urgent it is, picks a technician, starts a clock for the fix, warns people when the clock runs low, and keeps a record of everything. Administrators watch the whole desk live and change the rules without restarting anything.

There are four kinds of people:

| Role | In the code | What they do |
|---|---|---|
| Employee | `EMPLOYEE` | Reports problems, follows them, confirms or rejects the fix, rates it. |
| Technician | `TECHNICIAN` | Works on assigned incidents, sets own availability. |
| Team lead | a technician with escalation level 1 | Sees every incident, handles escalations, groups related incidents. |
| Administrator | `ADMINISTRATOR` (scope System admin or IT manager) | Manages users, services, SLA rules and settings. Sees the audit trail and the live dashboard. |

One person can hold several roles.

How to read the tables:

- **Where** is the main endpoint (relative to `/api/v1`) or the background job that does the work.
- **Screen** says what the frontend shows today:
  - `real` = the screen calls the real API.
  - `fake` = the screen exists but shows hardcoded data.
  - `stub` = a five-line placeholder.
  - `none` = no screen at all. The feature works only through the API (Swagger or a script).
- **Source** is the handbook module (M1 to M14) or the extra ID (S, D, E, A, G, C), plus decision numbers (DEC) from `DECISIONS.md`.
- **Video** says whether it is a good thing to show in the 15 to 20 minute recording. A feature with `none` for screen can still be shown in Swagger, but a screen is better.

## 2. At a glance

| What | Count | How counted |
|---|---|---|
| Features in this catalogue (built, on `main`) | **127** (123 on 2026-11-15 plus B1 to B4, which merged on 2026-11-15; per-section counts below the table) | One row per user-facing feature |
| API operations | **129** in `docs/openapi/iitsm-api.json` (106 paths) | The code has 132 endpoint methods. The 3 extra exist only in the `demo` profile (clock read, clock advance, outage drill), so they are not in the contract. |
| Background jobs | **6** | SLA monitor, SLA risk scan, escalation monitor, auto-verify, audit seal, dashboard counters |
| Live settings | **83** (`ConfigKey`) | Changed by an administrator with `PUT /admin/config`, effective at once |
| Design patterns | **9** | The 7 the brief asks for, plus Command and Template Method (section 6) |
| Real-time topics | **2** | `/user/queue/notifications` (own messages), `/topic/dashboard` (administrators) |
| Notification channels | **6** | In-app inbox, WebSocket push, email, simulated SMS, simulated mobile push, chat webhook |
| Database migrations | 10 schema (V1 to V10) + 3 seed/demo scripts | `src/main/resources/db` |
| Frontend screens | 11 admin screens real; employee home, my incidents, incident detail, technician (3) and team lead (2) screens fake or stub | See the `Screen` column |

Features per section (a few appear in two sections and are counted in both):

- Reporting incidents: 15
- Incident lifecycle: 10
- Priority: 5
- Assignment: 10
- SLA and escalation: 12
- Notifications: 9
- Intelligence and AI: 10
- Major incidents and problems: 7
- Search, reports and exports: 7
- Dashboard, real-time and service health: 6
- Accounts and security: 12
- Administration and live settings: 5
- Audit: 4
- Demo aids (demo profile only): 3
- Observability and operations: 8
- Added by B1 to B4 (section 18; B3 is also row 9.10): 4

**Best 10 for the video** (all are built and work now):

1. **Smart report form**: type a description, the system suggests category, impact and urgency, and warns about a likely duplicate (screen `real`). Rows 3.1 to 3.3.
2. **Priority with a reason, then automatic assignment**: the incident gets P1 to P4 with a plain explanation, then the best technician is picked and the runner-ups are shown with scores. Rows 5.1 and 6.1 to 6.4.
3. **Change a setting live**: switch the assignment strategy or a priority band on the Config screen (`real`) and show the next incident go to a different person. Row 14.1.
4. **Demo clock plus SLA warnings, violations and escalation**: move time forward 30 minutes (demo profile) and watch warnings, a violation and an escalation appear. Rows 7.1 to 7.7 and 16.1.
5. **Live dashboard and instant notifications**: the dashboard updates and a toast pops up without a page reload. Rows 8.1 and 12.1 (the bell and toast are `real`; the dashboard screen polls lists, see section 8).
6. **Major Incident Mode**: one click files the outage drill, related incidents group into one problem, the graph names the probable root cause, priority climbs as people join. Rows 10.1, 10.3, 10.4, 5.5, 3.7 and 16.2 (API only today).
7. **Service Desk Simulator**: replay the last N incidents under three different settings and compare the results. Row 14.5 (API only today).
8. **Sealed audit trail**: seal, change one database row by hand, run verify, and it names the altered record. Row 15.3.
9. **Post-incident report as PDF**: the whole story of an incident from the audit trail. Row 11.6.
10. **AI with a safety net**: show the AI answer, switch `ai.primary` to KEYWORD (or stop the model), and the same call still answers offline. Rows 3.2 and 9.3.

Other showable items: Grafana dashboard (17.2), service status board (12.6), account lockout (13.3).

## 3. Reporting incidents

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 3.1 | Report an incident | The employee fills a form (service, title, description, how many people are hit). The system gives it a code like INC-2026-00001, checks it, and starts the process. | Employee | `POST /incidents` | real | M4, DEC-70, DEC-71 | yes |
| 3.2 | Category and impact suggestion | While typing, the form suggests the category, how bad it is and how urgent. A suggestion below the confidence setting is not shown. | Employee | `POST /intelligence/suggest-category`, `suggest-intake` | real | M12, DEC-M12-2, DEC-111 | yes |
| 3.3 | Duplicate warning | Before the incident is saved, the system compares it with open incidents on the same service from the last 24 hours. If one is very similar, the reporter is warned and can confirm "not a duplicate". | Employee | `POST /incidents` (409 `DUPLICATE_INCIDENT`), `POST /intelligence/similar` | real | M12, DEC-71, DEC-M12-1 | yes |
| 3.4 | Automatic category when none given | If the reporter picks no category and the AI is sure enough, the category is filled in. If not, the incident waits in "triage" for a team lead. | Employee | `POST /incidents` | none | M12, DEC-70 | no |
| 3.5 | Chatbot reporting | A guided chat asks three questions (what happened, which service, how many people) and then files the incident through the normal path. It keeps no memory on the server. | Employee | `POST /intelligence/chat` | none | A1, DEC-75 | yes (API) |
| 3.6 | Voice reporting | Planned as a frontend feature on top of the chatbot. No backend part and no screen. | Employee | none | none | A2, DEC-43 | no |
| 3.7 | Known-outage banner and one-click join | The report form shows "known outage, being worked on". One click files a tiny linked incident and raises the main incident's user count, instead of filling a second form. | Employee | `GET /problems/known-outages`, `POST /problems/{id}/join` | none | S2, DEC-73 | yes (API) |
| 3.8 | Attachments | The reporter or staff add files (up to 5 MB each, 10 per incident, limited file types) and download them later. | Employee, staff | `POST/GET /incidents/{id}/attachments`, `GET /attachments/{id}/download` | none | M14, DEC-93 | no |
| 3.9 | Edit an incident | The reporter can fix title or description. Impact, urgency and users are locked once it is assigned, so nobody can raise their own priority. | Employee, staff | `PUT /incidents/{id}` | none | M4, G4, DEC-77 | no |
| 3.10 | Withdraw | The reporter cancels their own incident. It closes with reason "withdrawn". | Employee | `POST /incidents/{id}/withdraw` | none | G3, DEC-77 | no |
| 3.11 | Confirm or reject the fix, rate it | After "resolved", the reporter verifies it (closes the loop) or reopens it. They also rate the fix from 1 to 5 once. | Employee | `POST /incidents/{id}/verify`, `/reopen`, `POST /incidents/{id}/feedback` | none | M4, M10, DEC-65 | no |
| 3.12 | Answer a technician's question | The technician asks for more information (SLA clock pauses). The reporter replies and work continues. | Employee | `POST /incidents/{id}/request-info`, `/provide-info` | none | M4 | no |
| 3.13 | Comments | Public comments are seen by the reporter. Internal notes are seen by staff only. | Employee, staff | `GET/POST /incidents/{id}/comments` | none | M4 | no |
| 3.14 | Reporter tracking view | A progress line with the SLA due time, for the employee. Planned for the frontend; the data already comes from the incident detail. | Employee | `GET /incidents/{id}` | stub | E5, DEC-47 | no |
| 3.15 | Service and category lists | The report form's drop-downs. Open to every logged-in user. | Everyone | `GET /services`, `GET /categories` | real | M3 | no |

## 4. Incident lifecycle

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 4.1 | Ten-step life cycle | An incident moves through New, Classified, Assigned, Acknowledged, In progress, Pending user info, Resolved, Verified, Closed and Reopened. Each step only allows the moves that make sense. A wrong move is refused with 409. | Everyone | `POST /incidents/{id}/{action}` | real (admin) | M4, DEC-19, DEC-20 | yes |
| 4.2 | Who may do what | A separate rule class decides whether the caller is allowed (403). A person who may not see the incident gets 404. Wrong person is 403, wrong moment is 409. | Everyone | all incident endpoints | none | M4, DEC-20, DEC-21, DEC-78 | no |
| 4.3 | Technician actions | Acknowledge, start work, ask for info, resolve with a written fix. | Technician | `POST /incidents/{id}/acknowledge`, `/start`, `/request-info`, `/resolve` | fake | M4 | no |
| 4.4 | Close | An administrator closes a verified incident. | Administrator | `POST /incidents/{id}/close` | real | M4 | no |
| 4.5 | Auto-verify | A resolved incident nobody confirmed for 48 hours is verified and closed by the system. | System | job `AutoVerifyJob` | none | G2, DEC-46, DEC-53 | yes |
| 4.6 | Reopen window | A closed incident can be reopened for 7 days (setting). | Employee | `POST /incidents/{id}/reopen` | none | M4 | no |
| 4.7 | Mark as duplicate | Staff close an incident as a copy of another one. | Staff | `POST /incidents/{id}/mark-duplicate` | none | M12, DEC-77 | no |
| 4.8 | Safe concurrent edits | If two people change the same incident at once, the second gets a clear conflict instead of silently overwriting. | Everyone | all incident writes (409) | none | M4, DEC-22 | no |
| 4.9 | Incident history | The full list of what happened, in order, with who did it. The reporter does not see internal notes. | Everyone | `GET /incidents/{id}/history` | none | M8 | no |
| 4.10 | Incident detail with allowed actions | One call returns the incident, its SLA state, and which buttons the caller may press, so the frontend does not repeat the rules. | Everyone | `GET /incidents/{id}` | real (admin) | M4 | no |

## 5. Priority

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 5.1 | Automatic priority with explanation | Priority P1 to P4 comes from impact, urgency, how critical the service is and how many people are hit. The reason is stored and shown ("score 187, Payment is always P1"). | System | on `POST /incidents`, `PUT /incidents/{id}` | real (shows the result) | M5, DEC-25 | yes |
| 5.2 | Business override rules | A security incident on a critical service is at least P2. A service flagged "always P1" (Payment) is P1 when impact is 4 or more. | System | `PriorityEngine` | none | M5, DEC-25, C3 | yes |
| 5.3 | Manual override | Staff with the override permission set a different priority and must give a reason. | Staff | `POST /incidents/{id}/override-priority` | real (admin) | M5 | no |
| 5.4 | Priority what-if | "If impact were 4 and 120 people were hit, what priority would this be?" Nothing is saved. | Everyone who can see incidents | `POST /priority/what-if` | none | A11, DEC-66 | yes (API) |
| 5.5 | Priority that climbs with the crowd | When more people join a known outage, the lead incident's user count goes up and its priority is recalculated (the multipliers apply at 10 and 101 users). | System | `POST /problems/{id}/join` | none | S2, DEC-73 | yes |

## 6. Assignment

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 6.1 | Automatic assignment | When an incident is created with a category, the system picks the best available technician. | System | on `POST /incidents` | real | M6, DEC-33 | yes |
| 6.2 | Five switchable strategies | Composite (default), skill, load, round robin, experience-by-priority. An administrator switches by changing one setting, with no restart. | Administrator | setting `assignment.strategy` | real (Config) | M6, DEC-28 to DEC-32 | yes |
| 6.3 | Eligibility rules | A technician is skipped if the account is inactive, away, full, the reporter themself, or without a skill the category needs. The reason is recorded. | System | `EligibilityFilter` | none | M6 | no |
| 6.4 | Explainable recommendations | For any incident, the top three technicians with a score per factor, and a list of who was excluded and why. | Staff | `GET /incidents/{id}/recommendations` | none | M6, DEC-30 | yes |
| 6.5 | Manual assign and reassign | Staff assign or move an incident to a named technician. The same eligibility rules apply. | Staff | `POST /incidents/{id}/assign`, `/reassign` | real (admin) | M6 | no |
| 6.6 | Triage queue | An incident with no category waits for a team lead, who is told. | Team lead | event `TriageNeeded` | none | M6, DEC-33 | no |
| 6.7 | Technician workload and queue | A technician sees their own load, capacity, resolved this week and next SLA deadlines, and their active incidents (most urgent first). | Technician | `GET /technicians/me/workload`, `/me/queue` | fake | M6 | no |
| 6.8 | Availability | A technician sets Available, Busy, Away or Off duty. Away and Off duty get no new work. | Technician | `PUT /technicians/me/availability` | fake | M6 | no |
| 6.9 | Team view | Team leads and administrators list active technicians with load, availability and skills. | Team lead, administrator | `GET /technicians` | none | M6 | no |
| 6.10 | Coverage risk report | Lists critical services where fewer than two technicians hold the needed skills. | Team lead, administrator | `GET /reports/coverage-risk` | none | E3, DEC-47, DEC-63 | yes (API) |

## 7. SLA and escalation

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 7.1 | Two SLA clocks | One clock for the first answer, one for the fix. The fix clock stops at "resolved", pauses while waiting for the reporter, and restarts on reopen. | System | `SlaTracker` | real (countdown in lists) | M7 | yes |
| 7.2 | SLA policies per service and priority | An administrator sets target times for each service and priority, plus a global default. If none applies, the error names the missing policy. | Administrator | `GET/POST/PUT/DELETE /admin/sla-policies` | real | M3, M7 | no |
| 7.3 | Business-hours calendar | A policy may count only working hours (Mon to Fri 09:00 to 18:00 by default, with holidays). A clock started Friday 16:00 can run out Monday. | Administrator | settings `sla.business.*` | real (Config) | M7, DEC-39 | no |
| 7.4 | SLA warnings and violations | At 75% and 90% of the deadline a warning goes out. At 100% a violation is recorded. Each fires exactly once. | System | job `SlaMonitorJob` (60 s) | none | M7, DEC-37 | yes |
| 7.5 | Violations list | Team leads and administrators list recorded violations. | Team lead, administrator | `GET /sla/violations` | none | M7 | no |
| 7.6 | SLA risk score | A score from 0 to 1 says how likely an incident is to miss its deadline, with how much each factor added. A scan flags incidents above 0.70 once. | Staff | `GET /incidents/{id}/sla-risk`, job `SlaRiskScanJob` (300 s) | none | M12, DEC-M12-8 | yes (API) |
| 7.7 | Escalation chain | An unacknowledged P1 or P2 moves up: technician, team lead, system admin, IT manager. Each level has its own timeout from the escalation policy. A level nobody holds is skipped. | System | job `EscalationMonitorJob` (60 s) | none | M11, DEC-48, DEC-50 | yes |
| 7.8 | Escalation exhausted alert | If nobody at the top level acts for 15 minutes, one final alert goes out. | System | job `EscalationMonitorJob` | none | M11, DEC-49 | no |
| 7.9 | Manual escalation | Staff push an incident up one level by hand. | Staff | `POST /incidents/{id}/escalate` | none | M11 | no |
| 7.10 | Escalation preview | The incident detail shows when the next escalation will happen and who gets it. Staff only. | Staff | `GET /incidents/{id}` (field) | none | A11, DEC-51 | yes |
| 7.11 | Escalation policies | An administrator sets the timeout per priority and level. | Administrator | `GET/POST/PUT/DELETE /admin/escalation-policies` | real | M3, M11 | no |
| 7.12 | Escalated-incidents filter | The incident list can be filtered to those at escalation level 1 or higher. | Team lead | `GET /incidents?minEscalationLevel=` | real (admin tickets) | M10, DEC-113 | no |

## 8. Notifications

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 8.1 | Instant pop-up | A message appears in the browser the moment something happens to your incident, with no refresh. The unread count updates too. | Everyone | STOMP `/user/queue/notifications` | real (toast, unread count) | M9, DEC-54 | yes |
| 8.2 | Inbox | A list of your notifications with read and unread. | Everyone | `GET /notifications`, `POST /notifications/{id}/read`, `/read-all`, `GET /unread-count` | fake (list is hardcoded; mark-read calls the API) | M9 | no |
| 8.3 | Fifteen kinds of event | Created, assigned, acknowledged, priority changed, info asked, info given, SLA warning, SLA violated, escalated, resolved, verified, closed, reopened, duplicate suspected, triage needed. | Everyone | `NotificationListener` | none | M9, DEC-54 | no |
| 8.4 | Six channels | Inbox, WebSocket push, HTML email, simulated SMS (P1 only, staff only), simulated mobile push (P1 and P2), chat webhook (shared room). | Everyone | `NotificationDispatcher` | none | M9, A6, A4 | yes |
| 8.5 | Email with retries | A failed email is retried with a growing wait (3 times by default). | System | `EmailChannel` | none | M9, DEC-54 | no |
| 8.6 | Personal preferences | A person switches channels on or off per event. The inbox and critical alerts cannot be switched off. | Everyone | `GET/PUT /notifications/preferences` | none | M9, DEC-40 | no |
| 8.7 | Alert storm control | If one person would get more than 5 SLA warnings in one run, they get one digest instead. P1 and violations are never batched. | System | `DigestCollector` | none | M9, DEC-54 | no |
| 8.8 | Mobile devices | A person registers up to 5 phones for push. Only the last six characters of a token are ever shown. | Everyone | `GET/POST /notifications/devices`, `DELETE /notifications/devices/{id}` | none | A4, DEC-117 | no |
| 8.9 | Quiet grouping | Grouping an incident into a problem record is not announced, to avoid noise. | System | `NotificationRules.announced` | none | DEC-110 | no |

## 9. Intelligence and AI

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 9.1 | Keyword engine (offline) | Works with no internet and no key. Matches words to categories and impact. This is the default safety net. | System | `KeywordTextAnalysisService` | none | M12, DEC-M12-2 | no |
| 9.2 | AI model (Gemini) | If a key is set, Gemini suggests category and impact. Anthropic is also supported. A scripted fake model exists for demos and tests. | System | `GeminiLlmClient`, `AnthropicLlmClient`, `ScriptedLlmClient` | none | M12, DEC-M12-4, DEC-111 | yes |
| 9.3 | Automatic fallback and circuit breaker | If the model fails, times out (8 s) or returns junk, the keyword engine answers. After 3 failures in a row the model is skipped for 60 seconds. The answer says who produced it. | System | `FallbackTextAnalysisService`, `CircuitBreaker` | none | M12, DEC-M12-5 | yes |
| 9.4 | Privacy filter | Email addresses, IP addresses and secrets are removed from text before it goes to the model. | System | `TextRedactor` | none | M12, DEC-42, DEC-M12-4 | yes |
| 9.5 | Similar incidents | Finds open incidents that mean the same thing, for a draft or for an existing incident. Uses Gemini embeddings when they are available, else TF-IDF word matching; each match says which (`source`). | Employee, staff | `POST /intelligence/similar`, `GET /incidents/{id}/similar` | real (form only) | M12, DEC-M12-1 | yes |
| 9.6 | Suggested fixes | For an open incident, lists fixes used on similar resolved incidents. | Technician, team lead, administrator | `GET /incidents/{id}/suggested-resolutions` | none | M12 | yes (API) |
| 9.7 | Thread summary | Summarises comments and history into a short summary with hand-over notes. | Technician, team lead, administrator | `POST /incidents/{id}/summary` | none | M12, DEC-M12-6 | yes (API) |
| 9.8 | Rate limit and cache | Each user gets 20 suggestion calls a minute. The same request within 60 s reuses its answer. | System | `AiRateLimiter`, `AiResultCache` | none | M14, DEC-M12-9 | no |
| 9.9 | Chatbot reporting | See 3.5. | Employee | `POST /intelligence/chat` | none | A1, DEC-75 | yes (API) |
| 9.10 | Embeddings similarity | Built: see 18.3. New incidents get an AI vector after they are saved; searches compare vectors and fall back to TF-IDF when there is no key, the quota is used up or the model fails. | System | `EmbeddingService`, `EmbeddingListener`, `EmbeddingBackfillJob` | none | M12, B3, DEC-M12-10 | yes (API) |

## 10. Major incidents and problems

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 10.1 | Automatic grouping into a problem record | When many people report the same outage, the new incident is grouped under one "problem" record. Two rules: same service with similar text, or a neighbouring service during an open P1 or P2. | System | on `POST /incidents` | none | M12, S2, DEC-71, DEC-72 | yes |
| 10.2 | Problem records | Team leads list problems and open one from chosen incidents. | Team lead, administrator | `GET/POST /problems`, `GET /problems/{id}` | none | M12, DEC-72 | no |
| 10.3 | Probable root cause | From the service graph, finds the service all failing services depend on and shows the paths as evidence. | Team lead, administrator | `GET /problems/{id}/root-cause` | none | S2, DEC-73, DEC-83 | yes |
| 10.4 | Resolve the whole problem | One fix closes every open incident in the record, and each joiner gets one notice. | Team lead, administrator | `POST /problems/{id}/resolve` | none | S2, DEC-73 | yes |
| 10.5 | Take an incident out of a problem | An administrator removes a wrongly grouped incident. Audited. | Administrator | `DELETE /problems/{id}/incidents/{incidentId}` | none | M12, DEC-72 | no |
| 10.6 | Recurring-problem detector | Proposes a problem record when the same service and category was fixed 3 times in 30 days, or an incident was reopened twice. Computed when asked, so never stale. | Team lead, administrator | `GET /problems/recurring` | none | E2, DEC-47, DEC-74 | yes (API) |
| 10.7 | Known outages | The list behind the report-form banner (see 3.7). | Everyone who can report | `GET /problems/known-outages` | none | S2, DEC-73 | no |

## 11. Search, reports and exports

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 11.1 | Incident search | Free text, code, status, priority, category, service, assignee, reporter, SLA state, dates, escalation level; paging and sorting. Each person sees only what they may see. | Everyone | `GET /incidents` | real (admin tickets) | M10, DEC-24 | yes |
| 11.2 | Saved views | A person saves a set of filters under a name (up to 20) and replays it. Private to the owner. | Everyone | `GET/POST /saved-filters`, `DELETE /saved-filters/{id}` | none | M10, DEC-65 | no |
| 11.3 | Reports | Overview, workload, services, trends, priority split, category split, SLA compliance. Scoped by what the caller may see. | Staff | `GET /reports/*` (7 reports) | real (screen computes its own numbers from the incident list) | M10, DEC-60 | yes |
| 11.4 | CSV and PDF export | Download any of 8 reports as CSV (default) or PDF (`format=pdf`). Capped at 10,000 rows (the PDF says when it was cut). CSV is safe against spreadsheet formula tricks. Any other format is 400. | Staff | `GET /reports/export?type=&format=csv\|pdf` | none | M10, DEC-62 | no |
| 11.5 | Coverage risk report | See 6.10. | Team lead, administrator | `GET /reports/coverage-risk` | none | E3, DEC-63 | yes (API) |
| 11.6 | Post-incident report (JSON and PDF) | The story of one incident: timeline, time in each status, SLA result, people involved, the fix. Downloadable as a PDF. | Whoever may see the incident | `GET /incidents/{id}/post-incident-report`, `/pdf` | none | E4, DEC-47, DEC-64 | yes |
| 11.7 | Feedback | See 3.11. | Employee | `POST /incidents/{id}/feedback` | none | M10, DEC-65 | no |

## 12. Dashboard, real-time and service health

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 12.1 | Live dashboard (API) | Counters (open, critical, violations, resolved), the ten most at-risk incidents and recent events, first loaded once and then pushed. | Administrator | `GET /dashboard/live`, STOMP `/topic/dashboard` | real, but the screen builds its numbers from `GET /incidents` and does not use these two | M13, DEC-80 to DEC-82 | yes |
| 12.2 | Counter push | Counters are pushed at most once a second after a change, and every 30 s when quiet. | System | job `DashboardCountersJob` | none | M13, DEC-81 | no |
| 12.3 | Socket safety | The socket needs a valid token, each topic has its own permission, and the socket closes when the token expires. | Everyone | `/ws` | real | M13, DEC-80, DEC-82 | no |
| 12.4 | Service dependency graph | Shows which service depends on which. A cycle is refused. | Everyone | `GET /services/graph` | real, but the screen draws the graph from `GET /admin/services` | M13, DEC-16, DEC-83 | yes |
| 12.5 | Impact analysis | For a service, lists everything that would be hit if it failed. | Everyone | `GET /services/{id}/impact` | none | M13, DEC-83 | yes (API) |
| 12.6 | Service status board | Every service shown as Healthy, Degraded or Outage, from open incidents. Employees can see it. | Everyone | `GET /services/status` | none | E1, DEC-47, DEC-84 | yes (API) |

## 13. Accounts and security

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 13.1 | Register and log in | Create an account (always an employee first) and log in with email and password. | Everyone | `POST /auth/register`, `/login` | real | M2 | no |
| 13.2 | Tokens | A short-lived access token and a rotating refresh token. The refresh token is stored only as a hash and reuse of an old one is detected. | Everyone | `POST /auth/refresh`, `/logout`, `GET /auth/me` | real | M2, DEC-10, DEC-11 | no |
| 13.3 | Account lockout | 5 failed logins lock the account for 15 minutes (both are settings). | System | `POST /auth/login` (423) | real | M2, DEC-12 | yes |
| 13.4 | Google sign-in | Log in with a Google ID token. Links to an existing account by verified email. Auto-register is off by default. An offline fake verifier is used in dev and demo. | Everyone | `POST /auth/google` | real (shows an account chooser; works with the fake verifier) | M2b, DEC-04, DEC-100 to DEC-103 | yes |
| 13.5 | Password reset | "Forgot password" mails a single-use link (30 minutes). The answer is the same whether the email exists or not. All sessions are signed out on success. | Everyone | `POST /auth/password-reset/request`, `/confirm` | none | A12, DEC-116 | no |
| 13.6 | Two-step login (TOTP) | Optional. A person scans a code into an authenticator app, then logs in with email, password and a 6-digit code. | Everyone | `GET /auth/mfa`, `POST /auth/mfa/setup`, `/enable`, `/disable` | none | A12, DEC-116 | yes (API) |
| 13.7 | Reset someone's two-step | An administrator clears two-step login for a person who lost their phone. | Administrator | `POST /admin/users/{id}/mfa/reset` | none | A12, DEC-116 | no |
| 13.8 | Password policy | 8 to 72 characters, a letter and a digit, no common passwords, not built from your email. Each rule has its own message. | Everyone | register, reset | real | M14, DEC-92 | no |
| 13.9 | Rate limits at the door | Login, Google sign-in, password reset request and incident creation are limited per minute; the answer is 429 with `Retry-After`. | Everyone | `RateLimitFilter` | none | M14, DEC-90 | no |
| 13.10 | Permission-based access | Every endpoint checks a permission (17 kinds), never a role name. | Everyone | `@PreAuthorize` | real | M2, DEC-09 | no |
| 13.11 | Request ID and safe headers | Each request gets an ID in a header for tracing. Clickjacking and referrer headers are set. | System | `RequestIdFilter`, `SecurityConfig` | none | M1, DEC-06 | no |
| 13.12 | Clear errors | One error shape for everything, with a code. A database outage answers 503, not a crash. | Everyone | `GlobalExceptionHandler` | none | M1, M14, DEC-05, DEC-94 | no |

## 14. Administration and live settings

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 14.1 | Live settings | 83 settings (priority bands, assignment weights, SLA warning percentages, escalation timeouts, AI thresholds, rate limits, lockout and more). Saved values apply on the next request. Values are checked for range. | Administrator | `GET/PUT /admin/config` | real | M3, DEC-18 | yes |
| 14.2 | User management | Create, edit, deactivate users. Add or remove a role. Technician profile and skills. | Administrator | `/admin/users`, `/admin/technicians/{id}` | real | M2, DEC-34 | no |
| 14.3 | Services and dependencies | Create and edit services (criticality, always-P1 flag) and set what each depends on. Deleted services are hidden, not erased. | Administrator | `/admin/services` | real | M3, DEC-15, DEC-16 | no |
| 14.4 | Categories and skills | A category tree and the skills each category needs. | Administrator | `/admin/categories`, `/admin/skills` | real (list and create) | M3 | no |
| 14.5 | Service Desk Simulator | Replays the last N real incidents in memory under up to 3 different setting sets and compares SLA violations, time to resolve, waiting time and fairness. Nothing is saved. Then "apply" copies the winner into live settings. | Administrator | `POST /admin/simulations`, `/admin/simulations/apply` | none | S1, DEC-44, DEC-112 | yes |

## 15. Audit

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 15.1 | Audit trail | Every incident action, SLA alert, failed login, refused request, role change, settings change, attachment and password event is recorded and cannot be edited. | System | `AuditListener` | none | M8, DEC-38 | yes |
| 15.2 | Audit search | Administrators filter the trail by incident, action, person and date. | Administrator | `GET /audit` | real | M8 | yes |
| 15.3 | Sealed audit trail | Every 5 minutes the new records are hashed together with the previous seal. If anyone edits a row in the database, verify names the first record that no longer matches. Each seal hash is also written to the log, where a database editor cannot reach it. | Administrator | `GET /audit/verify`, `POST /audit/seal`, job `AuditSealJob` | none | S3, DEC-44, DEC-91 | yes |
| 15.4 | Denied-request audit with flood guard | A refused request (403) is written to the audit trail, but limited to 20 a minute so an attacker cannot fill the log. | System | `SecurityAuditEvent` | none | M8, M14, DEC-90 | no |

## 16. Demo aids (demo profile only)

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 16.1 | Adjustable clock | An administrator moves time forward ("+30 minutes") so SLA warnings, escalations and auto-verify show in seconds. Time never goes back. | Administrator | `GET /admin/demo/clock`, `POST /admin/demo/clock/advance` | none | D1, DEC-45, DEC-52 | yes |
| 16.2 | Outage drill | One click files a fixed set of related incidents from different employees on a failing service and the services that depend on it, through the real pipeline. Same result every take. | Administrator | `POST /admin/demo/outage-drill` | none | D2, DEC-45, DEC-76 | yes |
| 16.3 | Staged demo data | Seed files fill the database with historical incidents, users and one staged outage so the demo is not empty. Owned by the Testing teammate. | Everyone | `db/seed/V100` to `V102`, `db/demo/V200` | n/a | DEC-43 (A14 campus flavour not done) | no |

## 17. Observability and operations

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 17.1 | Metrics endpoint | Counters for incidents, SLA warnings and violations, escalations, triage, simulator runs, who answered AI calls. Guarded by a token; with no token configured it does not exist (404). | Operations | `GET /actuator/prometheus` | none | A8, DEC-115 | no |
| 17.2 | Prometheus and Grafana | A ready dashboard "I-ITSM service desk" with 15 panels (open incidents, SLA violations, latency, heap, AI engine split and more), started by one Docker Compose file. | Operations | `backend/observability/` | n/a | A8, DEC-115 | yes |
| 17.3 | Health | Health and info endpoints, open to monitors. | Operations | `GET /actuator/health` | none | M1 | no |
| 17.4 | API documentation | Swagger UI and the full contract; every operation lists the error codes it can return. | Everyone | `/swagger-ui.html`, `/v3/api-docs` | n/a | M1, DEC-36 | no |
| 17.5 | Database from migrations | The schema comes from 10 versioned migrations, so a new database builds itself. | Operations | `db/migration` | n/a | DEC-03 | no |
| 17.6 | Scale-out path | A written review of indexes and what would change to run more than one copy. | Report | `docs/SCALING.md` | n/a | A7, DEC-114 | no |
| 17.7 | Traceability matrix | A table from each requirement of the brief to the code and the test that covers it. | Report | `docs/TRACEABILITY.md` | n/a | A13, DEC-118 | no |
| 17.8 | Time zone and clock | All times are UTC and come from one injected clock, so tests and the demo clock work. | System | `ClockConfig`, `DemoClockConfig` | n/a | DEC-13 | no |

## 18. Added on 2026-11-15 (B1 to B4, merged after the first draft of this catalogue)

| # | Feature | What it does | Who | Where | Screen | Source | Video |
|---|---|---|---|---|---|---|---|
| 18.1 (B1) | At-risk SLA state | An incident the SLA risk scan flags shows `slaState = AT_RISK` in lists and on the detail, and the filter finds it. It takes over from OK and WARNING only; violated, paused and met stay as they are. The list, the detail and the filter read the same flags (`SlaRiskFlags`, implemented by `SlaRiskService`). | Staff | `GET /incidents?slaState=AT_RISK`, `slaState` on every incident view | none | M12 follow-up, DEC-M12-11 | yes (API) |
| 18.2 (B2) | PDF format for report exports | The export endpoint gives a PDF as well as CSV: title, date range, generated-at time and the same rows, landscape A4 with the header repeated on each page. `ExportSink` lets one code path feed both formats; `ReportPdfRenderer` is the port and `OpenPdfReportRenderer` the OpenPDF adapter. Any `format` other than csv or pdf is 400 `VALIDATION_FAILED`. | Staff | `GET /reports/export?format=pdf` | none | M10 follow-up, DEC-M12-12 | yes (API) |
| 18.3 (B3) | Gemini embeddings for similarity | Similar-incident search and the duplicate check compare AI vectors (cosine), thresholds 0.93 duplicate and 0.90 related (setting keys `dup.embedding.threshold.*`). `EmbeddingClient` port with a Gemini adapter and a disabled one; `EmbeddingListener` embeds a new incident after commit; `EmbeddingBackfillJob` (every 60 s, 20 at a time) fills the gaps; table `incident_embeddings`; 60 texts per minute cap; circuit breaker; TF-IDF (0.55 and 0.35) answers whenever a vector is missing, there is no key or the breaker is open. Matches carry `source` = `EMBEDDING` or `KEYWORD`. Key `EMBEDDING_API_KEY`, else `LLM_API_KEY` when the LLM provider is Gemini. | Employee, staff | `POST /intelligence/similar`, `GET /incidents/{id}/similar`, duplicate check on `POST /incidents` | real (form) | M12 follow-up, DEC-M12-10 (supersedes DEC-M12-3) | yes (API) |
| 18.4 (B4) | `schema-auto` profile removed | The temporary profile that made tables from the code, and its helper `SchemaAutoSupport`, are deleted. Flyway builds the database. No user effect. | Developers | n/a | n/a | D-006, PR #26 | no |

Not a feature but a number to know: B3 adds 5 settings (83 in total) and no migration (the table came from V7).

## 19. How the design patterns show up

| Pattern | Where you can see it |
|---|---|
| State | The ten incident statuses, one class each (`NewState` to `ReopenedState`). Try a wrong move and get 409 (4.1). |
| Strategy | Priority (`PriorityStrategy`), assignment (five strategies), text analysis (AI or keyword), SLA calendar (always or business hours). Switch by a live setting (6.2, 14.1). |
| Observer | Services publish events (`IncidentChanged`, `SlaWarning`, `SlaViolated`, ...). Audit, notifications, dashboard and metrics each listen on their own (8.3, 12.1, 15.1). |
| Factory | `IncidentFactory` builds every incident in a valid state; `UserFactory` makes every user an employee first; `NotificationFactory` builds messages (3.1, 13.1). |
| Repository | 24 interfaces in `domain/repository`, each implemented with Spring Data or SQL in `infrastructure/persistence`. The domain never touches the database directly. |
| Adapter | Gemini and Anthropic behind `LlmClient`; the six notification channels; JWT behind `AccessTokenIssuer`; Google token checker; push gateway; PDF renderer (9.2, 8.4, 11.6). |
| Chain of Responsibility | Escalation: technician, team lead, system admin, IT manager, each a handler (7.7). |
| Command | Each incident action (acknowledge, resolve, close, escalate and others, 10 in all) is a command object run by `IncidentCommandRunner`, which does the shared steps once (4.1). |
| Template Method | `FactorStrategy.rank` is fixed: score, sort, tie-break. The assignment strategies only supply the score (6.2). |

## 20. Where to read more

| Topic | Where |
|---|---|
| How each module works, with diagrams | `docs/SYSTEM_GUIDE.md` (section 1 status table, section 14 for OOP and patterns) |
| Brief requirement to code | `docs/TRACEABILITY.md` |
| Why a choice was made, with options and trade-offs | `docs/DECISIONS.md` (DEC numbers used above) |
| Status of every ID (M, S, D, E, A, G, C) | `docs/ROADMAP.md` |
| What changed for teammates | `docs/TEAM_UPDATES.md` |
| Known problems and fixes | `docs/ERROR_LOG.md` |
| Scale-out and indexes | `docs/SCALING.md` |
| Frontend state, screen by screen | `frontend/FRONTEND_GUIDE.md` |
| Test evidence and demo run sheet | `docs/qa/` at the repository root (demo run sheet, testing work left), smoke suites in `backend/smoke-tests/` |
| API contract | `docs/openapi/iitsm-api.json` |

## 21. Doc vs code mismatches (still true on 2026-11-16)

The first draft of this section listed ten mismatches. Five were fixed on 2026-11-16 and are no longer mismatches: six notification channels and 25 repository interfaces are now correct in `SYSTEM_GUIDE.md`; `slaState=AT_RISK` works (B1); report export gives PDF (B2); the setting count is 83 everywhere. What remains:

1. **Operation count is easy to misquote.** The contract has **129 operations**. The code has **132** endpoint methods because 3 exist only in the `demo` profile (clock read, clock advance, outage drill). `SYSTEM_GUIDE.md` (section 15.1) and `TEAM_UPDATES.md` now say so. Quote 129.
2. **Frontend screens that look real but do not use the matching endpoint:**
   - Admin Dashboard builds its numbers from `GET /incidents` (page size 100), not from `GET /dashboard/live`. The `/topic/dashboard` message invalidates a query key (`dashboard`) that the screen does not use, so it does not refresh live.
   - Admin Reports computes its numbers in the browser from the incident list, not from `GET /reports/*`, and has no export button (CSV or PDF).
   - Admin Service graph is drawn from `GET /admin/services` plus incidents, not from `GET /services/graph`, `/impact` or `/status`.
   - Notifications screen shows a hardcoded list (`INITIAL_NOTIFICATIONS`). The unread count is real; mark-read and mark-all-read call the API but ignore the result, and mark-read always sends id 1.
   - Login shows a Google account chooser with demo accounts. It works only with the fake verifier.
3. **Frontend has no screen at all** for: password reset, two-step login, chatbot, known-outage banner, attachments, feedback, saved views, problems, recurring problems, coverage risk, post-incident report, simulator, dashboard live feed, SLA violations list, notification preferences and devices, audit seal, demo clock and outage drill. `SYSTEM_GUIDE.md` describes the backend only and now points to `frontend/FRONTEND_GUIDE.md` for the screens.
4. **A2 (voice reporting)** is open in `ROADMAP.md` and is frontend-only. There is no code for it anywhere; it has not been started.
5. **A14 (campus-flavoured demo data)** is open in `ROADMAP.md`; it belongs to the Report and Testing teammates (seed data). The seed data exists (200 historical incidents and a staged demo) but uses generic services.

Could not classify: the `E5` reporter tracking view (a stub screen only, and no separate backend endpoint beyond the incident detail).
