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
- [ ] Audit: description "missed by 267574 s" (raw seconds) and "response due 2026-11-20T19:54..." (raw ISO); backend text, make readable
- [ ] Audit: "To is exclusive" helper text is unclear
- [ ] Audit: header "Time (your local time)" wraps
- [ ] Services: "86% of 7" unclear (means 7 judged); "Depends on: Nothing" should be "None"
- [ ] Users: "10 / 10 · available" for a full technician; should say full
- [ ] Dashboard: team capacity "10 of 10 load, 4 active" wording
- [ ] Dashboard donut: label "3: 55" lost its "P"; "P1: 10" clipped at the right edge
- [ ] Reports: per-technician "Average time to resolve" is one long run-on line of "X no data · Y 10 min"
- [ ] Reports workload chart: "Capacity" legend label nearly invisible

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
- [ ] SLA "Which policy applies?": Service select label overlaps its value
- [ ] Page headers inconsistent (Users/Services/SLA use icon card header; others plain h1)

## Open: data correctness
- [ ] Reports: "Average time to resolve -13 min" (negative)
- [ ] SLA violations count disagrees: dashboard 77 (30 days), reports card 48 (30 days), reports table 78, SLA page "77 breached" total
- [ ] Dashboard "Needs attention: nothing" while 6 P1 open and many SLA breaches
- [ ] Console: GET /api/v1/admin/demo/clock 404 on every page (demo endpoint called outside demo profile)

## Design tweaks (polish pass)
Global (theme / layout, admin worker):
- [ ] One product name everywhere: login says "IITSM Platform / Enterprise Incident & Service Command System", app bar says "IITSM Enterprise / COMMAND CENTRE"
- [ ] App bar shows the role twice ("Admin View" switcher plus "ADMIN VIEW" under the name); keep the switcher, show the email or nothing under the name
- [ ] Notification badge: hot pink and large; use the theme red, cap at "99+", smaller
- [ ] Sidebar: at 768px height the INSIGHT and TOOLS groups (Reports, Audit, Wallboard, Demo, Account) are below the fold with an inner scrollbar; tighten item height and spacing so everything fits at 1366x768; drop the extra "ADMIN CONSOLE" label above "OPERATIONS"
- [ ] Page headers come in 3 styles (plain h1; icon + card; breadcrumb + giant title) with title sizes from ~26px to ~36px; make one `PageHeader` (title, one-line subtitle, actions on the right) and use it on every page
- [ ] Gradient + glow on primary buttons everywhere looks heavy; keep the gradient for the one main action per page, flat for the rest; disabled primary buttons must look clearly disabled
- [ ] Monospace uppercase used for ordinary labels, hints and helper text ("0 to 1", "Window: 30d basis", table headers, card labels); keep mono for codes, numbers and keys only
- [ ] KPI cards differ per page (coloured top border on Dashboard, none on Reports, mono labels on Users/Services); one KpiCard style
- [ ] Tables: rows ~60px tall; use a denser row height on laptop so more rows fit
- [ ] Reserve the scrollbar gutter (`scrollbar-gutter: stable`) so the top bar doesn't jump between pages with and without a scrollbar
- [ ] Login: white Google button clashes with the dark card (use the dark outline style); "View Default Database Credentials (Demo)" becomes "Show demo accounts"; "Sign In" / "Email Address" in sentence case; "enterprise account" becomes "account"
Dashboard / charts (admin worker):
- [ ] Line chart curve overshoots (smoothed spline dips around flat days); use monotone interpolation
- [ ] Donut centre shows "Avg to resolve / No data"; show the total count instead, or hide the line
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

## To review before merge (supervisor checklist)
- [ ] PR #72 laptop crash and overflow fixes: CI green, then merge
- [ ] Admin worker PR: Config keys, dropdown popups, buttons not wrapping, Categories columns, drawer offset, PageHeader on all admin pages, login page, demo-clock 404 gone; check at 1366x768 and 1280x720
- [ ] Staff worker PR: lead queue, escalations, tech queue, workload wording and layout; codes on one line
- [ ] Employee worker PR: chat chips show names and the chat completes end to end; report form wording; my incidents table fits; home tiles compact
- [ ] Backend worker PR: no negative resolve time; SLA counts explained and consistent; "Needs attention" correct; readable audit text; chat matches an exact service name; compile plus smoke suites
- [ ] Service graph worker PR: Sanay's 50794aa look with the #49 inspector panel and real data
- [ ] After all merges: one full re-sweep of every screen at 1366x768 (admin, lead, tech, employee), console clean, then tick this file
- [ ] Docs: record the polish pass in FRONTEND_PROGRESS / SYSTEM_GUIDE changelog via the docs keeper; clean up `.playwright-mcp`, `wt-*` worktrees, `_sanay_pr`, `_qr`
- [ ] Still to click-test: submit a real incident end to end, auto-assign, summarize thread, verify and seal the audit chain, CSV/PDF exports, notifications panel, Ctrl+K search, workspace switcher, set away

## Not UI (dev database)
- Smoke-test leftovers in the dev DB (Network-5fb62e, Crit1-ffb884, asha.5fb62e@...); not a code bug, the demo DB is fresh
