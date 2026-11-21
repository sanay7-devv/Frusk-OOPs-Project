# I-ITSM recorded demo: full script (about 19 minutes)

Built from the course brief (section 9 "Project Demonstration", the evaluation rubric, the OOP requirements and the innovation list) and the run sheet in DEC-45. **The report and the video are due on 22.11.2026 (hard deadline).** The file is named `<GroupNo>_OOP_S1_2025-2026_Project` as the brief says.

## 1. What the video must prove (brief, section 9 and rubric)

| Brief requirement | Where in this script |
|---|---|
| Three complete workflows | Segment 3 (report to assignment), 4 (investigate to resolve), 5 (outage: related incidents correlated and escalated). They are the brief's own three examples |
| Every member introduces themselves and explains a module | Segment 1 (intros), then each person owns a segment (table in section 2) |
| OOP quality is a major criterion | Segment 2 (pillars and 9 design patterns) and segment 9 (the patterns in code) |
| Rubric: Functionality 60, Technical depth 15, Design 10, UX 10, Innovation 10, Testing 5, Presentation 10 | Each segment ends with a "Marks hit" line |
| Different GUI for different users | Segment 3 to 5 switch between employee, technician, team lead and administrator screens on purpose |
| Innovation items (brief list) | AI classification, resolution suggestion, similarity, root cause, predictive SLA risk, dependency graph, real-time notifications, chatbot, event-driven design, live dashboard, analytics, automatic escalation: all shown, see section 6 |

## 2. Who speaks (fill in the names)

| Segment | Speaker | Module they explain |
|---|---|---|
| 1 Opening, team | all four, 15 seconds each | self-introduction |
| 2 Architecture and OOP | Backend lead | Domain model, patterns, layers |
| 3 Workflow 1 | Frontend lead (clicks) with Backend lead (voice-over of the rules) | Reporting, priority, assignment, notifications |
| 4 Workflow 2 | Backend lead | Lifecycle (State pattern), SLA, escalation |
| 5 Workflow 3 | Frontend lead | Problems, correlation, service graph |
| 6 Administrator | Frontend lead | Dashboard, reports, live settings, simulator |
| 7 Security and audit | Backend lead | Authentication, authorization, sealed audit trail |
| 8 Code and tests | Testing teammate | Tests, quality gate, CI |
| 9 Patterns in code | Backend lead (or Testing teammate) | The patterns, file by file |
| 10 Close | Report teammate | Report, what is next |

Total about 19 minutes. If a take runs long, cut in this order: 6 (reports tab), then the second half of 7, then 9 shrinks to three patterns.

## 3. Before you press record (15-minute checklist)

1. Start Docker Desktop and the database container `iitsm-db`.
2. Stop the old backend and start the **latest `main`** with the **`demo` profile** on an empty database (Flyway builds the schema and loads the demo seed). The clock controls and the outage drill exist only in the `demo` profile, and the outage banner and auto-assign fixes need the latest `main`. Port: free 8080 with `net stop MTAgentService`, otherwise `SERVER_PORT=8081`.
3. Start the frontend. Browser at 1366x768 or 1920x1080, zoom 100%, dark theme, notifications muted, bookmarks bar hidden.
4. Open four private windows already signed in (so there are no password prompts on camera): employee `employee1@iitsm.demo`, technician and team lead `priya.nair@iitsm.demo`, administrator `asha.rao@iitsm.demo`. The demo password is on the login panel ("Show demo accounts").
5. Have a mail inbox tab and the chat-webhook room open to show channels. Have the LLM key set in the git-ignored `backend/.env` (never show that file on screen). Without a key the keyword fallback still works, but the AI badge says "Keyword".
6. Dry run workflows 1 to 3 once, then **reset the demo database** so the take starts from the same state every time.
7. Terminal ready with `.\mvnw.cmd -q test` typed but not run, and the repo open in the IDE at the pattern files listed in segment 9.
8. Screen recorder at 1080p, microphone check, one member records, the others read their segment from this script.

## 4. The script

Format: **SAY** is spoken (plain words, no jargon without a one-line meaning). **DO** is what the screen shows. **Marks hit** names the rubric rows.

### Segment 1. Opening and team (0:00 to 1:15)

DO: Title slide: "I-ITSM, Intelligent IT Service Management and Incident Resolution". Then each member on camera or on a name card.

