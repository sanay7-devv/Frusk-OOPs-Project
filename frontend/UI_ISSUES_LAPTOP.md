# Laptop UI issues (running list, 1280-1440px)

Status: [ ] open, [x] fixed. Fix all at once, then re-check.

## Fixed on branch frontend/fix-link-icon (commit b3110c1)
- [x] Team queue / escalations crash (Link icon import)
- [x] Service status crash when SLA compliance is null
- [x] Reports export row overflows the page
- [x] Audit table clipped (overflow hidden)
- [x] Admin incidents: disabled refresh button inside Tooltip warning
- [x] Problems list has no h1

## Open: naming and wording
- [ ] Config: key names break mid-word ("dup.tfidf.threshold.duplic / ate"); break only after dots
- [ ] Config: "default: 0.80" repeats the column header; show just the value
- [ ] Escalation "Related settings": raw keys (`escalation.exhausted.minutes`) shown under fields; show plain text, key as small hint only
- [ ] SLA page: raw enum "BUSINESS_HOURS" in calendar heading
- [ ] SLA table: "1 days" (plural for 1)
- [ ] Audit: action chip "Sla violated" should be "SLA violated" (acronyms in humanised enums: SLA, P1, AI, LLM...)
- [x] Audit: description "missed by 267574 s" (raw seconds) and "response due 2026-11-20T19:54..." (raw ISO); backend text, make readable
- [ ] Audit: "To is exclusive" helper text is unclear
- [ ] Audit: header "Time (your local time)" wraps
- [ ] Services: "86% of 7" unclear (means 7 judged); "Depends on: Nothing" should be "None"
- [x] Users: "10 / 10 · available" for a full technician; should say full
- [ ] Dashboard: team capacity "10 of 10 load, 4 active" wording
- [ ] Dashboard donut: label "3: 55" lost its "P"; "P1: 10" clipped at the right edge
- [ ] Reports: per-technician "Average time to resolve" is one long run-on line of "X no data · Y 10 min"
- [x] Reports workload chart: "Capacity" legend label nearly invisible

- [ ] Simulator: strategy shown as raw enum "COMPOSITE" (dropdown and weights hint)
- [ ] Dates use 4 formats ("11/21/2026, 12:24:15 AM", "21 Nov 2026, 00:24", "11/15/26, 9:54 PM", "11-14"); use one shared formatter
- [ ] Admin incident detail: audit history shows raw enums (INCIDENT_CREATED, PRIORITY_CALCULATED, SLA_VIOLATED)
- [ ] Admin incident detail: SLA risk factors in camelCase (elapsedTime, technicianLoad, similarHistory)
- [ ] Admin incident detail: section titles mix Title Case and jargon ("SLA Timers & Target", "Admin Command Notes & Discussion", "Compliance PDF Dossier", "ITIL PRIORITY FORMULA BREAKDOWN", "Override Priority"); use sentence case, plain words
- [ ] Admin incident detail: visibility chips "INTERNAL (Ops Only)" / "PUBLIC (Reporter Visible)"; empty lifecycle dates show "-"
- [ ] Wallboard: "Nearest to missing SLA" empty while 40 open (ignores already-breached); big empty panel

- [ ] Lead team queue: heading "Team Triage & Explainable Allocation", breadcrumb Title Case, "Auto-Assign Ticket"; duplicate banner lists 5 codes with "(100%)"
- [ ] Lead escalations: "SUPERVISORY CONSOLE // ESCALATIONS & BREACHES • TIER 1 & 2 SUPERVISION", "Escalation Command & SLA Violations", "Assigned: Unassigned (Triage)", "No subsequent escalation step scheduled. Ticket is at top supervisory tier."
- [ ] Tech queue: "Technician Operational Work Queue", "Live backend · 10s sync", "Live SRE incident triage cockpit · Logged in as ...", "Quota: 10 Max", "(90% Capacity)", "Pending Info (Paused)"
- [ ] Tech workload: "Technician Workload, Capacity & SLA Performance", "Real-time concurrency quotas, shift throughput velocity, and ITIL SLA delivery compliance.", "Live Queue Tickets", "Completed Resolutions", "Next Commitments"
- [ ] Employee home: "Enterprise IT Service Portal", "Window: 30d basis", "SUMMARY 4 Active / 25 Resolved"
- [ ] Employee my incidents: "My Reported Incidents", "29 TICKETS", "Save Current View", "Refresh Feed", headers "Incident code", "SLA clock & bar"
- [ ] Employee report form: jargon for an employee ("Report an Operational Issue or Outage", "01. CORE INCIDENT PARAMETERS", "Mandatory for escalation routing", "SEVERITY METRICS & BLAST RADIUS", "SLA Matrix", "Scope of Operational Impairment", "LVL", "responder rota", "degraded customer-facing service"); level descriptions cut off with "…"
- [ ] 404 page: "Return to Console", "decommissioned"
- [ ] Title Case vs sentence case mixed across buttons and headings app-wide

