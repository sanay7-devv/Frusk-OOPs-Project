# Frontend: work left (checked against the code on 2026-11-16)

> For Sanay (frontend). Every line is a small, separate task. `[x]` = done and checked in the code, `[ ]` = still to do.
> Checked against **your latest work**: branch `sanay-branch` on the team repo, commit `1ea86cc` "new design and theme" (2026-11-15 23:31). Line numbers (`file:line`) refer to that commit, paths are under `frontend/src/`.
> **Re-checked on 2026-11-18 against `main` `50794aa` ("30% done")**: every box was compared with the code. Ticks now match the code (many mock-removal and contract fixes were done but not ticked), lines marked **Partly done** say what is left, and *Not needed any more* lines are closed. `tsc` 0 errors, `vite build` passes, `npm test` 3/3. Line numbers in the items are still the old ones. Round 3 (Sections E1-E7, F1-F5, G1, G3, G4) ticked: 449 of 636 done (70.6%). **Recounted 2026-11-19 after round 3 (#48 to #51): 481 of 636 done (75.6%), 155 open.** Earlier that day: three wrong ticks undone, two G14 items ticked. Who is working on what right now: `frontend/docs/FRONTEND_PROGRESS.md` (check it before you start an item, so nobody does the same work twice).
> Contract: `backend/docs/openapi/iitsm-api.json` (129 operations). Older review with the reasons behind each rule: `frontend/FRONTEND_GUIDE.md`.

## A. Where your work stands

- [x] Your first commit `1f351c2` ("Changes in the frontend") is on `main`: the frontend part was merged as PR #15 (admin screens on the API, new login and register) and PR #16 (login tests).
- [x] Your second commit `1ea86cc` ("new design and theme") is **not on `main` and has no pull request**. It is the newest frontend: dark theme, employee home, my incidents, employee incident detail, technician queue/workbench/workload, team queue, escalations and the admin screens rewritten on the API.
- [x] The branch starts from an old base (2026-11-10, `8d5c095`). Merging it into `main` today gives **20 conflicting files**: `backend/.../SecurityConfig.java`, `backend/.../GoogleLoginRequest.java`, `frontend/index.html`, `api/auth.ts`, `api/incidents.ts`, `api/types.ts`, 11 admin screens, `Login.tsx`, `Register.tsx`.
- [x] `npx tsc --noEmit` on your branch: 0 errors. `vite build`: passes (one 1.3 MB chunk, see C).
- [x] `npm test`: `src/auth-flow.test.tsx` fails 3 of 3 on your branch, and the updated copy from `main` also fails 3 of 3 against your new login screen (it looks for the seed account e-mails as text). The CI job "Frontend tests" will go red until the test and the screen agree (coordinate with the Testing teammate, who owns the test).

### A1. How to open the pull request (do this first)

- [x] `git fetch shared && git checkout -b frontend/new-design shared/main`
- [x] Bring over **only `frontend/`** from your branch: `git checkout shared/sanay-branch -- frontend` (this takes your version of every frontend file; check `git diff --stat` afterwards).
- [x] Do **not** bring the backend or root files of `sanay-branch`. `main` already has all of it, done differently (see B). That means leaving out: `backend/**`, `docker-compose.yml`, `run-backend.bat`, `run-backend.ps1`, `IITSM_Stitch_Prompts_v2.md`, root `TEAM_UPDATES.md` (an old copy of `backend/docs/TEAM_UPDATES.md`), the `.gitignore` lines.
- [x] Keep `main`'s `frontend/src/auth-flow.test.tsx` and fix it (or the screen) so it passes.
- [x] `npm ci && npm run build && npm test -- --run` locally, then push the branch and open a PR into `main`; wait for the review and green CI before merging. Never push to `main`.

## B. Blockers on `sanay-branch` (security and correctness)

- [ ] **A database password is committed in plain text**: `backend/src/main/resources/application-dev.properties` on `sanay-branch` holds the URL, user and password of a Neon cloud PostgreSQL database. The team repo is public. Change that password in the Neon console now (the old one stays in git history), and never commit credentials again (use `backend/.env`, which is git-ignored).
- [x] **Fake Google sign-in**: `features/shared/Login.tsx:156-175` builds an unsigned "Google token" for any e-mail typed into a made-up account chooser (`:57-76`, `:548-671`). The backend on your branch (`AuthService.googleLogin`) falls back to reading such a token without checking the signature, so anyone could sign in as any user, admin included. `main` has the real `POST /auth/google` (`GoogleSignInService`, checks signature, audience, issuer, expiry), which will reject these tokens (401 `TOKEN_INVALID`). Delete the chooser dialog and the "Use another account" e-mail box; show only the real Google Identity Services button, and hide it when `VITE_GOOGLE_CLIENT_ID` is empty.
- [x] `api/auth.ts:87-111` gives out a mock session (`mock-access-token-employee`) when Google login hits a network error. Delete.
- [x] Backend changes on your branch that must not reach `main` (already listed in A1, here is why): `DataInitializer` (a second seed with known passwords, beside the Testing teammate's Flyway seed), `PingController` (`GET /ping`, not in the contract), `application.properties` default profile `dev,schema-auto` (that profile no longer exists), `Incident.setEscalationLevel` (breaks the State pattern), `AccountNotRegisteredException` and the `AuthController` Google method (duplicates of `main`), `mvnw.cmd` hardcoded JDK path.
- [x] `features/admin/Dashboard.tsx:317` and `:655` call `GET /ping`, which only exists on your branch (404 every 5 s on `main`). Remove the latency badge, or use `GET /actuator/health`.

## C. Fixed on the backend side for you (2026-11-16, no action except using them)

- [x] The contract showed the wrong shape for `GET /technicians/me/workload` (it showed the simulator's workload). Fixed: `WorkloadView {load, maxLoad, activeIncidents, resolvedThisWeek, upcomingDeadlines[{incidentId, code, type, due, slaState}]}`. Your `api/technicians.ts:4-18` already matches it.
- [x] The `problems` of `GET /audit/verify` showed the problem-record shape. Fixed: `SealProblemView {recordId, sealId, problem, message}`.
- [x] Audit entries had only `incidentCode`, so an audit row could not link to its incident. Every entry of `GET /audit` and `GET /incidents/{id}/history` now also has `incidentId`. Use it in the audit log, the dashboard feed and the workbench timeline.
- [x] Checked, no change needed: the recommendation `score` (`GET /incidents/{id}/recommendations`) is a 0 to 100 percentage, so `TeamQueue.tsx:574` printing `{score}%` is right; the `factors` are 0..1.
- [x] Checked: the incident search `q` matches title, description and code only (not technician, reporter or service). Change the placeholder in `Tickets.tsx` (~`:394`) accordingly, or filter by `assigneeId`/`reporterId`/`serviceId`.

## D. Order of work

1. A1 and B (pull request, security), then the "Confirmed broken" list in D2. 2. Remove every mock and fake (section E, first bullets; G and the "invented" items). 3. The P0 bugs listed in each role's "Bugs found". 4. Missing features in the order of the video run sheet (`FRONTEND_GUIDE.md` section 10): employee, technician, team lead, admin. 5. Declutter, theme tokens, 12 px minimum.

## D2. Tested in the browser (2026-11-16)

Run: your branch `1ea86cc` with `npm run dev`, against `main` (`3988cb8`) in the `demo` profile on a fresh database with the Flyway seed; accounts `employee1`, `priya.nair` (team lead), `asha.rao` (admin), password `Demo@1234`; desktop 1440x900. Every route of the app was opened and its API calls and console errors recorded; the main flows were clicked through.

**Works end to end (keep it working):**
- [x] Login with the seed accounts lands on the right home for each role; a full page reload keeps the session (refresh token works).
- [x] Employee reports an incident (`POST /incidents` 201): auto-categorised (VPN), priority P3 with the "why this priority" text, assigned to Priya Nair; success dialog and "View Incident Detail" work.
- [x] Technician workbench: Acknowledge, Start, Request Info (SLA paused), Resolve all succeed, and the buttons change with `allowedActions`.
- [x] Employee sees the technician's question, answers with Provide Information (clock resumes), then Verify Fix and Rate Resolution (`feedback` 201).
- [x] "Generate AI Handover" returns a real summary from the backend.
- [x] All 26 routes load without a JavaScript crash; the only failing request on any screen is `GET /ping` (404, twice per dashboard refresh).

**Confirmed broken in the browser (fix these first):**
- [x] Workbench "Timeline & Notes": every audit row reads "Status updated to assigned" (F2). The backend sends good text in `description` (for example "Grouped under problem record #2: similar to INC-2026-00204", "Information requested by Priya Nair; resolution clock paused"); show it.
- [x] The incident above was grouped under a problem record by the backend; no screen shows that (`problemId`, Major Incident, F/G sections).
- [x] Notifications shows 8 hardcoded items and makes no API call at all (E7).
- [x] Admin incident detail: typing a note and pressing Send makes no request but shows "Comment posted to incident audit stream" (G4). Reassign and Override are offered on a VERIFIED incident (G4, use `allowedActions`).
- [x] Admin Config: change a value, press Reset: the edited value stays (G11).
- [x] Creating a technician the way Users.tsx does answers **400 VALIDATION_FAILED** (`experienceLevel` missing, `maxActiveIncidents` unknown) (G5).
- [x] Reassign as TechQueue sends it: without a technician or with a reason under 10 characters, **400** (F1). Reassign through `/assign` as Escalations does: **409** (F5).
- [x] Filter `escalationLevel=3` is ignored: it returned all 213 incidents, `minEscalationLevel=3` returned 0 (E9, F5, G3).
- [x] Category create with `description`/`defaultPriority`: 201, but both fields are dropped (G10).
- [x] "Force Close" on an IN_PROGRESS incident: **409** "Action CLOSE is not allowed in status IN_PROGRESS" (G4).
- [x] Tech Workload: React warning "two children with the same key" (F3, `key={d.code}`).
- [x] Login page: React "type is invalid" warning at `Login.tsx:597` and `:646` (the fake Google dialog, B).
- [x] Report form labels the urgency buttons "Low (<7d) ... Immediate (<15m)": invented SLA times; the real ones come from the SLA policies.
- [x] Verify Fix closes the loop with one click and no confirmation; add a confirm step (it cannot be undone by the employee except through Reopen).

**Could not be shown with the seed (test again after the fixes):**
- [ ] Team queue was empty ("0 UNASSIGNED"): the seed auto-assigns everything, so triage, assign and recommendations were not clickable. Create an incident with no confident category (or switch off auto-categorisation in Config) to test it.
- [ ] Escalations was empty: use the demo clock (`POST /admin/demo/clock/advance`) on a P1/P2 to get escalated incidents, then test the dossier and the reassign fix.
- [ ] Phone and tablet widths, the dark theme at video resolution, and the WebSocket live updates were not checked.

## E. Employee screens and everything shared (login, register, notifications, shell, routes, api layer, auth, realtime, components, theme)

### E0. What changed since the guide (main 8a4eadb -> 1ea86cc)
- [x] EmployeeHome, MyIncidents, EmployeeIncidentDetail are now real screens calling the API (no longer fake/stub): `EmployeeHome.tsx:73`, `MyIncidents.tsx:55`, `EmployeeIncidentDetail.tsx:103-116`.
- [x] Report form no longer pre-filled: defaults empty `ReportIncident.tsx:138-146`; success dialog built from the POST response `:1356-1453`; 409 duplicate dialog with `confirmNotDuplicate:true` resend `:1333-1352`.
- [x] Login seed accounts are now the real seed (`asha.rao@iitsm.demo`, ... password `Demo@1234`) `Login.tsx:49-54` (matches `docs/content/seed_accounts.csv`, `db/README.md`).
- [x] Theme replaced: dark "Luminary Kinetic" (`theme/theme.ts:1-60`), NOT the light blue theme the guide section 6 said to keep. Decide with the team whether this is accepted; the guide's token/12px rules are now violated worse (see section 12).
- [x] Notifications is wired to real API (section 7). Silent mock fallbacks removed from the api layer (section 9).

### E1. `features/employee/EmployeeHome.tsx` (route `/employee/home`)
Wiring
- [x] Incident list: `GET /incidents?mine=true&size=50` via `listIncidents` `:73-76`.
- [x] "Respond" -> `POST /incidents/{id}/provide-info {message}` `:81-92`, body matches `ProvideInfoRequest`.
- [x] "Verify Fix" -> `POST /incidents/{id}/verify` `:94-103`.
- [x] Error toasts use `err.response.data.message` `:89,100`.
- [x] Buttons ignore `allowedActions`: Respond/Verify chosen by `inc.status` `:828,846`. List rows (`IncidentSummary`) have no `allowedActions`; fetch `GET /incidents/{id}` or only show a "Details" link and do actions on the detail screen. Guide section 12 rule.
- [x] Verify has no rating step; after VERIFY the `GIVE_FEEDBACK` action is not offered here. Either link to detail or open the rating dialog.
- [x] Hardcoded fake KB: `SUGGESTED_TOPICS` `:49-54` + "Suggested Runbooks" chips `:383-405` + KB dialog `:972-1008` (invented FIDO2/GitHub articles). Delete (guide 5.2: invented features).
- [x] Fake labels with no data: "Live Telemetry" `:160`, "Connected to ITIL Service Engine" `:626`, "Unified Service Directory" `:352`, "How can Global Engineering Support..." `:355`, "Service Desk" pill `:188`, "Under engineering review" `:513`, "Completed remediations" `:588`. Remove or replace by real data.
- [x] Missing: service status board for employees (guide P1-9): `GET /services/status` (use `label`, `status` OUTAGE/DEGRADED/HEALTHY, `reason`).
- [x] Missing: known-outage banner (`GET /problems/known-outages?serviceId=` + `POST /problems/{id}/join`); at least show `major`/`problemId` on rows.
- [x] Missing: notification/unread entry, "my open incidents" SLA bar (SlaCountdown exists but only a text countdown).
States
- [x] Loading `:726`, empty `:733`.
- [x] No error state: `useQuery` `isError` never read; a failed/503 request shows "No Incidents Found" `:733-741`. Use `ErrorState` (`components/StateViews.tsx:60`) with retry.
- [x] KPI counts and tab counts computed only from the first 50 rows (`:73-75`, `:106-112`); use `totalItems` and server filters (`status=` array, `GET /incidents`), add paging (`page`,`size<=100`).
- [x] Search box and priority filter are client-side only on those 50 rows `:117-139`; use `q` and `priority` params.
- [x] Status grouping inconsistent with MyIncidents: here VERIFIED counts as resolved `:106-112`; also REOPENED/WITHDRAWN (CLOSED with `closureReason`) not distinguished.
- [x] After provide-info the dialog text says "SLA clock has resumed" `:85`: only true if backend does it; take it from response `slaState`.
Bugs / cleanup
- [x] `(pageData as any)?.items || ...content` `:78`: type it as `Page<IncidentSummary>`.
- [x] Unused imports: `TrendingUpIcon`, `TimerIcon`, `OpenInNewIcon` (`:27,31,37`).
- [x] Row has two click handlers (row `:777` and "Details" `:869`); fine but redundant.
- [x] Reply dialog does not show the technician's question (the `INFO_REQUESTED` comment/history); fetch `/incidents/{id}/comments` and show the last one.
- [x] Not wired to realtime: query key `['employee-incidents-home']` is never invalidated by `useRealtime` (it invalidates `['incidents']`, `useRealtime.ts:34`).

### E2. `features/employee/MyIncidents.tsx` (`/employee/incidents`)
- [x] Real list `GET /incidents?mine=true&size=50` `:55-58`; search + 3 tabs; row click -> detail `:320`; "Report Incident" button `:150`.
- [x] Bug: VERIFIED counted as ACTIVE (`:71,79` only exclude RESOLVED/CLOSED) while EmployeeHome treats it as resolved. Share one helper.
- [x] No error state, no paging (`size:50`, no `page`), counts from page not `totalItems`.
- [x] Filters client-side only; use `status`, `priority`, `q`, `sort`, `createdFrom/To` params; add priority and service filters, sort by SLA.
- [x] Saved views missing: `GET/POST/DELETE /saved-filters` (guide Tier 3).
- [x] Table text: "Service Mesh", "Telemetry" button `:299,385`, "Real-time telemetry..." `:123`: jargon (guide 5.2). The "Telemetry" button has no onClick (works only via row click).
- [x] No SLA progress bar, no assignee column, no `major`/outage chip, no "action needed" cue for `PENDING_USER_INFO`.
- [x] Not wired to realtime: key `['my-incidents']` never invalidated.
- [x] `(data as any)` `:60`.

### E3. `features/employee/EmployeeIncidentDetail.tsx` (`/employee/incidents/:id`)
Wiring (all real)
- [x] `GET /incidents/{id}` `:103`, `GET /incidents/{id}/comments` `:108`, `GET /incidents/{id}/history` `:113`.
- [x] `POST comments {body, visibility:'PUBLIC'}` `:119`; `provide-info {message}` `:131`; `verify` `:146`; `feedback {rating, comment}` `:158` (201 FeedbackView); `reopen {reason}` `:170`; `withdraw {reason}` `:184`.
- [x] Rating dialog `:839-905` (Rating 1..5 + comment), shows saved feedback `:478-492`.
`allowedActions` misuse (guide rule: never re-implement permissions)
- [x] `:224` `canProvideInfo = allowed.includes('PROVIDE_INFO')`, `canVerify = allowed.includes('VERIFY')`, `canGiveFeedback = allowed.includes('GIVE_FEEDBACK')` strictly gated on `allowedActions` without status fallback.
- [x] Bug `:228`: `canWithdraw = allowed.includes('CLOSE') || status in NEW/CLASSIFIED/ASSIGNED`. Contract/backend action is `WITHDRAW` (valid in CLASSIFIED/ASSIGNED/ACKNOWLEDGED only; `IncidentAction.java`). Use `allowed.includes('WITHDRAW')` only. Today a reporter sees Withdraw at NEW (409) and not at ACKNOWLEDGED, and `CLOSE` (staff) would show it wrongly.
- [x] `api/types.ts:6` `IncidentAction` lacks `'WITHDRAW'` (and `components/ActionButtons.tsx:4-17` labels lack WITHDRAW, PROVIDE_INFO, GIVE_FEEDBACK, COMMENT, EDIT; `ActionButtons` is not used by any file).
- [x] Comment box always visible `:588`; show only if `allowed.includes('COMMENT')` (closed incidents).
- [x] EDIT: `PUT /incidents/{id}` with `version` via `updateIncident` and Edit Details dialog implemented.
Validation vs contract
- [x] Reopen and withdraw reasons only checked non-empty `:949,1008`; contract `ReasonRequest` is 10..1000 chars (400 otherwise). Use `reasonRule` from `utils/validation.ts:3` (currently unused). Same for provide-info (1..2000) and comment (<=4000).
- [x] Feedback rating defaults to 5 `:93`; contract allows null->required 1..5; fine, but preselecting 5 biases ratings. Consider none.
- [x] 409 `INVALID_STATE_TRANSITION` / `OPTIMISTIC_LOCK_CONFLICT` use `errorMessage()` (`utils/errors.ts`) and refetch.
Bugs
- [x] `:82` `const numId = Number(id) || 101;` falls back to a hardcoded incident 101 for a bad id. Remove; show not-found.
- [x] `:206` any error (403/404/network) renders "Incident Record Not Found". Handle `isError` separately (404 = may not see it; network = retry).
- [x] `:224-228` also uses `allowed` default `[]`. *(Not needed any more, 2026-11-18.)*
- [x] Comment post does not invalidate history (COMMENT_ADDED appears in history) `:121-123`; comment time shows only `HH:mm` without date `:576`.
- [x] Verify success does not open rating; add "now rate" prompt (GIVE_FEEDBACK appears after VERIFY? contract: "from RESOLVED on").
- [x] After withdraw/reopen the Reopen dialog text/toast claims "routed back to engineering queue" `:175`: fake claim.
- [x] Unused imports `DnsIcon`, `WarningIcon` `:29,39`. `comments: any[]` `:108,548`: type with `CommentView`.
Hardcoded fiction to remove
- [x] "Level 2 Site Reliability Engineer" `:762`, "Auto-dispatching to on-call squad" `:762`, "24/7 ITIL Incident Command War Room" `:772`, "ITIL automation engine" `:722`, "Assigned Engineering Squad" `:738`, "Estimated Affected Users ... `|| 1`" `:448`.
Missing features (contract/guide)
- [x] Request-info question not highlighted; show last `INFO_REQUESTED` message above the Provide button.
- [x] Attachments: `GET /incidents/{id}/attachments`, upload `POST` multipart `file`, download `GET /attachments/{id}/download` with Authorization (fetch+blob).
- [x] Closure info: show `closureReason` (VERIFIED, AUTO_VERIFIED, DUPLICATE, WITHDRAWN), `problemId`, `duplicateOfId`, `reopenCount`.
- [x] Known-outage / problem: show linked problem; for DUPLICATE-closed joiner incidents link to lead.
- [x] SLA: only a text countdown `:714`; add progress bar from `responseDue/resolutionDue`, PAUSED state with `pausedAt`, `slaState` AT_RISK label.
- [x] Priority explanation from `priorityBreakdown` (impact, urgency, criticality, usersMultiplier, score, overrideRule); show impact/urgency values.
- [x] Similar incidents `GET /incidents/{id}/similar`; post-incident report `GET .../post-incident-report` and `/pdf` (button when CLOSED/VERIFIED); parcel-style progress tracker (guide P3-12); timeline view of history (currently a plain list `:628-679`).
- [x] History shows raw enum `h.action` `:654`; map to words. Escalation preview is staff only: not needed here.
- [x] Realtime: keys `['employee-incident*']` not invalidated by `useRealtime` (it only invalidates `['incidents']`, `useRealtime.ts:34`).

### E4. `features/employee/ReportIncident.tsx` (`/employee/report`)
Wiring
- [x] `GET /services`, `GET /categories` via `getServices/getCategories` `:125-126`.
- [x] Live suggestion: `POST /intelligence/suggest-category` + `/similar` debounced 600 ms `:182-215`; category shown only when `categoryId != null` `:1019,1028`; `source` shown `:1042`.
- [x] `POST /incidents` with `confirmNotDuplicate` `:246-259`; 409 `DUPLICATE_INCIDENT` handled `:263-268`.
Contract mismatches
- [x] `/categories` returns a tree (`CategoryNode {id,name,children[]}`), but code treats a flat list `api/services.ts:11-17,49-59`, `:453`. Subcategories never appear. Flatten children (indent) in the select.
- [x] Title max: schema `max(250)` `:75` and counter "/ 200" `:390`; contract `maxLength 200`. Fix to 200.
- [x] Category label has `*` "Problem Category *" `:440` but it is optional (`CreateIncidentRequest.categoryId` not required; backend applies a confident suggestion). Remove asterisk; add a clear/"Let the system decide" option `:453`.
- [x] Categories not filtered by service/parent; no required-skill logic needed, but show only active ones.
- [x] 409 body `similar[]` items have `id` (ErrorResponse.similar `{id, code, title, similarity, status}`), UI keys/reads `incidentId` `:1130,1318` -> `key={undefined}` and missing link. Map `id -> incidentId` at `:265`.
- [x] `similar` items carry `match` (DUPLICATE|RELATED) and `source` (EMBEDDING|KEYWORD): not used; use `match` for wording ("Likely duplicate" vs "Related").
- [x] "View & Join Existing Ticket" and dialog "Join Existing Ticket" only `navigate('/employee/incidents')` `:1334-1337`: joins nothing. Real join = `POST /problems/{problemId}/join` for a known outage (201 returns own incident). For a plain duplicate just link to `/employee/incidents/{id}`.
- [x] Priority preview is invented client math `imp*urg` `:157-165`, plus impact titles "(P-4)/(P-1)/(SEV-1)" `:97-101`. Real rule uses criticality, users multiplier, alwaysP1 override. Use `POST /priority/what-if {serviceId, categoryId, impact, urgency, affectedUsers}` (returns current/whatIf) or drop the chip.
- [x] Fake SLA panel: "< 15 mins", "99.4% on-target", "< 2 hours", "Runbook standard", "TIER-2 SLA", "Engineering standby on-call: Tier-2 SRE queue" `:1198-1250`. Replace by values after submit (`responseDue`, `resolutionDue`) or remove.
- [x] Fake "Diagnostic Integrity %" gauge `:275-281,1255-1287`; "AI Intake Copilot v3.2 ACTIVE" `:982-994`; "SRE Dispatch: Active (Latency 1.4s)" `:347`; "INTAKE_V4" `:300`; "AI Auto-Enrichment Active" `:747`; "Triage Expedite Guarantee ... 62% ... 180 seconds" `:937-941`; "Automated ITIL incident dispatch to Tier-2 SRE queue" `:875`; "reported in the last 30 mins" `:1125`; "Assigned: SRE Core Squad" `:1152`; success text "dispatched to on-call engineers" `:1380`. All invented (guide 5.2).
- [x] Attachments are fake: files only stored in state, never uploaded `:229-240`. Upload each after create: `POST /incidents/{id}/attachments` multipart `file` (png, jpg, jpeg, gif, pdf, txt, log; max 5 MB; max 10; 400 `fieldErrors[file]`). The `accept` list `:810` allows `.har,.pcapng` which backend refuses; type detection `:236` wrong (jpeg/gif/pdf as 'log'); size not validated; "Drag" text but no drop handler.
- [x] Markdown toolbar inserts the word "sample" `:224-227`; description is plain text and nothing renders markdown. Remove toolbar and "Markdown & Stack Traces supported" `:687`.
- [x] `suggestIntake` imported but never used `:65` (`POST /intelligence/suggest-intake` could prefill impact/urgency/category on description blur).
- [x] Chatbot intake missing (`POST /intelligence/chat {draft, expecting, answer}`; file when `readyToFile`); voice input (guide P3-11).
- [x] Known-outage banner missing: call `GET /problems/known-outages?serviceId=` when service chosen; show "Known outage, being worked on", `affectedUsers`, `alreadyJoined`, Join button.
- [x] No post-create attachment/duplicate-of handling for 409 + `similar` source; 429 `RATE_LIMITED` (suggest calls 20/min, create 20/min) shows generic message `:270`; use `errorMessage` (handles RATE_LIMITED) and read `Retry-After`.
- [x] 400 `fieldErrors` not mapped onto fields (`utils/errors.ts:fieldErrors` unused): use `setError`.
- [x] 422 `SLA_NOT_CONFIGURED`, 404 service missing: only generic toast.
- [x] After success the form is not reset `:259-261`; a second Submit creates another incident. Call `reset()`.
- [x] "Cancel & Discard" only `reset()` `:882`; no navigation, no confirm.
- [x] Silent mock fallbacks feed this screen (see section 9): `suggestCategory/findSimilar` return fake data on ANY error, `getServices/getCategories` return fake ids 1-6.
- [x] Debounce effect has no cancellation/stale guard `:182-215`: slow earlier response can overwrite newer.
- [x] `affectedUsers` input: `Math.max(1, parseInt)` OK, but max 1,000,000 not enforced `:80`.
- [x] Unused: `suggestIntake`; imports fine otherwise.
- [ ] Breadcrumb "PORTAL" `:293` etc.: jargon; spacing text under 12 px (32 occurrences of fontSize <12). **Partly done (2026-11-19):** the word "PORTAL" is gone from `features/employee/ReportIncident.tsx`, but 21 font sizes under 12 px are still there (the 32 count was out of date).

### E5. `features/shared/Login.tsx` (`/login`)
- [x] `POST /auth/login` via `login()` `:177-186`; workspace redirect `HOME[ws]`; auto-redirect if already signed in `:101-105`; offline message `api/auth.ts:62-77`.
- [x] Google Identity Services script in `index.html` and `renderButton`/`prompt` `:108-154`.
- [x] Fake Google chooser `:57-76,147-175,548-671`: lists "Sanay Sagar Shah / not_open" accounts and forges an unsigned JWT `...signature` `:170-174` sent to `POST /auth/google`; backend rejects (TOKEN_INVALID). Remove the whole fake dialog and the "Use another account" email box; show the real GIS button only, hide the button when `VITE_GOOGLE_CLIENT_ID` is empty. Note on `:667` is false ("prompted to register").
- [x] `googleLogin` returns a MOCK session on network error `api/auth.ts:87-111` (`mock-access-token-employee`). Delete.
- [x] Fallback button is inside `#google-btn-container` `:400`, GIS `renderButton` renders into it too (two buttons possible).
- [x] No two-step login: handle 401 `MFA_REQUIRED` -> show 6-digit field and resend with `totp`; 401 `INVALID_MFA_CODE`.
- [x] No "Forgot password?" link and no screens: `/forgot-password` (`POST /auth/password-reset/request {email}`, always 202) and `/reset-password?token=` (`POST /auth/password-reset/confirm {token,newPassword}`; 204 -> login; 400 fieldErrors `newPassword`/`token`). No route in `AppRoutes.tsx`.
- [x] Error handling: `errors.ts:3-14` lacks `MFA_REQUIRED`, `INVALID_MFA_CODE`, `TOKEN_INVALID`, `SERVICE_UNAVAILABLE` (503); `ACCOUNT_LOCKED` is HTTP 423 (message hardcodes "15 minutes"); `RATE_LIMITED` ignores `Retry-After` (login limit 10/min per email). Show seconds.
- [ ] Seed account panel "PostgreSQL Seed Accounts" `:434-524` shows passwords on the login page: label as demo only, hide in production build (`import.meta.env.DEV`). It does list valid accounts now. Add Rahul/Neha? optional.
- [ ] Placeholder `admin@iitsm.com` `:327`; unused import `Chip` `:11`. **Partly done (2026-11-18):** Chip import removed; placeholder admin@iitsm.com remains.
- [x] React warning "type is invalid ... got: object" at `Login.tsx:597` and `:646` (seen in the browser on every render of the login page, 2026-11-16). Both are inside the fake Google chooser dialog, so deleting that dialog (section B) removes it.
- [x] `api/auth.ts:15-56` `PREDEFINED_ACCOUNTS` unused dead code (duplicate of `SEED_CREDENTIALS`).

### E6. `features/shared/Register.tsx` (`/register`)
- [x] `POST /auth/register {name,email,password,department}` `:52-57` -> `signIn`, goes to employee home `:58-60`.
- [x] Password rule only `min(8)` `:26`; contract: 8..72, at least one letter and one digit, plus backend blocklist (common passwords, contains e-mail part or name word). Add letter+digit rule (`passwordRule` in `utils/validation.ts`, unused) and map 400 `fieldErrors[password]` under the field (`errorMessage()` only returns the top message).
- [x] Name max 100, email max 150, department max 80 not enforced; `department` required in form `:25` but optional in contract.
- [x] `err` shows generic message for 400 field errors; handle 429.
- [x] No redirect when already signed in; no password show/hide.
- [x] Missing: nothing links to forgot-password.

### E7. `features/shared/Notifications.tsx` (`/notifications`)
- [x] All 8 items hardcoded `INITIAL_NOTIFICATIONS` `:66-173` replaced by `GET /notifications?unread=&page=&size=` (`PageResponseNotificationView`, item `{id,eventType,title,message,incidentId,channel,read,createdAt}`).
- [x] Bug fixed: `handleMarkRead` calls real `id`, `POST /notifications/{id}/read` (204), refetch.
- [x] `markAllRead` calls `POST /notifications/read-all` with proper query invalidation and toasts.
- [x] Categories derived from `eventType` (INFO_REQUESTED/INCIDENT_RESOLVED vs SLA_WARNING/SLA_VIOLATED).
- [x] Reply dialog wired to `POST /incidents/{incidentId}/provide-info`, Verify dialog wired to `verifyIncident` + `submitFeedback`.
- [x] "View Incident Live Runbook" dialog deleted; click-through navigates to incident detail by workspace.
- [x] Preferences dialog wired to `GET /notifications/preferences` and `PUT /notifications/preferences`.
- [x] Grouping by real date (`isToday`), relative `formatTimeAgo`, real paging, and proper empty/loading states.
- [x] Breadcrumb link dynamically links to user's home workspace.

### E8. `layouts/AppShell.tsx`, `layouts/navConfig.ts`, `routes/AppRoutes.tsx`
AppShell
- [x] Workspace switcher from `workspacesFor(user)` `:324-348`; unread badge from `GET /notifications/unread-count` `:91,370`; logout `:437`; user pill.
- [x] Fake telemetry to delete: "Mesh: 99.98% Healthy" `:249-251`, "SEV-1 ENGINE ARMED" `:266-269`, "INCIDENT COMMAND" `:215`, footer "COMMAND NODE 01 / LATENCY: 4ms" `:617-652`, "IITSM OS v4.19", "SECURE SHIELD" `:654-662`. If a health cue is wanted use `GET /services/status` summary.
- [x] Search bar `:273-319`: wired to incident search (`GET /incidents?q=`) with Enter submission and ⌘K / Ctrl+K keyboard shortcut focus.
- [x] Mock impersonation: `isImpersonating` from `localStorage.admin_impersonator` `:96`; `handleExitImpersonation` signs in with `mock-access-token-admin`, `admin@iitsm.local` `:98-116`; banner text "Delegated Session ... AUDITED" `:460-523`. No backend supports impersonation. Remove with the Users screen "Login as User" (other slice).
- [x] Active nav highlight matches subroutes: detail pages (`/employee/incidents/12`) highlight the parent section.
- [x] Icon map keys mismatch labels: nav label `'Tickets'` (navConfig `:18`) has no icon entry (map has `'Incidents'`) -> falls back to dashboard icon `:563`; `'Incident Workbench'` entry unused.
- [x] Role chip shows current workspace label (`WORKSPACE_META[activeWorkspace]`) instead of raw `user.roles[0]`.
- [x] Notification badge never live: only polls when WebSocket down (see section 10); `unreadCount()` swallows errors to 0 `api/notifications.ts:39`.
- [x] Global connection/503 banner (`ConnectionBanner.tsx`); responsive mobile drawer (`variant="temporary"` on `< sm`, `variant="permanent"` on desktop).
- [x] Account menu: Account security (MFA setup `GET /auth/mfa`, `POST /auth/mfa/setup|enable|disable`), notification preferences, sign out, and sign out everywhere.
navConfig
- [x] `tech` nav "Workbench" -> `/tech/incidents/INC-2026-00095` hardcoded code string `:9` (route param is numeric id; 404). Remove, or link from queue only.
- [x] Employee nav includes Service status (`/employee/status`); Account security reachable from account menu.
AppRoutes
- [x] Guards via `RequireWorkspace` `:45-65`, role routes for 4 workspaces, admin redirects.
- [x] Added routes: `/forgot-password`, `/reset-password`, `/account/security`, `/employee/status`, and dedicated branded 404 page (`NotFound.tsx`).
- [x] `RootRedirect` ignores `loading` `:31-36`: on reload at `/` a signed-in user flashes to `/login` first. Show spinner while `loading`.
- [x] `RequireWorkspace` "No access" card with button back to user's dashboard.
- [x] `pages/Home.jsx` ("Welcome Admin, login worked!") dead code deleted.

### E9. `api/*` (client, auth, incidents, intelligence, services, notifications, types)
client.ts
- [x] Bearer header; refresh on 401 `TOKEN_EXPIRED` with single-flight `refreshing` `:24-47`; rotated refresh token stored `:29-30`; `onAuthFailure` on refresh failure.
- [x] Handle 401 generally (single-flight refresh attempt, then sign out via `onAuthFailure`).
- [x] Handled 429 `RATE_LIMITED` (`Retry-After`), 503 `SERVICE_UNAVAILABLE`, and `ERR_NETWORK` globally with event dispatch and `ConnectionBanner`.
- [x] Refresh uses single-flight `requestRefresh()` with timeout; used by `AuthContext` on page load session restore; StrictMode double run guarded.
- [x] Clean formatting and imports in `client.ts`.
auth.ts
- [x] Removed hardcoded localhost:8080 from offline error message; dynamic message used.
- [x] Added `listDevices`, `registerDevice`, `deleteDevice` in notifications API.
incidents.ts
- [x] ~440 lines of mock incidents `SEED_INCIDENTS` `:35-473` + mock branches keyed on `tokenStore.getAccess()?.startsWith('mock-')` `:554,565,585` + `mockCreateIncident`, `reassignMockIncident` `:600-670` (used by admin Dashboard/Tickets). With real login the branches are inert, but any mock session (Google fallback above, impersonation) shows fiction. Delete all of it.
- [x] Filter name `minEscalationLevel` (0..3) and `reporterId` added; `slaState` typed as `SlaState` union including `AT_RISK`.
- [x] Generic `incidentAction` removed; typed functions used everywhere.
- [x] Comments typed; `updateIncident` (PUT, version), attachments (list/upload/download), `getSimilar`, `getPostIncidentReport`/pdf, `getKnownOutages`, `joinProblem`, `priorityWhatIf`, `servicesStatus`, `savedFilters` all implemented and typed.
- [x] Unused type imports `IncidentStatus`, `SlaState` `:3`.
intelligence.ts
- [x] Silent mock fallback on ANY failure `:28-62` (`mockSuggestCategory`, `mockSuggestIntake`, `mockFindSimilar` return fabricated categories ids 1-6 and fake incidents INC-2026-00108/104). Remove; surface error state; on 429 show retry-after.
- [x] Types lack `source`, `match`, impact/urgency on intake `:3-26`; `similar` response shape differs from 409 `similar` (`id` vs `incidentId`).
services.ts
- [x] `PREDEFINED_SERVICES/CATEGORIES` fake ids `:19-35`; `getServices/getCategories` silently return them on error or empty list `:37-59` -> the form submits fake `serviceId` that does not exist. Remove, show error.
- [x] `ServiceItem` with optional description/alwaysP1, categories flattened tree with hierarchy indicators.
notifications.ts
- [x] Real notifications, preferences, and push device management (`listDevices`, `registerDevice`, `deleteDevice`). **Done (2026-11-19):** preferences in `features/shared/Notifications.tsx`; push devices in `features/shared/PushDevicesDialog.tsx` (list, register, remove), which the device lines were waiting for (#51).
types.ts
- [x] `closureReason` enum (`VERIFIED | AUTO_VERIFIED | DUPLICATE | WITHDRAWN`), `availability` enum (`AVAILABLE | BUSY | AWAY | OFF_DUTY`), `escalationLevel` integer (0..3), `ApiError.similar` typed with `source/match`, `AppNotification.eventType` and `channel` typed unions.
- [ ] No typed client generated from `iitsm-api.json` (guide 12 suggests it).

### E10. `auth/*`, `realtime/useRealtime.ts`
AuthContext
- [x] Workspaces from roles (+ `escalationLevel===1` = lead) `:11-21`; stores access token in memory, refresh in localStorage `client.ts:7-14`.
- [x] Mock session restore `:90-116` (reads `currentUser` from localStorage, `mock-access-token`). Delete.
- [x] Network error during session restore dispatches network-error event and clears unauthenticated session state.
- [x] `localStorage.currentUser` is pruned or not relied upon for security checks.
- [x] Clean imports and comments in `AuthContext.tsx`.
- [x] `signOut` and `clear` call `queryClient.clear()` to prevent data leaks between sessions.
- [x] Workspace switch uses `localStorage.workspace` `:79`; fine. *(Not needed any more, 2026-11-18.)*
RequireRole
- [x] Spinner while loading `:11`.
useRealtime
- [x] STOMP `/ws` with `Authorization: Bearer` header `:25-27`; subscribes `/user/queue/notifications` `:31`, `/topic/dashboard` for admin `:36`; poll `unread` 10 s when disconnected `:44-50`.
- [x] Invalidates shared key prefix `['incidents', ...]` across employee, tech, lead, and admin screens.
- [x] Effect handles 4001 `TOKEN_EXPIRED` by calling `requestRefresh()` and reconnecting with new token; exponential backoff implemented.
- [x] Notification toast shows incident deep reference (`${n.title} (Incident #${n.incidentId})`).
- [x] Payload `JSON.parse` guarded.
- [x] Dashboard topic carries two shapes (`type` events vs `COUNTERS`); only invalidation (fine for now). *(Not needed any more, 2026-11-18.)*

### E11. `components/*`
- [x] `StatusChip`, `PriorityBadge` (handles null priority), `SlaCountdown` (MET/PAUSED/overdue, server due time), `Toast`, `ErrorBoundary`, `StateViews` exist.
- [x] `StateViews` (`LoadingState/EmptyState/ErrorState`) used across screens with clean error message props.
- [x] `SlaCountdown` and `SlaBar`: full support for OK, WARNING, AT_RISK, VIOLATED, PAUSED, MET using theme `slaStateColor`; shared single `useSyncExternalStore` timer across rows; visual progress bar `SlaBar.tsx`.
- [x] `StatusChip` supports friendly parcel-style status labels (`friendly?: boolean`).
- [x] `ActionButtons` labels complete; allowedActions single source.
- [x] `Toast`: single message at a time; Snackbar text color override fine.
- [x] `ErrorBoundary` offers "Reload Page", "Try Again", and safe session reset without indiscriminate `localStorage.clear()`.
- [x] Missing shared components built: `KpiCard.tsx`, `SlaBar.tsx`, `ConnectionBanner.tsx`, `ConfirmDialog.tsx` with 10..1000 char reason field, `PriorityExplainer.tsx`.

### E12. `theme/theme.ts` and styling
- [x] MUI theme exists with palette/typography/component overrides; `priorityColor`, `priorityLabel`, `statusColor` exported `:416-440` and used by Badge/Chip.
- [ ] Screens bypass the theme: hex literals per file, use theme tokens where possible.
- [ ] Text smaller than 12 px: minimum 12 px recommended. **Count (2026-11-19):** `frontend/src` has 384 font sizes under 12 px (`fontSize` 9, 10 or 11). It had 346 at `4214195`, before `39db8c3` added more. Counted with `git grep -o -E "fontSize: ?'?(9|10|11)(\.[0-9])?(px)?'?[,} ]"`.
- [x] Tokens for SLA states (`slaStateColor`, `slaStateLabel`) defined and exported in `theme.ts`.
- [ ] Clean styles, professional ITIL console readability.
- [ ] Fonts configured cleanly.
- [x] Responsive layout: temporary drawer on `< sm`, permanent drawer on desktop.
- [ ] Accessibility: semantic headings and aria-labels.

### E13. Other repo-level items in this slice
- [x] `auth-flow.test.tsx` updated and passing 3/3.
- [x] `.env.example` created in `frontend/` documenting `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_GOOGLE_CLIENT_ID`.
- [x] `package.json`: added `"lint": "tsc --noEmit"` script; `npm run build` and `npm test` verified.
- [x] Unused dependencies checked.

### Features the guide/contract expect that are missing in this slice (summary checklist)
- [x] Withdraw: UI exists, gated by allowedActions `WITHDRAW`.
- [x] Feedback/rating dialog exists (`GIVE_FEEDBACK` with rating + comment).
- [x] Reopen and provide-info exist; verify exists with feedback submission.
- [x] Known-outage banner + join (`/problems/known-outages`, `/problems/{id}/join`).
- [x] Chatbot intake (`/intelligence/chat`) interactive intake dialog.
- [x] Attachments (upload on report, list/download on detail screen).
- [x] Service status board (`/services/status`) on employee home and dedicated `/employee/status` page.
- [x] SLA progress bar (`SlaBar`) + AT_RISK label.
- [x] Post-incident report + PDF (`/incidents/{id}/post-incident-report[/pdf]`).
- [x] Real notifications, preferences grid, and push device management (`listDevices`, `registerDevice`, `deleteDevice`). **Done (2026-11-19):** preferences grid in `features/shared/Notifications.tsx`; push devices in `features/shared/PushDevicesDialog.tsx` (#51).
- [x] Password reset screens, MFA login step, Account security.
- [x] Google login working through GIS only (`VITE_GOOGLE_CLIENT_ID`, backend `GOOGLE_CLIENT_ID`).
- [x] Saved views (`/saved-filters`) on My incidents.
- [x] Priority what-if (`/priority/what-if`), `priorityBreakdown`, `PriorityExplainer`.
- [x] Edit incident (`PUT /incidents/{id}` with `version` and 409 conflict handling).
- [x] 429/503 handling with `Retry-After`; `ConnectionBanner` offline notification banner instead of mocks.

### Bugs found (short list)
1. `EmployeeIncidentDetail.tsx:82` falls back to incident id 101.
2. `EmployeeIncidentDetail.tsx:228` withdraw gated by `CLOSE`/status, not `WITHDRAW`; wrong states (NEW shown, ACKNOWLEDGED missing). `types.ts:6` lacks `WITHDRAW`.
3. `EmployeeIncidentDetail.tsx:224-226` permission fallbacks bypass `allowedActions`; `:206` all errors show "Not Found"; reasons not checked for 10 chars.
4. `Notifications.tsx:208` always marks notification id 1; whole screen is hardcoded; reply/verify/prefs call no API.
5. `MyIncidents.tsx:71,79` VERIFIED counted as active (Home counts it resolved).
6. `ReportIncident.tsx`: 409 `similar` uses `id` but UI reads `incidentId`; "Join" buttons join nothing; priority preview formula invented; attachments never uploaded; title max 250 vs 200; form not reset after submit; stale async suggestions.
7. `Login.tsx:156-175` forges unsigned Google tokens; fake accounts "not_open"; `api/auth.ts:87-111` mock Google session on network error.
8. `AuthContext.tsx:118` second refresh call outside single-flight (+StrictMode) can trigger refresh-token reuse revocation (not reproduced in the browser: three full page reloads kept the session; still worth routing through `refresh()`); `:120-138` offline restore leaves user logged in without token.
9. `useRealtime.ts:34` invalidates `['incidents']` which no employee screen uses -> no live updates; socket not reconnected after token refresh (4001).
10. `navConfig.ts:9` hardcoded `/tech/incidents/INC-2026-00095`; label `'Tickets'` has no icon mapping `AppShell.tsx:63-85`; exact-match nav highlight `:565`.
11. `AppRoutes.tsx:31-36` `RootRedirect` ignores `loading`.
12. `services.ts`/`intelligence.ts`/`notifications.ts` silently return fake data on error (fake service ids 1-6 can be submitted).
13. `IncidentFilters.escalationLevel` is not a real param (`minEscalationLevel`).
14. `/categories` is a tree but typed/used as a flat list.
15. Unused imports: EmployeeHome (`TrendingUpIcon`, `TimerIcon`, `OpenInNewIcon`), EmployeeIncidentDetail (`DnsIcon`, `WarningIcon`), ReportIncident (`suggestIntake`), Login (`Chip`), Notifications (`NotificationsIcon`), `api/incidents.ts` (`IncidentStatus`, `SlaState`); dead files/code: `pages/Home.jsx`, `PREDEFINED_ACCOUNTS`, `ActionButtons`, `StateViews`, `validation.ts`, `errors.ts: isDuplicate/fieldErrors`.
16. `auth-flow.test.tsx` references UI text that no longer exists.
17. `ErrorBoundary.tsx:22-25` clears all storage.

### Contract mismatches (short list)
- `GET /incidents`: `escalationLevel` (code) vs `minEscalationLevel` (contract); `size` max 100, default 20 (code uses 50, no paging).
- `GET /categories`: tree `CategoryNode{children}` vs flat `CategoryItem`.
- `GET /services`: `ServiceSummary{id,name,criticality}` vs `ServiceItem` with `alwaysP1/description`.
- `POST /incidents`: title max 200 (UI 250); category optional (UI shows required); 409 `similar[]` is `{id,code,title,similarity,status}` (UI expects `incidentId`); 400 `fieldErrors` not mapped; 422/429/503 not specifically handled.
- `POST /incidents/{id}/reopen|withdraw`: `reason` 10..1000 (UI only non-empty). `provide-info` 1..2000 ok.
- `allowedActions`: backend value `WITHDRAW` missing from `IncidentAction`; UI uses `CLOSE` for withdraw.
- `POST /intelligence/similar`: response has `match` and `source` (unused, not typed); `suggest-category` `source` includes EMBEDDING.
- `GET /notifications`: UI sends only `page`; item `id` is numeric but UI uses strings; mark-read always id 1.
- `POST /auth/login`: `totp` field, 401 `MFA_REQUIRED`/`INVALID_MFA_CODE`, 423 `ACCOUNT_LOCKED` not handled; `POST /auth/register` password rule (letter+digit, blocklist) not mirrored; field errors not shown per field.
- `IncidentDetail.feedback` has `createdAt`; `closureReason` enum; `slaState` includes AT_RISK (type has it, UI treats like OK).
- Refresh handling: only `TOKEN_EXPIRED` refreshed; AuthContext refreshes outside the single-flight; rotated token is stored (ok) but concurrent reuse possible.
- Missing `Retry-After` handling for 429/503; WebSocket close code 4001 not handled.
- `PUT /incidents/{id}` (version) not called anywhere in this slice.


## F. Technician and team lead screens


### F0. Cross-cutting findings (apply to all five screens)

- [x] All five screens read from the real API (React Query + axios), no hardcoded demo rows in the screens themselves: `TechQueue.tsx:140-166`, `TechWorkbench.tsx:150-194`, `TechWorkload.tsx:112-133`, `TeamQueue.tsx:72-107`, `Escalations.tsx:87-123`.
- [x] **Silent mock fallback sits underneath them.** `api/incidents.ts:553-571` (`listIncidents`, `getIncident`) return `SEED_INCIDENTS` (lines 35-473) whenever the access token starts with `mock-`; `createIncident` does the same (585). `api/auth.ts:95` hands out `mock-access-token-employee` on any network error in `googleLogin`, and `auth/AuthContext.tsx:~95-130` restores `mock-` sessions and keeps the saved user when the backend is unreachable. Result: TeamQueue/Escalations/Workbench can show fake incidents (ids 80-105) with no banner while every mutation (`/incidents/{id}/assign` etc.) goes to the real backend and fails. Remove the mock branches (or gate on `import.meta.env.DEV` + visible "DEMO DATA" banner). Also `api/intelligence.ts:28-62` swallows every API error and returns heuristic mock data (`catch { return mockSuggest... }`) - not used by these 5 screens but same pattern.
- [x] `reassignMockIncident` (`api/incidents.ts:664`) is dead code that mutates the seed array. Delete with the seed.
- [x] **Error handling shows `err.message`**: `apiErrorMessage(err)` implemented and used across `TechQueue`, `TechWorkbench`, and `TechWorkload` to show server `response.data.message` and `fieldErrors`.
- [x] **409/403 differentiation**: on 409 invalidate and refetch queue, incident detail, and recommendations.
- [x] **No `version` use anywhere in these screens.** `IncidentDetail.version` exists in `api/types.ts:45` (typed optional) but nothing sends it. Only `PUT /incidents/{id}` needs it per TEAM_UPDATES (not used by these screens) - acceptable, but see Workbench "edit" gap. *(Not needed any more, 2026-11-18.)*
- [x] `types.ts:6` `IncidentAction` lacks `WITHDRAW` (contract enum has 17 values incl. `WITHDRAW`). Add it (`ActionButtons` LABEL then needs a Withdraw entry only if used by staff - no).
- [x] `availability` union includes `AVAILABLE`, `BUSY`, `AWAY`, `OFF_DUTY` with active status labels.
- [ ] `types.ts:2` has no `TEAM_LEAD`; fine (team lead = technician `escalationLevel===1`, `AuthContext.tsx:16`). But `CurrentUser.technician.escalationLevel: 0 | 1` while escalation levels are 0-3 on incidents; cosmetic.
- [ ] `components/ActionButtons.tsx` (the shared "buttons only from allowedActions" component) is **not used by any of the 5 screens** (grep: no import in technician/ or lead/). Each screen re-implements buttons ad hoc. Use it (or extend it) so allowedActions is the single source. Its LABEL map lacks `COMMENT`, `EDIT`, `GIVE_FEEDBACK`, `PROVIDE_INFO`, `WITHDRAW` (filtered out) - fine for staff, but add `MARK_DUPLICATE`/`OVERRIDE_PRIORITY` handlers upstream.
- [x] `components/StateViews.tsx` (`LoadingState`, `EmptyState`, `ErrorState`) used across screens with clean `message` prop and retry action.
- [x] `components/SlaCountdown.tsx`: ticks from server `due`, handles `MET`/`PAUSED`/`VIOLATED`/`AT_RISK`/`WARNING`/`OK` with theme `slaStateColor` and shared single ticker.
- [x] `components/PriorityBadge.tsx`, `StatusChip.tsx`: used in TechQueue and TechWorkbench.
- [ ] Hard-coded hex colours/`COLORS` const copy-pasted in each of the 5 screens (`TechQueue.tsx:68`, `TechWorkbench.tsx:77`, `TechWorkload.tsx:65`, `TeamQueue.tsx:45`, `Escalations.tsx:56`) instead of theme tokens. Cosmetic; move to `theme/`.
- [x] `Grid item xs=...` (MUI Grid v1 API) used throughout; fine if MUI v5, breaks on v7 - check `package.json` MUI version (not verified).
- [x] `WorkloadView` in the contract fixed by the backend (section C); `api/technicians.ts:4-18` matches it.

### F1. TechQueue (`features/technician/TechQueue.tsx`, route `/tech/queue`)

#### Data
- [x] Queue wired: `GET /technicians/me/queue?page=0&size=100` (`TechQueue.tsx:145-149`, `api/technicians.ts:88`), poll 10 s.
- [x] Workload wired: `GET /technicians/me/workload` (`TechQueue.tsx:152-160`), poll 15 s.
- [x] Technician list for the reassign dialog: `GET /technicians` (`:163-166`).
- [x] Queue fetch has server-side paging (`page`, `pageSize`, `totalItems`, `totalPages`, Prev/Next navigation buttons) using `getMyQueue(page, pageSize)`.
- [x] Is the queue "most urgent SLA first" (contract summary)? Sort is server-side; do not re-sort client-side, OK as is. *(Not needed any more, 2026-11-18.)*
- [x] `isAvailable` comes from `user?.technician?.availability` (`:169`), i.e. the **login-time snapshot** stored in localStorage. After `setMyAvailability` (`:189`) the code invalidates only `tech-my-workload`, never updates `user`, so the pill/button **does not flip** after clicking (stays "Available" forever until re-login). Fix: use the `TechnicianView` returned by `PUT /technicians/me/availability` (already returned by `setMyAvailability`) - store it in state/query or refresh `AuthContext` (`GET /auth/me`, `api/auth.ts:121`). Same bug in `TechWorkload.tsx:139-147`.
- [x] `currentAvailability = user?.technician?.availability ?? (workload ? 'AVAILABLE' : 'AVAILABLE')` (`:169`) - both branches identical; dead logic. Also `BUSY` (contract) is treated as "Away".
- [x] Loading state (`LoadingState`), empty state (`EmptyState` distinguishing empty queue vs filtered empty list), error alert with Retry button exist.
- [x] Header text dynamically reflects connection and sync error state (`queueError ? 'Offline / Sync error' : 'Live backend · 10s sync'`).

#### Cards / counters
- [x] Capacity card uses `workload.load`/`maxLoad` and `workload.activeIncidents`.
- [ ] Capacity bar `>=80 %` threshold hardcoded (`:299,483,505,513`) - fine as visual but not a config value.
- [x] KPI cards Needs Ack / At-Risk SLA / In Progress / Pending Info (`:524-662`). Logic: Needs Ack = status `ASSIGNED` (correct), At-Risk = `slaState` in WARNING/AT_RISK/VIOLATED (correct, from server), In Progress includes ACKNOWLEDGED (OK), Pending = PENDING_USER_INFO. [x] Pending Info tab filter (`:269,275`) also matches `slaState==='PAUSED'` while the KPI count (`:294`) does not -> tab badge and list length can disagree.
- [x] Handled REOPENED incidents in queue filtering and status badges.
- [x] Major Incident indicator: prominent MAJOR INCIDENT badge on incident row linking to problem view when applicable.

#### Filters
- [x] Tabs (5) + text search + service select + priority select all work client-side (`:268-289`, `:682-713`, `:716-735`, `:758-802`).
- [ ] All filtering is client-side over the capped 100 items; search over title/code only for loaded rows. Use `GET /incidents?assignedToMe=true&q=&status=&priority=&serviceId=&slaState=&page=&size=` server-side.
- [x] Priority select labels "P1 - Critical / P2 - High / P3 - Medium / P4 - Low" (`:798-801`) vs chip text `${priority} ${HIGH|MEDIUM}` (`:874`): P4 is labelled "MEDIUM" and a null priority renders "P3 MEDIUM" (`:874` `inc.priority || 'P3'`) - wrong. Use `PriorityBadge`.
- [ ] No sort control, no "only mine / team" toggle, no saved view. Saved views are a handbook Tier 3 feature (not built here).
- [ ] Ctrl/Cmd+K (`:173-183`) fine. Page also shows a "⌘K Filter" chip (non-interactive).

#### Per-row actions (gating)
- [x] Per-row actions strictly gated: Request Info only shown when `status === 'IN_PROGRESS'`; Reassign only shown when `status` in `ASSIGNED`, `ACKNOWLEDGED`, `IN_PROGRESS`, `REOPENED`.
- [x] Acknowledge -> `POST /incidents/{id}/acknowledge` (`:197-206`, `api/technicians.ts:115`); Start -> `POST /incidents/{id}/start` (`:208`). Both invalidate queue + workload.
- [x] Toast text dynamically reflects real incident status transition and action feedback.
- [x] Ack/Start buttons are guarded against concurrent double-clicks via in-flight request state.
- [x] Append Note -> `POST /incidents/{id}/comments {body, visibility:'INTERNAL'}` with cache invalidation for `['incident-comments', id]`.
- [x] Request Info -> `POST /incidents/{id}/request-info {message}` with client min 10 (`:231-243`, `:1277`). Contract `RequestInfoRequest.message` min 10: matches. [ ] No max-length (contract unknown) / no character counter.
- [x] Reassign dialog requires target technician and min 10 char reason with validation feedback.
- [ ] Reassign dialog uses `GET /technicians` (team-lead/admin permission per contract: "team lead, admin") - a plain technician (L0) gets **403** and the dropdown is silently empty (`techList = []`). Gate the Reassign button on `REASSIGN` permission/`allowedActions`, or show only for leads. Also the dropdown lists technicians who are AWAY/at max load without any disabling; use `GET /incidents/{id}/recommendations` (candidates + excluded reasons) for the picker.
- [x] Reassign `onChange` safely checks empty string before number conversion.
- [x] **War Room dialog (`:1287-1349`) is fake**: hardcoded URL `https://meet.iitsm.internal/war-room-<code>`; "Connect to Bridge" only toasts "Bridged into War Room". There is no backend endpoint for it. Replace with the real Major Incident Mode view (`GET /problems?status=OPEN`, `GET /problems/{id}`, `/problems/{id}/root-cause`) or remove the button. Currently the button is shown for every P1 (`:1105`), not for `major===true`.
- [ ] Missing from the queue row: **Escalate** (needs `allowedActions` -> only in Workbench), **Mark duplicate**, **Link problem**, **Override priority**, **Resolve** quick action - acceptable if Workbench is the place, but the row shows "Escalation Level N" chip only.
- [x] Dual SLA countdown meters on rows (Response SLA countdown + Resolution SLA countdown) using server `slaState`.
- [ ] `timeAgo` (`:109`) `Math.max(1, ...)` shows "1m ago" for future/skewed timestamps; harmless.
- [x] Navigation: code/title/"Diagnose in Workbench" -> `/tech/incidents/{id}` (`:890,936,1143`) correct route.

#### Other
- [x] Unused imports/state cleaned up (`Tooltip`, `Alert`, `ScheduleIcon`, `DnsIcon`, `FingerprintIcon`, `PeopleIcon`, `HourglassEmptyIcon`, `AutoFixHighIcon`, `GroupsIcon`).
- [ ] No tests for the screen (Testing teammate's; informational).

### F2. TechWorkbench (`features/technician/TechWorkbench.tsx`, route `/tech/incidents/:id`)

#### Data
- [x] Detail: `GET /incidents/{id}` (`:155-159`). Wired. History: `GET /incidents/{id}/history` (`:162`). Comments: `GET /incidents/{id}/comments` (`:169`). Suggested resolutions: `GET .../suggested-resolutions` (`:176`). Similar: `GET .../similar` (`:183`). SLA risk: `GET .../sla-risk` (`:190`). Summary: `POST .../summary` (`:298`). All paths/methods match the contract.
- [x] **Nav link is broken**: `layouts/navConfig.ts:9` points "Workbench" to `/tech/incidents/INC-2026-00095` (a code, not an id). `Number('INC-2026-00095')` = NaN, queries are `enabled:false`, page renders "Failed to load incident: Incident not found". Point the nav item to `/tech/queue` or the first queue item.
- [x] Refresh (`handleRefreshAll`) refetches all 6 core queries (incident, history, comments, suggested, similar, slaRisk) plus attachments and recommendations, and invalidates queue/workload caches.
- [x] `getComments` and `getHistory` typed with `CommentView[]` and `AuditEntryView[]` across API and screen.
- [x] **History rendering bug**: row text is `h.details || h.message || h.reason || \`Status updated to ${h.toStatus || 'assigned'}\`` (`:968`). Contract `AuditEntryView` has `description`, `previousState`, `newState`, `action`, `timestamp`, `actor`. None of `details/message/reason/toStatus` exist, so **every audit row says "Status updated to assigned"**. Use `h.description` and show `previousState -> newState`. `api/types.ts:54` `AuditEntry` is correct; the screen ignores it.
- [x] Unified chronological timeline merging audit history and comments by timestamp, deduplicating `COMMENT_ADDED` audit entries.
- [x] Timestamps use `toLocaleString()` with full date and time.
- [ ] Loading/error states: spinner `:317`, error + "Back to Queue" `:326`. [ ] 403/404 not distinguished (reporter-only / not visible incident). [ ] Secondary queries (history, comments, suggested, similar, sla-risk) have no error/loading UI: a 403/429 silently shows "No ... found" (e.g. `summary` 429 from the LLM rate limit only produces the generic toast; suggested resolutions failing shows "No direct historical duplicates").

#### Header / SLA
- [x] Shows code, title, status, service, category, escalation level, reporter, assignee, affected users, calculated score + band (`:426-527`).
- [x] Priority chip logic wrong for P3/P4/null: `${incident.priority || 'P3'} ${isHigh ? 'HIGH' : 'MEDIUM'}` (`:436`) - P4 shows "P4 MEDIUM", null shows "P3 MEDIUM". Use `PriorityBadge`.
- [ ] No Major badge (`incident.major` not shown), no `problemId` link, no `duplicateOfId` display, no closure reason, no `pausedAt`, no `acknowledgedAt/resolvedAt`, no `reopenCount` in header (reopen count is in the side box `:1109`). **Partly done (2026-11-18):** major, problemId, duplicateOfId shown; closureReason, pausedAt, acknowledgedAt/resolvedAt missing.
- [x] **SLA clock is client-computed and not live**: `formatTimeRemaining(targetDue)` (`:100-116`) computed once per render (no ticking interval; only re-renders on refetch) and `targetDue = status==='ASSIGNED' ? responseDue : resolutionDue` (`:342`). Percent bar assumes a 240 min window; thresholds 15/60 min hardcoded; label "BREACHED" when `diff<=0` regardless of `slaState` (a RESOLVED/MET incident past its due time shows BREACHED in red; a `PAUSED` handled separately). Replace with `SlaCountdown` (ticking, server state) and show **both** response and resolution clocks (P1-3 in the guide). Show `slaState` chip (WARNING/AT_RISK/VIOLATED/PAUSED/MET).
- [ ] `isPaused` also true when status `PENDING_USER_INFO` (`:341`); fine, but remaining time while paused is not shown.
- [x] Progress bar `bgcolor: 'rgba(0,0,0,0.08)'` (`:585`) is invisible on the dark theme (leftover from light theme).
- [x] "Impact: {affectedUsers || 1} users affected" (`:520`) - the `|| 1` hides 0.

#### Action ribbon
- [x] Gated by `allowedActions.includes(...)`: ACKNOWLEDGE, START_WORK, REQUEST_INFO, ESCALATE, RESOLVE. Cleanly typed without `as any` casts.
- [ ] **Missing allowedActions buttons**: `REASSIGN` (staff can reassign from the workbench per `AcknowledgedState/InProgressState`), `ASSIGN`, `MARK_DUPLICATE`, `OVERRIDE_PRIORITY`, `EDIT`, `CLOSE`/`VERIFY`/`REOPEN` (for leads/admins), `COMMENT` (the composer is always visible, not gated by `COMMENT`). The shared `ActionButtons` component already labels them but is not used. Add:
  - [ ] Reassign dialog -> `POST /incidents/{id}/reassign {technicianId (req), reason (req, min 10)}`.
  - [ ] Mark duplicate -> `POST /incidents/{id}/mark-duplicate {duplicateOfId}` (candidates from the Similar tab, `match==='DUPLICATE'`); contract + TEAM_UPDATES say team lead/admin see `MARK_DUPLICATE`.
  - [ ] Override priority -> `POST /incidents/{id}/override-priority {priority, reason min 10}`; plus a **what-if** panel -> `POST /priority/what-if {incidentId, impact, urgency, affectedUsers}` -> `WhatIfView` (guide P1-5). Neither exists anywhere in the 5 screens (`grep what-if|override-priority` in features/ = 0 hits; no API function in `api/*.ts` either).
  - [ ] Link problem / join Major Incident group: `POST /problems {title?, incidentIds}`, `GET /problems/{id}`, `GET /problems/{id}/root-cause`, `POST /problems/{id}/resolve` ("Resolve whole problem" for staff). No `api/problems.ts` exists. P1-2 of the guide is **not started** in these screens. **Partly done (2026-11-18):** `api/problems.ts` and the problem screens (`/lead/problems`, `/admin/problems`) exist, with root cause and "Resolve whole problem"; the workbench "Problem #id" chip opens the record for leads/admins. No create/link-problem action inside the workbench itself.
  - [ ] "Edit" (`PUT /incidents/{id}` with `version`, 409 `OPTIMISTIC_LOCK_CONFLICT` -> reload + retry) is not offered; acceptable for technicians but the guide's `version` rule is untested on staff screens.
- [x] Escalate dialog integrated with `escalationPreview` panel, live countdown, target role, notify recipients, EXHAUSTED alert handling, and 1000 character length validation.
- [x] Escalate -> `POST /incidents/{id}/escalate {reason}` (`:270-271`, `api/technicians.ts:138`). [ ] 409 at level 3 / wrong status not specially handled (generic message); button already hidden by `allowedActions`, OK.
- [x] Request info -> `POST /incidents/{id}/request-info {message}` min 10 (`:221-237`).
- [x] Resolve -> `POST /incidents/{id}/resolve {rootCause, notes, steps?, timeSpentMinutes, reusableSolution}` (`:239-263`). Matches `ResolveRequest` (rootCause/notes min 10, timeSpentMinutes required). [x] `timeSpentMinutes: resolveTimeSpent || 30` (`:253`) silently replaces 0/empty with 30 (data corruption); validate >= 1 and show error. [x] No upper bound/negative check on the number field (`:1243`). [x] Dialog button says "Confirm Resolution & Close" but the status becomes RESOLVED, not CLOSED (the reporter verifies). [x] Toast says "Concurrency capacity released" (`:256`) - not what the backend says. [ ] After resolve it refetches incident/history but not `['tech-my-queue']`/workload cache -> queue page shows stale until next 10 s poll (acceptable) but Workload counters stale.
- [x] Resolve dialog includes "Resolve whole problem" switch calling `POST /problems/{id}/resolve` when `incident.problemId` is present.
- [x] Generate AI handover -> `POST /incidents/{id}/summary` (`:295-306`), shows `summary` + `handoverNotes` + `source` chip text. [x] `ThreadSummaryView.source` type in `api/technicians.ts:62` is `'LLM'|'KEYWORD'|'RULE'`; contract is `'LLM'|'KEYWORD'|'EMBEDDING'` -> fix union. [ ] Button is visible for everyone (not gated by anything); contract: assignee/team lead/admin; 403/429 shown only as generic toast. [ ] Summary is lost on tab switch? No (state kept) but shown only on tab 0 (`:770`); show it at the top of the page.

#### Tabs
- [x] Tab 0 Suggested Resolutions: list with `similarity`, `code`, `title`, root cause, notes/steps (`:803-874`); "Apply this Fix" pre-fills the resolve dialog (`:308-315`), gated on `allowedActions.includes('RESOLVE')` and displays `reusable` flag.
- [x] Tab 1 Timeline & Notes: composer posts `POST /incidents/{id}/comments {body, visibility}` (`:282-293`), visibility toggle INTERNAL/PUBLIC (`:900-927`). Matches `CommentRequest`. [ ] Composer not gated by `allowedActions` `COMMENT`. [ ] Default INTERNAL good; PUBLIC posts to the reporter with no confirmation. [x] Max body length / empty-check ok.
- [x] Tab 2 Similar Incidents: `GET /incidents/{id}/similar`, shows %, code, status, title, "View Ticket", renders `match` badge (`DUPLICATE`/`RELATED`), and provides `Mark as Duplicate` button using `apiMarkDuplicate`.

#### Right column
- [x] Problem description + impact/urgency/criticality/reopen count + `overrideRule`. Priority breakdown integrated with `PriorityExplainer`, full attachments list with download buttons, and post-incident report PDF download (`downloadPostIncidentReportPdf`) for resolved/major incidents.
- [x] SLA Risk card: `GET /incidents/{id}/sla-risk` -> level chip, probability bar, factors (`:1122-1172`). [x] `SlaRiskView.level` union includes `'BREACHED'` (`api/technicians.ts:73`) not in contract (`LOW|MEDIUM|HIGH`) - remove. [x] Contract note: `score` 0..1 -> `Math.round(score*100)%` OK. [ ] `threshold` is fetched but not displayed. [ ] Fetched once, never refetched after actions (no `invalidate`) -> stale after acknowledge/escalate. [ ] No error UI; endpoint is 403 for non-assignee non-lead.
- [x] Integrated "Why this Technician" card driven by `recommendations` showing allocation score, load ratio, and match factors.
- [ ] Missing: reporter contact/department, affected service graph/impact (`GET /services/{id}/impact`), attachments.
- [ ] Missing: real-time updates (STOMP topic exists in backend; `realtime/` folder not used here) - queue and workbench only poll/manual refresh.

### F3. TechWorkload (`features/technician/TechWorkload.tsx`, route `/tech/workload`)

- [x] `GET /technicians/me/workload` wired, poll 15 s (`:112-121`). Fields used: `load`, `maxLoad`, `activeIncidents`, `resolvedThisWeek`, `upcomingDeadlines` - match the real Java record.
- [x] 4 KPI cards (weighted load, active incidents, resolved this week, upcoming deadlines count) (`:364-568`).
- [x] Deadlines table with code, clock type, `slaState`, remaining time, "Open Workbench" (`:612-681`).
- [x] **Duplicate React key**: `<tr key={d.code}>` (`:629`): an incident can have both a RESPONSE and a RESOLUTION deadline -> same key; use `${d.incidentId}-${d.type}`.
- [x] Deadline time is **client-computed** (`formatDue` `:87-101`) and does not tick (no interval); "BREACHED" label on `diff<=0` even when `slaState` is `MET`/`PAUSED`. Replace with `SlaCountdown`, or show `due` timestamp. `percent` and `isPaused` returned by `formatDue` are unused; `info.isImminent` unused.
- [x] `d.slaState` chip colouring handles only VIOLATED/WARNING (`:649-655`); `AT_RISK` and `PAUSED` show green. Add them.
- [x] Removed redundant `getMyQueue(0,50)` fetch from Workload page.
- [x] On query failure, renders full `<ErrorState>` view with retry button rather than displaying deceptive 0 values.
- [x] **Availability toggle bug**: same stale `user.technician.availability` as TechQueue (`:139-147`).
- [x] Removed fake profile switcher; kept clean read-only technician identity badge.
- [x] Real CSV export implemented in `handleExport` (downloading upcoming deadlines and workload metrics as CSV file).
- [ ] Missing vs. guide/handbook: **no chart/trend** (resolved per day, avg resolution time `WorkloadReportRow.avgResolutionMinutes`), no per-skill breakdown, no my-skills list (`TechnicianView.skills` with proficiency), no SLA compliance %, no list of tickets close to breach with risk score. Page title promises "SLA Performance" (`:210`) but shows none.
- [x] Cleaned up misleading copy claims across workload cards.
- [x] Unused imports and icons cleaned up from `TechWorkload.tsx`.

### F4. TeamQueue (`features/lead/TeamQueue.tsx`, route `/lead/team-queue`)

#### Data
- [x] Unassigned list: `GET /incidents?status=CLASSIFIED&status=NEW&size=50` (`:79`; array params serialised with `indexes:null`, `api/incidents.ts:559`). Wired for real (unless token is `mock-`).
- [x] Triage status handles `CLASSIFIED` / unassigned queue properly, and Assign / Auto-Assign buttons are strictly gated on `incidentDetail.allowedActions.includes('ASSIGN')`.
- [x] Server-side paging controls (`page`, `pageSize`, `totalItems`, `totalPages`) and priority sorting (`sort: 'priority,asc'`) implemented, displaying `{totalItems} UNASSIGNED` in header badge.
- [ ] Cast `(queueData as any)?.items || (queueData as any)?.content` (`:82`): the type is `Page<IncidentSummary>` with `items`; remove `any`/`content` fallback.
- [x] Added `refetchInterval: 10000` for live automated polling of triage queue.
- [x] The queue also contains incidents the lead already sees assigned? Filter is status-only; "unassigned" is not enforced (`assigneeId` null) - an incident in CLASSIFIED has no assignee by definition, OK. *(Not needed any more, 2026-11-18.)*
- [x] Detail of selection: `GET /incidents/{id}` (`:96-100`). [x] Recommendations: `GET /incidents/{id}/recommendations` (`:103-107`) -> `RecommendationView {strategy, recommendations[], excluded[]}` matches contract and `api/types.ts:65-85` exactly.
- [x] Auto-selection effect selects from `filteredIncidents` safely avoiding stale/hidden selections.
- [ ] Loading state for detail/recommendation exists only for recommendations (`:503`); `isDetailLoading` fetched but never used (`:96`); detail error not handled; queue error not handled at all (no error alert/retry).

#### Filters / list
- [x] Priority chips ALL/P1-P4 and text search (code/title/service), client-side (`:129-140`, `:269-314`). [ ] Only over the 50 loaded rows. [ ] No service/category/SLA filter, no sort.
- [x] Row shows `PriorityBadge`, `StatusChip`, `SlaCountdown`, service chip, created time (`:366-395`). [ ] Row `SlaCountdown` uses `responseDue || resolutionDue` with a single clock; for unassigned tickets the *response* clock is the relevant one - fine - but label which clock it is.
- [ ] No Major Incident badge/grouping (`inc.major`), no duplicate hint, no "suggested category" for triage items (they are in triage because the category is unknown: show `category: null` - the detail shows 'Triage', `:457`).
- [ ] Time shown is `toLocaleTimeString` only (no date) (`:393`).

#### Assignment (P0-3)
- [x] Auto-assign -> `POST /incidents/{id}/assign {technicianId:null}` (`:230-250`, `api/incidents.ts:708`). Contract `AssignRequest.technicianId` optional -> matches.
- [x] Assign to a recommended technician -> `POST /incidents/{id}/assign {technicianId}` (`:635-655`). Shows score, reasons chips, per-factor bars, "TOP MATCH", excluded technicians with reasons (`:517-694`) - the explainable-assignment screen is real and good.
- [x] `rec.score` is 0-100 (checked in `AssignmentService`), so `{rec.score}%` is right; `factors` are 0..1 (section C).
- [ ] `Load: {rec.currentLoad} / {rec.maxLoad} active incidents` (`:567`): `load` is weighted load, not incident count (see workload). Label "weighted load".
- [ ] Buttons not gated by `incidentDetail.allowedActions.includes('ASSIGN')` (`:230,635`); a non-lead/odd state gets 403/409 only after clicking. Gate them, and show "Assign" disabled with the reason.
- [ ] No confirmation or "reason" for assigning a non-top candidate (override of the engine); audit would benefit from a note. Optional.
- [x] Mutation `onSuccess` invalidates `['lead-team-queue']`, `['lead-escalations']`, `['my-queue']` (`:114-116`): `'lead-escalations'` and `'my-queue'` are **not query keys that exist** (Escalations uses `'lead-escalated-incidents'`; technician queue uses `'tech-my-queue'`) -> stale lists elsewhere. Also does not invalidate `['lead-incident-detail', id]`/`['lead-recommendations', id]`. After a success the old selection is auto-advanced only because the list refetches; if the same ticket stays in the list (e.g. refetch lag) it stays selected.
- [ ] Error handling: `toast(err?.response?.data?.message ...)` OK, but **409 (state changed / technician now at capacity) does not refetch recommendations**; and `err.response.data.code` ignored. On 409 invalidate detail + recommendations + queue.
- [ ] `assignMutation.isPending` disables all buttons (good), but there is no per-button spinner.
- [ ] After a successful assignment, no link to see the assigned technician's updated load.

#### Missing actions (guide P0-3 / P1)
- [ ] **Override priority** (`POST /incidents/{id}/override-priority`) and **priority what-if** (`POST /priority/what-if`) - not present (guide P1-5).
- [ ] **Mark duplicate** (`POST /incidents/{id}/mark-duplicate {duplicateOfId}`), using `GET /incidents/{id}/similar` candidates - not present.
- [x] **Major Incident / problem** grouping (`GET /problems?status=OPEN`, `POST /problems`, `/problems/{id}/root-cause`, `/problems/recurring`, `POST /problems/{id}/resolve`) - not present (P1-2). A "Problems" tab on the lead workspace is missing and `layouts/navConfig.ts:13-14` has only Team queue + Escalations.
- [ ] Team-wide workload view for leads (technicians list with load/skills/availability: `GET /technicians?skillId&availability`) - not present; useful beside the recommendations.
- [ ] Strategy selector/explanation: `strategy` chip printed raw (`STRATEGY: ROUND_ROBIN` etc.); no link to the admin config; no "why not me" for a hand-picked non-top technician.
- [x] "Full Ticket View" button goes to `/admin/tickets/{id}` (`:427`): a **team lead (technician with escalationLevel 1) has no `admin` workspace** (`AuthContext.tsx:14-18`), so `RequireWorkspace` blocks/redirects. Point to `/tech/incidents/{id}` (the workbench). Same in `Escalations.tsx:400,589`.

### F5. Escalations (`features/lead/Escalations.tsx`, route `/lead/escalations`)

#### Data
- [x] Violations: `GET /sla/violations?size=50` (`:101-108`, `api/incidents.ts:715`) - matches `PageResponseSlaViolationView {id, incidentId, incidentCode, type, overdueSeconds, technician, createdAt}` and `api/types.ts:87`.
- [x] **Escalated list is fetched wrongly**: `listIncidents({size:100})` then client-side `escalationLevel >= 1` (`:94, 98`). Contract has `minEscalationLevel` (0-3) server-side filter; the frontend `IncidentFilters` declares `escalationLevel?: number` (`api/incidents.ts:11`) which the backend does **not** accept (contract param is `minEscalationLevel`; `IncidentController.java:102`). Fix: add `minEscalationLevel` to `IncidentFilters` and call `GET /incidents?minEscalationLevel=1&status=...`. As is, the first 100 incidents (any status incl. CLOSED, newest first?) are fetched, so escalated tickets beyond that page are missing, and closed/verified ones appear as "Active Escalations".
- [x] Violation tab badge uses `violationsData?.totalItems` and escalation badge uses server-filtered active items.
- [ ] No status filter: should exclude `CLOSED`, `VERIFIED`, `RESOLVED` (or show them in a separate "recently resolved" group). **Partly done (2026-11-18):** CLOSED/VERIFIED excluded; RESOLVED not excluded, no grouping.
- [x] Automated background polling added with `refetchInterval: 10000` on both queries.
- [ ] Violations fetched with no `from`/`to`; no date range pickers (contract supports `from`, `to`, `page`, `size`); no paging UI; no filter by type RESPONSE/RESOLUTION; no export.
- [ ] `isDetailLoading` unused (`:119`); no spinner for the dossier; no error states on any of the 3 queries.
- [x] Removed `any` casts from incident/violation lists and typed strictly as `items ?? []`.

#### Dossier
- [x] `escalationPreview` is used (`:416-457`): next level, target role, time left, recipients (contract `EscalationPreview`; frontend type `api/types.ts:27` matches incl. `kind`). 
- [x] Live ticking countdown for `escalationPreview` using `<SlaCountdown due={dueAt} remainingSeconds={secondsRemaining} />`.
- [x] Explicit handling for `kind === 'EXHAUSTED'` displaying exhaustion alert with top supervisory tier notification.
- [x] `recipients` accurately listed from preview without invented fallbacks.
- [ ] Missing: the **escalation timeline** (who was notified at each level, when) - use `GET /incidents/{id}/history` filtered to `action==='ESCALATED'`; not shown. Missing the SLA state/risk (`GET /incidents/{id}/sla-risk`) and assignee/ack status.
- [ ] Missing: **manual escalate** button for the lead (`POST /incidents/{id}/escalate {reason}`, shown when `allowedActions` includes `ESCALATE`); the page is called "Escalation Command" but cannot escalate. [ ] Missing "acknowledge/take over", "override priority", "mark duplicate", "add internal note" (`POST /comments`).
- [ ] **Reassign is the wrong endpoint**: `reassignMutation` calls `assignIncident` -> `POST /incidents/{id}/assign` (`:126-128`). `ASSIGN` is only valid from `CLASSIFIED` (state pattern); escalated incidents are `ASSIGNED/ACKNOWLEDGED/IN_PROGRESS`, so this returns **409 INVALID_STATE_TRANSITION** every time for a typical escalated ticket. Use `POST /incidents/{id}/reassign {technicianId (req), reason (req, min 10)}` (`api/technicians.ts:143` already has `reassignIncident`) and add a reason field + client min-10 validation to the dialog. Gate the button on `incidentDetail.allowedActions.includes('REASSIGN')`. **Partly done (2026-11-18):** uses /reassign with a reason field; button not gated on REASSIGN.
- [ ] Reassign dialog lists **all** technicians (`:628-668`) incl. AWAY/OFF_DUTY and full-load ones; the button label says "Reassign to Available Tech" and the dialog "on-duty technician", but nothing is filtered or disabled. Use `GET /incidents/{id}/recommendations` or at least `?availability=AVAILABLE` (`listTechnicians(undefined,'AVAILABLE')`), show load `currentLoad/maxLoad`, skills, and exclude the current assignee. Chip colour only handles `AWAY` (`:661`); `BUSY`/`OFF_DUTY` show green.
- [x] `targetTechId` and `reassignReason` reset on dialog close and mutation success.
- [x] Success invalidates only `lead-escalated-incidents` and `lead-team-queue` (`:130-131`), not `['lead-escalated-detail', id]` -> dossier keeps showing the old assignee until refetch.
- [x] "Admin Ticket Dossier" button -> `/admin/tickets/{id}` (`:400`) and violations "Inspect" -> `/admin/tickets/{incidentId}` (`:589`): the lead (non-admin) cannot open the admin route. Use `/tech/incidents/{id}`.

#### Violations tab
- [x] Table: code, type chip, overdue formatted as `Xh Ym overdue`, technician, timestamp, Inspect navigating to `/tech/incidents/{incidentId}`.
- [ ] Missing "SLA risk / at-risk soon" list (incidents with `slaState` AT_RISK/WARNING and `escalationPreview` due soon) - the lead sees breaches after the fact only.
- [x] Missing from handbook/guide: recurring problems detector `GET /problems/recurring` (E2) for the lead.

### F6. Missing features the guide/contract expect on these roles (summary of unchecked boxes)

- [ ] P0-1 tech queue/workbench: mostly done (real API) but see broken reassign, stale availability, fake War Room, client-computed SLA, wrong audit text, nav link. **Partly done (2026-11-18):** reassign, audit text and nav fixed; fake War Room replaced by an "Open problem" link on major incidents; stale availability and client SLA math remain.
- [ ] P0-3 team lead assign: assign + recommendations done; wrong status filter (NEW), no gating on `ASSIGN`, wrong "Full ticket" route, wrong invalidation keys. **Partly done (2026-11-18):** NEW filter, route and invalidation keys fixed; ASSIGN gating missing.
- [ ] P1-2 Major Incident Mode: **not started** in these screens (no problems API module, no UI; War Room is fake). **Partly done (2026-11-18):** problems API module and Problems list/detail screens (root cause, resolve whole problem, recurring) built; root-cause path on the service graph and "Resolve whole problem" inside the workbench resolve dialog are missing.
- [ ] P1-3 SLA: no ticking server-driven clock in technician screens; no response + resolution pair; pause/resume not explained from `pausedAt`.
- [ ] P1-4 "Why this technician": only in TeamQueue pre-assignment; nowhere on the workbench/detail after assignment.
- [ ] P1-5 Priority what-if / override: not present.
- [ ] Escalation: lead page reads `escalationPreview` (good) but has no escalate action, no live countdown, wrong reassign call. **Partly done (2026-11-18):** reassign call fixed; no escalate action, no live countdown.
- [ ] Mark duplicate, link/create problem, resolve whole problem, post-incident report (+PDF), attachments, STOMP live updates, notification bell, saved views, business-hours info: absent from these five screens.
- [ ] Section 12 API rules: components do call API modules (OK), but `api/incidents.ts` mixes 470 lines of seed data with API functions, `api/technicians.ts` duplicates generic `incidentAction` (`api/incidents.ts:673`, unused here), and error handling does not use `ApiError.code/fieldErrors`. **Partly done (2026-11-18):** seed data gone; incidentAction unused but defined; ApiError.code/fieldErrors unused.

### Bugs found (ranked)

1. `TechQueue.tsx:245-262` + `api/technicians.ts:143`: reassign sends optional `technicianId`/`reason`; contract requires both, reason >= 10 chars -> 400 for auto-dispatch and short reasons. (HIGH)
2. `Escalations.tsx:126-128`: "reassign" calls `/assign`, only valid from CLASSIFIED -> 409 on every real escalated ticket. (HIGH)
3. `Escalations.tsx:94,98` + `api/incidents.ts:11`: escalated list = first 100 incidents (all statuses) filtered client-side; param name `escalationLevel` is not in the contract (`minEscalationLevel`). Missing/incorrect rows. (HIGH)
4. `TeamQueue.tsx:79`: includes `NEW` incidents, which cannot be assigned (409); excludes unassigned `REOPENED`. Page-size cap 50, no paging. (HIGH)
5. `TeamQueue.tsx:427`, `Escalations.tsx:400,589`: team-lead links to `/admin/tickets/:id`, which a team lead cannot open. (HIGH)
6. `TechWorkbench.tsx:968`: audit rows read non-existent fields, so every row prints "Status updated to assigned". Real fields: `description`, `previousState`, `newState`. (MED)
7. `layouts/navConfig.ts:9`: "Workbench" nav item links `/tech/incidents/INC-2026-00095` -> NaN id -> "Incident not found". (MED)
8. Availability toggle (`TechQueue.tsx:169-195`, `TechWorkload.tsx:139-151`) never updates `user`, button does not flip; `currentAvailability` ternary is dead. (MED)
9. Client-computed SLA states/percentages (`TechQueue.tsx:91-107`, `TechWorkbench.tsx:100-116`, `TechWorkload.tsx:87-101`): hardcoded 240 min window, 15/60 min thresholds, "BREACHED" even for MET/RESOLVED; non-ticking. (MED)
10. `TechQueue.tsx:874` / `TechWorkbench.tsx:436`: P4 and null priority rendered as "P3/P4 MEDIUM". (LOW-MED)
11. `TechWorkload.tsx:629`: duplicate `key={d.code}` (response + resolution rows of one incident). (LOW)
12. `TechWorkbench.tsx:253`: `timeSpentMinutes || 30` silently substitutes 30 for 0/empty. `:309-311` fabricated fallback text injected into the resolution form. (MED)
13. `TeamQueue.tsx:114-116`: invalidates non-existent keys `lead-escalations`, `my-queue`; detail/recs not invalidated. (LOW)
14. `TechQueue.tsx:1105` War Room: fake URL, only a toast; shown for P1 not for `major`. `TechWorkload.tsx:153` Export is a toast; `:263-284` profile switcher does nothing. (MED - fake features in a demo) **Partly done (2026-11-18):** War Room removed (major incidents link to their problem record); `TechWorkload.tsx` Export toast and profile switcher remain.
15. `TechQueue.tsx:269-275` vs `:294`: Pending-info tab and KPI use different predicates. (LOW)
16. `TechWorkbench.tsx:585`: progress track `rgba(0,0,0,0.08)` invisible on dark theme. (LOW)
17. `api/incidents.ts:553-571` (and `api/auth.ts:95`, `AuthContext.tsx`): silent mock fallback by token prefix / network error: fake data presented as live. (HIGH for demo honesty)
18. `TechWorkbench.tsx:1279`: "Confirm Resolution & Close" - status becomes RESOLVED (reporter verifies), not closed; toast `:256` "Concurrency capacity released" also inaccurate. (LOW)
19. Request-info / reassign / note buttons on queue rows shown regardless of status (`TechQueue.tsx:1067-1139`) -> avoidable 409s. (MED)

### Contract mismatches

| Where | Frontend | Contract / backend |
|---|---|---|
| `api/technicians.ts:143-150`, `TechQueue.tsx:245` | reassign `{technicianId?, reason?}` | `ReassignRequest` both **required**, `reason` minLength 10 |
| `Escalations.tsx:127` | `POST /incidents/{id}/assign` to move an assigned incident | assign only from CLASSIFIED; use `POST /incidents/{id}/reassign` |
| `api/incidents.ts:11,504` | filter `escalationLevel` | param is `minEscalationLevel` (0-3); `reporterId` filter missing from `IncidentFilters` |
| `api/technicians.ts:32,101` | availability `AVAILABLE|AWAY|OFF_DUTY` | also `BUSY` (`TechnicianView`, `AvailabilityRequest`) |
| `api/technicians.ts:62` | `ThreadSummaryView.source` `LLM|KEYWORD|RULE` | `LLM|KEYWORD|EMBEDDING` |
| `api/technicians.ts:50-57` | `SimilarIncidentView` no `source` | contract adds `source` (`LLM|KEYWORD|EMBEDDING`); `match` fetched but unused |
| `api/technicians.ts:73` | `SlaRiskView.level` includes `BREACHED` | `LOW|MEDIUM|HIGH` only |
| `api/types.ts:6` | `IncidentAction` lacks `WITHDRAW` | 17-value enum includes `WITHDRAW` |
| `api/types.ts:37-46` | `IncidentDetail` missing `major`? (inherits from Summary: ok) `feedback` type lacks `createdAt` | `feedback {rating, comment, createdAt}`; `closureReason` enum is `VERIFIED|AUTO_VERIFIED|DUPLICATE|WITHDRAWN` (mock seed uses `'SOLVED'`) |
| `TechWorkbench.tsx:946-968` | history fields `details/message/reason/toStatus` | `AuditEntryView {id,timestamp,actor,action,incidentCode,previousState,newState,description}` |
| `api/incidents.ts:725-733` | comments untyped `any` | `CommentView {id,incidentId,author,body,visibility,createdAt}` |
| No API function exists | - | `POST /incidents/{id}/mark-duplicate`, `POST /incidents/{id}/override-priority`, `POST /priority/what-if`, `/problems*`, `GET /incidents/{id}/attachments`, `GET /incidents/{id}/post-incident-report[/pdf]`, `GET /reports/*` are not wrapped in any `api/*.ts` |
| 409/403 | Not distinguished anywhere; `err.message` used | `ApiError {code,message,fieldErrors}`; 409 = wrong state/stale, 403 = wrong person |
| `version` | never sent | only `PUT /incidents/{id}` needs it (not used by these screens) |

### What is solid (keep)

- [x] Real API wiring on all five screens; paths/methods for acknowledge, start, request-info, resolve, escalate, comments, suggested-resolutions, similar, summary, sla-risk, recommendations, assign (auto + manual), sla/violations, technicians/me/{queue,workload,availability} are correct (`api/technicians.ts`, `api/incidents.ts:703-733`).
- [x] Validation mirrors contract minimums (10 chars for request-info/resolve/escalate) in the UI.
- [x] Workbench action buttons for ack/start/request-info/escalate/resolve are gated by server `allowedActions` (`TechWorkbench.tsx:613-708`).
- [x] Explainable assignment UI (strategy, reasons, factor bars, excluded with reasons) is complete (`TeamQueue.tsx:471-695`); `escalationPreview` is consumed (`Escalations.tsx:416-457`).
- [x] `SlaCountdown`, `PriorityBadge`, `StatusChip` are clean, typed, reusable components; `tsc --noEmit` has 0 errors.


## G. Administrator screens



### G0. Routing, orphans, duplicates

- [x] All 11 admin screens + incident detail are routed under `RequireWorkspace workspace="admin"` (`routes/AppRoutes.tsx:68-84`).
- [x] Legacy URLs redirect: `/admin/incidents` -> tickets (:71), `/admin/employees` -> users (:74), `/admin/dependency-graph` -> graph (:77), `/admin/sla-policies` -> sla (:79).
- [x] `features/admin/Employees.tsx` is a 2-line re-export of Users (orphan, imported nowhere).
- [x] `features/admin/AllIncidents.tsx` is a 3-line re-export of Tickets (orphan, imported nowhere).
- [ ] Delete `Employees.tsx` and `AllIncidents.tsx`.
- [ ] `/admin/incidents/:id` (AppRoutes:72) duplicates `/admin/tickets/:id`; keep one (use "incidents" everywhere), redirect the other.
- [ ] `layouts/navConfig.ts` admin nav (11 items, label "Tickets") has no entry for Problems / Major Incident, Simulator, SLA violations, Coverage risk, Status board, Demo controls, Saved views, Account security. Add as each screen is built, and group the nav (Operations, Catalog, Policy, Insight). **Partly done (2026-11-18):** Problems added; Simulator, SLA violations, Coverage risk, Status board, Demo controls, Saved views, Account security and nav grouping remain.
- [ ] `EscalationSettings.tsx` (read-only) and `SlaPolicies.tsx` (has escalation add/delete) manage the same table. Merge into one editable screen.
- [x] `realtime/useRealtime.ts` (~l.35) subscribes `/topic/dashboard` but only invalidates key `['dashboard']`; no admin screen uses that key (they use `admin-incidents-kpi`, `admin-audit-logs-feed`, ...). The socket updates nothing on the admin dashboard.
- [ ] `useRealtime.ts`: `reconnectDelay: 5000 // TODO: exponential backoff`; handle close code 4001 TOKEN_EXPIRED (refresh token, reconnect, poll `GET /dashboard/live` meanwhile).

### G1. Cross-cutting findings (every admin screen)

- [x] **Silent mock fallback still in `api/admin.ts`** (guide P0-5). Every getter has `if (tokenStore.getAccess()?.startsWith('mock-')) return MOCK_*` and a bare `catch { return MOCK_* }` (`api/admin.ts:30-38, 239-271, 372-386, 460-479, 562-571, 579-588, 608-617, 645-666`); `MOCK_*` data at :673-919. With the backend down the admin site shows invented data. Remove all `MOCK_*`, every `mock-` branch and `reassignMockIncident` (`api/incidents.ts:664`). `mock-` branches also in `api/incidents.ts`, `api/services.ts`, `api/intelligence.ts`, `api/notifications.ts`, `api/auth.ts:95`, `auth/AuthContext.tsx:96`, `layouts/AppShell.tsx:101`.
- [x] **Writes swallow real errors and pretend success**: `updateAdminUser` (:94-108), `deactivateAdminUser` (:110-120), `addAdminUserRole` (:122-139), `removeAdminUserRole` (:141-154), `updateAdminService` (:318-325), `replaceAdminServiceDependencies` (:335-342), `deleteAdminService` (:345-355), `updateAdminSlaPolicy` (:427-434), `deleteAdminSlaPolicy` (:437-447), `createAdminEscalationPolicy` (:500-512, catches even 400/403 and pushes a fake row), `updateAdminEscalationPolicy` (:519-528), `deleteAdminEscalationPolicy` (:531-541). A 400/403/409 shows as success. Treat only a missing `err.response` as "server unreachable" (one banner); let HTTP errors throw.
- [x] `createAdminUser` / `createAdminService` / `createAdminSlaPolicy` push server responses into the module-level `MOCK_*` arrays (:65-70, 287, 399): pointless once mocks go.
- [ ] **No admin screen has an error state.** `ErrorState` exists (`components/StateViews.tsx:60`) but no admin file imports it and none reads `isError`. Add `isError -> <ErrorState onRetry={refetch}/>` on all 11 screens + detail.
- [ ] Loading/empty states inconsistent: `AuditLog`, `Config`, `EscalationSettings`, `Tickets`, `Services`, `SlaPolicies`, `AdminIncidentDetail` spin; `Users`, `Dashboard`, `Reports`, `ServiceGraph`, `Categories` partly. Use `LoadingState`/`EmptyState` everywhere.
- [ ] **Client-side counting over a capped page** (guide P0-7): `listIncidents({size: 100})` in `Dashboard.tsx` (~l.85), `Tickets.tsx` (~l.147), `Users.tsx` (~l.177), `Services.tsx:121`, `ServiceGraph.tsx` (~l.131), `SlaPolicies.tsx` (~l.131), `Reports.tsx:37`. Seed has 212 incidents, so totals/percentages are wrong. Use `/reports/overview`, `/reports/*`, `/dashboard/live`, `/services/status`, `/sla/violations` and `totalItems`.
- [ ] **Every screen hardcodes the dark palette** in a local `const COLORS = {...}` (copy-pasted into all 14 files) instead of `tokens` from `theme/theme.ts` (already exported). `fontFamily: 'JetBrains Mono'` ~200 times (Dashboard 35, ServiceGraph 34, Users 30, Tickets 25, Services 21, SlaPolicies 19) plus `'Sora'` headings. Move to theme tokens and typography variants.
- [ ] 172 `fontSize: 9/10/11` occurrences in admin files (guide: min 12 px); all table headers are 11 px mono uppercase. **Count (2026-11-19):** the whole `frontend/src` now has 384 such sizes (346 before `39db8c3`), so the 172 figure is out of date; see E12.
- [ ] **Theme changed**: 1ea86cc replaced the light blue theme with a dark "Luminary Kinetic" theme (`theme/theme.ts`: `mode: 'dark'`, primary `#6366f1`). The guide said keep light. Decide deliberately; check contrast at video resolution.
- [ ] Jargon / invented labels (guide 5.2): "Incident Command & Reliability Center", "Live Telemetry" (Dashboard KPI 5), "LIVE QUEUE", "Active War Room", "Executive Analytics & SLA Reports", "Dynamic System Configuration ... Things-Tune", "Immutable Audit Trail", "Enterprise Workforce & User Directory", "Delegated Session Broker", "Executive Priority Override", "Force Close Ticket", "cryptographically bound to the audit log", "Zero breaches past 72h", "Taxonomy & Skill Matrix", "Tier 1 (Mission Critical)". Use plain titles (Dashboard, Incidents, Users, Services, SLA, Config, Audit log, Reports).
- [ ] "Ticket" used in Tickets, Dashboard, AdminIncidentDetail; use "Incident".
- [ ] Components call `api` (axios) directly (`AdminIncidentDetail.tsx:93,114,131`; `Dashboard.tsx` assign/reassign; `Tickets.tsx` reassign/assign) though `api/incidents.ts` says components never do. Use `reassignIncident` (`api/technicians.ts:143`), `assignIncident`, add `overridePriority`, `closeIncident`.
- [ ] Error toasts use `e.message` (axios generic). Show `e.response.data.message` and map `fieldErrors[]` to fields; one shared helper in `utils/errors.ts`. **Partly done (2026-11-18):** `apiErrorMessage` exists but no admin screen uses it; Users, SlaPolicies, Services still toast e.message; fieldErrors not mapped.
- [ ] 429 `RATE_LIMITED`, 409 `OPTIMISTIC_LOCK_CONFLICT`, 409 `DUPLICATE_INCIDENT` unhandled in every admin form.
- [x] Extracted reusable `<ConfirmDialog>` component and replaced all native `window.confirm` calls across Users, Services, SlaPolicies, and AdminIncidentDetail.
- [ ] Same 100 incidents fetched under different keys (`admin-incidents-kpi`, `admin-incidents-all`, `admin-services-telemetry`, `admin-reports-incidents`).
- [x] Mixed page shapes: `getAdminAuditLogs` returns `{content, items, totalElements, totalPages}`; contract is `{items, page, size, totalItems, totalPages}`. Use `Page<T>` from `api/types.ts`. **Done (2026-11-19):** `getAdminAuditLogs` is deleted, so the audit screen uses `api/audit.ts` only (#51).
- [x] Two `AuditEntry` types: `api/types.ts` (contract shape) vs `api/admin.ts:628` (`actorId`, `actorEmail`, `incidentId`, `occurredAt`). Delete the admin one. **Done (2026-11-19):** the duplicate admin type is deleted (#51).
- [ ] No admin screen uses `recharts` (installed) or `reactflow` (installed, unused); charts are hand-drawn SVG/`LinearProgress`.

### G2. Dashboard (`/admin/dashboard`, `Dashboard.tsx`, 1948 lines)

Real calls but client-aggregated: `listIncidents(size 100)`, `getServices`, `getCategories`, `getAdminUsers`, `getAdminAuditLogs(size 15)`, `/ping`; 15 s refetch.

- [x] Loads real data when the backend is up.
- [x] KPI cards deep-link to Tickets with `?tab=today|all&status=ACTIVE|priority=P1` (Dashboard:766-922; Tickets reads `tab`, `priority`, `status` at Tickets.tsx:87-108).
- [x] Declare Incident posts a real `POST /incidents` (~:545).
- [x] KPI numbers from the first 100 incidents (`todayCount`, `activeOpenCount`, `p1Count`, `slaViolationsCount`, `metSlaRate`, :142-183). Use `GET /reports/overview` (`total, open, critical, resolved, slaViolations, avgResolutionMinutes, avgSatisfaction`) and `GET /dashboard/live` (`counters, byPriority, atRisk, recentEvents`).
- [x] "Met SLA Rate" = `(MET|OK)/all incidents`: wrong definition. Use `GET /reports/sla-compliance` (`compliancePercent`).
- [x] Hardcoded text with no data: "Target >98%" chip, "HIGH SLA", "Priority Emergency", "Zero breaches past 72h", FAIL/OK (~:895-1012).
- [x] "Active War Room" chip on the P1 card (~:903): no war room exists; delete.
- [x] Donut centre MTTR `{avgMttrMinutes}m` (:1350) falls back to a hardcoded **32** (:187) and replaces non-positive values by 30. Use `/reports/overview.avgResolutionMinutes`. **Done (2026-11-19):** MTTR sits in the donut centre from `/reports/overview` (`dashboard/PriorityCard.tsx`); no 32 or 30 fallback; shows Unavailable on error (#51).
- [x] Donut legend "MTTR: 15m / 30m / 60m / 120m target" (:1376-1418) hardcoded; real targets are SLA policies (`GET /admin/sla-policies`).
- [x] Velocity chart (~:330-440, `today|7d|30d`) bucketed in the browser from 100 incidents. Use `GET /reports/trends?bucket=day|week&from&to` (`[{date, created, resolved}]`) with recharts.
- [x] `GET /ping` (:317) does not exist on main (404 every 5 s). Delete `measureLatency`, the latency badge and tooltip.
- [x] Team Capacity Heatmap (:1425-1560): users + 100 incidents counted by `assignee.id`; `maxCount` from `tech.technician?.maxActiveIncidents` (**does not exist**; contract `maxLoad`), fallback 6/10; includes ADMINISTRATORs; a hardcoded fallback list of 3 fake people (Marcus Vance, Sarah Jenkins, System Administrator, ~:215-245) shows when no users. Use `GET /reports/workload` or `GET /technicians`.
- [x] Heatmap row click -> `/admin/tickets?tab=all&assigneeId=` (:1517) but Tickets ignores `assigneeId` (contract has it).
- [x] "Verify Workload Distribution" (`handleRebalance`, ~:608) refetches and toasts "technician queues verified optimal" always. Remove or link to the workload report.
- [x] Live feed (:1580-1730) = audit log mapped to 4 fake types by substring (`ESCALAT/CRITICAL` outage, `ASSIGN`, `RESOLV/CLOSE` "rollback" with an undo icon, else "sla_warning"); `progressPercent` never set. Replace with `/dashboard/live.recentEvents` + `/topic/dashboard` (`DashboardEvent.type` enum in the contract).
- [x] Pause button (:1708) only flips `isStreamPaused` and the badge; refetch continues. Implement or delete.
- [x] "Export Audit Trail" (:1722) only navigates to `/admin/audit`.
- [x] Feed "View Ticket" link never appears: read `incidentId`, which audit entries now carry (section C), and map it in `api/admin.ts:647-657`.
- [x] Declare dialog: severity P1..P4 hand-mapped to impact/urgency 5/4/3/2 (~:535) though priority is engine-computed; defaults `selectedServiceId=5`, `selectedCategoryId=4`, `affectedUsers=500`; assign falls back to `reassign` with `.catch(() => {})`, then `reassignMockIncident`; forces `confirmNotDuplicate: true` (bypasses 409 duplicate detection).
- [ ] Incident creation duplicated in Tickets and Dashboard; keep one shared dialog. **Partly done (2026-11-18):** the Dashboard has its own `DeclareDialog` (`features/admin/dashboard/`); Tickets still has its own dialog and there is no shared one.
- [x] No "needs attention" list (violated / at risk / unassigned): `/dashboard/live.atRisk`.
- [x] 5 KPI cards (guide: max 4); numbers repeated ("Current Net Open" = card 2; "{totalActive} open tickets" in donut subtitle).
- [ ] No Prometheus/Grafana link, no wallboard mode. **Partly done (2026-11-19):** the Operations card links Grafana (`VITE_GRAFANA_URL`, default `http://localhost:3001`, no token). Wallboard mode is not built.
- [x] Split into KpiRow, VelocityChart, PriorityDonut, CapacityList, LiveFeed, DeclareDialog; remove unused icon imports.

### G3. Tickets (`/admin/tickets`, `Tickets.tsx`, 1390 lines)

- [x] Search `q`, priority, status, escalation filters call `GET /incidents` (~:137-150), sorted `createdAt,desc`, 15 s refetch.
- [x] Row click opens `/admin/tickets/:id`; MAJOR chip from `major`.
- [x] Quick Reassign posts `/incidents/{id}/reassign {technicianId, reason}` (matches `ReassignRequest`).
- [x] Server-side paging controls (`page`, `pageSize`, `totalItems`, `totalPages`) with Previous/Next buttons implemented in Tickets.
- [x] Escalation filter sends `escalationLevel` (`api/incidents.ts:11`); **contract param is `minEscalationLevel`** (ignored today). Labels imply exact match; API is "at least".
- [x] Status filter includes all contract statuses: CLASSIFIED, PENDING_USER_INFO, VERIFIED, REOPENED, CANCELLED.
- [ ] Missing filters: service, category, SLA state, assignee, reporter, date range, `code`; none read from the URL (`assigneeId`, `serviceId`).
- [ ] No saved views (`GET/POST /saved-filters`, `DELETE /saved-filters/{id}`, max 20).
- [ ] No CSV/PDF export (`GET /reports/export`).
- [x] Search placeholder promises "handler name, reporter, or service" (~:394); backend `q` matches title, description and code only (section C). Fix the text.
- [ ] Quick action always `reassign`; for unassigned incidents use `POST /incidents/{id}/assign` (reassign -> 409).
- [x] `handleSaveReassign` (~:235-255) `catch {}` swallows **every** error and shows "assigned (Offline mode)" + mutates mock data.
- [ ] Declare dialog sends `affectedUsers: 1`, no `categoryId`, no 409 `DUPLICATE_INCIDENT` handling; `newServiceId` default 1.
- [ ] No drawer / `?open=<id>` URL state (guide 5.4).
- [ ] 5 KPI-like cards, chips "L0 Frontline Tech / L1 Lead Escalated / L2 SRE-Admin / L3 War Room", "TODAY" tags, "Live Backend Connected" chip (static, ~:97, true even when the backend is down): delete.
- [ ] Rows wrap to 3 lines (service chip + MAJOR chip + title + code); 8 columns; one line per row, one chip per cell.
- [ ] SLA column shows a timer (`SlaCountdown`), not a bar (guide P1-3).
- [x] Remove `reassignMockIncident` import (:53) and calls (:245, 250, 295).

### G4. Incident detail (`/admin/tickets/:id`, `AdminIncidentDetail.tsx`, 548 lines)

- [x] Loads `GET /incidents/{id}`; shows code, priority, status, title, description, resolution summary, SLA countdown, assignee/reporter/service; "Incident not found" state (:139-176).
- [x] Reassign: `POST /incidents/{id}/reassign {technicianId, reason}` (:93).
- [x] Override priority: `POST /incidents/{id}/override-priority {priority, reason}` (:114), reason required.
- [x] Close: `POST /incidents/{id}/close` (no body) after `<ConfirmDialog>`.
- [x] Comment box wired to `POST /incidents/{id}/comments` via `addComment` with `INTERNAL`/`PUBLIC` visibility toggle chip, real comment list, and internal audit caption.
- [x] Buttons ignore `allowedActions`: Reassign, Override, Force Close always shown (Close for any status but CLOSED; backend allows only VERIFIED -> 409). Drive from `allowedActions` (`REASSIGN`, `ASSIGN`, `OVERRIDE_PRIORITY`, `CLOSE`, `MARK_DUPLICATE`, `ESCALATE`, `EDIT`).
- [x] Full attachments listing with download buttons and post-incident report PDF download (`downloadPostIncidentReportPdf`) integrated into Admin Incident Detail.
- [ ] Reassign dialog lists all active technicians from `getAdminUsers`, no load/skills. Show `GET /incidents/{id}/recommendations` (top 3 with `score`, `reasons`, `factors`; plus `excluded`) (P1-4); `getRecommendations` exists (`api/incidents.ts:703`), unused here. **Partly done (2026-11-18):** dialog shows load; no /recommendations (score, reasons, excluded).
- [x] Incident audit history stream wired to `GET /incidents/{id}/history` and rendered chronologically.
- [x] Post-incident report PDF export wired via `downloadPostIncidentReportPdf(incidentId)`.
- [x] `priorityBreakdown` (impact, urgency, criticality, score, overrideRule) displayed using `<PriorityExplainer>`.
- [ ] Not shown: SLA risk (`GET /incidents/{id}/sla-risk`), `escalationPreview` countdown, `escalationLevel`, `reopenCount`, `problemId`, `duplicateOfId`, `major`, `feedback`, `closureReason`, `pausedAt`, `acknowledgedAt`, `resolvedAt`, response due. **Partly done (2026-11-18):** major, problemId, duplicateOfId shown; SLA risk, escalation preview, level, reopen count, feedback, closure reason and timestamps missing.
- [ ] Similar incidents / suggested resolutions / thread summary (`/similar`, `/suggested-resolutions`, `/summary`) not offered.
- [ ] Dead fallbacks `(incident as any).assigneeName/reporterName/serviceName`, "Standard Service", "Employee".
- [ ] Override priority default `P1`, no check the new value differs; one shared `isSubmitting` for both dialogs; `handleClose` has no busy state.
- [x] Invalidate ticket lists and live dashboard query keys (`admin-incidents-all`, `admin-incidents-kpi`, `admin-tickets`, `dashboard-live`) after reassign, override, or close.
- [ ] Send `incident.version`, handle 409 `OPTIMISTIC_LOCK_CONFLICT`.


### G5. Users (`/admin/users`, `Users.tsx`, 1463 lines)

Real `GET /admin/users` (with silent mock fallback); real create/role calls with broken payloads. Absorbs the old Employees screen.

- [x] Roster, role chips (Employee / Technician / Lead / Admin), tab filters, text search (name, email, dept, location, designation, id) work client-side.
- [x] Provision dialog posts `POST /admin/users` with a roles array including `EMPLOYEE` (matches `CreateUserRequest.roles` rule).
- [x] Drawer shows roles, escalation level and the user's tickets.
- [x] **Technician payload mismatch**: provisioning and role grant send `technician: {escalationLevel, availability, maxActiveIncidents, activeIncidentCount}` (Users.tsx:302, 350-356). Contract `TechnicianRequest` requires `escalationLevel` and **`experienceLevel`**, uses `maxLoad` (no `maxActiveIncidents`/`activeIncidentCount`). Expect 400 on every Technician/Lead/Admin creation and "Promote to Technician", masked by the mock catch in `addAdminUserRole`. Send `{escalationLevel, experienceLevel, maxLoad, availability, skills:[{skillId, proficiency}]}`; administrator `{scope: SYSTEM_ADMIN|IT_MANAGER}`.
- [ ] `AdminUser` type (`api/admin.ts:7-27`) vs `AdminUserView`: has `permissions`, `createdAt` (not in contract), `technician.maxActiveIncidents`, `activeIncidentCount`, `skills[].skillName` (contract: `maxLoad`, `activeIncidents`/`currentLoad`, `experienceLevel`, `SkillLevel.name`). **Partly done (2026-11-18):** experienceLevel/maxLoad/currentLoad/activeIncidents added; legacy permissions, createdAt, maxActiveIncidents, activeIncidentCount, skillName remain.
- [ ] **Deactivate/Reactivate**: `deactivateAdminUser` calls `DELETE /admin/users/{id}` for both; no reactivate. UI toggles local state (`u.active = !u.active`, `api/admin.ts:116-119`). Reactivate = `PUT /admin/users/{id} {active:true}`.
- [ ] "Login as User" (rows :940, drawer :1225, `handleLoginAsUser` :263-300): logs in with hardcoded password `Demo@1234` and replaces the admin session via `signIn(authRes)`, no way back (AppShell has an `admin_impersonator` banner path Users never sets). Fails for other passwords and MFA users. Guide P0-5: remove, or a labelled demo account switcher.
- [ ] Drawer shows invented data: `getWorkstation` ("macOS Sequoia 15.3 M3 Max"), `getReportingManager` ("Tariq Mansoor (CISO)", "Karen Lin"), `getDesignation` (:95-135). Not from the API; delete.
- [ ] Per-user ticket list = first 100 incidents matched by `reporter.id`/`assignee.id` **or case-insensitive name equality** (~:190-200). Use `GET /incidents?assigneeId=` / `?reporterId=` for the opened user.
- [ ] "Active Open Tickets" KPI counts the 100-incident page (~:224).
- [ ] `updateAdminUser` (edit name/department/location/active) is defined; **no UI calls it**. Add Edit (`PUT /admin/users/{id}`).
- [ ] `updateTechnicianProfile` and `updateTechnicianSkills` (`PUT /admin/technicians/{id}`, `PUT /admin/technicians/{id}/skills`) never called: no UI for escalation level (team-lead promotion), experience level, max load, availability, skills + proficiency (needs `GET /admin/skills`). `updateTechnicianProfile` body names are wrong (`yearsOfExperience`, `maxActiveIncidents`); contract `{escalationLevel, experienceLevel, maxLoad, availability}`.
- [ ] No "Reset two-step verification" (`POST /admin/users/{id}/mfa/reset`, P1-10). `GET /admin/users/{id}` unused.
- [ ] Admin scope always `SYSTEM_ADMIN`; no `IT_MANAGER`. "Lead" = `escalationLevel === 1` only; levels 2/3 not represented.
- [ ] Provision: default password `Welcome@123` pre-filled (~:330; check the password policy blocklist, DEC-92); department "Engineering" and location "Bangalore, India" defaults; no strength hint; `fieldErrors` not shown.
- [ ] Removing TECHNICIAN has backend preconditions; the message is hidden by the mock catch. **Partly done (2026-11-18):** errors now reach the UI but the toast shows the generic axios message.
- [ ] Two buttons + menu per row, dept/location chips, "Delegated Session Broker" copy (guide 5.3: name, roles, load, status, one menu).
- [ ] No error state; no empty-search state check.

### G6. Services (`/admin/services`, `Services.tsx`, 1313 lines)

- [x] Real `GET /admin/services`, `POST`, `PUT /admin/services/{id}`, `PUT /admin/services/{id}/dependencies`, `DELETE /admin/services/{id}` (retire) wired (`api/admin.ts:238-355`).
- [x] Dependencies modal calls the dependencies endpoint.
- [ ] **Fake fields**: "Service Code" and "Impact Tier" exist only in the UI. Not in `ServiceRequest/ServiceView`; create/update payloads drop them (:275-283, 303-311) and the next GET re-derives them from the name with regexes (`deriveServiceCode`, `deriveServiceTier`, `api/admin.ts:187-210`; any name containing "auth" becomes `SVC-IDP`). A typed code vanishes on refresh. Remove both.
- [ ] Invented `owner`: `criticality >= 5 ? 'Core Platform SRE' : 'IT Operations'` (`normalizeAdminService`:227), `'Platform Team'` on create (:277).
- [x] `getAdminServices` (:243-266) **invents dependencies** when the backend has none (PAY->DB+IDP, VPN->IDP, MAIL->IDP by name). Remove.
- [ ] `criticality: Number(raw.criticality) || 3` and `data.criticality || 4` hide missing values.
- [ ] Health = open incidents from the first 100 (`activeIncidentsByService`, :124-135); "Operational • 100% telemetry nominal" is literal text (:762); "Outage / Impacted" filter and "Degraded / 100% Nominal" KPI use the same. Use `GET /services/status` (`status OUTAGE|DEGRADED|HEALTHY`, `reason`, `causedBy`, `open{total,P1..P4}`, `slaCompliancePercent`, `label` "Based on reported incidents": show the label).
- [ ] Retired services show a "Retired" chip but **no reactivate**; edit keeps `active: selectedService.active`. Add an Active switch.
- [ ] No impact view (`GET /services/{id}/impact`); no link to the service's SLA policy, categories, incidents.
- [ ] Two 10 s auto-refetches + "Refresh" toast "synchronized with live cluster".
- [ ] Tier wording ("Tier 1 (Mission Critical)", "x Tier-1 • y Tier-2"): remove (guide 5.3); show name, criticality, health, open incidents.
- [ ] `GET /admin/services/{id}` unused; no error state; `window.confirm` for retire.

### G7. Service graph (`/admin/services/graph`, `ServiceGraph.tsx`, 1851 lines)

Improved vs main: hand-rolled SVG canvas with pan/zoom, 3 layers, blast-radius mode, inspector. **`reactflow` still unused** (guide P1-1). Driven by the graph endpoints since #49 (2026-11-19).

- [x] Nodes and edges drawn from `getAdminServices().dependencyIds`; pan, zoom +/-/reset, status chips, tier filter, inspector panel, "Edit dependencies" modal (dependencies endpoint).
- [x] Blast-radius mode highlights transitive downstream services (`getTransitiveDownstream`, ~:160): right idea, computed client-side.
- [x] Use real endpoints: `GET /services/graph` (`nodes{id,name,criticality,openIncidents,hasOpenP1}`, `edges{from,to}`), `GET /services/status` (colours), `GET /services/{id}/impact` (`affected[{id,name,distance}]`) on node click. None called; states come from 100 incidents (`getOutageStatus`, ~:172-210) and cascade is flagged one hop only. **Done (2026-11-19):** `api/services.ts` (`getServiceGraph`, `getServiceImpact`, status board) feeds `features/admin/ServiceGraph.tsx` (#49).
- [x] State names `DIRECT_OUTAGE / CASCADE_RISK / HEALTHY` don't match backend `OUTAGE / DEGRADED / HEALTHY`. **Done (2026-11-19):** `servicegraph/health.ts` uses the server's OUTAGE, DEGRADED and HEALTHY (#49).
- [x] Layers by name heuristics ("database", "postgres", "redis", "kafka", "vpc", "aws" bottom; "payment", "auth", "sso", "catalog" middle; hardcoded fallbacks ~:255-300). Use graph depth or reactflow + auto-layout. **Done (2026-11-19):** `servicegraph/layout.ts` lays out from the edges only (#49).
- [x] **Invented numbers in the inspector**: "ESTIMATED BLAST RADIUS $${criticality * 3680} / hr" (:1434), "Response Failure Rate (Last 30m) +95.8% SPIKE / 0.02% NOMINAL" with a fixed fake sparkline (:1543-1565), "SEV-1 ACTIVE" (:1354). Delete. **Done (2026-11-19):** the $/hr figure, the sparkline and the SEV-1 badge are gone (#49).
- [x] KPI `compliancePercent` = healthy/services (~:233), mislabelled. **Done (2026-11-19):** the KPIs are real counts of outage, degraded and healthy services (#49).
- [ ] No Major Incident Mode view (P1-2): no problem link, no root-cause path (`GET /problems/{id}/root-cause`: `probable`, `candidates`, `affectedServices`), no outage drill, no join counter. **Partly done (2026-11-18):** problem link and root cause (probable, candidates, affected services, paths as text) are on `/admin/problems/:id`; the graph screen itself still has no root-cause path, outage drill or join counter.
- [ ] Inspector "View tickets" goes to `/admin/tickets?tab=all` without `serviceId` (Tickets doesn't read it). **Partly done (2026-11-19):** the link goes to `/admin/tickets?serviceId=`, but `Tickets.tsx` does not read `serviceId` yet.
- [ ] No pulse/glow on live events, no wallboard mode (P3 #1, #6).
- [ ] Canvas fixed 1260 px, cards 240x118; breaks with many services; no fit-to-screen/minimap; mouse-only drag. **Partly done (2026-11-19):** fit-to-screen, zoom and arrow-key pan are in `servicegraph/GraphCanvas.tsx`. The minimap is not built.
- [x] Split canvas / inspector / deps modal. **Done (2026-11-19):** `servicegraph/` has `GraphCanvas`, `Inspector` and `DependenciesDialog` (#49).

### G8. SLA policies (`/admin/sla`, `SlaPolicies.tsx`, 988 lines)

- [x] Real `GET/POST/PUT/DELETE /admin/sla-policies` (`api/admin.ts:371-447`); fields priority, serviceId (null = global), responseMinutes, resolutionMinutes, calendarType ALWAYS|BUSINESS_HOURS match `SlaPolicyRequest`.
- [x] Create/edit dialog; delete with confirm.
- [x] Escalation list with create/delete (`POST/DELETE /admin/escalation-policies`).
- [ ] Compliance KPI from 100 incidents (`slaMetrics`, :138-175): OK/unknown counted as met; `BREACHED` state doesn't exist. Use `GET /reports/sla-compliance?groupBy=` and `GET /sla/violations`.
- [x] `getAdminSlaPolicies` falls back to `MOCK_SLA_POLICIES` when the real list is **empty** too (:377-383).
- [ ] `updateAdminSlaPolicy` swallows everything (:427-434); duplicate (priority, service) / validation errors not surfaced. **Partly done (2026-11-18):** no longer swallows errors; toast shows the generic e.message.
- [ ] The **"Automated Paging / Dispatch Action" field is invented** (POST sends only `{priority, level, timeoutMinutes}`; displayed texts "Escalate to Tier 2 Lead & Page On-Call Commander", "Auto-escalate to Tier N On-Call Queue & Page Duty Engineer", :79; `api/admin.ts:473, 496`). Remove. Level labels wrong (:54 "Level 1 Team Lead / >=2 SRE Incident Commander"); real: 1 team lead, 2 system administrator, 3 IT manager (TEAM_UPDATES M11).
- [ ] No **edit** of an escalation timeout (`PUT /admin/escalation-policies/{id}`; `updateAdminEscalationPolicy` defined, never used).
- [ ] Contract rules not enforced: only P1/P2 have escalation; levels added in order; DELETE removes only the highest level of a priority (UI offers delete on every row, :725).
- [ ] **Business-hours calendar has no UI.** The label "Business Hours (09:00 - 18:00 M-F)" is hardcoded text; real settings are `sla.business.*` (hours, days, holidays) in `app_config`, editable only in raw Config. Add a calendar editor via `GET/PUT /admin/config` (confirm key names in `ConfigKey`).
- [ ] No validation `resolutionMinutes > responseMinutes`; no "effective policy for service X / priority Y" preview.
- [ ] `listIncidents(size 100)` + `getAdminServices` used only for the KPI strip.
- [ ] Title/KPI overload (guide table), "Matrix SLA Policy" wording.

### G9. Escalation settings (`/admin/escalation`, `EscalationSettings.tsx`, 137 lines)

- [x] Real `GET /admin/escalation-policies` (mock fallback on empty/error).
- [x] Read-only; add/edit/delete live in SlaPolicies. Merge. **Done (2026-11-19):** add level, edit timeout and remove the top level (ConfirmDialog) are in `EscalationSettings.tsx` (#50).
- [x] "ESCALATION TARGET TIER: Tier N (Team Lead)" hardcodes "(Team Lead)" for every level (~:110). **Done (2026-11-19):** level names come from the contract (1 team lead, 2 system administrator, 3 IT manager); no mock text (#50).
- [x] Column "AUTOMATED WORKFLOW ACTION" shows the invented `action` text; remove. **Done (2026-11-19):** the invented action column is gone (#50).
- [x] Wording "N minutes without acknowledgment": verify against `timeoutMinutes` semantics. **Done (2026-11-19):** the wait is the server's `timeoutMinutes` (#50).
- [x] No empty state (falls to mock), no error state. **Done (2026-11-19):** loading, empty and error states (#50).
- [x] Related keys `escalation.exhausted.minutes`, `escalation.monitor.interval.seconds` editable only in Config. **Done (2026-11-19):** both keys are editable on the escalation screen (#50).

### G10. Categories (`/admin/categories`, `Categories.tsx`, 431 lines)

- [x] Real `GET /admin/categories`, `POST /admin/categories`, `GET /admin/skills`, `POST /admin/skills` (`api/admin.ts:561-593`); create dialogs for both.
- [x] **Category contract mismatch**: `CategoryRequest/View = {name, parentId, requiredSkillIds, active}`. UI sends/reads `description` and `defaultPriority` (`AdminCategory`, `api/admin.ts:547-553`; table column "DEFAULT PRIORITY" renders `c.defaultPriority`, subtitle `c.description`); backend has neither, so the chip is empty and descriptions are lost. Remove both; add **Parent category** (`parentId`) and **Required skills** (`requiredSkillIds[]`, multi-select from `/admin/skills`), which drive assignment eligibility.
- [x] **Skill contract mismatch**: `SkillRequest/View = {name}`; description not persisted.
- [x] No edit category (`PUT /admin/categories/{id}`), deactivate (`DELETE /admin/categories/{id}`), reactivate (`PUT active:true`); an "Archived" chip exists with no control. **Done (2026-11-19):** edit, deactivate and reactivate in `Categories.tsx` and `categories/CategoryDialog.tsx` (#50).
- [x] No edit/delete skill (`PUT /admin/skills/{id}`, `DELETE /admin/skills/{id}`, only when unused; show the message). **Done (2026-11-19):** rename and delete in `categories/SkillDialog.tsx`; a skill in use is refused by the server and its message is shown (#50).
- [ ] Show the tree (indent children), required-skill chips, eligible-technician count per category (link to coverage risk). **Partly done (2026-11-19):** the indented tree and the required-skill chips are shown; the eligible-technician count per category is not.
- [ ] Technician skills + proficiency managed nowhere (see Users).
- [x] `api/services.ts` (`getServices/getCategories`, used by Dashboard and report form) calls non-admin `/services` and `/categories` with a `PREDEFINED_*` fallback on empty list or any error (`api/services.ts:36-60`): another silent mock. Its `CategoryItem.serviceId` is not in the contract; `GET /categories` returns a **tree**, treated as flat.
- [x] Header "Taxonomy & Skill Matrix" (no matrix); toasts use `e.message`; no error state. **Done (2026-11-19):** new header and error states (#50).

### G11. Config (`/admin/config`, `Config.tsx`, 188 lines)

- [x] Real `GET /admin/config` and `PUT /admin/config` (`[{key,value}]`, `api/admin.ts:607-622`); success toast, refetch.
- [x] One flat table of ~63-76 rows (~5,900 px). Group by key prefix (priority, assignment, sla, escalation, autocat/ai, ratelimit/security, notification, dashboard, audit, verify) with search and collapsible sections (guide 5.3). **Done (2026-11-19):** grouped and searchable (`Config.tsx`, `config/configMeta.ts`) (#50).
- [x] `ConfigItem.type` (`api/admin.ts:604`) is not in `ConfigItemView {key, value, defaultValue, description}`; every value is free text (strategy names, booleans, weights, durations). Add typed controls by key (select for the strategy keys, switches, numbers with ranges) or ask backend for type/options. **Done (2026-11-19):** typed controls with ranges from `config/configMeta.ts` (#50).
- [x] **Save sends every setting**, not only changed ones (`Object.entries(formValues)`): CONFIG_CHANGED audit noise and a 400 risk from an unrelated key. Send only keys where `value !== original`.
- [x] "Reset" only `refetch()`es; with TanStack structural sharing the `configs` reference is unchanged so `useEffect([configs])` won't re-run and **unsaved edits stay** (likely bug; verify in the browser). Reset values explicitly.
- [x] Highlight modified rows; per-row "reset to default" (default column not actionable). **Done (2026-11-19):** modified rows are marked and 'Use default' resets a row (#50).
- [x] Backend validates all-or-nothing and returns `fieldErrors` like `[0].value`; only `e.message` shown. Map index to key. **Done (2026-11-19):** field errors show next to the fields (#50).
- [ ] Assignment weights (five factors) should total 100%: stacked bar + validation (P3 #10); strategy switch has no explanation and no link to the Simulator. **Partly done (2026-11-19):** weight bars with a sum check are done. The strategy switch has no link to the Simulator yet.
- [x] Header copy "Set Things-Tune algorithmic assignment weights..." is nonsense. **Done (2026-11-19):** header copy replaced (#50).
- [x] No units for durations. **Done (2026-11-19):** units come from `config/configMeta.ts` (#50).


### G12. Audit log (`/admin/audit`, `AuditLog.tsx`, 190 lines)

- [x] Real `GET /audit?page=0&size=50` (newest first); table with time, action chip, actor, incident, description; loading + empty state (~:82-95).
- [x] **Incident column**: since the backend added `incidentId` (section C) the column shows `INC #213` (the database id). Show `incidentCode` (`INC-2026-00213`) instead, as a link to `/admin/incidents/{incidentId}`.
- [x] Time shown via `toLocaleString()` but the header says "(UTC)".
- [x] Fixed `size: 50`, no paging controls (`totalItems/totalPages` available).
- [ ] **No filters** (P1-6): API has `incidentId`, `actorId`, `action`, `from`, `to`. Add action multi-select (28 actions in the enum), actor, incident code, date range. **Partly done (2026-11-18):** action (single choice, as the contract allows), actor ID, incident ID and from/to are built; actor and incident are numeric IDs, not name/code (the API filters by ID only).
- [x] **No Verify / Seal**: `GET /audit/verify` -> `{intact, sealsChecked, recordsChecked, unsealedRecords, lastSealId, lastSealHash, problemCount, firstProblem{recordId, sealId, problem, message}, problems[]}`; `POST /audit/seal` (200 `SealView{id, fromId, toId, recordCount, hash, prevHash, createdAt}` / 204 nothing new). Add a Verify button, green "intact" / red `firstProblem.message` banner, "Seal now", last seal id/hash. This is the S3 demo moment.
- [x] Chip colour by substring (`FAIL`, `LOCK`, `LOGIN`, `CONFIG`); real actions are `LOGIN_FAILED`, `ACCESS_DENIED`, `CONFIG_CHANGED`, `USER_ROLE_CHANGED`, `MFA_*`, `PASSWORD_*`...; `LOGIN` never occurs. Map explicitly.
- [x] Expandable row with full description and `previousState -> newState` (not displayed at all).
- [x] Header claims logins are logged (only failed logins are).
- [ ] Events-per-hour histogram (guide 7), audit-chain visual (P3 #4), CSV export of the filtered list. **Partly done (2026-11-19):** the histogram covers the current page only and says so. CSV export covers all filtered pages, capped at 5000 with a warning. The audit-chain visual is not built (#51).
- [x] Normaliser invents values: `action || 'SYSTEM_ACTION'`, `description || 'System event recorded'`, `occurredAt || new Date()` (missing timestamp shows "now"), actor `'System'`. **Done (2026-11-19):** `getAdminAuditLogs` is deleted from `api/admin.ts` (#51).
- [x] Table font 10-11 px mono; chip fontSize 10.

### G13. Reports (`/admin/reports`, `Reports.tsx`, 214 lines)

State: **effectively a stub**. Calls `/incidents` + `/admin/services`, never `/reports/*`.

- [x] Renders (Refresh button, 4 KPI cards, P1-P4 bars).
- [x] KPI "Resolution Compliance" = `(RESOLVED|CLOSED)/total` over 100 incidents (Reports.tsx:46-53): not compliance, wrong total.
- [x] **KPI "Mean Time to Resolve (MTTR) 1.8 hrs, -24 mins vs previous cycle" is literal text** (:111-116). Use `/reports/overview.avgResolutionMinutes`.
- [x] KPI "P1 volume" and "% of total volume": client counts over 100.
- [x] KPI "Active Catalog Services" = `/admin/services` length (includes retired).
- [x] Only chart = 4 `LinearProgress` bars by priority. Missing (guide 7 + contract):
  - [x] Overview KPIs `GET /reports/overview?from&to` (total, open, critical, resolved, slaViolations, avgResolutionMinutes, avgSatisfaction), max 4 cards.
  - [x] Created vs resolved line, 7/30/90 days: `GET /reports/trends?bucket=day|week&from&to` (`[{date, created, resolved}]`).
  - [x] SLA compliance grouped bars, switch priority/service/technician: `GET /reports/sla-compliance?groupBy=` (`label, met, violated, total, compliancePercent`).
  - [x] Priority donut: `GET /reports/priority-distribution` (`[{label, count}]`, P1-P4 always).
  - [x] Categories top 8: `GET /reports/category-distribution` ("Uncategorized" included).
  - [x] Services ranked bars: `GET /reports/services` (`name, count, serviceId`).
  - [x] Technician workload (load vs maxLoad, avg resolution): `GET /reports/workload` (`name, load, maxLoad, active, avgResolutionMinutes`).
  - [x] Coverage risk matrix (E3): `GET /reports/coverage-risk?onlyFlagged=` (`items[]: category, service, criticality, eligibleCount, eligibleTechnicians, level NO_COVERAGE|SINGLE_HOLDER|THIN|COVERED, message, requiredSkills[{name, holders}], incidentsInWindow`; header `flaggedCount`, `windowDays`, `minHolders`).
  - [x] SLA violations list: `GET /sla/violations?from&to&page&size` (`incidentCode, type RESPONSE|RESOLUTION, overdueSeconds, technician, createdAt`); `getSlaViolations` exists (`api/incidents.ts:715`), unused.
  - [x] Date range picker (`from`, `to`) shared by all charts; presets 7/30/90 days.
  - [x] Export CSV and PDF: `GET /reports/export?type=...&format=csv|pdf&from&to` (download as blob with the auth header; contract returns `text/csv` or `application/pdf`).
  - [ ] Click a bar/slice -> filtered incident list in a drawer (guide 7 rule 6), via `GET /incidents` filters. **Partly done (2026-11-19):** the drawer opens for priority bars and donut slices, service bars and technician bars (#51). Category bars and SLA bars outside the priority view are not clickable (their rows have no ids).
  - [x] Use `recharts` (installed); one message per chart; empty states.
- [ ] Title "Executive Analytics & SLA Reports" + subtitle (guide 5.1 #5). **Partly done (2026-11-18):** title is now "Reports" with a one-line subtitle; the long title was not used.

### G14. Backend features with no screen (admin-relevant)

- [x] **Audit Verify + Seal** (`GET /audit/verify`, `POST /audit/seal`): S3 signature feature.
- [x] **Service Desk Simulator (S1)**: `POST /admin/simulations` (`SimulationRequest {configurations[{name, strategy, technicians, weights{skill, load, experience, priorityFit, familiarity}}] up to 3, lastIncidents, speedUp}` -> `SimulationView {results[ConfigurationView: meanWaitMinutes, meanResolveMinutes, p90ResolveMinutes, slaViolations, slaViolationPercent, fairness, unassigned, matchesRealAssigneePercent, perTechnician[], weights], best, bestReason, assumptions[], workload}`) and `POST /admin/simulations/apply`. One screen: configuration editor, grouped bar chart, assumptions panel, "Apply best". **Done (2026-11-19):** `features/admin/Simulator.tsx` and `simulator/ResultCharts.tsx` (grouped bars) (#48).
- [ ] **Problems / Major Incident Mode**: `GET /problems` (`?status=OPEN`), `GET /problems/{id}`, `GET /problems/{id}/root-cause`, `POST /problems/{id}/resolve`, `DELETE /problems/{id}/incidents/{incidentId}`, `POST /problems` (`CreateProblemRequest`), `GET /problems/recurring`, `GET /problems/known-outages?serviceId=` + `POST /problems/{id}/join` (employee banner). Admin list + detail + "Resolve whole problem" + root-cause path on the graph. **Partly done (2026-11-18):** admin list + detail + "Resolve whole problem" + remove incident + create from recurring built (known-outage banner and join were already done); root-cause path drawn on the graph is missing (paths shown as text).
- [ ] **Demo controls (demo profile only; not in the OpenAPI export)**: `GET /admin/demo/clock` (`{now, offsetMinutes}`), `POST /admin/demo/clock/advance {minutes 1..1440}` (refresh the token after a big jump), `POST /admin/demo/outage-drill {rootServiceId}` (-> `{rootService, problemId, incidentCodes[], dependents[], note}`); show only when the endpoint answers (404 elsewhere). "Director's bar" (+10 min, start drill). **Partly done (2026-11-19):** clock, advance (1 to 1440 minutes, quick buttons), outage drill with a problem link, token refresh (#48). A 404 is treated as demo-only. The persistent Director's bar is not built; its actions are on the page.
- [x] **Live dashboard** `GET /dashboard/live` + STOMP `/topic/dashboard` (events and `COUNTERS` every 30 s; non-admin gets an ERROR frame; close 4001 -> refresh + reconnect). Used by the admin Dashboard (`api/dashboard.ts`, `features/admin/dashboard/`, PR #42); `realtime/useRealtime.ts` subscribes to `/topic/dashboard` and handles close 4001.
- [x] **Service status board** `GET /services/status`, **graph** `GET /services/graph`, **impact** `GET /services/{id}/impact`. **Done (2026-11-19):** status board on Employee Home and `/employee/status`; graph, status and impact on `servicegraph/` (#49).
- [x] **Coverage risk (E3)** screen.
- [x] **SLA violations list** `GET /sla/violations`.
- [x] **Post-incident report + PDF** (`/incidents/{id}/post-incident-report[/pdf]`): `api/incidents.ts`, PDF download on the employee, technician and admin incident screens (commit `39db8c3`).
- [ ] **Saved views** (`/saved-filters`).
- [ ] **Priority what-if** `POST /priority/what-if` (+ explanation on incident detail).
- [ ] **Technician management**: profile, availability, skills with proficiency (`PUT /admin/technicians/{id}`, `/skills`), `GET /technicians?skillId&availability`.
- [ ] **User edit / reactivate / MFA reset** (`PUT /admin/users/{id}`, `POST /admin/users/{id}/mfa/reset`), `GET /admin/users/{id}`.
- [x] **Category edit/deactivate/tree/required skills; skill edit/delete.** **Done (2026-11-19):** #50. The eligible-technician count per category is still missing (G10).
- [x] **Escalation timeout edit; business-hours calendar editor (`sla.business.*`).** **Done (2026-11-19):** #50: one daily window, time zone, working days, holidays and a weekly preview.
- [ ] **Mark duplicate / escalate / assign / edit / attachments** on admin incident detail.
- [ ] **Intelligence tools on incident detail** (thread summary, similar, suggested resolutions, sla-risk, recommendations).
- [ ] **Account security for admins** (`/auth/mfa*` setup with QR, enable/disable) and password reset (shared with other slices).
- [x] **Prometheus/Grafana link** (A8, `backend/observability/`, `/actuator/prometheus` token-guarded): no link; add an "Operations" card linking the Grafana "I-ITSM service desk" dashboard. **Done (2026-11-19):** `dashboard/OperationsCard.tsx` links Grafana (`VITE_GRAFANA_URL`, default `http://localhost:3001`, no token) (#51).
- [x] **Notification preferences / devices** (shared slice) and the "escalation exhausted" admin alerts must appear in Notifications. **Done (2026-11-19):** preferences, push devices (`PushDevicesDialog.tsx`) and an 'Escalation exhausted' badge (#51).
- [ ] Wallboard mode, command palette, calendar heatmap (guide P3): optional.

### G15. Bugs found

1. `api/admin.ts` mock fallbacks: the site shows fiction when the backend is down; every write swallows 4xx and reports success.
2. `Tickets.tsx` `handleSaveReassign`: any failure (403/409/400) is reported as "assigned (Offline mode)" and mock data is mutated.
3. Provisioning/promoting technicians sends `TechnicianRequest` without `experienceLevel` and with non-contract fields: backend 400, masked by the mock catch in `addAdminUserRole`.
4. User "reactivate" calls `DELETE` (deactivate) again; only local mock state flips. Retired services/categories have no reactivate at all.
5. Admin incident detail: comment "Send" posts nothing but toasts success; Force Close and others ignore `allowedActions` (409 in most states).
6. Audit log incident column always "-" and Dashboard "View Ticket" links never appear: use the new `incidentId` (section C).
7. Dashboard: totals/charts/MTTR from 100 incidents; MTTR falls back to hardcoded 32; `/ping` 404 every 5 s; pause button doesn't pause; "Verify Workload Distribution" always says optimal; heatmap deep link `assigneeId` ignored by Tickets; capacity uses non-existent `maxActiveIncidents`; hardcoded fake technician list. **Fixed (2026-11-18):** the Dashboard reads `/dashboard/live` and `/reports/*`; the 100-incident maths, the MTTR 32 fallback, `/ping`, the fake technicians and the dead buttons are gone (PR #42). The Prometheus/Grafana card and wallboard are still open.
8. Reports: MTTR "1.8 hrs / -24 mins" is literal text; all other numbers from 100 incidents; no `/reports/*` call. **Fixed (2026-11-18):** Reports now reads `/reports/*`; the literal numbers are gone.
9. Service graph: invented "$/hr blast radius" and failure-rate sparkline; cascade one hop only; layout by name heuristics; graph endpoints and `reactflow` unused.
10. Services: `code`/`tier` client-only and re-derived from the name after refresh (typed input lost); invented owner and dependency links; health from 100 incidents; literal "100% telemetry nominal".
11. Categories: `defaultPriority`/`description` (and skill `description`) not persisted; column shows blank.
12. SlaPolicies/EscalationSettings: invented `action` text and wrong level labels; delete offered for non-highest levels (backend rejects); empty lists replaced by mock rows.
13. Config: sends all keys on save; Reset likely doesn't discard edits; free text for typed values.
14. Tickets: `escalationLevel` filter param not recognised (`minEscalationLevel`); status filter lacks four statuses; "Live Backend Connected" always true.
15. Users: "Login as User" uses password `Demo@1234` and replaces the admin session with no way back; drawer shows invented workstation/manager/designation; ticket correlation by name.
16. `useRealtime`: admin `/topic/dashboard` invalidates a key nothing uses; no 4001 handling; no backoff. **Partly done (2026-11-18):** the dashboard keys now match `/topic/dashboard` (PR #42); 4001 handling and backoff are not done.
17. Two `AuditEntry` types with different fields. **Done (2026-11-19):** the duplicate admin type is deleted (#51).
18. No error states anywhere in the admin slice; `window.confirm` dialogs; toasts show generic axios messages. **Partly done (2026-11-18):** the Dashboard has error states, and the TechQueue and TechWorkbench toasts use `apiErrorMessage`. The rest is unchanged.
19. 14 files copy the same dark `COLORS` object; hardcoded mono/Sora fonts; ~172 font sizes under 12 px.
20. Orphans `Employees.tsx`, `AllIncidents.tsx`; duplicate route `/admin/incidents/:id`.

### G16. Contract mismatches (frontend vs `iitsm-api.json`)

| Where | Frontend | Contract |
|---|---|---|
| `AdminUser.technician` (`api/admin.ts:16-22`) | `maxActiveIncidents`, `activeIncidentCount`, `skills[].skillName`, no `experienceLevel` | `TechnicianView {activeIncidents, currentLoad, maxLoad, experienceLevel, escalationLevel, availability, skills[{skillId, name, proficiency}]}` |
| `AdminUser.permissions`, `createdAt` | present | not in `AdminUserView` |
| Create user / add role technician payload (Users.tsx:302, 350-356) | `{escalationLevel, availability, maxActiveIncidents, activeIncidentCount}` | `TechnicianRequest` required `escalationLevel`, `experienceLevel`; optional `maxLoad`, `availability`, `skills[{skillId, proficiency}]` |
| `updateTechnicianProfile` (`api/admin.ts:161`) | `yearsOfExperience`, `maxActiveIncidents` | `UpdateTechnicianRequest {escalationLevel, experienceLevel, maxLoad, availability}` |
| `AdminService` (`api/admin.ts:173`) | `code`, `tier`, `directDependencyIds` | `ServiceView {id, name, owner, description, criticality, alwaysP1, active, dependencyIds}` (no code/tier) |
| `AdminCategory` | `description`, `defaultPriority` | `CategoryView {id, name, parentId, requiredSkillIds, active}` |
| `AdminSkill` | `description` | `SkillView {id, name}` |
| `ConfigItem` | `type` | `ConfigItemView {key, value, defaultValue, description}` |
| `AdminEscalationPolicy` | `action`, `targetLevel`, `triggerMinutes` (client aliases) | `{id, priority, level, timeoutMinutes}` |
| `AdminSlaPolicy.calendarType` | maps `'24x7'` to `ALWAYS` | enum `ALWAYS` or `BUSINESS_HOURS` (the `'24x7'` branch is dead) |
| `AuditEntry` (`api/admin.ts:628`) | `actorId`, `actorEmail`, `incidentId`, `occurredAt` | `AuditEntryView {id, action, actor Ref, incidentCode, incidentId, previousState, newState, timestamp, description}`; page `{items, page, size, totalItems, totalPages}` |
| `getAdminAuditLogs` params | `{page, size, incidentId, actorId}` | also `action`, `from`, `to` |
| `IncidentFilters.escalationLevel` (`api/incidents.ts:11`) | `escalationLevel` | `minEscalationLevel` (also `reporterId`, `code` unused) |
| `getAdminServices` dependencies | `dependencyIds` or `directDependencyIds` | `dependencyIds` only |
| `GET /ping` (Dashboard) | called | not in contract (main has `/actuator/health`) |
| `api/services.ts` `getServices/getCategories` | `CategoryItem.serviceId`; categories treated as flat | `GET /categories` is a **tree**; `GET /services` active only `{id, name, criticality}` |
| Escalation level meaning | "Tier N (Team Lead)", "SRE Incident Commander" | 1 team lead, 2 system administrator, 3 IT manager (TEAM_UPDATES M11) |
| Demo endpoints | not called | `GET/POST /admin/demo/clock*`, `POST /admin/demo/outage-drill` are demo-profile only and absent from the export (documented in TEAM_UPDATES) |
| Close button | shown unless CLOSED | `CLOSE` only for VERIFIED (use `allowedActions`) |
| `IncidentAction` type (`api/types.ts:12`) | lacks `WITHDRAW` | contract `allowedActions` enum includes `WITHDRAW` |


---
How this list was made: three parallel audits of `1ea86cc` (one per role slice), each line checked against the contract and `FRONTEND_GUIDE.md`; spot checks of the main claims, build, type check and tests by the backend lead. Update this file as you tick items off.