SAY (Report teammate, 20 seconds): "Every company has the same problem: people report IT problems by chat, email and phone, and technicians decide by gut feeling who gets what and when. Our system, I-ITSM, takes a reported problem and does the whole job: it works out how urgent it is, picks the best technician, starts the right clock, warns before the clock runs out, escalates by itself, and writes down every decision with the reason."

SAY (each member, 15 seconds): "I am [name], I built [module]." Backend lead: the domain model, rules and API. Frontend lead: the four user interfaces. Testing teammate: tests, database scripts and the pipeline. Report teammate: report and documentation.

SAY: "We will show three complete workflows, the administrator tools, security, and then the code."

Marks hit: Presentation (10), Design (10).

### Segment 2. Architecture and object-oriented design (1:15 to 3:00)

DO: Open the layer diagram (`docs/SYSTEM_GUIDE.md`, section 3), then the class diagram. Keep each image on screen about 20 seconds.

SAY (Backend lead): "The system has four layers: web, application, domain and infrastructure. The important rule is that the **domain layer has no Spring and no web code**. It is plain Java, so the business rules can be tested and reasoned about alone. Services return view objects, never entities, so the database model cannot leak to the screen."

SAY: "Each object-oriented idea from the brief has a home. **Encapsulation**: an incident changes only through its own methods. **Abstraction and interfaces**: priority, assignment and notification are interfaces. **Polymorphism**: the engine does not know which strategy it runs. **Inheritance** only where there is a real is-a: all errors extend one `ItsmException` that carries a code and an HTTP status. **Composition**: an incident owns its SLA tracker."

SAY: "We use nine design patterns, and each solves a real problem rather than decorating the code." Show the one-line list: State for the incident lifecycle, Strategy for priority and assignment, Observer for events, Factory for creating incidents, Repository for storage, Adapter for external services, Chain of Responsibility for technician eligibility, plus Command and Template Method.

SAY: "Stack in one breath: Java 21 and Spring Boot because the brief asks for OOP and Spring gives dependency injection for the interfaces; PostgreSQL for transactions and strict constraints; Flyway so the schema is versioned; React for the interface; WebSocket for live updates."

Marks hit: Design (10), Technical depth (15), OOP requirements.

### Segment 3. Workflow 1: report, prioritize, assign, notify (3:00 to 7:00)

Brief workflow: employee reports, system prioritizes, technician assigned, notification generated.

DO (employee window): Employee home. Click **Report incident**. Use the guided chat or the form and type: "Printer on floor 3 jams on every job and nobody can print."

SAY: "The employee writes in plain words. Nothing else is required."

DO: The AI card fills category, impact and urgency. Point at the badge ("AI" or "Keyword").

SAY: "The system suggests the category, impact and urgency. If the language model is down, a keyword engine takes over, so the form never breaks. The employee can change anything."

DO: Type a second report on the same service. The duplicate warning appears.

SAY: "Before saving, it compares with open incidents on the same service. A very similar one is flagged, so the desk does not get ten tickets for one problem."

DO: Submit. The success dialog shows the SLA target. Switch to the employee "My incidents" list: the new row, status, clock.

SAY (Backend lead): "Priority is not a guess. It is impact times urgency times the service's criticality times a users multiplier, and the screen shows that formula." DO: open the incident, show the priority explanation, then the **what-if** (change impact and affected people, watch the priority change, nothing is saved).

DO (administrator window): Admin incidents, open the new incident, click **Assign**. The ranked list opens.

SAY: "Technicians are ranked by skill match, current load and availability. Each person has a reason: someone away, someone at full load, someone without the skill is shown as not selectable, and **why**. That is the explainable part." DO: pick the best fit, assign.

DO: Admin **Config** page: change the assignment strategy and save. Open the assign dialog on another incident: the ranking changes.

SAY: "Strategies are objects, and the choice is a live setting. No restart, no code change."

DO: Switch to the technician window: bell shows the new incident. Open the mail tab: the HTML email. Open the chat room: the webhook message.

SAY: "One event, six channels: inbox, live push, email, simulated SMS, simulated mobile push and a chat webhook. The incident only publishes an event; the notification module listens. That is the Observer pattern."

Marks hit: Functionality (60: create, classify, service, impact, priority, SLA, assign, notify), Innovation (AI classification, duplicate detection, smart technician recommendation), UX (10).

