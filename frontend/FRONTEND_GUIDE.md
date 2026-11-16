# I-ITSM Frontend Guide: what to fix, why, and in what order

Reviewed on 2026-11-15 against `main` (`8a4eadb`), with the real backend and the Flyway seed data.

> **Newer:** the item-by-item checklist against Sanay's latest commit (`1ea86cc` on `sanay-branch`, 2026-11-16) is `docs/FRONTEND_WORK_LEFT.md`. This guide keeps the reasons and the video plan.

## 0. How to read this

**The viewer is a camera, not a user.** Nobody will use this site day to day. It is graded from a 15 to 20 minute recorded video (plus the PDF report). So every decision here follows one rule:

> A screen earns marks only if it shows real data, the story on it can be told in under two minutes, and a viewer understands it at video resolution without explanation.

That rule changes priorities:

- A fake screen is worse than no screen. If the technician queue shows "Marcus Chen" while the narrator logs in as "Technician 1", the examiner sees it.
- Small text, dense tables and jargon labels do not survive video compression. Fewer, larger elements do.
- Features that are visual and change on screen (a graph lighting up, a bar filling, a priority climbing) are worth more than ten static tables.
- Phone layout, deep accessibility and edge-case forms matter little. Do them last.

**How this review was done.** Every route was opened in a real browser (Playwright, 1440 px wide) as four seeded users: administrator, team lead, technician, employee. For each screen the API calls it made were recorded. The main dialogs were opened and one incident was submitted. Things not checked are listed in section 9.

**Priority labels.** P0 = the video cannot be recorded without it. P1 = the highlight moments of the video. P2 = makes every shot look professional. P3 = standout extras. P4 = last.

---

## 1. Verdict in one page

| Area | State |
|---|---|
| Login, register, role routing, role guards | Works with real accounts |
| Admin (11 screens) | Real data, every request succeeds, but cluttered and thin on charts |
| Employee: report incident | Real: files an incident, calls AI suggestions |
| Employee: home, my incidents, incident detail | Home is fake data; the other two are empty stubs |
| Technician: queue, workbench, workload | Entirely fake data, zero API calls |
| Team lead: team queue, escalations | Entirely fake data, zero API calls |
| Notifications | Fake list; the unread badge in the shell is real; mark read and mark all read call the API but ignore the result (the first always sends id 1) |
| Theme | Fine. Keep it. The screens ignore it (section 6) |

**The three workflows the video must show cannot be recorded today**: an employee can file an incident, but then cannot see it, the technician cannot act on it, and the team lead cannot assign it.

The backend is complete: 129 operations, all built, including the Service Desk Simulator, password reset, two-step verification and simulated push (built 2026-11-15; request and answer shapes are in `backend/docs/TEAM_UPDATES.md`, last two sections). Nothing in this guide waits on backend work.

---

## 2. Screen by screen: what exists today

"API calls" lists what the screen really requested during the review.

