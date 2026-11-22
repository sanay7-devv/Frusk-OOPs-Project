# Laptop UI issues (running list, 1280-1440px)

Status: [ ] open, [x] fixed. Source-verified items are checked; the remaining full-screen sweep still needs a running app and live data.

Status 2026-11-22 (reconciled against current main and this cleanup branch): [x] = source-verified or checked live; [ ] = still open or needs live verification. Known-outages and auto-assign need the backend restarted on the latest main to show. Lead take-over at full capacity only got a clearer message; whether a lead may exceed capacity is an open decision.

## Fixed on branch frontend/fix-link-icon (commit b3110c1)
- [x] Team queue / escalations crash (Link icon import)
- [x] Service status crash when SLA compliance is null
- [x] Reports export row overflows the page
- [x] Audit table clipped (overflow hidden)
- [x] Admin incidents: disabled refresh button inside Tooltip warning
- [x] Problems list has no h1

## Open: naming and wording
- [x] Config: key names break mid-word ("dup.tfidf.threshold.duplic / ate"); break only after dots
- [x] Config: "default: 0.80" repeats the column header; show just the value
- [x] Escalation "Related settings": raw keys (`escalation.exhausted.minutes`) shown under fields; show plain text, key as small hint only
- [x] SLA page: raw enum "BUSINESS_HOURS" in calendar heading
- [x] SLA table: "1 days" (plural for 1)
- [x] Audit: action chip "Sla violated" should be "SLA violated" (acronyms in humanised enums: SLA, P1, AI, LLM...)
- [x] Audit: description "missed by 267574 s" (raw seconds) and "response due 2026-11-20T19:54..." (raw ISO); backend text, make readable
- [x] Audit: "To is exclusive" helper text is unclear
- [x] Audit: header "Time (your local time)" wraps
- [x] Services: "86% of 7" unclear (means 7 judged); "Depends on: Nothing" should be "None"
- [x] Users: "10 / 10 · available" for a full technician; should say full
- [x] Dashboard: team capacity "10 of 10 load, 4 active" wording
- [x] Dashboard donut: priority legend uses P1–P4 labels, wraps safely, and keeps counts visible
- [x] Reports: per-technician "Average time to resolve" is one long run-on line of "X no data · Y 10 min"
- [x] Reports workload chart: "Capacity" legend label nearly invisible

- [x] Simulator: strategy shown as raw enum "COMPOSITE" (dropdown and weights hint)
- [x] Dates use 4 formats ("11/21/2026, 12:24:15 AM", "21 Nov 2026, 00:24", "11/15/26, 9:54 PM", "11-14"); use one shared formatter
- [x] Admin incident detail: audit history shows raw enums (INCIDENT_CREATED, PRIORITY_CALCULATED, SLA_VIOLATED)
- [x] Admin incident detail: SLA risk factors use readable names (elapsed time, technician load, similar history)
- [x] Admin incident detail: section titles use sentence case and plain words (SLA timers, Notes and discussion, Audit history)
- [x] Admin incident detail: visibility chips use readable labels; missing lifecycle dates show a dash
- [x] Wallboard: already-breached incidents appear in the empty-at-risk state with a link to the breached list

- [x] Lead team queue: old command-center titles and five-code duplicate banner are gone; the banner is limited to one code plus a remainder count
- [x] Lead escalations: old supervisory-console jargon and top-tier error copy are gone
- [x] Tech queue: old SRE/quota labels are gone; waiting-on-requester and weighted-load labels are plain
- [x] Tech workload: old quota/velocity jargon is gone; page is titled "My workload"
- [x] Employee home: old service-portal and 30-day-basis labels are gone; summary counts use plain words
- [x] Employee my incidents: old reported-incidents labels are gone; paging and total count are shown
- [ ] Employee report form: confirm impact-level descriptions fit at laptop width without truncation
- [x] 404 page: plain "Page Not Found" message and role-appropriate navigation
- [ ] Title Case vs sentence case mixed across buttons and headings app-wide

- [x] Employee report: AI source labels are humanized; confidence is shown as a percentage, not a ratio
- [x] Employee guided chat: service choice chips render empty (`{id,name}` read as `{label,value}`)
- [x] Guided chat: exact service name ("Network") ties with test services, so the chat loops

