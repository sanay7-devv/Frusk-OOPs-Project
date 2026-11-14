# IITSM: Stitch prompt pack v2 (Idea 2, calm and simple)

Refined from DESIGN_BRIEF.md. Same product, same 25 screens, same roles and data. What changes is how much each screen shows, how it looks, and how the prompts are written so Stitch stops producing a congested, "AI-looking" result.

---

## 0. How to use this

1. Open a new Stitch project. Paste **Section 1 (Master prompt)** once.
2. Generate **one screen at a time**. After the master prompt, paste the wrapper line and then the screen block from Section 3:
   `Using the master design system above, generate this one screen only:`
3. Start with the Employee Home or Admin Dashboard. Once it looks right, tell Stitch: `Keep this exact sidebar, top bar, spacing and components on every following screen.`
4. Refine with **one change per prompt**. Long multi-change prompts bring the clutter back.
5. Paste **Section 2 (Sample data)** when Stitch starts inventing perfect round numbers.

---

## 1. Master prompt (paste first)

```text
Design "IITSM", a web app for IT incident and service management. Real people use it every day: employees report problems, technicians fix them, team leads assign work, admins configure the system.

Make it a calm, professional, human-looking product in the spirit of Freshservice, Linear and Notion. It must NOT look like a futuristic command center, a sci-fi dashboard or a generic AI template.

PRINCIPLES
- Clarity over decoration. A user should know what to do within 5 seconds of opening any screen.
- One primary focus per screen. Everything else is visibly secondary.
- Maximum 4 content blocks per screen. If something is not needed to act now, hide it behind a tab, a drawer or a "More" menu.
- Tables and lists first, charts second. Max 2 charts on any screen.
- Colour carries meaning only (priority, status, SLA risk). Never use colour for decoration.
- Align everything to an 8px grid, generous whitespace, left-aligned text, consistent paddings.
- No gradients, no glow, no pulsing or blinking, no glassmorphism, no heavy shadows.

THEME
- Page background: warm off-white #FAF9F7. Cards and tables: white, 1px border #E7E5E4, radius 8px, no shadow (shadow only on drawers and modals).
- Text: #1C1917 primary, #78716C secondary.
- Single brand accent: deep teal #0F766E, used only for primary buttons, links, active sidebar item (soft teal tint #CCFBF1 background) and focus rings.
- Priority (dot + plain text label, never filled pills): P1 Critical #D32F2F, P2 High #ED6C02, P3 Medium #F9A825 (use #B45309 for the text), P4 Low #2E7D32.
- Status (small dot + plain text, no filled chips): New and Closed grey, In progress teal, Waiting on you purple #8E24AA, Resolved green #2E7D32, Reopened red text. Show only these groups.
- SLA time: plain text such as "Due in 2h 10m". Grey when safe, amber under 25% left, red when overdue. Nothing else changes.
- Font: Public Sans. Sentence case everywhere. No ALL-CAPS labels. Monospace only for ticket codes like INC-2026-00042.
- Sizes: page title 24px semibold, section title 16px semibold, body 14px, captions 12px.

APP SHELL (identical on every screen after login)
- Left sidebar 232px, white, icon + label items, soft teal tint on the active item. IITSM logo at the top of the sidebar. Navigation changes by role.
- Top bar 56px: search on the left, then workspace switcher (only if the user has several roles), notification bell with a small count, avatar menu (profile, sign out). Nothing else.
- Page header inside the content area: title on the left (with a count where useful), the single primary action on the right.
- Content max-width 1200px, centered, 24px padding.

COMPONENTS
- Buttons: one solid teal primary per screen, other actions outlined or text-only, 8px radius, no uppercase.
- Tables: white, sticky header, 56px rows, 1px row dividers, quiet hover tint, no zebra stripes, pagination at the bottom, clicking a row opens it.
- Filters: a "Filters" button that opens a right-side drawer. Show only the 3 most useful filters inline.
- Forms: labels above inputs, helper text under inputs, only required fields visible, optional fields under "More details".
- Modals: centered, 560px (720px for complex forms), simple dark scrim.
- Loading: simple grey skeleton rows. Empty states: one calm sentence and one button, no cartoon illustrations.

HUMAN FEEL
- Plain-language labels ("Needs attention", not "Active war room"). No jargon badges, no technical micro-text, no "heartbeat", "telemetry" or "websocket" labels.
- Use realistic, slightly imperfect sample data: real-sounding names and ticket titles like "VPN not connecting from home". Avoid round numbers like 100%, 50, 10.
- Same layout, spacing and components on every page so it reads as one product.
```