- [ ] Employee report: AI card "Model Alignment 0.95 / 1.00", "Source: LLM", badge "SLA Matrix: P2 HIGH"
- [ ] Employee guided chat: service choice chips render empty (`{id,name}` read as `{label,value}`)
- [ ] Guided chat: exact service name ("Network") ties with test services, so the chat loops

## Open: layout
- [ ] ALL dropdowns (Select / Menu / Autocomplete) open as a full-height list over the page; make them small popups (max 320px, scroll inside, open below the field)
- [ ] Incident codes wrap onto 3 lines (lead queue cards and detail header, employee my incidents); codes must never wrap
- [ ] Employee my incidents table: cramped (title, date wrap per word), Actions column cut off
- [ ] Tech queue: "Set Away" button wraps; header layout loose
- [ ] Lead queue detail: action buttons stack and wrap ("Problem #2: resolve the whole problem")
- [ ] Incident quick-view drawer: top (code, close button) hidden under the app bar
- [ ] Buttons wrap to 2 lines in page headers (Config Save/Discard, Services "Dependency graph"/"New service", Categories "Add skill"/"Add category", Escalation "Add level"); fix globally (nowrap)
- [ ] Categories table: row cells shifted one column (Status shows under "Eligible technicians", actions under Status, "Actions" header cut off)
- [ ] Admin incidents table: last column (Created) cut off at laptop width
- [x] SLA "Which policy applies?": Service select label overlaps its value
- [ ] Page headers inconsistent (Users/Services/SLA use icon card header; others plain h1)

## Open: data correctness
- [ ] Reports: "Average time to resolve -13 min" (negative)
- [ ] SLA violations count disagrees: dashboard 77 (30 days), reports card 48 (30 days), reports table 78, SLA page "77 breached" total
- [ ] Dashboard "Needs attention: nothing" while 6 P1 open and many SLA breaches
- [ ] Console: GET /api/v1/admin/demo/clock 404 on every page (demo endpoint called outside demo profile)

## Design tweaks (polish pass)
Global (theme / layout, admin worker):
- [x] One product name everywhere: login says "IITSM Platform / Enterprise Incident & Service Command System", app bar says "IITSM Enterprise / COMMAND CENTRE"
- [ ] App bar shows the role twice ("Admin View" switcher plus "ADMIN VIEW" under the name); keep the switcher, show the email or nothing under the name
- [x] Notification badge: hot pink and large; use the theme red, cap at "99+", smaller
- [x] Sidebar: at 768px height the INSIGHT and TOOLS groups (Reports, Audit, Wallboard, Demo, Account) are below the fold with an inner scrollbar; tighten item height and spacing so everything fits at 1366x768; drop the extra "ADMIN CONSOLE" label above "OPERATIONS"
- [ ] Page headers come in 3 styles (plain h1; icon + card; breadcrumb + giant title) with title sizes from ~26px to ~36px; make one `PageHeader` (title, one-line subtitle, actions on the right) and use it on every page
- [ ] Gradient + glow on primary buttons everywhere looks heavy; keep the gradient for the one main action per page, flat for the rest; disabled primary buttons must look clearly disabled
- [ ] Monospace uppercase used for ordinary labels, hints and helper text ("0 to 1", "Window: 30d basis", table headers, card labels); keep mono for codes, numbers and keys only
- [ ] KPI cards differ per page (coloured top border on Dashboard, none on Reports, mono labels on Users/Services); one KpiCard style
- [ ] Tables: rows ~60px tall; use a denser row height on laptop so more rows fit
- [ ] Reserve the scrollbar gutter (`scrollbar-gutter: stable`) so the top bar doesn't jump between pages with and without a scrollbar
- [x] Login: white Google button clashes with the dark card (use the dark outline style); "View Default Database Credentials (Demo)" becomes "Show demo accounts"; "Sign In" / "Email Address" in sentence case; "enterprise account" becomes "account"
Dashboard / charts (admin worker):
- [ ] Line chart curve overshoots (smoothed spline dips around flat days); use monotone interpolation
- [x] Donut centre shows "Avg to resolve / No data"; show the total count instead, or hide the line
- [ ] "Needs attention" empty state is a huge empty box; make it compact
- [ ] Team capacity and live feed have inner scrollbars inside cards; show the top N with a "view all" link
Employee home (employee worker):
- [ ] 18 service tiles each repeating italic "No open P1 or P2 incident here or upstream"; healthy services should be compact (name + green dot), with only degraded and outage tiles expanded; less italic
Lead / tech (staff worker):
- [ ] Too many chips per card (priority, status, MAJOR, LEVEL); combine or reduce; consistent chip sizes