## Open: layout
- [x] ALL dropdowns (Select / Menu / Autocomplete) open as a full-height list over the page; make them small popups (max 320px, scroll inside, open below the field)
- [x] Incident codes wrap onto 3 lines (lead queue cards and detail header, employee my incidents); codes must never wrap
- [x] Employee my incidents table: confirm title/date wrapping and Actions fit at laptop width
- [x] Tech queue: "Set Away" button wraps; header layout loose
- [x] Lead queue detail: action buttons stack and wrap ("Problem #2: resolve the whole problem")
- [x] Incident quick-view drawer: starts below the app bar; code and close button remain visible
- [x] Buttons wrap to 2 lines in page headers (Config Save/Discard, Services "Dependency graph"/"New service", Categories "Add skill"/"Add category", Escalation "Add level"); fix globally (nowrap)
- [x] Categories table: row cells shifted one column (Status shows under "Eligible technicians", actions under Status, "Actions" header cut off)
- [ ] Admin incidents table: last column (Created) cut off at laptop width
- [x] SLA "Which policy applies?": Service select label overlaps its value
- [ ] Page headers inconsistent (Users/Services/SLA use icon card header; others plain h1)

## Open: data correctness
- [x] Reports: "Average time to resolve -13 min" (negative)
- [ ] SLA violations count disagrees: dashboard 77 (30 days), reports card 48 (30 days), reports table 78, SLA page "77 breached" total. Report presets now use exactly N inclusive calendar days; the remaining count semantics differ across backend endpoints and need backend reconciliation.
- [x] Dashboard "Needs attention: nothing" while 6 P1 open and many SLA breaches
- [ ] Console: the demo-clock probe returns 404 for non-demo CONFIG_MANAGE users. React Query caches the result, so it is not requested on every page; avoid the initial probe outside the demo profile.

## Design tweaks (polish pass)
Global (theme / layout, admin worker):
- [x] One product name everywhere: login says "IITSM Platform / Enterprise Incident & Service Command System", app bar says "IITSM Enterprise / COMMAND CENTRE"
- [x] App bar shows the role twice ("Admin View" switcher plus "ADMIN VIEW" under the name); keep the switcher, show the email or nothing under the name
- [x] Notification badge: hot pink and large; use the theme red, cap at "99+", smaller
- [x] Sidebar: at 768px height the INSIGHT and TOOLS groups (Reports, Audit, Wallboard, Demo, Account) are below the fold with an inner scrollbar; tighten item height and spacing so everything fits at 1366x768; drop the extra "ADMIN CONSOLE" label above "OPERATIONS"
- [ ] Page headers come in 3 styles (plain h1; icon + card; breadcrumb + giant title) with title sizes from ~26px to ~36px; make one `PageHeader` (title, one-line subtitle, actions on the right) and use it on every page
- [ ] Gradient + glow on primary buttons everywhere looks heavy; keep the gradient for the one main action per page, flat for the rest; disabled primary buttons must look clearly disabled
- [ ] Monospace uppercase used for ordinary labels, hints and helper text ("0 to 1", "Window: 30d basis", table headers, card labels); keep mono for codes, numbers and keys only
- [x] KPI cards differ per page (coloured top border on Dashboard, none on Reports, mono labels on Users/Services); one KpiCard style
- [ ] Tables: rows ~60px tall; use a denser row height on laptop so more rows fit
- [x] Reserve the scrollbar gutter (`scrollbar-gutter: stable`) so the top bar doesn't jump between pages with and without a scrollbar
- [x] Login: white Google button clashes with the dark card (use the dark outline style); "View Default Database Credentials (Demo)" becomes "Show demo accounts"; "Sign In" / "Email Address" in sentence case; "enterprise account" becomes "account"
Dashboard / charts (admin worker):
- [x] Line chart curve overshoots (smoothed spline dips around flat days); use monotone interpolation
- [x] Donut centre shows "Avg to resolve / No data"; show the total count instead, or hide the line
- [x] "Needs attention" empty state is a huge empty box; make it compact
- [x] Team capacity and live feed have inner scrollbars inside cards; show the top N with a "view all" link
Employee home (employee worker):
- [x] Service status tiles: healthy services are compact with a green dot; only degraded/outage tiles show detail
Lead / tech (staff worker):
- [ ] Too many chips per card (priority, status, MAJOR, LEVEL); combine or reduce; consistent chip sizes