---

## 2. Sample data pack (paste when Stitch gets generic)

```text
Use this sample data. Do not invent perfect round numbers.

People: Elena Vance (Admin), Marcus Chen (Technician, Network), Sarah Jenkins (Team Lead), Priya Patel (Technician, Cloud), Alex Rivera (Technician, Access), Meher Jammula (Employee), Karthik Singaraju (Employee), Rahul Pillai (Employee).

Services: VPN, Payment Gateway, Email and Calendar, Employee Portal, Wi-Fi, Laptop and Devices, Billing Worker, Elasticsearch.

Incidents (code, title, service, priority, status):
INC-2026-00095, "Payment gateway returning 504 errors", Payment Gateway, P1, In progress
INC-2026-00089, "Search results timing out", Elasticsearch, P2, In progress
INC-2026-00084, "VPN not connecting from home", VPN, P3, New
INC-2026-00081, "Laptop battery swelling", Laptop and Devices, P2, Waiting on you
INC-2026-00077, "Cannot join meetings in calendar app", Email and Calendar, P3, Resolved
INC-2026-00072, "Wi-Fi drops on 3rd floor", Wi-Fi, P4, In progress
INC-2026-00066, "Shared mailbox permissions missing", Email and Calendar, P4, Closed

Numbers: 34 open, 2 critical, 5 at risk, 11 resolved today, SLA met 94.6% over 30 days, average resolution 38 minutes.
```

---

## 3. Screen prompts

Each block says the one thing the screen is for, what it shows, and what to leave out. Navigation per role is listed in 3.0.

### 3.0 Navigation per role

- **Employee:** Home, Report incident, My incidents
- **Technician:** My queue, Workload
- **Team lead:** Team queue, Escalations
- **Admin:** Dashboard, Incidents, Users, Services, Reports, Audit log, and a collapsible "Settings" group holding SLA policies, Categories, Scoring and assignment, Escalation rules
- Notifications live on the bell in the top bar for every role (not in the sidebar).
- The service dependency graph is a "List | Graph" toggle inside Services (route stays `/admin/services/graph`).

### Public screens

**Screen 1: Login (`/login`)**
```text
Screen: Login. Centered 400px white card on the warm off-white background. IITSM logo and a one-line welcome on top.
Show: Work email, Password with show/hide icon, "Sign in" primary button, small "Register" link.
Below the card, a quiet line "Try a demo account:" with four text links (Administrator, Team lead, Technician, Employee) that fill the form. No chips.
States: loading spinner inside the button; a simple inline error line above the button ("Email or password is incorrect").
Leave out: illustrations, marketing panels, social login.
```

**Screen 2: Register (`/register`)**
```text
Screen: Create account. Same centered card as login.
Show: Full name, Work email, Department (optional dropdown), Password, Confirm password, "Create account" primary button, "Already have an account? Sign in" link.
Password rules appear as helper text under the field only while it is focused or invalid (8 to 72 characters, at least 1 letter and 1 digit).
States: inline field errors; banner only for "This email is already registered".
```

### Employee

**Screen 3: Employee home (`/employee/home`)**
```text
Primary focus: tickets that need the employee's reply, and the button to report a new problem.
Header: "Good morning, Meher" with a solid teal "Report an incident" button on the right.
1. If any ticket needs a reply or verification: one single row with a soft amber tint: code, title, "Needs your reply", and a "Respond" button. Hide the row if nothing is waiting.
2. One compact strip (not cards) with three plain numbers: Open, Waiting on you, Resolved.
3. "Recent incidents" table, 5 rows: Title + code, Service, Status, Priority, Last updated. "View all" link below.
Empty state: "Nothing open right now." with a "Report an incident" button.
Leave out: charts, banners other than the one above, decorative illustrations.
```