### Segment 4. Workflow 2: investigate, monitor SLA, resolve, notify (7:00 to 10:30)

Brief workflow: technician investigates, SLA monitored, incident resolved, user notified.

DO (technician window): Tech queue. Open the assigned incident. Click **Acknowledge**.

SAY (Backend lead): "The incident is a state machine. Acknowledge is allowed only from Assigned, and the response clock stops. If a person tries an action in the wrong state, the server answers 409. If the wrong person tries, it answers 403. Wrong person and wrong state are different errors on purpose." DO: click **Start investigation**.

DO: Open **Suggested resolutions** and **Similar incidents** tabs, then **Generate AI handover**.

SAY: "For an incident that looks like an old one, the system suggests the fix that worked before, and can summarize the thread into a handover note."

DO: Click **Request info (pause SLA)**. Switch to the employee window, answer the question, switch back.

SAY: "Waiting for the requester is not the technician's fault, so the SLA clock pauses and resumes when the answer arrives."

DO (administrator window, **Demo** page): advance the demo clock by +20 minutes on an incident close to its limit.

SAY: "To avoid waiting in real time we move the system clock. Every rule reads one injected clock, so this is the real logic running at real durations, only faster." DO: the SLA warning notification appears; advance again: the violation appears.

DO (team lead window, **Escalations**): show the unacknowledged P1 that climbed the chain and the "next escalation at" preview.

SAY: "An unacknowledged critical incident climbs level by level without anybody pressing a button. The lead sees who it will go to next."

DO (technician window): **Resolve incident**, fill root cause, fix notes, time spent, save as reusable fix. Employee window: **Verify fix**, rate, then open the incident **audit trail**.

SAY: "The employee confirms, rates the fix, and every step, who did it and why, is in the timeline." DO: **Download post-incident PDF**.

Marks hit: Functionality (track, monitor SLA, record activities, close), Design (State pattern), Technical depth (clock injection), Innovation (automatic escalation, predictive SLA risk).

### Segment 5. Workflow 3: many incidents, correlation, escalation (10:30 to 14:00)

Brief workflow: multiple incidents reported, duplicates and related incidents identified, correlated and escalated.

DO (administrator window, **Demo** page): click **Outage drill**.

SAY (Frontend lead): "A database outage hits several services. Within seconds, several employees report different symptoms: one cannot log in, one cannot pay, one cannot open the portal."

DO: Admin **Problems**: one problem record now holds the linked incidents. Open it.

SAY: "The system grouped them. Two rules: the same service reported many times, or related services through the dependency graph. One problem, many incidents."

DO: Admin **Dependency graph**: the outline on the probable root cause, red services downstream.

SAY: "From the incidents and the graph the system proposes the **probable root cause**: the service that everything affected depends on. Click a service and the panel shows its health and what depends on it."

DO (employee window): Home shows the known-outage banner. Click **Join**.

SAY: "Employees see the known outage and join it instead of filing another ticket. The number of affected people goes up, and so does the priority."

DO: show the problem's priority and affected-people count climbing as employees join; the escalation raises the level.

DO (team lead window, **Problems**): click **Resolve the whole problem**.

SAY: "One fix, one resolution, and every linked incident closes with the same root cause, and everyone is notified."

Marks hit: Functionality, Innovation (incident correlation, automated root-cause analysis, service dependency graph, real-time notifications), UX.

### Segment 6. The administrator (14:00 to 16:00)

DO: **Dashboard** (live counters move without refresh; "Needs attention" lists breached incidents first). **Wallboard**. **Reports**: pick last 30 days, download the PDF and the CSV. **SLA policies**: calendar with business hours. **Service Desk Simulator**: pick a workload and two strategies, run, show the bar chart, **Apply**.

SAY (Frontend lead): "The dashboard updates by WebSocket. Reports export to PDF and CSV. 83 settings are live: thresholds, weights, strategies, lockout. The simulator replays a workload under different strategies, so an administrator can see which setup meets more SLAs before changing anything."

Marks hit: Functionality (reports and analytics), UX (SLA, configuration), Innovation (analytics, live dashboard).

### Segment 7. Security and audit (16:00 to 17:30)