## Less text, more hover (user request, all screens)
- [ ] Remove the small descriptive captions under nearly everything (page subtitles that restate the title, card sub-labels like "Incidents created today" / "Based on reported incidents" / "Currently assigned to you", helper lines under inputs like "Select the degraded customer-facing service", "0 to 1", raw key hints). They read as AI filler.
- [ ] If the text carries real information (a range, a unit, a rule, what a number counts), move it into a hover tooltip: a small muted info icon (ⓘ) next to the label, or a tooltip on the label itself, like VS Code settings
- [ ] Keep visible only: validation errors, units inside the input (e.g. "hours"), and one short page subtitle where it truly helps
- [x] Shared component: `InfoTip` (label + optional ⓘ with Tooltip, 12px muted icon, keyboard focusable) so every screen does it the same way

## Small polish (micro details)
- [ ] Matching icons: the same thing must use the same icon everywhere (Escalation is a trending-up line in the admin sidebar but a power icon in the lead sidebar; Problems = hub icon in one place, link icon in another; Refresh as icon button on some pages, text button on others); one icon per concept, kept in a shared map
- [ ] Icon sizes and alignment: sidebar, chips and buttons use mixed sizes (16/18/20px); pick 18px in buttons and 20px in the sidebar; vertically centre icons with text
- [x] Scrollbars: the default thick light scrollbars show inside cards, the sidebar and dropdowns; one thin dark themed scrollbar (WebKit + `scrollbar-width: thin`) app-wide; avoid scroll areas inside cards where a "view all" link works
- [ ] Spacing: card padding varies (16/20/24px) and gaps between sections vary; use one spacing scale
- [ ] Corner radius varies (8/10/12/16px and pill); one radius for cards, one for inputs and buttons
- [ ] Hover and focus: clickable rows and cards need a hover state and a visible keyboard focus ring; links as text buttons need underline on hover
- [ ] Empty states: one style (icon, one line, optional action), compact
- [ ] Loading: skeletons on some pages, spinner on others, blank page on Config first load; one approach
- [ ] Numbers: right-align numeric table columns; use tabular figures so timers don't jiggle
- [ ] Tooltips on icon-only buttons everywhere (edit, delete, more)
- [ ] Truncated text (ellipsis) must show the full text on hover
- [x] Page title in the browser tab is always "IITSM Enterprise"; set it per page ("Incidents · IITSM")

## Full click-through, 2026-11-21 (every screen, every button, all 4 roles, 1366x768)
Found by clicking every button and running the incident lifecycle end to end (report, acknowledge, start, note, resolve, reopen, verify, rate, withdraw, edit, comment, take over, auto-assign, summarize).

### Broken (feature does not work)
- [x] `GET /problems/known-outages` returns 400 for employees: the frontend (`api/incidents.ts` `getKnownOutages`) sends no `serviceId`, the backend (`ProblemController.knownOutages`) requires it. The outage banner and "Join outage" never show on Employee home or Service status (and the graph says "0 joined" on every problem). Fix one side: make `serviceId` optional in the backend (list all) or send it
- [x] Lead "Auto-Assign Ticket" fails with 409 "That technician cannot take more work. Pick another." It picks a full technician instead of skipping full ones; for an automatic action the message makes no sense
- [ ] Lead "Take over" can still fail with 409 when the lead is at capacity (Priya 10/10); backend/product owner must decide whether lead takeover bypasses capacity or explain the restriction before submit.
- [x] Take-over confirmation shows the minimum reason length and live character count while the action is disabled.
- [x] Admin assign dialog (Printing/Hardware incident): all 21 technicians are ineligible, only a disabled "Assign now" and no message saying why or what to do
- [x] Employee opening someone else's incident (`/employee/incidents/224`): blank page, no "not found / no access" message; every request is sent twice (8x 404)
- [x] Categories: "Edit Hardware" and "Edit VPN" opened no dialog (recheck)
- [x] Top-bar search box does nothing while typing; only Ctrl+K opens the palette, so there are two searches. Make the box open the palette
- [x] 404 page renders without the app shell (no sidebar, no top bar)