## Less text, more hover (user request, all screens)
- [ ] Remove the small descriptive captions under nearly everything (page subtitles that restate the title, card sub-labels like "Incidents created today" / "Based on reported incidents" / "Currently assigned to you", helper lines under inputs like "Select the degraded customer-facing service", "0 to 1", raw key hints). They read as AI filler.
- [ ] If the text carries real information (a range, a unit, a rule, what a number counts), move it into a hover tooltip: a small muted info icon (ⓘ) next to the label, or a tooltip on the label itself, like VS Code settings
- [ ] Keep visible only: validation errors, units inside the input (e.g. "hours"), and one short page subtitle where it truly helps
- [ ] Shared component: `InfoTip` (label + optional ⓘ with Tooltip, 12px muted icon, keyboard focusable) so every screen does it the same way

## Small polish (micro details)
- [ ] Matching icons: the same thing must use the same icon everywhere (Escalation is a trending-up line in the admin sidebar but a power icon in the lead sidebar; Problems = hub icon in one place, link icon in another; Refresh as icon button on some pages, text button on others); one icon per concept, kept in a shared map
- [ ] Icon sizes and alignment: sidebar, chips and buttons use mixed sizes (16/18/20px); pick 18px in buttons and 20px in the sidebar; vertically centre icons with text
- [ ] Scrollbars: the default thick light scrollbars show inside cards, the sidebar and dropdowns; one thin dark themed scrollbar (WebKit + `scrollbar-width: thin`) app-wide; avoid scroll areas inside cards where a "view all" link works
- [ ] Spacing: card padding varies (16/20/24px) and gaps between sections vary; use one spacing scale
- [ ] Corner radius varies (8/10/12/16px and pill); one radius for cards, one for inputs and buttons
- [ ] Hover and focus: clickable rows and cards need a hover state and a visible keyboard focus ring; links as text buttons need underline on hover
- [ ] Empty states: one style (icon, one line, optional action), compact
- [ ] Loading: skeletons on some pages, spinner on others, blank page on Config first load; one approach
- [ ] Numbers: right-align numeric table columns; use tabular figures so timers don't jiggle
- [ ] Tooltips on icon-only buttons everywhere (edit, delete, more)
- [ ] Truncated text (ellipsis) must show the full text on hover
- [ ] Page title in the browser tab is always "IITSM Enterprise"; set it per page ("Incidents · IITSM")

## Full click-through, 2026-11-21 (every screen, every button, all 4 roles, 1366x768)
Found by clicking every button and running the incident lifecycle end to end (report, acknowledge, start, note, resolve, reopen, verify, rate, withdraw, edit, comment, take over, auto-assign, summarize).

### Broken (feature does not work)
- [ ] `GET /problems/known-outages` returns 400 for employees: the frontend (`api/incidents.ts` `getKnownOutages`) sends no `serviceId`, the backend (`ProblemController.knownOutages`) requires it. The outage banner and "Join outage" never show on Employee home or Service status (and the graph says "0 joined" on every problem). Fix one side: make `serviceId` optional in the backend (list all) or send it
- [ ] Lead "Auto-Assign Ticket" fails with 409 "That technician cannot take more work. Pick another." It picks a full technician instead of skipping full ones; for an automatic action the message makes no sense
- [ ] Lead "Take over" (escalations) fails with the same 409 when the lead is at capacity (Priya 10/10); a lead taking over should not be blocked by load, or the dialog must say so before submit. The Take over button stays disabled with no hint of the minimum reason length
- [ ] Admin assign dialog (Printing/Hardware incident): all 21 technicians are ineligible, only a disabled "Assign now" and no message saying why or what to do
- [ ] Employee opening someone else's incident (`/employee/incidents/224`): blank page, no "not found / no access" message; every request is sent twice (8x 404)
- [ ] Categories: "Edit Hardware" and "Edit VPN" opened no dialog (recheck)
- [ ] Top-bar search box does nothing while typing; only Ctrl+K opens the palette, so there are two searches. Make the box open the palette
- [ ] 404 page renders without the app shell (no sidebar, no top bar)