| Route | API calls seen | State | Main problems |
|---|---|---|---|
| `/login` | `POST /auth/login` | Real | Demo account list shows `admin@iitsm.com` accounts that do not exist in the database; they log in with fake tokens |
| `/register` | `POST /auth/register` | Real | Not exercised in the review |
| `/admin/dashboard` | `/incidents`, `/services`, `/categories`, `/admin/users`, `/audit`, `/ping` (404) | Real | Counts from the first 100 incidents only; "11" shown three times; fake latency badge; tall empty feed panel |
| `/admin/tickets` | `/incidents`, `/services`, `/admin/users` | Real | 5 KPI cards; rows wrap over three lines; two chips per cell |
| `/admin/tickets/:id` | `/incidents/{id}`, `/admin/users` | Real | No timeline, no SLA bar, no recommendations; the note box sent no request when tried |
| `/admin/users` | `/admin/users`, `/incidents` | Real | "Login as User" is a fake impersonation (mock tokens); two buttons on every row |
| `/admin/services` | `/admin/services`, `/incidents` | Real | Jargon ("Tier-1", "telemetry") |
| `/admin/services/graph` | `/admin/services`, `/incidents` | Real data | Not a graph: cards in rows. `reactflow` is installed and unused |
| `/admin/sla` | `/admin/sla-policies`, `/admin/escalation-policies`, `/admin/services`, `/incidents` | Real | Title and KPI overload |
| `/admin/categories` | `/admin/categories`, `/admin/skills` | Real | Fine |
| `/admin/config` | `/admin/config` | Real | One table of 76 rows, about 5,900 px tall, no grouping or search |
| `/admin/escalation` | `/admin/escalation-policies` | Real | Read-only list |
| `/admin/audit` | `/audit` | Real | No filters; no Verify button |
| `/admin/reports` | `/incidents`, `/admin/services` | Real but thin | 4 numbers and one bar list, computed in the browser; `/reports/*` never called |
| `/employee/home` | none | **Fake** | Invented incidents ("Okta MFA Duo Token Desync"), invented tools, "99.98% uptime" |
| `/employee/report` | `/services`, `/categories`, `/intelligence/suggest-category`, `/intelligence/similar`, `POST /incidents` | Real | Arrives pre-filled with a fake story and fake attachments; success panel text is not from the response |
| `/employee/incidents` | none | **Stub** | Title only |
| `/employee/incidents/:id` | none | **Stub** | Title only |
| `/tech/queue` | none | **Fake** | "Marcus Chen, Tier-2 SRE", Kubernetes and PagerDuty tickets |
| `/tech/incidents/:id` | none | **Fake** | "System Diagnostics Cockpit", war room, fake SLA clock |
| `/tech/workload` | none | **Fake** | Slot diagram for "Marcus Chen" |
| `/lead/team-queue` | none | **Fake** | "POD-AMER-L1", fake auto-assign |
| `/lead/escalations` | none | **Fake** | "DEFCON-3 ACTIVE" |
| `/notifications` | `/notifications/unread-count` (shell badge); `POST /notifications/1/read` and `/read-all`, result ignored | **Fake** | 8 hardcoded notifications |

---

## 3. P0: without these the video cannot be recorded

Each item: what is wrong, why it must be fixed, how to fix it, and when it is done.

### P0-1. Technician queue and workbench run on fake data

- **Wrong:** `TechQueue`, `TechWorkbench` and `TechWorkload` make no API call. They show a hardcoded person and hardcoded tickets.
- **Why:** Workflow 2 of the video (acknowledge, request info, resolve) happens here. On camera, an incident filed one minute earlier must appear in this queue. Today it never will.
- **Fix:**
  - Queue: `GET /technicians/me/queue`. One row per incident: code, title, priority, status, SLA bar.
  - Workbench: `GET /incidents/{id}`, `GET /incidents/{id}/comments`, `GET /incidents/{id}/history`. Buttons come only from `allowedActions` in the response: `POST /incidents/{id}/acknowledge`, `/start`, `/request-info`, `/resolve`, `/escalate`, and `POST /incidents/{id}/comments` for notes.
  - Workload: `GET /technicians/me/workload`; availability switch: `PUT /technicians/me/availability`.
  - Helpers on the workbench: `GET /incidents/{id}/suggested-resolutions`, `GET /incidents/{id}/similar`, `POST /incidents/{id}/summary`, `GET /incidents/{id}/sla-risk`.
- **Helps:** Workflow 2 becomes recordable in one take, and the SLA pause on request-info is visible.
- **Done when:** logged in as `tech1`, the queue shows the incidents the admin Tickets screen says are assigned to Technician 1, and acknowledge then start then resolve changes the status on screen and in the admin view.

### P0-2. The employee cannot see their own incidents