**Screen 4: Report incident (`/employee/report`)**
```text
Primary focus: a short form that is quick to finish.
Single centered column, 640px wide, page title "Report an incident".
Visible fields: Title, Description, Affected service (searchable dropdown).
Under the description, one quiet suggestion line when available: "Suggested category: Network > VPN" with an "Apply" text button. If similar open incidents exist, show at most 2 as a small list titled "Similar open incidents" with a "View" link each.
"More details" (collapsed): Category, Impact 1 to 5 and Urgency 1 to 5 (segmented controls with short labels), Number of affected users, Attachments (simple drop area, PNG, JPG, PDF, TXT, LOG, 5MB each, up to 10).
Footer: "Cancel" text button, "Submit incident" primary button.
Also design: (a) Duplicate-warning modal, 720px, two columns comparing "Your report" and "Existing incident", buttons "Join existing ticket" and "Submit anyway". (b) Success screen: incident code, priority, expected resolution time, and a collapsed "How priority was decided" section.
Leave out: the right-hand AI panel, glowing or gradient AI cards.
```

**Screen 5: My incidents (`/employee/incidents`)**
```text
Primary focus: find one of my tickets quickly.
Header: "My incidents (23)".
Toolbar: search, tabs All / Open / Resolved / Closed, a "Filters" button (service, date range) opening a right drawer.
Table: Title + code, Service, Status, Priority, Created, Due, Assigned to. Pagination at the bottom.
Empty state: "No incidents match these filters." with "Clear filters".
```

**Screen 6: Employee incident detail (`/employee/incidents/:id`)**
```text
Primary focus: what is happening with my ticket, and what do I need to do.
Top: code, title, status and priority text. Under it a slim, small horizontal progress line (New, Assigned, In progress, Resolved, Closed) with the current step highlighted in teal.
Left 2/3: description, then a conversation thread (author, role in plain text, time, message) and a reply box.
Right 1/3: "Details" card (service, assigned technician, reported on, expected by). Below it, one action card that appears only when relevant:
- Status Waiting on you: the technician's question, a reply box, attach button, "Send reply".
- Status Resolved: root cause summary, buttons "Yes, it's fixed" (primary) and "Still broken" (outlined, asks for a reason). After confirming, a simple 5-star rating and an optional comment.
Leave out: heavy stepper graphics, extra widgets.
```

### Technician

**Screen 7: Technician queue (`/tech/queue`)**
```text
Primary focus: what should I work on next.
Header: "My queue" on the left. On the right: "3 of 5 active" with a thin progress bar and an Available / Busy toggle.
Tabs: Needs acknowledgment (4), In progress (3), Waiting on user (1), At risk (2).
List sorted by SLA deadline, one row per ticket: priority dot + label, code, title, service, reporter, SLA time text, and an "Acknowledge" button (outlined) on tickets that need it.
Overdue tickets use red SLA text only. No blinking, no red card backgrounds.
Empty state: "Your queue is clear."
```

**Screen 8: Technician workbench (`/tech/incidents/:id`)**
```text
Primary focus: understand the issue, talk to the reporter, resolve it.
Header: code, title, status, priority. On the right: ONE primary contextual button (Acknowledge, Start work or Resolve) and a "More" menu holding Request info, Escalate, Reassign.
Left 62%: short description and impact line; conversation with two tabs, "Public reply" and "Internal note". The Internal note tab has a very light amber tint and a "Only visible to staff" hint so no one posts to the wrong place. Reply box below.
Right 38%: "Details" card (reporter, service, priority, SLA due); one "Suggested fix" card showing only the best match with an "Apply fix" button; "Similar incidents" and "Timeline" as collapsed sections.
Also design the Resolve modal (720px): Root cause, Resolution notes, Steps taken, Time spent (minutes), checkbox "Save as reusable solution", buttons Cancel and Resolve incident.
Leave out: risk gauges, multiple AI panels.
```

**Screen 9: Technician workload (`/tech/workload`)**
```text
Primary focus: how loaded am I and what is due soon.
Header: "My workload" with an availability dropdown (Available, In training, Out of office) on the right.
1. One strip of three numbers: Active tickets 3 of 5, Average resolution 38 min, SLA met 96%.
2. "Upcoming deadlines" table, 5 rows: code, priority, title, time left, status.
3. "Resolved per day" simple bar chart, last 14 days, with a one-line takeaway under the title.
Show a calm amber banner only when the technician is at 100% capacity. No gauges or donuts.
```

### Team lead