### Wrong behaviour or wrong data
- [x] Withdrawn incident still offers "Rate Resolution" and "Post-Incident Report"; the backend accepts the rating (201 POST /feedback). Hide both on WITHDRAWN, and reject feedback for withdrawn incidents in the backend
- [x] Withdraw toast says "Incident withdrawn and marked as closed." but the status is WITHDRAWN
- [x] Post-Incident Report for a withdrawn incident is an almost empty dialog ("Duration: 820 minutes", raw minutes); Escape does not close it
- [x] Comment toast "Your update has been sent to the assigned technician." on an unassigned incident
- [x] Edit Details saves (PUT) even when nothing changed; only the description is editable, title is not
- [x] Employee stepper: on RESOLVED the "Remediated" step is not ticked (shows numbers 4 and 5); on REOPENED no step is ticked at all (1 to 5 all plain numbers). Map RESOLVED and REOPENED in the stepper
- [x] Verify dialog says "you will be invited to rate the resolution" but no rating prompt follows
- [x] Notifications page: tab "Unread (82)" while "All Notifications (30)"
- [x] "View Ticket #252" and the toast "received (Incident #253)" show internal ids; the code is INC-2026-00253. Show codes only, never internal ids
- [x] Tech queue "Pending Info (Paused) (0)" tab lists 1 incident
- [x] Tech workbench resolution clock: "Due 11/15/2026, 10:23 PM" (in the past) instead of "Overdue"
- [x] Tech workbench header "Priya Nair // Assigned SRE" while the Assignee field says Unassigned; still shown after resolve
- [x] Lead escalations: rows with "0m overdue"
- [x] Incidents Export covers the date range only and ignores the active filters
- [x] Two different assign dialogs: simple dropdown on the incidents list, ranked list on the detail page; use the ranked one in both
- [x] Mark-duplicate dialogs: admin/lead share one dialog; technician dialog includes a manual ID when no similar incident is found
- [x] Employee My incidents: total count and page controls are visible; completed rows say "Done" rather than "Remediated"
- [x] Toasts show raw statuses: "moved to IN_PROGRESS", "INC-2026-00224 is now RESOLVED."
- [ ] A public note toast says "Investigation note appended to timeline." (fine), but the public-note confirm is the only confirm in the app; check other irreversible actions use the same style
- [x] Login page always shows the demo accounts block ("POSTGRESQL SEED ACCOUNTS … Full system clearance"); show only in the demo profile, behind "Show demo accounts"
- [x] Console: React duplicate key warning in the audit actor filter (two users named "Priya Lead")
- [x] Console: validateDOMNesting `<h2>` inside `<h6>` in dialogs (Notification preferences, employee Rate dialog): DialogTitle wraps a Typography h6; use `component="span"` or drop the inner Typography

### Date and time inputs (user request)
- [x] Native `dd-mm-yyyy --:--` date inputs on Lead escalations (SLA violations From / To), Audit and Incidents filters: labels sit outside the field, format differs per browser locale. Use one shared date-range picker (MUI X DatePicker or one styled `DateRangeField`), label inside, same height as the other filters, a clear button, and display dates in the one app format
- [x] Every timestamp should use the one shared formatter (see naming list); durations as "5d 16h", never "135h 52m" or "820 minutes" or "54726 s"

### Naming, jargon and wording found in dialogs
- [x] Resolve dialog: plain labels, one time-spent field, and a multiline root-cause field
- [x] Withdraw/reopen dialogs: sentence-case titles, no raw status enum, and the character count sits below the field
- [x] Rate dialog: plain title and action; the empty rating label is hidden
- [x] Verify dialog: plain confirmation question and action
- [x] Post-incident dialog: plain title, without the `//` command-center style
- [x] Edit dialog: plain title and concise helper text
- [x] Take-over dialog: reason is shown once as the field label
- [ ] Declare-incident dialog: confirm field alignment and spacing at laptop width
- [x] Notification preferences: 40-row list with raw enums (IN_APP, SMS_SIM, WEBSOCKET, INCIDENT CREATED, "Locked by Policy"); make it a matrix (events x channels with checkboxes); "Save Preferences" / "Notification Preferences" Title Case
- [x] Push devices dialog: "Platform WEB"
- [x] Team workload dialog: raw AVAILABLE/BUSY, "Weighted load 10 / 10 | 4 active | experience 5" with pipes, skill numbers unexplained, every bar red, "AVAILABLE" at full load
- [x] Override priority: "WHAT THE PRIORITY ENGINE SAYS", "1 users"
- [x] Append note dialog: uses the plain title "Add note" and a direct save action
- [x] Assign dialog: "Ranked with strategy COMPOSITE", raw OFF_DUTY / AWAY, "is AWAY"; ineligible people listed first (list eligible first)
- [x] Reassign dialog: "Currently with X" mixed into the reason helper text
- [x] Saved views: empty state is compact when there are none
- [x] New SLA policy dialog: Service label overlaps its value
- [x] Employee saved-view dialog: current action is sentence case ("Save this view")
- [x] Report success dialog: target fix time uses the shared date-and-time formatter
- [x] Simulator toast: confirmation now says assignment settings are active for new incidents
- [ ] Timeline: verify backend descriptions and visibility with live data; action names and state transitions are humanized in the UI
- [x] Lead intelligence panel: risk factors and matching sources use readable labels
- [x] Ctrl+K palette: incident status hints use readable labels
- [ ] TOTP: raw setup URI is no longer printed, but issuer consistency is set by the backend and still needs review
- [x] Register page: "Create Enterprise Account", "Enterprise Email", password hint in the label differs from the backend rules, "Forgot password?" link on the register page