DO: Login page: enter a wrong password until lockout. Show different menus for employee, technician, lead, admin. As an employee, open another person's incident: "not found or no access". Account security: turn on two-factor, show the QR code.

SAY (Backend lead): "Passwords are hashed, tokens are short lived, repeated failures lock the account, and every screen and endpoint checks a permission, not a role name. Two-factor uses standard authenticator apps."

DO: Admin **Audit**: filter by incident, then **Verify chain**.

SAY: "The audit trail is append-only and sealed: each record carries a hash chained to the one before, and seals are written on a schedule. If anybody edits a past row in the database, the verification points to the exact record that was changed." Optional, if rehearsed: change one audit row in the database, press Verify, show the failure.

Marks hit: User experience (security), Functionality (authorization, audit), Technical depth.

### Segment 8. Code quality and tests (17:30 to 18:30)

DO: Run `.\mvnw.cmd -q test` and let it finish (Docker running, Testcontainers starts a real PostgreSQL). Then show the pipeline page with green checks (backend tests with migrations, frontend tests, production build, seed integrity, demo stack round trip).

SAY (Testing teammate): "Unit tests cover the domain rules, integration tests run against a real PostgreSQL with the real migrations, and architecture rules fail the build if the domain layer imports Spring. Smoke suites per module call the real API: authorization, business rules and edge cases such as wrong state, wrong person and invalid input. Every pull request must pass the pipeline before merging."

Marks hit: Testing (5), Technical depth (15).

### Segment 9. The patterns in code (18:30 to 19:15)

DO (IDE, 10 seconds each, scroll to the type name only): `Incident` and its state classes (State), `PriorityStrategy` and `AssignmentStrategy` (Strategy), `IncidentChanged` and its listeners (Observer), `IncidentFactory` (Factory), `EligibilityFilter` chain (Chain of Responsibility), the repository interfaces (Repository), the external service clients (Adapter).

SAY: "Seven required patterns, all visible, each in one place."

### Segment 10. Close (19:15 to 19:45)

SAY (Report teammate): "In the report you will find the requirement-to-code traceability table, the decision record with the options we rejected, and the scaling plan. Thank you for watching."

## 5. Likely evaluator questions (brief, "Technology choices")

| Question | Short answer |
|---|---|
| Why Java and Spring Boot? | Strong typing, interfaces and dependency injection fit the OOP brief; Spring gives security, validation and scheduling; decision record DEC entries show the alternatives |
| Why PostgreSQL? | Transactions, constraints and indexes for the incident and audit data; Flyway keeps the schema versioned |
| Why this architecture? | Layered with a pure domain so rules are testable and replaceable; events decouple notification, audit and SLA from the incident |
| What else did you consider? | Each decision in `DECISIONS.md` lists the options and the trade-offs; cloud deployment and microservices were decided against for a team of four |
| How does it scale? | `docs/SCALING.md`: index review, scheduled jobs that can run on one node, stateless API behind a load balancer |
| How does the technology support OOP? | Interfaces and dependency injection make strategies interchangeable; the domain layer is framework-free |

## 6. Rubric and innovation coverage in one table

| Rubric row (marks) | What the viewer sees |
|---|---|
| Functionality (60) | The 14 mandatory steps across workflows 1 to 3 |
| Technical depth (15) | Clock injection, live settings, Observer events, Flyway, real-time push, third-party language model with fallback |
| Design and architecture (10) | Layer and class diagrams, nine patterns |
| User experience (10) | Different screens per role, ranked assignment with reasons, what-if, SLA and security |
| Innovation (10) | AI classification, duplicate detection, similar incidents and suggested fixes, root-cause from the dependency graph, SLA risk, automatic escalation, chatbot intake, live dashboard, analytics, simulator, sealed audit trail |
| Testing (5) | Tests and pipeline on screen |
| Documentation and presentation (10) | This script, the report, the decision record, the traceability table |

## 7. If something goes wrong on camera

| Problem | Fix |
|---|---|
| Outage banner empty | The backend is not on the latest `main`; restart it |
| AI badge says "Keyword" | No language-model key or no network: say "this is the fallback", it is a feature |
| Assign list shows nobody free | Seed technicians are full; use the demo database (not the dev one) or pick another incident |
| SLA warning does not appear | Advance the demo clock again; it moves forward only |
| Port 8080 busy | `net stop MTAgentService` or run on 8081 |