- **Wrong:** `EmployeeHome` is fake; `MyIncidents` and `EmployeeIncidentDetail` are five-line stubs.
- **Why:** Workflow 1 ends with "the employee sees the ticket and its progress". Workflow 2 needs the employee to answer a request for information, confirm the fix and rate it.
- **Fix:**
  - Home and My incidents: `GET /incidents` (the backend already returns only the caller's incidents for an employee).
  - Detail: `GET /incidents/{id}`, `/comments`, `/history`. Actions from `allowedActions`: `POST /incidents/{id}/provide-info`, `/verify`, `/reopen`, `/withdraw`, `/feedback`.
  - Reporter rule: once the incident is assigned, impact, urgency and affected users are read-only for the reporter (the backend answers 403 otherwise).
- **Helps:** closes the loop of workflows 1 and 2 on camera.
- **Done when:** an incident filed from the report form appears on the home screen within one refresh, and the employee can answer a request for information and give a rating.

### P0-3. The team lead cannot assign anything

- **Wrong:** `TeamQueue` and `Escalations` are fake.
- **Why:** "Explainable assignment" is one of the project's innovations and is in workflow 1. Escalation is in workflow 2.
- **Fix:**
  - Team queue: `GET /incidents` with a status filter for unassigned work (CLASSIFIED). Assign with `POST /incidents/{id}/assign` (with or without `technicianId`). Show `GET /incidents/{id}/recommendations` before assigning (see P1-4).
  - Escalations: `GET /incidents` has no escalation filter, so request the open incidents (filters available: `status`, `priority`, `slaState`, `assigneeId`, `serviceId`, `q`, `mine`, `assignedToMe`, `page`, `size`, `sort`) and keep the rows whose `escalationLevel` is 1 to 3 (include incidents with no assignee: triage escalates too). Show `escalationPreview` from the incident detail. `GET /sla/violations` for the breach list.
- **Done when:** a team lead assigns a triage incident and the chosen technician sees it in their queue.

### P0-4. The report form is pre-filled with a fake incident

- **Wrong:** the form opens with a title, a description, two fake attached files, a "94% confidence" panel and a fake duplicate list. Pressing Submit without typing filed a real P1 on the Payment service.
- **Why:** on camera the narrator types an incident; pre-filled text looks staged, and the fake panels contradict the real answers that arrive a second later.
- **Fix:** start empty. Build the suggestion panel only from `POST /intelligence/suggest-category` (show a category only when `categoryId` is not null; `source` is `LLM` or `KEYWORD`). Build the similar list only from `POST /intelligence/similar`. Build the success panel from the `POST /incidents` response (status, priority, assignee, due times).
- **Also:** handle `409 DUPLICATE_INCIDENT`: show the returned `similar` list and a "My problem is different" button that resends with `confirmNotDuplicate: true`.
- **Done when:** nothing on the form is visible before the user types, and every value in the success panel matches the incident in the admin Tickets screen.

### P0-5. Silent mock fallback and mock logins

- **Wrong:** when a request gets no response, `src/api/*.ts` returns hardcoded data. The login demo list uses `admin@iitsm.com` style accounts that do not exist; they produce `mock-` tokens and every later screen shows invented data. "Login as User" on the Users screen does the same.
- **Why:** this is the single biggest risk for the recording. If the backend is down or the wrong account is used, the site looks fine and shows fiction. Nobody notices until the examiner does.
- **Fix:** remove the mock branches. On a network failure show one clear banner ("Cannot reach the server"). Replace the login demo list with the real seed accounts (`docs/content/seed_accounts.csv`, password in `db/README.md`). Remove "Login as User", or keep it only as a clearly labelled demo account switcher that performs a real login.
- **Done when:** with the backend stopped, every screen shows an error state and no data.

### P0-6. Notifications are fake

- **Wrong:** the Notification Center shows 8 hardcoded items.
- **Why:** workflow 1 shows the notification arriving after assignment.
- **Fix:** `GET /notifications?unread=&page=&size=`, `POST /notifications/{id}/read`, `POST /notifications/read-all`. Live push: STOMP at `/ws`, header `Authorization: Bearer <token>`, subscribe to `/user/queue/notifications`. Fall back to polling `unread-count` every 10 seconds.
- **Done when:** assigning an incident makes the bell count change on the technician's screen without a reload.

### P0-7. Numbers computed from the first 100 incidents

- **Wrong:** dashboard, tickets and reports fetch `GET /incidents?size=100` and count in the browser. The seed has 212 incidents, so totals are wrong ("5% of total volume" of 100).
- **Why:** the narrator will say a number that the report or another screen contradicts.
- **Fix:** use `GET /reports/overview` and the other `/reports/*` endpoints for totals; use the paged response's `totalItems` for list counts; the admin dashboard has `GET /dashboard/live` plus the `/topic/dashboard` socket.
- **Done when:** the dashboard total equals `/reports/overview.total`.

---

## 4. P1: the highlight moments of the video

These are the shots people remember. All data exists.

### P1-1. A real dependency graph (workflow 3)

- **Wrong:** the "graph" is eight large cards in rows; dependencies are code chips (`SVC-DB`).
- **Why:** Major Incident Mode is the best segment of the video: an outage spreads through dependent services and the root cause is named. That needs a picture with nodes and lines.
- **Fix:** draw it with `reactflow` (already installed). `GET /services/graph` gives `nodes` (`id, name, criticality, openIncidents, hasOpenP1`) and `edges` (`from` depends on `to`). Colour nodes from `GET /services/status` (OUTAGE, DEGRADED, HEALTHY). On click: `GET /services/{id}/impact` and highlight the affected nodes. Details go in a side drawer, not in the node.
- **Done when:** clicking the Database node highlights everything that would fail with it.

### P1-2. Major Incident Mode screens

- Known-outage banner on the report form: `GET /problems/known-outages?serviceId=`; a **Join** button calls `POST /problems/{id}/join`. Show the affected-people counter.
- Problem list and detail for staff: `GET /problems`, `GET /problems/{id}`; root cause `GET /problems/{id}/root-cause` drawn as a highlighted path on the graph; "Resolve whole problem" calls `POST /problems/{id}/resolve`.
- Recurring problems: `GET /problems/recurring`.
- Demo trigger (demo profile only): `POST /admin/demo/outage-drill`.

### P1-3. SLA made visible

- A progress bar on every incident row and detail, from the due times in the incident. Colour changes at the warning points.
- Escalation countdown from `escalationPreview` ("escalates to Team Lead in 04:12").
- Demo clock control (demo profile only): `GET /admin/demo/clock`, `POST /admin/demo/clock/advance`. A small "+10 min" button lets the narrator trigger a warning or a violation on camera. After a large advance, refresh the access token.

### P1-4. "Why this technician"

- `GET /incidents/{id}/recommendations` returns the top candidates with `score`, `reasons` and `factors` (skill, load, experience, priority fit, familiarity) plus `excluded` with reasons. Draw the factors as five bars per candidate. This is the project's main "explainable" claim; show it.

### P1-5. Priority explained, with what-if

- Show the priority breakdown from the incident (impact, urgency, criticality, user multiplier, score, override rule).
- `POST /priority/what-if` gives the result for changed inputs without saving. Use it for live sliders.

### P1-6. Audit trail with Verify

- `GET /audit/verify` returns `intact`, counts and `firstProblem`. One button, one green or red result. `POST /audit/seal` seals now.
- Add filters to the audit log (action, actor, incident, date).

### P1-7. Incident timeline and post-incident report

- Timeline from `GET /incidents/{id}/history` on every detail screen.
- `GET /incidents/{id}/post-incident-report` (timeline, time in each status, SLA outcome, people) and `/pdf` for download.

### P1-8. Reports that are charts

See section 7.

### P1-10. New screens the backend now supports (added 2026-11-15)

Shapes and error cases are in `backend/docs/TEAM_UPDATES.md` (the last two sections).

- **Forgot password** (public, two small screens): an e-mail form (`POST /auth/password-reset/request`, always 202, show "if that address has an account we sent a link") and the page the mailed link opens, `/reset-password?token=...`, with a new-password form (`POST /auth/password-reset/confirm`, 204 then go to login, 400 field errors on `newPassword` or `token`). Add a "Forgot password?" link on the login screen.
- **Two-step verification:** when `POST /auth/login` answers 401 `MFA_REQUIRED`, show a six-digit field and send the same login again with `totp`; `INVALID_MFA_CODE` means wrong or reused. An "Account security" screen: `GET /auth/mfa`, `POST /auth/mfa/setup` (draw `otpauthUri` as a QR code and show `secret`), `POST /auth/mfa/enable`, `POST /auth/mfa/disable`. Administrators get a "Reset two-step verification" action on a user (`POST /admin/users/{id}/mfa/reset`).
- **Service Desk Simulator** (administrators): `POST /admin/simulations` and `/apply`; one screen, one grouped bar chart, up to three configurations, the assumptions panel next to the chart. Good for the administrator segment of the video.
- **Pushed notifications:** `GET /notifications?channel=PUSH_SIM` ("Pushed to my devices"), device registration `POST /notifications/devices`. The push itself is simulated.

### P1-9. Service status board for employees

- `GET /services/status`: a grid of services, each Healthy, Degraded or Outage, with the reason. Show its `label` ("Based on reported incidents"). Put it on the employee home.

---

## 5. P2: make every shot look professional (declutter)

The site's problem is too much on every screen, not too little.

### 5.1 Rules

1. **One question per screen.** Anything that does not help answer it goes behind a click or is deleted.
2. **At most four KPI cards**, each with one number, one label and at most one trend. No pills or badges inside a card.
3. **No number twice** on a screen.
4. **Delete labels that carry no data.**
5. **Short titles, no subtitle sentence.** "Users", not "Enterprise Workforce & User Directory".
6. **One primary button per screen or row.** Other actions go in a menu or in the drawer.
7. **Table rows on one line.** One chip per cell.
8. **No boxes inside boxes.** Use spacing, not nested cards.
9. **Text at least 12 px.** On the dashboard 80 of 180 text elements are smaller; they vanish in a video.
10. **Monospace only for incident codes.** It is hardcoded 181 times today.
11. **One word for one thing.** "Incident" everywhere, not "ticket" in some places.

### 5.2 Things to delete

- Jargon labels: "ZERO-TRUST AUTHENTICATED", "REGION_AP_SOUTH_INDIA", "INTAKE_V4", "SELF_PROVISION_V2.4", "Live Telemetry", "LIVE QUEUE", "Stream active", "ITIL v4", "Matrix SLA Policy", "Tier-2 SRE", "DEFCON-3", "POD-AMER-L1".
- Invented features with nothing behind them: war rooms, PagerDuty, runbook matches, knowledge-base search, self-service password and licence tools, "99.98% uptime", "Triage Expedite Guarantee", "AI Intake Copilot v3.2", "Diagnostic Integrity 100%".
- The `/ping` call and the latency badge (the endpoint does not exist; it returns 404 on every load).

**Why:** an examiner who pauses the video and reads a label that means nothing, or sees a feature the report does not mention, starts doubting the real ones.

### 5.3 What to cut, per screen

| Screen | Remove | Keep |
|---|---|---|
| Dashboard | Latency badge, "System Health" strip, ten-row capacity list, tall feed panel | 4 KPIs, 2 charts, a "needs attention" list of 5 |
| Tickets | 5 KPI cards, "L0 Frontline Tech" chips, "TODAY" tags | Search, filters, one-line rows |
| Users | "Delegated Session Broker", per-row buttons, department and location chips | Name, roles, load, status, one menu |
| Services | Tier wording | Name, criticality, health, open incidents |
| Config | The single 76-row table | Sections (priority, assignment, SLA, AI, security, notifications) with search |
| Report form | Breadcrumb tag, "SRE Dispatch" badge, toolbar icons, guarantee box | The fields, the suggestion panel, the known-outage banner |
| Employee home | Search box, suggested links, self-service tools | Report button, my open incidents, service status |
| Technician queue | Slot bar, war room, runbook and PagerDuty lines | Counts, queue sorted by SLA, one action per row |

### 5.4 Show detail on demand (drawers)

Summary on the screen; detail only when asked for.

| Use | For | Example |
|---|---|---|
| Side drawer (slides from the right, list stays visible) | Detail of one item | Click an incident row: summary, SLA bar, timeline, actions |
| Centred dialog | A short action with input | Reassign, override priority, resolve |
| Popover | One extra fact | Hover a KPI: how it is calculated |
| Expandable row | Two or three extra fields | Audit row: full description |
| Full page | Long work on one item | Technician workbench |

Rules: never an overlay on an overlay (a drawer may open one confirm dialog); the summary must make sense alone; Escape and click-outside close it; keep the open item in the URL (`?open=204`) so refresh and Back work.

Where it removes the most clutter: KPI cards (click opens the list behind the number), chart bars (click opens those incidents), graph nodes, user rows, incident rows, "Why this technician?".

**Why for the video:** clicking a chart bar and seeing the matching incidents slide in proves the data is real and connected, in three seconds.

---

## 6. Theme: keep it, but make the screens use it

**No change of theme is needed.** Light mode, the blue primary (`#1565c0`) and Inter are right for an IT service tool and read well on video. A dark or more decorative theme would cost time and fix nothing.

What is wrong is that the screens bypass the theme: `src/theme/theme.ts` is 52 lines, while the feature files contain 132 different hardcoded hex colours and 181 hardcoded `fontFamily: 'monospace'`.

Fix:

1. **Tokens in the theme:** surface, border and text greys; the four priority colours (already there); SLA states (ok, warning, violated, paused, met); service states (healthy, degraded, outage).
2. **A type scale** of five or six sizes, minimum 12 px, set once in the theme.
3. **Red, amber and green only for meaning** (priority, SLA, service health). Never for decoration.
4. **One card radius, one shadow, one spacing step.**
5. Replace hardcoded colours and fonts in the screens with the tokens.

**Why:** consistent colour is what makes a P1 or an SLA breach stand out on camera. Today red is used everywhere, so nothing stands out.

---

## 7. Analysis pages: charts first, table second

A chart answers the question at a glance; the table underneath gives exact numbers. `recharts` is installed.

### Reports (`/admin/reports`)

| Chart | Type | Endpoint |
|---|---|---|
| Incidents created and resolved over time | Line, 7 / 30 / 90 day switch | `GET /reports/trends?bucket=day\|week` |
| SLA compliance | Grouped bars: met and violated; switch by priority, service, technician | `GET /reports/sla-compliance?groupBy=` |
| Priority mix | Donut | `GET /reports/priority-distribution` |
| Categories | Horizontal bars, top 8 | `GET /reports/category-distribution` |
| Services | Ranked bars | `GET /reports/services` |
| Technician workload | Bar per technician: load against capacity | `GET /reports/workload` |
| Coverage risk | Matrix: critical service against number of available skilled technicians; single holder in red | `GET /reports/coverage-risk` |
| Headline numbers | 4 KPI cards | `GET /reports/overview` |
| Export | Button | `GET /reports/export?type=` (CSV) |

All take optional `from` and `to`.

### Other screens

- **Dashboard:** trend chart, priority donut, one compact technician-load chart, and a "needs attention" list (violated, at risk, unassigned). Live updates from `/topic/dashboard`.
- **Incident detail:** SLA bar; horizontal timeline of status changes; one stacked bar of time spent in each status; factor bars for assignment and SLA risk.
- **Audit log:** a small histogram of events per hour above the table; the Verify banner.
- **Technician workload:** resolved per day and SLA met percentage for the logged-in technician.

### Chart rules

1. One message per chart, stated in its title ("SLA compliance by priority").
2. At most six colours; priority colours identical on every screen.
3. Values labelled on the bars; no legend where a label will do.
4. No 3D, no gradients, no pulsing animations.
5. Every chart has an empty state ("No incidents in this period").
6. Clicking a bar or slice opens the filtered incident list in a drawer.

---

## 8. P3: standout ideas

All use data the backend already serves. Effort: S small, M medium, L large.

| # | Idea | What the viewer sees | Effort |
|---|---|---|---|
| 1 | Living service map as admin home | The graph is the dashboard; nodes glow by health and pulse when an incident arrives over the socket | L |
| 2 | Incident replay | A play button scrubs through an incident's history while the SLA bar fills | M |
| 3 | SLA fuse | A thin line on every row that shortens and changes colour at 75% and 90% | S |
| 4 | Audit chain | Seals drawn as linked blocks; Verify sweeps down them; a tampered block turns red | M |
| 5 | "Me too" join | Known-outage banner with a live counter; priority badge climbs when a threshold is crossed | M |
| 6 | Wallboard mode | Full screen: the map and four numbers, no sidebar | S |
| 7 | Priority chip that explains itself | Click "P1": the formula and the P1 to P4 bands on a ruler, with what-if sliders | S |
| 8 | Technician match card | Top three candidates side by side with five factor bars; excluded ones with reasons | M |
| 9 | Escalation ladder | Four rungs, the current one lit, a countdown to the next | S |
| 10 | Assignment weights as one bar | Five weights as one stacked bar that always totals 100% | S |
| 11 | Conversation-first reporting | Chat on the left (`POST /intelligence/chat`), ticket preview filling in on the right; voice input in the browser | M |
| 12 | Parcel-style tracking | Reported, Assigned, Being worked on, Resolved, Confirmed, with the SLA due time | S |
| 13 | Technician focus mode | One large "next incident" card with its one action | S |
| 14 | Command palette (Ctrl+K) | Jump to an incident, a service or an action | M |
| 15 | Calendar heatmap | Incidents per day in a year grid | S |
| 16 | Problem cluster view | Grouped incidents as bubbles around the lead; root-cause path on the map | M |
| 17 | Director's bar (demo profile) | "+10 min" and "Start outage drill" in one strip | S |
| 18 | Notification preferences grid | 15 event types by 4 channels; a lock on alerts that cannot be switched off (`GET/PUT /notifications/preferences`) | S |

Suggested first picks: 3, 7, 9, 12 (small and visible in every workflow), then 1 and 2 for the highlight shots.

---

## 9. P4: last, and what was not checked

Last priority (little or no value in a desktop video):

- Phone layout. At 390 px the dashboard is 709 px wide and the tickets table 1,682 px.
- Accessibility basics: no page has an `h1`; one icon button has no label.
- The React warning at `Login.tsx` lines 440 and 489 (invalid element type).
- Two `POST /auth/refresh` calls on every page load: make it one.

Not checked in this review:

- Submitting the admin create and edit dialogs (service, user, SLA policy, category, config save). They were opened, not submitted.
- The register screen and Google sign-in (needs `VITE_GOOGLE_CLIENT_ID`).
- The note box on the admin incident detail was tried once and sent no request; confirm and wire it to `POST /incidents/{id}/comments`.
- Behaviour on errors (401 refresh, 403, 409 `OPTIMISTIC_LOCK_CONFLICT`, 429 `RATE_LIMITED`).

---

## 10. The video run sheet, mapped to screens

From `backend/docs/DECISIONS.md` (DEC-45). Use it as the acceptance test: each row must be recordable in one take.

| Time | Segment | Screens needed | Depends on |
|---|---|---|---|
| 2:30 | Workflow 1: report to assignment | Report form (empty, real suggestions), priority explanation and what-if, recommendations, notification arriving | P0-2, P0-3, P0-4, P0-6, P1-4, P1-5 |
| 6:00 | Workflow 2: investigate to close | Technician queue and workbench, request info (SLA pauses), clock forward, resolve, employee verify and feedback, timeline, escalation | P0-1, P0-2, P1-3, P1-7 |
| 9:30 | Workflow 3: Major Incident Mode | Outage drill, graph lighting up, root cause, join, resolve all | P1-1, P1-2 |
| 13:00 | Administrator | Live dashboard, reports, strategy switched in Config with no restart | P0-7, P1-8 |
| 15:00 | Security | Lockout, different screens per role, a refused action, audit Verify | P0-5, P1-6 |

---

## 11. Definition of done (per screen)

- [ ] Every value on screen comes from an API response.
- [ ] Buttons shown match `allowedActions`; no permission logic in the frontend.
- [ ] Loading, empty and error states exist; no mock data path.
- [ ] At most four KPI cards; no number twice; no label without data.
- [ ] Colours and fonts come from the theme.
- [ ] Text is at least 12 px.
- [ ] The screen's story can be told in under two minutes.

## 12. API rules to follow

- Base URL: `VITE_API_BASE_URL` (default `http://localhost:8080/api/v1`). Contract: `backend/docs/openapi/iitsm-api.json` (a typed client can be generated from it). Changes from the handbooks: `backend/docs/TEAM_UPDATES.md`.
- Never re-implement permissions: `IncidentDetail.allowedActions` says which buttons to show.
- Send `version` on `PUT /incidents/{id}`; on 409 `OPTIMISTIC_LOCK_CONFLICT` reload and retry.
- Store the new refresh token from every refresh response; reusing an old one logs the user out everywhere.
- 403 means the wrong person, 409 means the wrong status, 404 on a read means the user may not see it.
- 429 `RATE_LIMITED` carries `Retry-After`: show a message, do not retry in a loop.
- For an unknown error code, fall back to the HTTP status.
- Seed accounts for testing: `docs/content/seed_accounts.csv`; password and data description in `db/README.md`. Local stack: `deploy/README.md`.