**Screen 10: Team queue (`/lead/team-queue`)**
```text
Primary focus: assign unassigned tickets fast.
Left 60%: queue table: Priority, Code + title, Service, Created, SLA time, Assignee ("Unassigned" in grey).
Right 40%: panel that opens when a row is selected, titled "Suggested technicians": the top 3 as rows with avatar, name, match percentage, current load (e.g. 2 of 5) and an "Assign" button. The best match gets the text "Best match" next to its name, no badge.
Before any selection the panel shows "Select a ticket to see suggestions."
Leave out: score breakdown charts, extra metrics.
```

**Screen 11: Escalations (`/lead/escalations`)**
```text
Primary focus: tickets stuck at level 1 that I must act on.
Header: "Escalations (4)".
List rows: priority, code + title, "Escalated from Marcus Chen", time in escalation (red text when past the limit), and buttons "Acknowledge" and "Reassign".
Empty state: "No escalations. Nice."
```

### Administrator

**Screen 12: Admin dashboard (`/admin/dashboard`)**
```text
Primary focus: what needs attention right now.
Header: "Good morning, Elena". Optional small date text on the right.
Top row: exactly 4 stat cards, each with a label, a large number and one small trend text: Open incidents 34, Critical (P1) 2, SLA at risk 5, Met SLA (30 days) 94.6%.
Main area, left 2/3: "Needs attention", a list of the 5 most urgent tickets (priority dot, code, title, service, assignee avatar, SLA time) and a "View all incidents" link.
Right 1/3: "Team workload", 4 agents with avatar, name and a thin bar (4/5), then a small line chart "Incidents this week" with a one-line takeaway.
Leave out: live event feed, donut charts, heatmaps, uptime or region labels, status tickers, war-room banners.
```

**Screen 13: Incidents console (`/admin/incidents`)**
```text
Primary focus: find and open any incident.
Header: "Incidents (123)" with an outlined "Export CSV" button.
Toolbar: search, tabs All / Unassigned / Overdue / Critical, "Filters" button opening a right drawer (service, priority, status, assignee, date).
Table: checkbox, Title + code, Requester, Priority, Status, Assigned to, Due. A small action bar ("Assign", "Change status") appears only when rows are selected. Pagination at the bottom.
```

**Screen 14: Admin incident detail (`/admin/incidents/:id`)**
```text
Same layout as the technician workbench so the product feels consistent.
Differences: the header has an "Admin actions" menu (Override priority, Force reassign, Mark duplicate, Close). The conversation area has two tabs, "Conversation" and "Activity history". The right panel has editable properties (status, priority, assignee, service, escalation level, SLA due) and a collapsed "Priority score breakdown".
Every override opens a small modal that requires a reason.
```

**Screen 15: Users (`/admin/users`)**
```text
Primary focus: manage who can do what.
Header: "Users (48)" with search.
Table: avatar + name, email, role(s) in plain text, Status (Active toggle), Skills (count, for technicians). Row click or "Edit" opens a right drawer: role checkboxes, active toggle, and for technicians a skills tag input, max concurrent tickets and availability.
```

**Screen 16: Services (`/admin/services`)**
```text
Primary focus: keep the service catalog accurate.
Header: "Services (14)" with a "List | Graph" toggle and an "Add service" button.
List view table: Service, Business criticality (1 to 5 as five small dots), "Always P1" toggle, Open incidents, Status dot (Operational, Degraded, Down). Row click opens an edit drawer.
```

**Screen 17: Service dependency graph (`/admin/services/graph`)**
```text
The "Graph" view of Services. Full-width light canvas.
Nodes: small white rounded rectangles with service name and a status dot. Edges: thin grey lines with small arrowheads, laid out left to right.
An outage service gets a red outline; services affected downstream get an amber outline. Everything else stays neutral.
Clicking a node opens a right side panel: service name, criticality, depends on, depended on by, open incidents.
Controls: zoom in/out and fit-to-screen only. A tiny legend with 3 entries. No minimap, no neon edges.
```

**Screen 18: SLA policies (`/admin/sla`)**
```text
Primary focus: spot missing or wrong targets.
Header: "SLA policies". If gaps exist, a single line under the title: "3 combinations have no target" (amber text).
A matrix: rows = services, columns = P1, P2, P3, P4. Each cell shows "Response / Resolution" in minutes (e.g. 15 / 240) and is editable on click. Missing cells show "Add target" with a dashed outline.
A sticky "Save changes" bar appears only when something was edited.
```