### Wrong behaviour or wrong data
- [ ] Withdrawn incident still offers "Rate Resolution" and "Post-Incident Report"; the backend accepts the rating (201 POST /feedback). Hide both on WITHDRAWN, and reject feedback for withdrawn incidents in the backend
- [ ] Withdraw toast says "Incident withdrawn and marked as closed." but the status is WITHDRAWN
- [ ] Post-Incident Report for a withdrawn incident is an almost empty dialog ("Duration: 820 minutes", raw minutes); Escape does not close it
- [ ] Comment toast "Your update has been sent to the assigned technician." on an unassigned incident
- [ ] Edit Details saves (PUT) even when nothing changed; only the description is editable, title is not
- [ ] Employee stepper: on RESOLVED the "Remediated" step is not ticked (shows numbers 4 and 5); on REOPENED no step is ticked at all (1 to 5 all plain numbers). Map RESOLVED and REOPENED in the stepper
- [ ] Verify dialog says "you will be invited to rate the resolution" but no rating prompt follows
- [ ] Notifications page: tab "Unread (82)" while "All Notifications (30)"
- [ ] "View Ticket #252" and the toast "received (Incident #253)" show internal ids; the code is INC-2026-00253. Show codes only, never internal ids
- [ ] Tech queue "Pending Info (Paused) (0)" tab lists 1 incident
- [ ] Tech workbench resolution clock: "Due 11/15/2026, 10:23 PM" (in the past) instead of "Overdue"
- [ ] Tech workbench header "Priya Nair // Assigned SRE" while the Assignee field says Unassigned; still shown after resolve
- [ ] Lead escalations: rows with "0m overdue"
- [ ] Incidents Export covers the date range only and ignores the active filters
- [ ] Two different assign dialogs: simple dropdown on the incidents list, ranked list on the detail page; use the ranked one in both
- [ ] Three different mark-duplicate dialogs (admin, lead, tech); the tech one has no id input when nothing similar is found
- [ ] Employee My incidents: "Resolved / Closed 25" badge but 20 rows (paging not shown); SLA column shows "Remediated" for closed rows
- [ ] Toasts show raw statuses: "moved to IN_PROGRESS", "INC-2026-00224 is now RESOLVED."
- [ ] A public note toast says "Investigation note appended to timeline." (fine), but the public-note confirm is the only confirm in the app; check other irreversible actions use the same style
- [ ] Login page always shows the demo accounts block ("POSTGRESQL SEED ACCOUNTS … Full system clearance"); show only in the demo profile, behind "Show demo accounts"
- [ ] Console: React duplicate key warning in the audit actor filter (two users named "Priya Lead")
- [ ] Console: validateDOMNesting `<h2>` inside `<h6>` in dialogs (Notification preferences, employee Rate dialog): DialogTitle wraps a Typography h6; use `component="span"` or drop the inner Typography

### Date and time inputs (user request)
- [ ] Native `dd-mm-yyyy --:--` date inputs on Lead escalations (SLA violations From / To), Audit and Incidents filters: labels sit outside the field, format differs per browser locale. Use one shared date-range picker (MUI X DatePicker or one styled `DateRangeField`), label inside, same height as the other filters, a clear button, and display dates in the one app format
- [ ] Every timestamp should use the one shared formatter (see naming list); durations as "5d 16h", never "135h 52m" or "820 minutes" or "54726 s"