### Tech workbench and employee detail layout
- [ ] Workbench sidebar box ends at ~770px instead of full height (also on employee detail)
- [ ] Left column short, right column long; balance the two columns
- [ ] Workbench: check header chip density and column balance at laptop width; dates and overdue durations use shared formatting
- [ ] Post Note and Attach file still offered after RESOLVED (fine for notes, but say "reopen to change")
- [ ] Employee detail: confirm the Similar reports tab fits at laptop width; employee-visible labels and resolution details are simplified
- [x] Employee home: source contains no duplicate search section

### Service dependency graph (admin)
- [x] Two sidebar items highlighted at once (Services and Dependency graph); only the most specific route is active
- [x] Graph nodes fit to view when the layout changes
- [x] Circular mini graph on the right has a health legend
- [x] Major incident strip identifies incidents by code/service and avoids repeating a one-node root path
- [ ] (Pending, user's call) Sanay's 50794aa look with the #49 inspector, see the service graph worker PR

### Shell and accessibility
- [x] Collapsed sidebar hides completely; keep an icon rail
- [x] Sidebar links and workspace switcher have accessible names; incident list rows/cards support keyboard navigation
- [x] Resolve dialog: Root cause and Resolution fields have no real `<label>` (only placeholder-like text)
- [x] One measured dropdown was 708px tall (confirms the small-popup item in Layout)

### Works (verified 2026-11-21)
Login + wrong-password error, forgot password page, register page, 2FA QR, Ctrl+K search, account menu, sign out; incident submit (INC-2026-00254); AI category suggestion; acknowledge, start, public note (with confirm), resolve; employee comment, edit, withdraw, reopen, verify, rate; lead summarize thread (LLM); simulator run; AI handover; CSV and PDF report downloads, audit CSV, workload CSV, post-incident PDF; audit chain verify (2348 records, 11 seals).

Not click-tested (state-changing, left alone on purpose): seal now, set away, resolve whole problem, deactivate/retire, demo clock and outage drill, discard/reset config.

## To review before merge (supervisor checklist)
- [ ] PR #72 laptop crash and overflow fixes: CI green, then merge
- [ ] Admin worker PR: Config keys, dropdown popups, buttons not wrapping, Categories columns, drawer offset, PageHeader on all admin pages, login page, demo-clock 404 gone; check at 1366x768 and 1280x720
- [ ] Staff worker PR: lead queue, escalations, tech queue, workload wording and layout; codes on one line
- [ ] Employee worker PR: chat chips show names and the chat completes end to end; report form wording; my incidents table fits; home tiles compact
- [ ] Backend worker PR: no negative resolve time; SLA counts explained and consistent; "Needs attention" correct; readable audit text; chat matches an exact service name; compile plus smoke suites
- [ ] Service graph worker PR: Sanay's 50794aa look with the #49 inspector panel and real data
- [ ] After all merges: one full re-sweep of every screen at 1366x768 (admin, lead, tech, employee), console clean, then tick this file
- [ ] Docs: record the polish pass in FRONTEND_PROGRESS / SYSTEM_GUIDE changelog via the docs keeper; clean up `.playwright-mcp`, `wt-*` worktrees, `_sanay_pr`, `_qr`
- [ ] Still to click-test: seal now, set away, resolve whole problem, workspace switcher between roles, mobile widths (deferred)

## Not UI (dev database)
- Smoke-test leftovers in the dev DB (Network-5fb62e, Crit1-ffb884, asha.5fb62e@...); not a code bug, the demo DB is fresh