**Screen 19: Categories (`/admin/categories`)**
```text
Two panes. Left 35%: category tree with expand/collapse and an "Add category" button. Right 65%: details of the selected category: name, parent service (dropdown), required skills (tags), "Save".
Empty right pane: "Select a category."
```

**Screen 20: Scoring and assignment (`/admin/config`)**
```text
Two stacked white sections.
1. "Priority scoring": three sliders (Impact, Urgency, Business criticality) with a running total on the right ("100% total"). Total turns red text with a message if not 100%.
2. "Assignment strategy": a vertical list of radio options, each with a one-line plain description.
Sticky "Save changes" and "Discard" bar appears only when something changed.
```

**Screen 21: Escalation rules (`/admin/escalation`)**
```text
A single table: rows = P1 to P4, columns = Level 1, Level 2, Level 3, each cell an editable timeout in minutes (e.g. 20 min). One-line explanation above the table. Sticky "Save changes" bar when edited.
```

**Screen 22: Audit log (`/admin/audit`)**
```text
Primary focus: a trustworthy record that is easy to scan.
Header: "Audit log" with an outlined "Export" menu (CSV, JSON).
Toolbar: search, action-type dropdown, actor dropdown, date range.
Dense table: Time, Incident code, Actor (or "System"), Action, Change shown as "Assigned > In progress", and a Note column that expands on row click. Pagination.
Leave out: colourful action badges (plain text only).
```

**Screen 23: Reports (`/admin/reports`)**
```text
Primary focus: answer one question per tab.
Header: "Reports" with a date-range dropdown (Last 30 days, Last quarter, Custom) and one "Export" menu (PDF, CSV).
Tabs: Summary, SLA compliance, Technician performance, Service stability.
Each tab: at most 2 charts and 1 table. Every chart has a plain-English title, e.g. "Are we meeting our SLA targets?", and a one-line takeaway under it. Target line is dashed grey, actual line is teal.
Empty state: "Not enough data for this period."
```

### Shared

**Screen 24: Notifications (`/notifications`)**
```text
Centered 720px list. Header: "Notifications" with an "Unread only" toggle and "Mark all as read" text button.
Each item: small icon, bold title (e.g. "Reply needed on INC-2026-00042"), one-line excerpt, time. Unread items show a small teal dot and bold title, with no tinted background. Click opens the ticket.
Empty state: "You're all caught up."
```

**Screen 25: Error and access denied**
```text
Centered 480px white card on the warm background. Small neutral icon (not a big red warning), a plain title ("Something went wrong" or "You don't have access to this area"), a one-sentence explanation, a primary button ("Reload page" or "Go to my home"), and a text link "Sign out and start again".
A collapsed "Show technical details" section with a copy button for the stack trace.
```

---

## 4. Follow-up prompts when Stitch drifts

- `Remove all decorative text, badges, monospace labels and icons that do not help the user act.`
- `Reduce this screen to 4 content blocks. Move the rest into tabs, a drawer or a "More" menu.`
- `Use colour only for priority, status and SLA risk. Make everything else neutral.`
- `Increase whitespace and make the main table or list the clear visual focus.`
- `Replace filled pills and chips with a dot and plain text.`
- `Make this feel more human: use realistic names and imperfect numbers, and rewrite jargon labels in plain language.`
- `Match the sidebar, top bar, spacing and components exactly to the previous screen.`

## 5. What changed from DESIGN_BRIEF.md

| Area | Original brief | In this version |
|---|---|---|
| Brand colour | Corporate blue #1565c0 | Deep teal #0F766E on warm off-white |
| Font | Inter | Public Sans |
| Statuses | 10 filled colour chips | 5 groups shown as dot + text |
| Priority | Filled badges | Dot + text; same code colours kept |
| Cards and shadows | Shadow on every card | 1px border, shadow only on drawers and modals |
| Admin dashboard | KPIs, charts, gauges, watchlist, live feed | 4 stats, Needs attention list, team workload, one small chart |
| Report incident | Right-hand AI Copilot panel | One quiet suggestion line, single-column form |
| Workbench | Several side panels | One suggested fix, other sections collapsed |
| Admin navigation | 11 items | 6 items + collapsed Settings group; graph lives inside Services |
| Notifications | Sidebar item and bell | Bell only |
| Urgent state | Blinking red highlight | Red SLA text only |
| Priority and status tokens | Mandatory code values | Kept, so your theme code only needs the primary colour, background and font changed |