### Naming, jargon and wording found in dialogs
- [ ] Resolve dialog: "Resolve Incident", "Root Cause Analysis", "Resolution Actions & Fix Notes", "Steps for Long-Term Prevention", "Mark as Reusable Fix for AI" (Title Case); "Time Spent (minutes)" label appears twice; root cause is a one-line input but allows 2000 chars (use a textarea)
- [ ] Withdraw dialog: "Withdraw Incident Report", raw "WITHDRAWN" in the text, char counter inside the button ("Withdraw Report (10 more chars)"); same for "Reopen Ticket (10 more chars)". Put the counter under the field
- [ ] Rate dialog: "Rate the Resolution", MUI's hidden "Empty" label shows as text; "Submit Feedback"
- [ ] Verify dialog: "Confirm Incident Resolution", "Confirm & Verify"
- [ ] Post-incident dialog title "Post-Incident Report // INC-…" (the `//` style)
- [ ] Edit dialog: "Edit Incident Details", "Update the incident description and diagnostic details:"
- [ ] Take over dialog: label "Reason for taking over" shown twice (label + placeholder)
- [ ] Declare-incident dialog: Service / Category / Impact rows indented and wider than Title, big gap
- [ ] Notification preferences: 40-row list with raw enums (IN_APP, SMS_SIM, WEBSOCKET, INCIDENT CREATED, "Locked by Policy"); make it a matrix (events x channels with checkboxes); "Save Preferences" / "Notification Preferences" Title Case
- [ ] Push devices dialog: "Platform WEB"
- [ ] Team workload dialog: raw AVAILABLE/BUSY, "Weighted load 10 / 10 | 4 active | experience 5" with pipes, skill numbers unexplained, every bar red, "AVAILABLE" at full load
- [ ] Override priority: "WHAT THE PRIORITY ENGINE SAYS", "1 users"
- [ ] Append note dialog: "SRE INTERNAL WORKBENCH // … Append Investigation Note", "Save to Incident Timeline"
- [ ] Assign dialog: "Ranked with strategy COMPOSITE", raw OFF_DUTY / AWAY, "is AWAY"; ineligible people listed first (list eligible first)
- [ ] Reassign dialog: "Currently with X" mixed into the reason helper text
- [ ] Saved views: a big empty box when there are none
- [ ] New SLA policy dialog: Service label overlaps its value
- [ ] Employee "Save Filter View" dialog Title Case
- [ ] Report success dialog: "Target SLA Resolution: 01:54 PM" without a date
- [ ] Simulator toast grammar is odd
- [ ] Timeline: raw enums (WORK_STARTED, SLA_VIOLATED, DUPLICATE_LINKED), "missed by 54726 s"; visibility chips "INTERNAL (Techs & Admins Only)" / "PUBLIC (Visible to Reporter)"
- [ ] Lead intelligence panel: camelCase risk factors (elapsedTime, technicianLoad, similarHistory), "source: LLM", "EMBEDDING" chip; plain words or move to hover
- [ ] Ctrl+K palette rows show raw "Incident, CLASSIFIED"
- [ ] TOTP: issuer "I-ITSM" vs app name "IITSM"; the raw otpauth link breaks mid-string (hide behind "Can't scan? Show key")
- [ ] Register page: "Create Enterprise Account", "Enterprise Email", password hint in the label differs from the backend rules, "Forgot password?" link on the register page

### Tech workbench and employee detail layout
- [ ] Workbench sidebar box ends at ~770px instead of full height (also on employee detail)
- [ ] Left column short, right column long; balance the two columns
- [ ] 7 chips in the header; risk factors badly aligned; "SERVICES THAT DEPEND ON CRIT3-FFB884" uppercased; "POST-INCIDENT AUDIT DOSSIER"; "Overdue 135h 52m" (use days); Title Case "Back to Queue", "Generate AI Handover", "Download Post-Incident PDF"
- [ ] Post Note and Attach file still offered after RESOLVED (fine for notes, but say "reopen to change")
- [ ] Employee detail: "Problem Record #6" chip shown to employees (internal); stepper jargon ("Remediated", "Verified"); "INCIDENT DIAGNOSTICS & IMPACT DESCRIPTION", "CATEGORY SCOPE Unclassified Triage", "1 User(s)", "PRIORITY DETERMINATION FORMULA" (employees do not need the formula), "Triage Dispatch Queue", "ENGINEERING RESOLUTION LOG"; Similar Incidents tab cut off
- [ ] Employee home: duplicate search sections

### Service dependency graph (admin)
- [ ] Two sidebar items highlighted at once (Services and Dependency graph)
- [ ] Graph nodes load tiny and unreadable at the bottom of the canvas with empty space above; fit to view on load
- [ ] Circular mini graph on the right has no labels or legend
- [ ] Major incident strip: chips "Staged 0 (0 joined)", three identical "Something is broken" chips (add code or service); "Probable root cause: Payment, path Payment" reads oddly when the path is one node
- [ ] (Pending, user's call) Sanay's 50794aa look with the #49 inspector, see the service graph worker PR

### Shell and accessibility
- [ ] Collapsed sidebar hides completely; keep an icon rail
- [ ] Sidebar links and the workspace switcher button have no accessible names; incident list cards are not keyboard focusable
- [ ] Resolve dialog: Root cause and Resolution fields have no real `<label>` (only placeholder-like text)
- [ ] One measured dropdown was 708px tall (confirms the small-popup item in Layout)

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
