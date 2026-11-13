# I-ITSM Backend: Decision Record

> **Purpose.** Every significant design decision, in the order it was taken: *when* (date and module), *what* we chose, *which alternatives* we weighed, *why*, the *trade-off* we accept, and the **cross-questions an examiner is likely to ask**, with short answers. Use it to prepare for the demo and viva.
>
> **How it relates to other docs.** `ROADMAP.md` section 6 keeps the short index (D-numbers); this file holds the full reasoning. `SYSTEM_GUIDE.md` explains *what* the system does; this file explains *why* it is built that way.
>
> **Rule.** A new decision gets an entry in the same change as the code. Decisions on innovative features are taken together with the team, after comparing options.

**Status values:** ✅ Accepted · 🔁 Superseded · ⏳ Temporary (will be removed) · 📌 Deferred · 🕓 Proposed (waiting for the user's choice)

---

## Index

| # | Decision | When | Module | Status |
|---|---|---|---|---|
| [DEC-01](#dec-01-layered-monolith-with-four-layers) | Layered monolith with four layers | 2026-10-15 | Setup | ✅ |
| [DEC-02](#dec-02-spring-boot-411-instead-of-3x) | Spring Boot 4.1.1 instead of 3.x | 2026-10-15 | Setup | ✅ (supersedes 3.5) |
| [DEC-03](#dec-03-postgresql-with-flyway-migrations) | PostgreSQL with Flyway migrations | 2026-10-15 | Setup | ✅ |
| [DEC-04](#dec-04-google-sign-in-as-an-extra-not-a-replacement) | Google sign-in as an extra, not a replacement | 2026-10-15 | M2b | ✅ (not built yet) |
| [DEC-05](#dec-05-one-global-error-handler-and-one-error-shape) | One global error handler and one error shape | 2026-10-16 | M1 | ✅ |
| [DEC-06](#dec-06-request-id-in-a-header-not-in-the-error-body) | Request ID in a header, not in the error body | 2026-10-16 | M1 | ✅ |
| [DEC-07](#dec-07-temporary-schema-auto-profile) | Temporary `schema-auto` profile | 2026-11-06 | M2 | ⏳ |
| [DEC-08](#dec-08-user-composed-of-roles-single-table-role-hierarchy) | User composed of roles; single-table role hierarchy | 2026-11-06 | M2 | ✅ |
| [DEC-09](#dec-09-authorize-by-permission-not-by-role-name) | Authorize by permission, not by role name | 2026-11-06 | M2 | ✅ |
| [DEC-10](#dec-10-stateless-jwt-access-tokens-carrying-permissions) | Stateless JWT access tokens carrying permissions | 2026-11-06 | M2 | ✅ |
| [DEC-11](#dec-11-rotating-hashed-refresh-tokens-with-theft-detection) | Rotating, hashed refresh tokens with theft detection | 2026-11-06 | M2 | ✅ |
| [DEC-12](#dec-12-lockout-logic-inside-the-user-entity) | Lockout logic inside the `User` entity | 2026-11-06 | M2 | ✅ |
| [DEC-13](#dec-13-an-injected-clock-everywhere) | An injected `Clock` everywhere | 2026-11-06 | M2 | ✅ |
| [DEC-14](#dec-14-services-return-view-records-never-entities) | Services return view records, never entities | 2026-11-06 | M2 | ✅ |
| [DEC-15](#dec-15-soft-delete-for-services-and-categories) | Soft delete for services and categories | 2026-11-06 | M3 | ✅ |
| [DEC-16](#dec-16-cycle-free-service-dependency-graph) | Cycle-free service dependency graph | 2026-11-06 | M3 | ✅ |
| [DEC-17](#dec-17-global-sla-default-uniqueness-checked-in-code) | Global SLA default uniqueness checked in code | 2026-11-06 | M3 | ✅ |
| [DEC-18](#dec-18-live-configuration-as-an-immutable-validated-snapshot) | Live configuration as an immutable, validated snapshot | 2026-11-06 | M3 | ✅ |
| [DEC-19](#dec-19-state-pattern-with-stateless-state-objects) | State pattern with stateless state objects | 2026-11-06 | M4 | ✅ |
| [DEC-20](#dec-20-403-means-wrong-person-409-means-wrong-moment) | 403 means wrong person, 409 means wrong moment | 2026-11-06 | M4 | ✅ |
| [DEC-21](#dec-21-hide-incidents-from-strangers-with-404) | Hide incidents from strangers with 404 | 2026-11-06 | M4 | ✅ |
| [DEC-22](#dec-22-optimistic-locking-on-incidents) | Optimistic locking on incidents | 2026-11-06 | M4 | ✅ |
| [DEC-23](#dec-23-sla-state-computed-on-read-not-stored) | SLA state computed on read, not stored | 2026-11-06 | M4 | ✅ |
| [DEC-24](#dec-24-incident-search-with-the-criteria-api-and-fetch-joins) | Incident search with the Criteria API and fetch joins | 2026-11-06 | M4 | ✅ |
| [DEC-25](#dec-25-priority-as-a-strategy-plus-separate-override-rules) | Priority as a strategy plus separate override rules | 2026-11-06 | M5 | ✅ |
| [DEC-26](#dec-26-smaller-interpretations-of-the-handbook) | Smaller interpretations of the handbook | 2026-11-06 | M3, M4 | ✅ |
| [DEC-27](#dec-27-which-features-were-deferred-and-why) | Which features were deferred, and why | 2026-11-06 | M2, M4 | 📌 |
| [DEC-28](#dec-28-service-familiarity-as-a-fifth-assignment-factor) | Service familiarity as a fifth assignment factor | 2026-11-06 | M6 | ✅ team decision |
| [DEC-29](#dec-29-skill-score--70-best-proficiency--30-coverage) | Skill score = 70% best proficiency + 30% coverage | 2026-11-06 | M6 | ✅ team decision |
| [DEC-30](#dec-30-explainable-recommendations-top-3-factor-scores-excluded-list) | Explainable recommendations | 2026-11-06 | M6 | ✅ team decision |
| [DEC-31](#dec-31-priority-fit-prefers-juniors-for-p3-and-p4) | Priority fit prefers juniors for P3 and P4 | 2026-11-06 | M6 | ✅ |
| [DEC-32](#dec-32-round-robin-as-the-universal-tie-breaker) | Round-robin as the universal tie-breaker | 2026-11-06 | M6 | ✅ |
| [DEC-33](#dec-33-auto-assign-on-creation-only-when-the-incident-has-a-category) | Auto-assign on creation only with a category | 2026-11-06 | M6 | ✅ |
| [DEC-34](#dec-34-admin-user-management-rules) | Admin user management rules | 2026-11-06 | M2 | ✅ |
| [DEC-35](#dec-35-full-scope-no-timeline) | Full scope, no timeline | 2026-11-07 | All | ✅ |
| [DEC-36](#dec-36-api-contract-generated-from-code-plus-a-planned-resource) | API contract generated from code plus a planned resource | 2026-11-07 | Contract | ✅ |
| [DEC-37](#dec-37-sla-monitor-one-transaction-per-incident-fire-once-alerts) | SLA monitor: one transaction per incident, fire-once alerts | 2026-11-07 | M7 | ✅ |
| [DEC-38](#dec-38-audit-trail-through-events-same-transaction-for-actions-own-transaction-for-refusals) | Audit trail through events: same transaction for actions, own transaction for refusals | 2026-11-07 | M8 | ✅ |
| [DEC-39](#dec-39-one-company-business-hours-calendar-in-app_config) | One company business-hours calendar in app_config | 2026-11-07 | M7 | ✅ user decision |
| [DEC-40](#dec-40-notification-preferences-and-templates) | Notification preferences and templates | 2026-11-07 | M9 | ✅ user decision, to build |
| [DEC-41](#dec-41-shared-repository-layout-backend-and-frontend-folders) | Shared repository layout: backend/ and frontend/ folders | 2026-11-10 | Repo | ✅ |
| [DEC-42](#dec-42-design-review-of-the-open-questions-for-m9-to-m14) | Design review of the open questions for M9 to M14 | 2026-11-13 | M9 to M14 | ✅ review, user may veto |
| [DEC-43](#dec-43-rubric-driven-additions-for-full-marks) | Rubric-driven additions for full marks | 2026-11-13 | All | ✅ accepted, with the priorities in DEC-45 |
| [DEC-44](#dec-44-three-signature-features) | Three signature features | 2026-11-13 | M10 to M13 | ✅ user approved, shaped for the demo video (DEC-45) |
| [DEC-45](#dec-45-plan-shaped-by-the-recorded-demo) | Plan shaped by the recorded demo | 2026-11-13 | All | ✅ |
| [DEC-46](#dec-46-fixes-from-the-code-and-frontend-review) | Fixes from the code and frontend review | 2026-11-13 | M9 to M14 | ✅ |
| [DEC-47](#dec-47-five-features-that-answer-the-briefs-named-challenges) | Five features that answer the brief's named challenges | 2026-11-13 | M10 to M13 | ✅ user approved |
| [DEC-48](#dec-48-an-unassigned-p1-or-p2-in-triage-escalates-from-level-0) | An unassigned P1 or P2 in triage escalates from level 0 | 2026-11-13 | M11 | ✅ user decision |
| [DEC-49](#dec-49-one-final-alert-when-escalation-is-exhausted) | One final alert when escalation is exhausted | 2026-11-13 | M11 | ✅ user decision |

---

## Architecture and stack

### DEC-01: Layered monolith with four layers

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-15, project setup | Setup | ✅ | ROADMAP D-003, handbook 2.3 |

**Decision.** One deployable Spring Boot application split into four layers: `web` (HTTP), `application` (use cases, transactions), `domain` (business rules, no web code) and `infrastructure` (database, security, external services).

**Options considered.**

| Option | For | Against |
|---|---|---|
| **Layered monolith** ✔ | Simple to run (one process), easy to debug, clear separation for OOP | One database is a scaling point |
| Microservices | Independent scaling and deployment | Network calls, distributed transactions, much more ops work for a 4-person course project |
| Plain MVC without a domain layer | Fastest to write | Business rules end up in controllers; hard to show OOP and to test |

**Why.** The course grades OOP design, and a pure domain layer is where State, Strategy and Factory are visible and testable without Spring. The scale (hundreds of users, a few thousand incidents) does not need distribution.

**Trade-off.** Scaling means running more copies behind a load balancer; the in-memory config cache (DEC-18) would then need a shared cache or a refresh signal.

**Cross-questions.**
- *"Why not microservices?"* No scaling or team-independence need at this size; the cost (network failures, distributed transactions, deployment) would take time away from the domain model. Domain events (M8) give us the seams to split later.
- *"How does the domain avoid depending on Spring?"* Domain classes only use thin JPA mapping annotations; repositories are interfaces in the domain, implemented in infrastructure; domain services like `SlaPolicyResolver` are plain classes registered as beans from `DomainConfig`.

### DEC-02: Spring Boot 4.1.1 instead of 3.x

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-15, setup | Setup | ✅ (supersedes the 3.5 decision of the same day) | ROADMAP D-002, D-004, ERROR_LOG E-006 |

**Decision.** Spring Boot 4.1.1 (Spring Framework 7, Spring Security 7, Hibernate 7, Jackson 3), although the handbook said 3.x.

**Options considered.** Boot 3.5.16 (handbook) · Boot 4.0 · **Boot 4.1.1** ✔.

**Why.** Boot 3.5 reached end of free support on 2026-06-30, and a dependency scan showed many CVEs in Spring, Tomcat and Jackson that will never be patched on 3.5. No code existed yet, so switching was almost free. 4.1 rather than 4.0 because 4.0 support ends 2026-12-31.

**Trade-off.** Fewer tutorials for Boot 4; Jackson 3 uses new package names (`tools.jackson`), so JJWT uses Gson instead of Jackson.

**Cross-questions.**
- *"The handbook says 3.x. Why deviate?"* Security: unpatched CVEs on an out-of-support version. We documented it and the report states 4.1.1.
- *"Any remaining known vulnerabilities?"* Tomcat and Jackson were pinned to patched versions; two medium findings (logback, pgjdbc) are accepted because they are not reachable in our setup (ERROR_LOG E-007).

### DEC-03: PostgreSQL with Flyway migrations

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-15 (team decision in the handbook) | Setup | ✅ | Handbook 1.5 |

**Decision.** PostgreSQL 16; the schema is created by numbered Flyway SQL files; Hibernate only validates (`ddl-auto=validate`).

**Why.** Relational integrity fits users, incidents, SLAs and audit; strong constraints let the database reject bad data too; JSONB holds the priority explanation; versioned migrations make every environment identical and reviewable.

**Cross-questions.**
- *"Why not MongoDB?"* Our data is highly relational (incident ↔ service ↔ category ↔ users ↔ audit) and needs transactions and foreign keys.
- *"Why let Hibernate validate instead of creating tables?"* Generated schemas drift silently; migrations are explicit, reviewed and repeatable.

### DEC-04: Google sign-in as an extra, not a replacement

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-15 | M2b | ✅ approved, not built yet | ROADMAP D-001 |

**Decision.** Keep email and password login; add `POST /auth/google` that verifies a Google ID token and returns the same JWT tokens. `password_hash` becomes nullable and `google_sub` is added.

**Why.** Easier sign-in and a real third-party API integration (graded under technical depth), without breaking the password flows that test cases T19 and T20 depend on.

**Cross-questions.** *"How do you verify the Google token?"* Signature, audience (our client id), issuer, expiry and `email_verified`; behind an interface so tests can fake it (Adapter pattern).

---

## M1 Foundations

### DEC-05: One global error handler and one error shape

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-16 | M1 | ✅ | ROADMAP D-005 |

**Decision.** All business errors are subclasses of one abstract `ItsmException` carrying a code and an HTTP status; one `@RestControllerAdvice` turns every exception (ours, Spring's, validation) into the same JSON body. Errors raised inside security filters use the same shape via `ApiErrorWriter`. Framework errors without a contract code get generic codes (`NOT_FOUND`, `METHOD_NOT_ALLOWED`, ...).

**Options considered.** Try/catch in each controller · Spring's default `ProblemDetail` · **one handler + own hierarchy** ✔.

**Why.** The frontend handles one shape everywhere; the exception hierarchy is a clean inheritance example (every exception *is an* `ItsmException`); no stack traces leak.

**Cross-questions.**
- *"Why unchecked exceptions?"* Business failures cross several layers; checked exceptions would force every method to declare them without adding safety. The handler is the single place they are caught.
- *"What happens with an unexpected error?"* 500 `INTERNAL_ERROR`, no details, the request ID in the message, and the full stack trace in the log.

### DEC-06: Request ID in a header, not in the error body

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-10-16 | M1 | ✅ | ROADMAP D-005 |

**Decision.** Every request gets an ID (reused from a safe incoming `X-Request-Id` or a new UUID), returned in the response header and printed on every log line; unsafe incoming values are replaced.

**Why.** Tracing a problem from a user report to the logs, while keeping the error body exactly as in the contract. Validating the incoming ID prevents log injection.

**Cross-questions.** *"Why validate the incoming ID?"* A client could otherwise inject newlines or fake log lines; only 8 to 64 safe characters are accepted.

---

## M2 Users, roles and authentication

### DEC-07: Temporary `schema-auto` profile

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06, start of M2 | M2 | ⏳ until the V1 to V6 migrations arrive | ROADMAP D-006 |

**Decision.** A separate profile lets Hibernate create the tables from the entities while the migration files (owned by the Testing teammate) have not arrived. Entities are written strictly to Appendix A, so the switch back is: delete the profile, drop the local database once, start with Flyway and `validate`.

**Options considered.** Wait for the migrations · write the SQL ourselves (outside our ownership) · **temporary Hibernate profile** ✔.

**Trade-off.** Meanwhile the database lacks the audit-immutability trigger and DB defaults; every generated table was compared column by column with Appendix A.

**Cross-questions.** *"Doesn't the handbook forbid ddl-auto?"* For the real schema, yes; this is an isolated, documented, temporary profile; the default profile still uses Flyway, and `validate` will prove the entities match the final SQL.

### DEC-08: User composed of roles; single-table role hierarchy

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 | ✅ | ROADMAP D-007 |

**Decision.** `User` *has* one or more `Role` objects (composition). `Role` is abstract with `EmployeeRole`, `TechnicianRole`, `AdministratorRole`, each defining its own permissions. In the database `user_roles` is one table with `role_type` as discriminator; each role owns its `*_profiles` row. A Team Lead is not a class: it is a technician with escalation level 1.

**Options considered.**

| Option | Against |
|---|---|
| `User` subclasses (`Employee extends User`) | A person can be an employee *and* a technician at once; single inheritance cannot express that |
| Role as an enum on `User` | No place for role-specific data or behavior; no polymorphism |
| **Composition of role objects** ✔ | Slightly more mapping work |

**Why.** Multi-role users are a requirement (test cases T25, T26); composition models it naturally, and `getPermissions()` shows polymorphism.

**Cross-questions.**
- *"Why is Team Lead not a subclass?"* It is not a different kind of thing, only a technician at a higher escalation level; one field changes the permissions.
- *"Why inheritance for roles but composition for users?"* A technician role *is a* role (real is-a). A user *has* roles (has-a).

### DEC-09: Authorize by permission, not by role name

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 | ✅ | ROADMAP D-008 |

**Decision.** Seventeen permission keys (`INCIDENT_HANDLE`, `CATALOG_MANAGE`, ...). A user's permissions are the union over their roles; Spring authorities are these keys; endpoints check `hasAuthority('...')`.

**Why.** Multi-role users simply get the union; changing what a role may do is one edit in its class; the handbook asks for permission-based checks.

**Cross-questions.** *"How does karthik (employee + technician) work?"* His permission set is the union; he can report and handle incidents, but never his own (conflict of interest), and admin endpoints still return 403.

### DEC-10: Stateless JWT access tokens carrying permissions

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 | ✅ | ROADMAP D-008 |

**Decision.** 15-minute HS256 access tokens containing user id, roles and permissions; no session on the server; the filter never ends a request itself but records a bad or expired token, so only protected endpoints answer `TOKEN_EXPIRED` or `TOKEN_INVALID`.

**Options considered.** Server sessions with cookies · **stateless JWT** ✔ · JWT with a database lookup on every request.

**Why.** No session storage, works for the React SPA and the WebSocket later; the short lifetime limits the risk of a stolen token.

**Trade-off.** A deactivated user or a role change takes effect only when the current access token expires (at most 15 minutes).

**Cross-questions.**
- *"How do you log someone out with stateless tokens?"* Logout revokes the refresh token; the access token dies within 15 minutes.
- *"Why does a bad token not block /auth/refresh?"* The browser may still send an expired header; refresh must keep working, so the failure is only reported where a login is required.

### DEC-11: Rotating, hashed refresh tokens with theft detection

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 | ✅ | ROADMAP D-008 |

**Decision.** Refresh tokens are 32 random bytes, stored only as SHA-256 hashes, valid once; each refresh issues a new one. Using an old (already rotated) token revokes all of that user's sessions.

**Why.** A database leak exposes no usable tokens; a stolen token is detected the moment either party uses the old one.

**Cross-questions.**
- *"Why SHA-256 and not BCrypt for refresh tokens?"* They are long random values, not guessable passwords; a fast hash is enough and allows lookup by hash.
- *"What if the legitimate user is the one reusing it?"* They are logged out everywhere and log in again: safe by default.

### DEC-12: Lockout logic inside the `User` entity

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 (limits moved to app_config in M3) | ✅ | Handbook 1.7 |

**Decision.** `User.recordFailedLogin(now, maxAttempts, lockDuration)` and `isLockedAt(now)` hold the rule; the service only calls them. The same message is returned for an unknown email and a wrong password, and an unknown email still runs one BCrypt check so both take the same time.

**Why.** A business rule belongs in the domain (encapsulation), testable with a fake clock. Identical messages and timing stop attackers from discovering which emails exist.

**Cross-questions.** *"Why save the failed attempt if the method throws?"* The transaction is marked `noRollbackFor = InvalidCredentialsException`, otherwise the counter would never increase.

### DEC-13: An injected `Clock` everywhere

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 onwards | ✅ | Handbook 2.10 |

**Decision.** One `Clock` bean; no `Instant.now()` in business code.

**Why.** Lockout, SLA deadlines, reopen windows and escalation are time rules; tests can move a fake clock instead of waiting (T08, T20, T22, T23).

### DEC-14: Services return view records, never entities

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M2 onwards | ✅ | Handbook 2.3 golden rules |

**Decision.** Application services build immutable view records inside the transaction (`UserView`, `IncidentDetail`, ...); controllers only see those.

**Why.** No accidental leaks (the password hash can never be serialized), no lazy-loading errors (open-in-view is off), and the API shape is decoupled from the table shape.

---

## M3 Catalog and configuration

### DEC-15: Soft delete for services and categories

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M3 | ✅ | ROADMAP D-009 |

**Decision.** `DELETE` on a service or category sets `active = false`; skills are hard-deleted only when unused.

**Why.** Incidents and history keep referring to old services and categories; deleting them would break reports and the audit trail.

**Cross-questions.** *"What does a user see?"* Inactive items disappear from the pick lists but stay visible to admins and on old incidents.

### DEC-16: Cycle-free service dependency graph

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M3 | ✅ | ROADMAP D-009 |

**Decision.** Before adding "A depends on B", `ItService` walks B's dependencies depth-first (stack + visited set) and refuses the change if it reaches A; the database also refuses a self-dependency.

**Why.** Impact analysis and correlation walk this graph; a cycle would make "what breaks if X fails" loop forever.

**Cross-questions.** *"Complexity?"* O(V + E) per check, trivial for tens of services.

### DEC-17: Global SLA default uniqueness checked in code

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M3 | ✅ | ROADMAP D-009 |

**Decision.** The unique constraint `(service_id, priority)` is backed by a code check for global defaults.

**Why.** PostgreSQL treats two NULLs as different, so the constraint alone would allow two global P1 defaults.

**Cross-questions.** *"Could the database do it?"* Yes, with a partial unique index (`WHERE service_id IS NULL`); that belongs in the migration files, and the code check stays as a clear error message.

### DEC-18: Live configuration as an immutable, validated snapshot

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M3 | ✅ | ROADMAP D-009 |

**Decision.** All settings (27 from the handbook, 30 since DEC-28) are defined in the `ConfigKey` enum (default, meaning, allowed range). `AppSettings` is an immutable snapshot validated as a whole, including cross-key rules (weights sum to 1.0, bands descend). `ConfigService` keeps the snapshot in memory and swaps in a new one **after** the database commit.

**Options considered.** Constants in code · `application.properties` · read the table on every use · **cached immutable snapshot** ✔.

**Why.** The handbook requires runtime changes without restart; a snapshot gives readers a consistent set; swapping after commit means a rolled-back change never reaches the cache; defaults in the enum let the system run without seed data.

**Trade-off.** The cache is per application instance (fine for one instance; several would need a shared cache).

**Cross-questions.** *"How did you prove no restart is needed?"* Setting `security.lockout.attempts` to 2 made the very next account lock after two failures.

---

## M4 Incidents

### DEC-19: State pattern with stateless state objects

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M4 | ✅ | ROADMAP D-010, handbook 2.4 |

**Decision.** `IncidentState` declares every action with a default that throws `InvalidStateTransitionException`; ten subclasses override only their legal moves; `StateFactory` maps the stored status to one shared, stateless instance (EnumMap). States change the incident only through package-private methods.

**Options considered.**

| Option | Against |
|---|---|
| A big `switch` on the status in a service | Every new rule touches one huge method; easy to miss a case |
| Transition table (map of status → allowed statuses) | Good for legality, but preconditions (reasons, windows, notes) end up elsewhere |
| **State pattern** ✔ | More classes |

**Why.** Each status's rules live in one small class; an illegal move is impossible by construction; it is the clearest OOP demonstration of polymorphism.

**Cross-questions.**
- *"Why stateless singletons?"* A state has no data of its own; the incident holds the data, so one instance per status is enough and nothing is allocated per call.
- *"Why are the state methods package-private?"* So only the `Incident` aggregate can drive transitions; other code must go through `incident.acknowledge()` etc.
- *"How do you add a new status?"* One enum value, one state class, one line in `StateFactory`, plus the moves into it.

### DEC-20: 403 means wrong person, 409 means wrong moment

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 (refined after a test found a mix-up, ERROR_LOG E-018) | M4 | ✅ | ROADMAP D-010 |

**Decision.** `IncidentAccessPolicy` decides only *who* may act (403 `UNAUTHORIZED_OPERATION` or `CONFLICT_OF_INTEREST`) and is checked first; the State pattern decides *whether the status allows it* (409 `INVALID_STATE_TRANSITION`). Both together produce `allowedActions`.

**Why.** Clear meaning for the frontend; matches the test cases (T18 → 403, T11 → 409); the frontend never re-implements the rules.

**Cross-questions.** *"A technician acknowledges someone else's incident. 403 or 409?"* 403: wrong person, regardless of the status.

### DEC-21: Hide incidents from strangers with 404

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M4 | ✅ | ROADMAP D-010 |

**Decision.** On read endpoints, someone who may not see an incident gets 404 `INCIDENT_NOT_FOUND`; on action endpoints they get 403. Lists apply role-based visibility in the query itself.

**Why.** "No endpoint returns another user's data" (handbook 2.5 M14), and a 404 does not even reveal that the incident exists. Actions keep 403 because test case T18 expects it.

### DEC-22: Optimistic locking on incidents

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M4 | ✅ | Handbook 2.5 M4 |

**Decision.** A `version` column; two simultaneous saves → one wins, the other gets 409 `OPTIMISTIC_LOCK_CONFLICT`. Clients may send the version they last saw on `PUT` (an addition to the contract).

**Options considered.** Pessimistic row locks (`SELECT ... FOR UPDATE`) · last write wins · **optimistic locking** ✔.

**Why.** Conflicts are rare; no locks held while a user types; no silent lost updates. Verified: two parallel PUTs gave one 200 and one 409 (T24).

### DEC-23: SLA state computed on read, not stored

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M4 | ✅ | Handbook 2.5 M7 |

**Decision.** `OK / WARNING / PAUSED / VIOLATED / MET` is calculated by `SlaTracker.stateAt(now, ...)` whenever an incident is shown; only deadlines, pause time and fire-once flags are stored.

**Why.** A stored state would be stale a second later; computing it is cheap and always correct. The monitor job (M7) still stores the flags so warnings fire exactly once.

**Clarified 2026-11-13 (DEC-42).** "Not stored" means the *display* state. The fire-once warning flags and the violated flags are stored by the monitor (DEC-37), so for up to one monitor interval a detail view can show VIOLATED before the violation row exists. List filters on `slaState` use the stored flags and the status, because with business hours (DEC-39) elapsed time cannot be computed in SQL.

### DEC-24: Incident search with the Criteria API and fetch joins

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M4 (M10 extends it) | ✅ | Handbook 2.10 (N+1) |

**Decision.** One dynamic query (JPA Criteria API) combining all optional filters with visibility, fetch-joining category, service, reporter and assignee, plus a count query for paging.

**Options considered.** Spring Data Specifications · one derived query method per filter combination · **Criteria API behind a domain interface** ✔.

**Why.** Any combination of 12 filters in one query; no N+1 (a page of 20 costs 2 queries, not 80); the domain only sees `IncidentSearch`, not Spring Data types.

---

## M5 Priority

### DEC-25: Priority as a strategy plus separate override rules

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-06 | M5 | ✅ | Handbook 1.7, 2.5 M5 |

**Decision.** `PriorityStrategy` (interface) with `WeightedPriorityStrategy`; override rules are separate small objects (`PriorityOverrideRule`) applied afterwards by `PriorityEngine`; the strategy is chosen by the setting `priority.strategy`; all numbers come from `app_config`. A rule whose condition holds is named in the explanation even when the score already reached its band.

**Why.** A new algorithm is one class (Strategy pattern); rules stay readable and testable one by one; users always see *why* ("score 187, Payment service is always P1").

**Cross-questions.**
- *"Why round down?"* The handbook defines the score as rounded down; it also makes the 59/60 boundary exact (T05).
- *"Can the override lower a priority?"* No, rules only raise it; a manual override by an admin or team lead can set any band, with a recorded reason.

---

## Interpretations and scope

### DEC-26: Smaller interpretations of the handbook

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M3, M4 | ✅ |

Where the handbook was silent or ambiguous, we chose:

| Topic | Our interpretation | Reason |
|---|---|---|
| "Team Lead sees their team" | Team leads see all incidents | The schema has no team concept |
| Who closes | Admins (the `INCIDENT_VIEW_ALL` permission marks admin authority) | Handbook: "System or Admin" |
| Request-info / provide-info messages, reopen and reassign reasons | Stored as incident comments (public or internal) | Appendix A.3 has no message columns |
| `resolvedBy` | The assignee at the time of resolution | No `resolved_by` column in Appendix A.3 |
| Security override rule | Category named Security or any child (Phishing) | Categories are admin data, not code |
| Priority after RESOLVED | Frozen | Deadlines of finished work should not move |
| Missing category, skill, policy | Generic `NOT_FOUND` code | No contract code exists; services, users, incidents keep their own |
| Admin catalog lists | Plain arrays, not paged | Small lists (tens of items) |
| Taken email on register | 400 `VALIDATION_FAILED` on `email` | No dedicated code in the contract |

### DEC-27: Which features were deferred, and why

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M2, M4 | 📌 |

Some endpoints listed under M2 and M4 in the contract are not built yet. Two kinds of reason:

**1. They depend on a later module (cannot be done properly yet).**

| Feature | Needs | Why it must wait |
|---|---|---|
| Audit of `LOGIN_FAILED`, `ACCESS_DENIED` (M2) | M8 audit trail | ✅ Done 2026-11-07 (DEC-38) |
| `GET /incidents/{id}/history` (M4) | M8 | ✅ Done 2026-11-07 (DEC-38) |
| `POST /incidents/{id}/escalate` (M4) | M11 escalation chain | Escalation levels and notifications are the Chain of Responsibility |
| `POST /incidents/{id}/mark-duplicate` and the duplicate check on create (M4) | M12 similarity | Needs similarity scoring and problem records |
| Automatic assignment on create (M4, so T01 ends in ASSIGNED) | M6 strategies | ✅ Done 2026-11-06 (DEC-33) |

**2. No technical dependency; deferred to keep each module small and testable.**

| Feature | Plan |
|---|---|
| Admin user and role management (`/admin/users`, roles, technician skills) | ✅ Done 2026-11-06 with M6 (DEC-34) |
| Feedback on resolved incidents (`POST /incidents/{id}/feedback`) | Small; can be done now |
| Attachments (upload, list, download) | Can be done now; the safety checks (type, 5 MB, safe names) are M14 rules but can be built together |

**Cross-questions.** *"Why is M4 not complete?"* Its core (the full lifecycle, creation pipeline, assignment rules, SLA clocks, concurrency) is done and tested; the remaining endpoints belong to features whose logic lives in later modules (audit, escalation, similarity), so they are built there instead of as throw-away stubs.

### DEC-35: Full scope, no timeline

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-07 | All | ✅ | ROADMAP D-012, CLAUDE.md |

**Decision.** Every feature in the handbook is built in full. The handbook's week-by-week plan, feature and code freeze dates, scope tiers (Tier 1/2/3) and cut order are not used. Work is ordered only by module dependencies (ROADMAP section 5). The extras the handbook labels "Tier 3" are built inside their modules:

| Extra | Built with |
|---|---|
| Business-hours calendar (`BusinessHoursCalendar`, `CalendarType.BUSINESS_HOURS`) | M7 SLA engine |
| Notification preferences | M9 notifications |
| PDF export, saved views (`saved_filters`) | M10 search and reports |
| Thread summarizer | M12 intelligence and AI |
| Dependency graph and impact | M13 real-time and graph |

**Options considered.**

| Option | For | Against |
|---|---|---|
| **Full scope, dependency order** ✔ | Every module and extra is demonstrable; nothing is half-promised in the report | More to build and test |
| Handbook tiers with cut order | Protects the core if time runs short | Extras risk being dropped; less to show for innovation and UX |

**Why.** User decision: the aim is a complete system, and the extras add to the innovation and user-experience marks.

**Trade-off.** No fixed dates to integrate against, so each module is handed to the team as soon as it is verified (contract first, then each module's endpoints).

**Cross-questions.** *"Did you build the optional parts?"* Yes, nothing in the handbook was treated as optional; each extra lives in the module it belongs to (table above). *"Why is the handbook PDF unchanged?"* It is the team's shared reference; this record and the roadmap state the scope rule.

### DEC-36: API contract generated from code plus a planned resource

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-07 | Contract | ✅ | ROADMAP D-013, `docs/openapi/README.md` |

**Decision.** springdoc generates the OpenAPI contract from the controllers and DTOs. Each controller method declares the error codes it can return with `@ApiErrors`; `ApiErrorsCustomizer` turns them into responses with the standard error body and an example. Endpoints of modules not built yet are written once as `openapi/planned-endpoints.json` (from Appendices B and C) and merged in by `PlannedEndpointsCustomizer` under the tag "Planned", each with `x-module` naming the module that delivers it. A planned operation never replaces an implemented one. The exported files in `docs/openapi` are what the team imports.

**Options considered.**

| Option | For | Against |
|---|---|---|
| Hand-written YAML first, code generated from it | Classic contract-first | Two sources of truth; drifts as soon as code changes; generators fight our DTO style |
| **Generated from code + planned resource** ✔ | Implemented part is always exact; the team still sees the whole API now | Planned part is hand-written until its module lands |
| Generated from code only | Simplest | Frontend and Testing cannot mock modules that do not exist yet |

**Why.** The handbook says the generated file is the final truth. Generating it removes drift for everything built, and the planned resource keeps the contract complete for the other roles.

**Trade-off.** The planned file must be pruned as modules land (a planned path that is now implemented is simply ignored, so a stale entry cannot break the contract, but it should be deleted).

**Cross-questions.** *"Is this really contract-first?"* The agreed shapes (Appendices B and C) came first and every endpoint exists in the published contract before it is built; the code then becomes the source for the built part. *"How do you know every error is documented?"* `check_contract.py` fails if an implemented operation lists no 4xx/5xx response, and the endpoint sweep compares the live spec with what the app actually returns.

---

## M7 SLA engine

### DEC-37: SLA monitor: one transaction per incident, fire-once alerts

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-07 | M7 | ✅ | ROADMAP D-014, SYSTEM_GUIDE section 11 |

**Decision.** A scheduled job (`SlaMonitorJob`) runs `SlaMonitor` on the interval in `sla.monitor.interval.seconds`, re-read after every run. The monitor loads the ids of open incidents with a clock not yet violated, then checks each one in its own short transaction. The rules live in the domain: `Incident.checkSla` hands both clocks to `SlaTracker.check`, which flips the fire-once flags and returns the alerts (`SlaAlert`). A violation becomes an `sla_violations` row; every alert is published as a `SlaWarning` or `SlaViolated` event for the audit and notification listeners (M8, M9).

Smaller rules the handbook left open:

| Topic | Our rule | Reason |
|---|---|---|
| A run finds a clock past several thresholds (app was down, monitor late) | Only the highest alert fires; the lower flags are marked sent | Two warnings and a violation in the same second is noise, not information |
| Priority change moves a deadline | Warnings for that clock reset (violations stay) | A new deadline deserves its own warnings; a missed one stays missed |
| Pause and resume move the resolution deadline | Warnings are not reset | Same deadline, only shifted; the handbook says each warning fires once |
| Paused clock | Raises nothing | The deadline is not running |
| `overdue_seconds` | How late the deadline was when the monitor noticed | Up to one interval after the deadline; the exact due time is on the incident |
| `technician_id` on a violation | The assignee at that moment (null if none) | For per-technician SLA reports (M10) |

**Options considered (transactions).**

| Option | For | Against |
|---|---|---|
| One transaction for the whole run | Simple | One bad incident (missing policy, concurrent edit) rolls back every alert of the run |
| **One transaction per incident** ✔ | A failure is logged and retried next run; the others go through | A few more round trips (fine for hundreds of open incidents) |

**Trade-off.** Setting a flag changes the incident, so its `version` goes up: a user who saves the same incident in that instant gets 409 `OPTIMISTIC_LOCK_CONFLICT` and reloads. That is rare (only when an alert fires) and keeps every write safe. The alternative, excluding the flags from optimistic locking, would let a user's save overwrite a flag the monitor just set, and the warning would fire twice.

**Cross-questions.**
- *"What if the app restarts in the middle?"* Flags are stored with the incident, so the next run skips what already fired and picks up the rest.
- *"Why not compute violations on read only?"* `slaState` is computed on read (DEC-23), but a violation must be recorded once, with a row, an audit entry and notifications; that needs a job.
- *"How do you test 75 % of a 5-minute clock without waiting?"* The `Clock` is injected (DEC-13); the smoke test moves the deadlines in the database and lets the monitor run every 5 s.

---

## M8 Events and audit trail

### DEC-38: Audit trail through events: same transaction for actions, own transaction for refusals

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-07 | M8 | ✅ | ROADMAP D-015, SYSTEM_GUIDE section 12 |

**Decision.** Application services publish small immutable events after each successful action; `AuditListener` (Observer) writes the audit record. Three event types:

| Event | Published by | Audit transaction |
|---|---|---|
| `IncidentChanged` (action, actor, previous and new status, description) | `IncidentService` for every lifecycle move, edit, assignment, comment | **Same** as the action: no commit without its record, a refused action leaves none |
| `SlaWarning`, `SlaViolated` | `SlaMonitor` | Same as the monitor's per-incident transaction |
| `SecurityAuditEvent` (LOGIN_FAILED, ACCESS_DENIED, USER_ROLE_CHANGED, CONFIG_CHANGED) | `AuthService`, the global error handler (every 403), `UserAdminService`, `ConfigService` | **New** (`REQUIRES_NEW`): the request that caused a refusal rolls back, the record must not |

`TriageNeeded` is published too (for M9 notifications) but not audited: the creation entries already say "waiting in triage".

**Options considered (event types).**

| Option | For | Against |
|---|---|---|
| One record per handbook event (IncidentCreated, IncidentAcknowledged, ... 15 types) | Names match the catalog one to one | 15 near-identical records; the audit listener needs 15 methods doing the same thing |
| **One `IncidentChanged` carrying the action** ✔, plus separate records where the data differs (SLA, triage, security) | One listener method for every lifecycle step; adding a step adds no class | Listeners that care about one step filter on `action` |

**Smaller rules.**

| Topic | Our rule | Reason |
|---|---|---|
| Creation | Four entries: INCIDENT_CREATED (reporter), CLASSIFIED, PRIORITY_CALCULATED, ASSIGNED (system) | The pipeline is visible step by step, as the handbook describes it |
| Actions that keep the status (comment, reassign, priority) | `previousState` = `newState` = current status | The entry still shows where the incident was |
| "Employees see non-internal entries" | The schema has no visibility column, so an entry is internal when its description starts with "Internal note" (internal comments). Reporters without staff rights do not see those; override and reassign reasons stay in internal comments, never in the audit description | Same rule as comments (INTERNAL hidden from the reporter) |
| Every 403 | Audited as ACCESS_DENIED with method, path and code | Handbook 2.10: failures worth auditing |
| Failed login | LOGIN_FAILED with the account as actor (null for an unknown email, which is named in the description) | Lets an admin see guessing attempts |
| Append-only | Entity is `@Immutable`; the repository is hand-written with only insert and read | The DB trigger that rejects UPDATE/DELETE belongs to the Testing teammate's migrations |

**Cross-questions.**
- *"How do you guarantee an action is never saved without its audit record?"* The listener is synchronous and runs inside the action's transaction; if the insert fails, the action rolls back.
- *"Then how is a refused request audited, since it rolls back?"* Refusals use a separate event type whose listener opens its own transaction.
- *"Can an admin edit the log?"* No endpoint writes it, the entity is immutable and the repository has no update or delete; at the database level a trigger (V5 migration) will refuse both.

---

## M6 Assignment and admin user management

> DEC-28 to DEC-30 were **team decisions on innovative parts**: options were compared with a worked example (Asha, Ravi, Meera) and chosen by the team on 2026-11-06.

### DEC-28: Service familiarity as a fifth assignment factor

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-06, start of M6 | M6 | ✅ | Team (option A of three) |

**Decision.** The Composite strategy scores five factors instead of the handbook's four. The new one, **service familiarity**, is how many incidents on the same service the technician resolved in the last 90 days, against a target of 5 (`min(fixes / 5, 1)`). Default weights: skill 0.35, load 0.25, experience 0.15, priority fit 0.10, familiarity 0.15. The window, the target and all weights are live settings and must add up to 1.0.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **A. Fifth weighted factor** ✔ | Comes straight from the course brief ("previous experience with the affected service"); visible in the ranking and in the reasons; tunable | Departs from the handbook's weights |
| B. Tie-breaker only | Handbook weights untouched | Almost never visible |
| C. Handbook only | Simplest | Ignores a factor the brief names |

**Why.** It is what a real support desk does: whoever fixed the payment gateway last week is the best person for it today. Verified on the worked example: with familiarity, Meera (2 recent fixes) ranks above Ravi (none recent): 66 vs 60; with the handbook weights Ravi wins 70 vs 69.

**Trade-off.** It could keep sending one service to the same person; the load factor (25%) and the max-load rule counter that.

**Cross-questions.**
- *"Why 90 days and 5 fixes?"* Recent enough to reflect current knowledge, long enough to have data; both are settings, so they can be tuned without code.
- *"Do fixes from long ago count?"* No: Ravi's three fixes from 200 days ago scored 0 in the test.

### DEC-29: Skill score = 70% best proficiency + 30% coverage

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-06 | M6 | ✅ | Team (option A of three) |

**Decision.** When a category requires several skills: `skill = 0.7 × (best proficiency among the required skills / 5) + 0.3 × (required skills held / required skills)`. A category with no required skill scores 1 for everyone.

| Formula | Asha (Networking 5, no Linux) | Ravi (3, 4) | Meera (4, 4) |
|---|---|---|---|
| **Best + coverage** ✔ | 0.85 | 0.86 | 0.86 |
| Best single skill | 1.00 | 0.80 | 0.80 |
| Average over required | 0.50 | 0.70 | 0.80 |

**Why.** For a problem needing Networking *and* Linux, a pure specialist missing Linux should not automatically beat someone who has both; but a strong specialist should not be punished as hard as a plain average does.

**Cross-questions.** *"Why 70/30?"* Proficiency matters most (it decides how fast the fix is), coverage is the safety net; the split keeps a 5/5 specialist competitive while letting complete coverage win close calls.

### DEC-30: Explainable recommendations (top 3, factor scores, excluded list)

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-06 | M6 | ✅ | Team (option A of three) |

**Decision.** `GET /incidents/{id}/recommendations` returns the active strategy, the top 3 with a 0 to 100 score, current and max load, human-readable reasons ("Networking 4/5, Linux 4/5", "Load 7/10", "Resolved 2 Network incidents in the last 90 days") and the five factor scores, plus every **excluded** technician with the reason ("is AWAY", "at max load (10/10)", "reported this incident"). Two fields (`factors`, `excluded`) are additions to the contract.

**Why.** The frontend can draw the factors as bars: a clear "explainable AI" moment for the demo, and it answers the obvious question "why wasn't Tom picked?".

**Cross-questions.** *"Is the AI a black box?"* No: every score is a weighted sum of five named factors, each shown with its value and a reason.

### DEC-31: Priority fit prefers juniors for P3 and P4

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M6 | ✅ (proposed default, not objected to) |

**Decision.** P1 and P2: levels 4 and 5 score 1, others level / 5 (handbook: "P1 and P2 to senior technicians"). P3 and P4: levels 1 to 3 score 1, level 4 scores 0.4, level 5 scores 0.2.

**Why.** The handbook only says what happens to critical incidents; keeping seniors free of routine work means they are available when a P1 arrives.

### DEC-32: Round-robin as the universal tie-breaker

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M6 | ✅ |

**Decision.** Every strategy orders equal scores by "assigned longest ago first (never assigned before anyone)", then by id, so results are deterministic. Scores equal to six decimals count as a tie, so floating-point noise never overrides rotation. Every assignment records `last_assigned_at`.

**Why.** Handbook: "round-robin as the tiebreaker"; fairness between equally good technicians.

### DEC-33: Auto-assign on creation only when the incident has a category

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M6 | ✅ |

**Decision.** Creation runs the active strategy and assigns the best eligible technician. An incident without a category, or with nobody eligible, stays CLASSIFIED (the triage queue) without any error to the reporter; a team lead or admin assigns it later (`POST /assign` with or without a technician). The TRIAGE_NEEDED notification follows with M9.

**Why.** Without a category there are no required skills to match, so any choice would be a guess (handbook pipeline: "else leave for triage"). Test case T13 expects "no error to the reporter".

### DEC-34: Admin user management rules

| When | Module | Status |
|---|---|---|
| 2026-11-06 | M2 (completed with M6) | ✅ |

**Decision.** Users are never deleted; `DELETE /admin/users/{id}` deactivates and revokes all their sessions. An admin cannot deactivate themselves. EMPLOYEE can never be removed. TECHNICIAN cannot be removed while the person has active incidents. Admin lists are plain arrays. Two endpoints were added beyond the contract: `PUT /admin/technicians/{id}` (experience, escalation level, max load, availability) and `PUT /technicians/me/availability` (a technician marks themselves AWAY).

**Why.** History and audit keep pointing at users; an admin locking themselves out is unrecoverable; removing a technician with open work would orphan incidents. Changing availability is needed to demo eligibility ("set Tom AWAY") and was missing from the contract.

**Cross-questions.** *"What happens to a deactivated user's open token?"* Refresh is revoked at once; the 15-minute access token expires on its own (DEC-10).

---

## User decisions for the extras (2026-11-07)

### DEC-39: One company business-hours calendar in app_config

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-07 | M7 | ✅ user decision | ROADMAP D-016, ERROR_LOG E-022 |

**Decision.** One calendar for the whole company, kept in `app_config` and editable live: `sla.business.zone` (Asia/Kolkata), `sla.business.open` / `close` (09:00 / 18:00), `sla.business.days` (MON..FRI), `sla.business.holidays` (comma-separated dates, may be empty). An SLA policy chooses ALWAYS (24/7) or BUSINESS_HOURS; every deadline and every "percent of the clock elapsed" is computed through a `WorkCalendar` (Strategy pattern: `AlwaysCalendar`, `BusinessHoursCalendar`). Worked example: an 8-hour P3 reported Friday 16:00 is due Monday 15:00.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **One company calendar** ✔ | Simple, live-editable, no schema change | Every service shares the same hours |
| Per-service calendars | Realistic (Payment 24/7, Intranet office hours) | Schema change beyond Appendix A and more admin screens; partly covered anyway because each policy picks ALWAYS or BUSINESS_HOURS |
| Fixed office hours, no holidays | Simplest | Unrealistic, and the hours would be constants |

**Rules.** Paused time is counted in the same calendar (a pause overnight does not move the deadline); `paused_seconds` holds the counted paused time. Holidays fit in one `app_config` value (200 characters, about 18 dates). The monitor's percentages use counted time, so a clock does not advance at night.

**Cross-questions.** *"Why does a P3 reported on Friday evening not breach over the weekend?"* Its policy counts only business hours; P1 policies stay ALWAYS. *"Why not a calendar table?"* The agreed schema has none, and one company calendar was enough (user decision).

### DEC-40: Notification preferences and templates

| When | Module | Status |
|---|---|---|
| 2026-11-07 | M9 | ✅ user decision, to be built with M9 |

**Decision.** Preferences are per user, per event type and channel (the handbook's `notification_preferences` table). In-app notifications are always kept so nothing is lost; SMS is only ever sent for P1; critical alerts (SLA violation to admins, escalation to the new owner) cannot be switched off. Message wording lives in a resource file with placeholders (`{code}`, `{priority}`, ...); the backend ships default wording and the Report teammate can refine it, as the handbook plans. No schema change.

**Options considered.** Per-channel-only switches (simpler, less control) and fully switchable alerts (someone could miss a violation) for preferences; an admin-editable template table (needs a new table) for wording.


### DEC-41: Shared repository layout: backend/ and frontend/ folders

| When | Module | Status |
|---|---|---|
| 2026-11-10 | Repo | ✅ |

**Decision.** The team repo (`sanay7-devv/Frusk-OOPs-Project`) holds the Spring Boot project in `backend/` and the React app in `frontend/`. `icons/`, `README.md`, `.gitignore`, `.npmrc` and `vercel.json` stay at the root. The backend history was merged in with `--allow-unrelated-histories` and reached `main` through pull requests (#1 import, #2 move into `backend/`), as the handbook asks (no direct pushes to `main`).

**Options considered.** Backend at the repo root beside `frontend/` (the handbook layout, but the root then mixes a Maven project with a Vite project); backend in its own folder (clear split, one extra path segment); two repositories (cleaner, but the handbook wants one monorepo).

**Why.** Each role owns one folder, Vercel can use `frontend` as its Root Directory, and the root stays free of build files. The shared `.gitignore` used an ignore-everything-except whitelist; that block was dropped so the backend is tracked, and the frontend rules were kept.

**Trade-offs.** Maven commands now run from `backend/`; IDE projects must be re-imported from `backend/pom.xml`. The Vercel check fails for the author `Vishh-t` until that account is added to the Vercel team (not a code issue).

**Cross-questions.** *Why not push to main?* Protected branch plus review, per the handbook. *Why a merge, not a copy?* It keeps the backend commit history and authorship. *Are secrets in the repo?* No: `.env`, `credentials/` and `target/` are ignored and untracked.


---

## Review and score plan (2026-11-13)

### DEC-42: Design review of the open questions for M9 to M14

| When | Module | Status |
|---|---|---|
| 2026-11-13, before M9 | M9 to M14, M2b | ✅ taken in a design review the user asked for; any line can be vetoed before its module is built |

**Decision.** The open questions were reviewed against this file, the handbook (Appendix A, sections 2.5 M9 to M14) and the code. Chosen options:

| Question | Choice | Reason |
|---|---|---|
| Delivery of notifications | After-commit, asynchronous listener; email gets up to 3 in-process retries with backoff; failures logged | The `notifications` table (Appendix A.4) has no status or retry columns, and the in-app row is always kept (DEC-40), so nothing is lost |
| Who is a team lead's team | One global pool behind a `TeamResolver` interface | Already implied by DEC-26 (no team concept in the schema) |
| Alert storms | One digest per recipient per monitor run above a threshold in `app_config`; P1 and violations are never batched | Quiet without hiding critical alerts |
| Email format | Placeholder text (DEC-40) inside one shared HTML shell | Cheap and looks finished |
| `slaState` list filter | Stored fire-once and violated flags plus the status | Business-hours elapsed time (DEC-39) cannot be computed in SQL; flags may lag the detail view by one monitor interval |
| Report numbers | GROUP BY in the database, same visibility rules as lists | Totals equal a direct count by construction |
| PDF library | OpenPDF | Direct table API, permissive licence |
| Saved views | `saved_filters` table | Already in Appendix A.4 |
| Escalation targets at levels 2 and 3 | `AdminScope` (`SYSTEM_ADMIN` = 2, `IT_MANAGER` = 3), already in code; several holders are all notified; an empty level is skipped | No new setting needed |
| Escalation timeouts | Wall-clock, read from `escalation_policies` | P1 and P2 are urgent around the clock |
| Reassign during escalation | Level kept, timer restarted | The new owner gets a fair window |
| LLM and similarity | LLM for suggestions and summaries; TF-IDF cosine as default similarity, embeddings behind the same interface | One provider; the no-key path stays strong. TF-IDF needs its own calibrated thresholds: 0.80 and 0.65 were written for embeddings |
| Text sent to the LLM | Redact emails, IPs and tokens first | Privacy, and a testable rule |
| LLM outage | Circuit breaker with a cool-off (settings in `app_config`) | Avoids an 8-second wait on every call |
| Embedding storage | Java cosine over `incident_embeddings` | Enough at this size |
| Problem records | Automatic grouping, admin ungroup, every grouping audited | Matches the handbook |
| AI accuracy | Repeatable evaluation on the labelled set, both paths | Numbers for the report |
| WebSocket tokens | Checked on connect and subscribe; session closed at token expiry | Closes the DEC-10 window for sockets |
| WebSocket destinations | Permission check per destination with `PermissionKey` | Same rules as REST |
| Impact traversal | Java traversal with a visited set | Easy to test |
| Broker, rate limits | In-memory, single instance | Same limit as the config cache (DEC-18); stated openly |
| Attachments | Disk volume plus the `incident_attachments` row; type checked from the first bytes | Matches Appendix A |
| Outage behaviour | `SERVICE_UNAVAILABLE` in the standard error body | The brief lists database and network failure |
| Google sign-in | Link only to an existing account with a verified email; auto-registration behind a setting | Safest default |
| Tests | Everything under `src/test` stays with the Testing teammate (handbook 1.4): unit, integration and boundary tests. The backend lead hands over class names, expected values and the smoke scripts, and verifies each module with the smoke suites | Handbook ownership. Corrected the same day: the first version of this line gave domain unit tests to the backend lead, which the team never agreed |

**Risks found in earlier decisions (to fix inside the named module).**

| Decision | Risk | Fix |
|---|---|---|
| DEC-38 | Audit visibility depends on the text prefix "Internal note" | Create internal entries only through one factory method, with a test (M14); ask for a visibility column in V5 |
| DEC-38 | Auditing every 403 lets a looping client flood `audit_records` | Rate-limit ACCESS_DENIED audit entries per user (M14) |
| DEC-21 | Actions answer 403 to people who cannot even see the incident, which reveals it exists | 404 on actions for non-viewers, 403 only for viewers who may not act (M14, check T18 first) |
| DEC-37 | Escalation and risk scans add background writers, so more 409s for users | Frontend reloads and retries on `OPTIMISTIC_LOCK_CONFLICT` |
| DEC-17 | Code check alone can race | Partial unique index in V1 (Testing teammate) |
| DEC-28 | Weights differ from the handbook's locked constants | Tests and report use the five-factor weights |

**Questions still open (decide when their module starts).** (An unassigned P1 in triage and what happens after level 3 were decided the same day: DEC-48 and DEC-49.) Whether a confident AI category is applied when the reporter gives none (DEC-33); mapping the single `IncidentChanged` action to the 15 notification event types; CSV formula injection in exports.

**Cross-questions.** *"Why not an outbox table for notifications?"* The agreed schema has no delivery columns; the in-app row is the durable record and email is retried in process. *"Why can a list and a detail view disagree on SLA state?"* The list filters on flags written by the monitor; the detail computes live; the gap is at most one monitor interval.

### DEC-43: Rubric-driven additions for full marks

| When | Module | Status |
|---|---|---|
| 2026-11-13 | All | ✅ Accepted by the user the same day; DEC-45 sets which lines are built first and which are last priority |

**Context.** The course rubric (brief, last page): Functionality 60 (mandatory modules), Technical depth 15 (code quality, use of APIs, third-party integration, scalability), System design 10, User experience 10 (value-added features: SLA, security, new features, intelligent features), Innovation 10 (the brief's Innovation Challenge list), Testing 5 (unit, integration, bug resolution, edge cases), Documentation and presentation 10. The handbook scope already covers 10 of the 16 innovation items. The additions below close what is left.

| # | Addition | Rubric line | Lives in | Owner |
|---|---|---|---|---|
| A1 | Chatbot incident reporting: a conversational intake that asks follow-up questions and files the incident; guided question flow when no LLM key | Innovation, UX | M12 | Backend + Frontend |
| A2 | Voice incident reporting: browser speech-to-text feeding the same intake | Innovation | Frontend (no backend change) | Frontend |
| A3 | Automated root-cause analysis: for a problem record, find the common upstream service of the affected services in the dependency graph, plus an LLM draft note a human approves (now part of S2 in DEC-44) | Innovation, Technical depth | M12 + M13 | Backend |
| A4 | Mobile push: Web Push as a fifth `NotificationChannel` | Innovation, Technical depth | M9 | Backend + Frontend |
| A5 | Cloud deployment: backend and PostgreSQL hosted, frontend on Vercel, HTTPS. **Last priority (user decision 2026-11-13):** it is one of 16 optional innovation items and ten are already covered, so nothing depends on it; the recorded demo runs locally with Docker Compose | Innovation, Technical depth | Deploy | Testing/DevOps + Backend |
| A6 | Chat-webhook channel (Google Chat or Slack incoming webhook) as a sixth channel | Technical depth ("use of APIs (Google API, any other)") | M9 | Backend |
| A7 | Scalability evidence: a load test with numbers, an index review, and a written scale-out path | Technical depth | M14 | Backend + Testing |
| A8 | Observability: Actuator health, Micrometer counters (incidents, SLA violations, LLM fallbacks), Prometheus and Grafana in Compose | Technical depth | M14 | Backend + Testing/DevOps |
| A9 | Architecture rule tests (ArchUnit): `domain` imports no Spring or web code; controllers never touch repositories | Testing, System design | Tests | Testing teammate (suggested by the backend lead) |
| A10 | Quality gate in CI: build, tests, coverage report, static analysis | Technical depth, Testing | CI | Testing/DevOps |
| A11 | Explain-this-priority what-if, escalation preview, strategy replay (replay is now S1 in DEC-44) | UX, Innovation | M10, M11 | Backend + Frontend |
| A12 | Security extras: password reset by email; optional TOTP second factor for administrators | UX (security), Technical depth | M2 | Backend + Frontend |
| A13 | Requirement traceability matrix: brief requirement to module, class, endpoint, screen and test | System design, Documentation | Report | Backend + Report |
| A14 | Campus-flavoured demo data (the institute's own IT services) | System design (problem understanding) | Seed data | Report + Testing |

**Not proposed.** Microservices and Kubernetes: the brief says innovation must not compromise the OOP design, and DEC-01 stands.

**Already required, not additions.** Notifications on at least two channels (M9), reports and dashboards (M10), feedback after resolution (a listed employee capability; build it with M10, not at the end), typed handling of database and network failure (M14), the Flyway cut-over, and automated tests.

**Trade-off.** A1 to A6 widen the surface the Frontend and DevOps teammates must cover; each stays behind an interface so the core lifecycle never depends on it.


### DEC-44: Three signature features

| When | Module | Status |
|---|---|---|
| 2026-11-13 | M10 to M13 | ✅ Approved by the user on condition that they suit the demo video; they do, with the changes in DEC-45 (S1 is one screen with one chart; the weight search is dropped) |

**Context.** Most teams will show an LLM that suggests a category or chats. These three are deterministic, explainable, and each one only works because of design decisions already taken, so they double as proof of the architecture in the viva. None depends on an API key.

#### S1. Service Desk Simulator (the desk in fast-forward)

**What.** An admin picks a workload (the last N real incidents, or a generated outage storm) and a set of configurations (assignment strategy, weights, SLA policy, number of technicians). The system replays the workload in memory on a virtual clock and reports, per configuration: SLA violations, mean time to resolve, and how evenly work was spread. The admin can apply the winning configuration live. (An automatic search of the weight space was considered and dropped in DEC-45.)

**Why only we can do it.** `AssignmentEngine.recommend(incident, candidates, settings)` is a pure domain call with no Spring or database (DEC-01); every time rule reads an injected `Clock` (DEC-13); settings are an immutable snapshot (DEC-18); the lifecycle is a domain State machine (DEC-19). The simulator is therefore a discrete-event loop over the real production classes, not a copy of the rules.

| Option | For | Against |
|---|---|---|
| **In-memory discrete-event simulation over the real domain classes** ✔ | Results come from the same code that runs live; no test data written to the database | Needs a handling-time model (historical resolution times per priority and category) |
| Replay by writing sandbox incidents to the database | Simple | Pollutes real data and the audit trail; slow |
| Static report of past assignments only | Trivial | Shows nothing about the alternatives |

**OOP shown.** Strategy (configurations compared side by side), State, Factory (`IncidentFactory` builds the simulated incidents), a priority queue of timed events (the brief's "appropriate data structures"), and a `SimulationClock` that is simply another `Clock`.

**Trade-off.** It is a model: technicians are assumed to work their queue in priority order at historical speeds. The report says so next to the numbers.

**Cross-questions.** *"How do you know the simulation matches reality?"* Replaying the real history under the configuration that was actually active must reproduce the real assignments; that is the built-in check. *"Why not machine learning?"* A simulation is explainable and needs no training data.

#### S2. Major Incident Mode (root cause from the graph, known-outage deflection, crowd-driven priority)

**What.** (1) When related incidents arrive on several services, the system walks the service dependency graph and names the common upstream service as the probable root cause, with the path as evidence. (2) It opens one major incident (`incidents.major`, `problem_records`) and links the others. (3) An employee who starts a report on an affected service sees "Known outage, being worked on" and joins with one click; no new form. (4) Every join raises `affected_users` on the major incident, so the handbook's own multiplier (1.0, 1.25, 1.5) re-runs and the priority climbs by itself as reports pile up. (5) Resolving the major incident resolves the linked ones and notifies everyone once.

**Why it fits.** The schema already has `major`, `problem_id`, `duplicate_of_id`, `affected_users` and `root_cause` (Appendix A.3); the graph is cycle-free (DEC-16); priority is recalculated by the existing engine (DEC-25). No schema change. It is the brief's demo workflow 3 ("multiple incidents reported, duplicates identified, correlated, escalated") and covers two innovation items: automated root-cause analysis and the service dependency graph.

| Option | For | Against |
|---|---|---|
| **Graph analysis first, LLM note optional** ✔ | Deterministic, explainable, works offline | Only finds causes that are services in the graph |
| LLM-written root cause only | Reads well | Not reproducible; fails without a key |
| Manual linking by an admin | Simple | Not intelligent |

**Trade-off.** A wrong grouping hides a separate problem; an admin can unlink, and every grouping is audited (DEC-42).

**Cross-questions.** *"What is the algorithm?"* For each affected service collect its upstream set by graph traversal; the candidates are the services present in every set; the one closest to the affected services wins. *"Why does the priority change with no human action?"* The affected-users factor is part of the handbook's priority formula; joining a known outage changes that input.

#### S3. Sealed audit trail (tamper-evident)

**What.** A scheduled job seals the audit records written since the last seal: it hashes them together with the previous seal's hash and stores the result. `GET /audit/verify` recomputes the chain and reports the first record that no longer matches. Demo: change one row directly in the database, press Verify, and the system names the altered record.

| Option | For | Against |
|---|---|---|
| **Seals over batches in a new `audit_seals` table** ✔ | No change to `audit_records`; no locking on the write path | The newest records are unsealed for one interval; one new table beyond Appendix A |
| Hash columns on every audit record, chained at insert | Every record protected at once | Concurrent writers must be serialised; changes the agreed table |
| Database trigger only (already planned for V5) | Prevents changes | Prevents but cannot prove; a database administrator can disable it |

**Why.** The brief asks for a complete audit trail and lists security under value-added features. Prevention (trigger) plus detection (seals) is the difference between "we log" and "we can prove the log is intact".

**Cross-questions.** *"Is this a blockchain?"* No: a hash chain kept by one party; it proves integrity, not consensus. *"What if the attacker recomputes the seals?"* They would need to rewrite every later seal; publishing the latest seal hash outside the database (log line, email to the IT manager) closes that gap.


### DEC-45: Plan shaped by the recorded demo

| When | Module | Status |
|---|---|---|
| 2026-11-13 | All | ✅ |

**Context.** The project is graded from a PDF report and a 15 to 20 minute recorded video in which every member introduces themselves, explains a module, and at least three complete workflows are shown. A feature earns marks in the video only if it can be shown working in under two minutes; everything else earns its marks in the report.

**Decision.**

| Item | Verdict for the video | Change |
|---|---|---|
| S2 Major Incident Mode | Best fit: it is the brief's workflow 3 and it is visual (graph lights up, priority climbs) | Build as proposed |
| S3 Sealed audit trail | Strong: a 30-second segment (edit a row, press Verify) | Build as proposed |
| S1 Service Desk Simulator | Fits only if short | One screen: choose a workload and up to three configurations, one bar chart, an Apply button. The weight search is dropped |
| A2 voice, A1 chatbot, A6 chat webhook | Good: each shows in 15 to 45 seconds | Keep |
| A11 priority what-if, escalation preview | Good, a few seconds each inside workflows 1 and 2 | Keep |
| A9 architecture tests, A10 quality gate, A7 load test | Not visible; they earn Testing and Technical depth marks in the report, plus a few seconds of a green test run | Keep, report-first |
| A4 mobile push, A8 Prometheus and Grafana, A12 password reset and TOTP, A5 cloud deployment | Hard to film or low return | Last priority, after everything above |

**Two additions that exist for the demo (demo profile only).**

| # | Addition | Why |
|---|---|---|
| D1 | Adjustable clock: in the `demo` profile the `Clock` bean (`ClockConfig`) can be moved forward by an administrator ("+10 minutes") | SLA warnings, violations, escalation and auto-verify can be shown on camera in seconds, without cuts. Possible because all time rules read one injected `Clock` (DEC-13). Forward only; the default and test profiles keep the system clock |
| D2 | Outage drill: one admin action files a prepared set of related incidents from several employees across dependent services | Workflow 3 starts in seconds and is identical in every take |

**Options considered.** Short real timeouts only (the handbook's demo profile: 1-minute escalation, 30-second monitor) still means minutes of waiting or video cuts for a 30-minute SLA; editing the video hides the wait but the viewer cannot tell the timing is real. An adjustable clock shows the real rules at real durations.

**Run sheet (about 19 minutes).**

| Time | Segment | Shows |
|---|---|---|
| 0:00 | Problem, team, roles | Each member introduces themselves |
| 1:00 | Architecture and patterns | Layer diagram, class diagram, the seven patterns |
| 2:30 | Workflow 1: report to assignment | Voice or chat intake, category suggestion, priority with its explanation and what-if, explainable assignment, notifications on in-app, email and chat webhook |
| 6:00 | Workflow 2: investigate to close | Acknowledge, request info (SLA pauses), clock forward to an SLA warning, resolve, verify, feedback, audit timeline; an unacknowledged P1 climbs the escalation chain |
| 9:30 | Workflow 3: Major Incident Mode | Outage drill, root cause from the graph, known-outage join, priority climbing, one resolution for all |
| 13:00 | Administrator | Live dashboard, reports, strategy switched with no restart, Service Desk Simulator |
| 15:00 | Security | Lockout, different screens per role, a refused action, sealed audit verify |
| 16:00 | Code and tests | State, Strategy, Observer, Chain of Responsibility in code; tests and architecture rules running green |
| 18:30 | Limits and scale-out path | Close |

**Trade-off.** D1 and D2 are code that exists for the demonstration; both are confined to the `demo` profile and to administrators, and the report says so.

**Cross-questions.** *"Is the SLA real if you can move the clock?"* The rules and durations are the production ones; only the clock source differs, in one profile. The same seam is what makes the time rules testable. *"Can a user move the clock in production?"* No: the adjustable clock bean is only created in the `demo` profile.


### DEC-46: Fixes from the code and frontend review

| When | Module | Status |
|---|---|---|
| 2026-11-13 | M9 to M14 | ✅ the user asked for every finding to be taken up |

**Context.** A read of `Incident`, the state classes, `IncidentService`, `IncidentAccessPolicy`, `PriorityEngine`, the assignment strategies, the controllers and the frontend sources (ROADMAP section 9).

**Decision.**

| # | Finding | Decision | Built with |
|---|---|---|---|
| G1 | 11 frontend screens are stubs and 6 run on hardcoded arrays; only login, register and the report form call the API | The Frontend teammate wires screens in the order of the three demo workflows (DEC-45 run sheet); the backend documents how to generate a typed client from `docs/openapi/iitsm-api.json` | Frontend; note in `docs/openapi/README.md` |
| G2 | `AutoVerifyJob` (handbook 2.7) belongs to no module | Built with escalation: RESOLVED with no reply for `verify.auto.hours` moves to VERIFIED and closes as AUTO_VERIFIED; idempotent, one transaction per incident like the SLA monitor (DEC-37) | M11 |
| G3 | `ClosureReason.WITHDRAWN` is unused | New reporter action `withdraw` (reason required), legal until work has started (CLASSIFIED, ASSIGNED, ACKNOWLEDGED); closes with WITHDRAWN and frees the technician's load. An addition to the contract | M10 |
| G4 | A reporter can raise their own priority by editing impact and urgency | Once an incident is ASSIGNED, only a team lead or administrator may change impact, urgency and affected users; the reporter can still edit the description. Before assignment the reporter may edit everything. Check the documented test cases before changing behavior | M14 |
| G5 | `major` already means "is P1" | The stored meaning stays. Major Incident Mode (DEC-44 S2) is modelled by the problem record (`problem_id`); the lead incident is the highest-priority, earliest linked one | M12 |
| C1 | `IncidentService`: 16 dependencies, about 500 lines, the same five steps in every lifecycle method | One command object per action behind a shared runner (Command pattern). Checked by running the smoke suites (auth, M3, M4, M6, M7, M8, calendar, endpoint sweep) before and after | Before M9 |
| C2 | Events are published by hand in each method | `Incident` records its own events in a transient list; the service publishes them after saving. No action can then skip its audit entry | Before M9 |
| C3 | Rules that depend on text: category name "security"; audit prefix "Internal note" | The security category name becomes an `app_config` setting; internal audit entries are created only through one factory method on `AuditRecord`, with a test | M14 |
| C4 | Template Method (`FactorStrategy`), the third Strategy (`WorkCalendar`) and the access policy are in the code but missing from the pattern table | Added to SYSTEM_GUIDE section 14.3 now | Done (docs) |

**Options considered.**

| Topic | Option | Verdict |
|---|---|---|
| G4 | Leave edits open and rely on the PRIORITY_CHANGED audit entry | Rejected: the audit shows the gaming but does not stop it, and crowd-driven priority (S2) makes the affected-users field matter more |
| G4 | Lock impact and urgency for the reporter from creation | Rejected: a reporter who made a mistake could not correct it before anyone picks the incident up |
| G5 | Redefine `major` as "heads a problem record" | Rejected: it changes verified behavior and the meaning the frontend may already show |
| C1 | Keep the service as it is | Rejected: every new action (escalate, withdraw, mark duplicate, feedback) would add another copy of the same five steps |
| C2 | Publish from the entity through Spring Data's `AbstractAggregateRoot` | Rejected: it puts a Spring type in the domain (DEC-01) |

**Built (C2, 2026-11-13).** Of two options for C2 (A: the aggregate records plain facts and the service adds actor and wording; B: the aggregate builds the full event, which would move names and wording into the domain) the user chose A. `Incident` keeps a non-persisted list of `IncidentFact` (audit action, status before, status after) filled by every lifecycle method, by `applyPriority` / `overridePriority` and by creation; `IncidentService` drains it after each action and publishes `IncidentChanged` with the actor and the same wording as before. If an action records no fact, or more than one where one is expected, publishing throws, so a forgotten audit entry is an error and not a silent gap. A move the state refuses records nothing. Comments are a separate record and stay published by the service. All eight smoke suites gave identical results before and after.

**Built (C1, 2026-11-13).** One command object per plain lifecycle action (`AcknowledgeCommand`, `StartWorkCommand`, `RequestInfoCommand`, `ProvideInfoCommand`, `ResolveCommand`, `VerifyCommand`, `CloseCommand`, `ReopenCommand` in `application/incident/command`) behind `IncidentCommandRunner`, which loads the incident, checks who may act (403), performs the command (the State pattern may refuse it: 409), leaves the command's public note, publishes the audit event from the recorded fact and builds the view. A command says what it does (`action`, `perform`, `publicNote`, `auditText`); `CommandContext` gives it the time, the live settings and the SLA policy. `IncidentEventPublisher` turns facts into events and is shared with `IncidentService`. Creation, edits, assignment, reassignment, priority override and comments stay in the service because each has extra logic of its own; they can move later one by one. The audit wording is unchanged. The eight smoke suites gave identical results before and after.

**Trade-off.** C1 and C2 change code that is already smoke-tested, so the smoke suites are run before and after as the regression check. Unit tests from the Testing teammate add a second net when they arrive.

**Cross-questions.** *"Is Command not over-engineering?"* Twelve lifecycle actions share the same five steps today and four more are coming; the runner removes the repetition and gives the chatbot and the simulator one way to invoke an action. *"Why does the aggregate hold events if the domain must not know Spring?"* It only keeps a plain list of event records; publishing stays in the application layer.

### DEC-47: Five features that answer the brief's named challenges

| When | Module | Status |
|---|---|---|
| 2026-11-13 | M10 to M13 | ✅ user approved |

**Context.** The brief's problem statement lists eight challenges. Six were already answered by planned modules; "poor visibility into service health" and "difficulty identifying recurring problems" were not. Every feature below uses data the system already stores and needs no schema change.

| # | Feature | Challenge in the brief | Rule | Built with |
|---|---|---|---|---|
| E1 | Service status board, visible to employees | Poor visibility into service health | Outage: an open P1 on the service. Degraded: an open P2, or an Outage on a service it depends on. Otherwise Healthy. Shown with open counts and 30-day SLA compliance | M13 |
| E2 | Recurring-problem detector | Difficulty identifying recurring problems | The same service and category resolved N times in a window, or an incident reopened more than once, proposes a problem record to a team lead (N and the window in `app_config`) | M12 |
| E3 | Coverage risk report | Inefficient technician allocation | For each category's required skills, count the available technicians who hold them; one or none on a service of criticality 4 or 5 is flagged | M10 |
| E4 | Post-incident report | Incomplete incident history | Timeline, time spent in each status, SLA outcome and people involved, computed from the audit trail; exportable as PDF | M10 |
| E5 | Reporter tracking view | Delayed response | A progress line over the lifecycle with the SLA due time; frontend only, from the existing incident detail | Frontend |

**Options considered.** A status board fed by real monitoring probes (out of scope: the system manages incidents, it does not monitor servers) against one derived from incidents (chosen: it is honest about its source and needs nothing new).

**Trade-off.** E1 reflects reported incidents only; a failing service nobody has reported shows Healthy. The board says "based on reported incidents".

**Cross-questions.** *"How is E2 different from duplicate detection?"* Duplicates are the same failure reported several times within 24 hours; a recurring problem is the same kind of failure coming back over weeks after being resolved. *"Why does a dependency make a service Degraded?"* Its upstream is down, so it is likely affected even before anyone reports it; the graph is already there (DEC-16).


---

## M11 Escalation decisions (2026-11-13)

> Two open questions from the design review (DEC-42) were put to the user with options before M11 is built. Nothing is built yet.

### DEC-48: An unassigned P1 or P2 in triage escalates from level 0

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-13 | M11 | ✅ user decision, to be built with M11 | User (option A of three) |

**Context.** The escalation monitor looks for P1 and P2 incidents in ASSIGNED that nobody has acknowledged. An incident that stays in triage (no category, or no eligible technician) is CLASSIFIED with no assignee, so it was never escalated; only the one TRIAGE_NEEDED notice at creation reached a team lead.

**Decision.** An unassigned P1 or P2 in triage is escalated like an assigned one, starting from level 0 (nobody): after the same timeout as a technician level (10 minutes for P1 and 30 for P2, 1 minute in demo) it moves to level 1 (team lead), is notified, audited as ESCALATED and published as the escalation event, and then climbs level by level exactly as in the handbook. Assigning or acknowledging it stops the climb. The timeouts are the existing per-level escalation settings; no new setting.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **A. Escalate from level 0** ✔ | Closes the gap with no new concept; the same timeouts, audit entries and notifications; the story "nothing critical is ever ignored" holds for every state | The monitor now reads two statuses, ASSIGNED and (for P1 and P2 only) CLASSIFIED without assignee |
| B. Separate triage timeout | Triage can be tuned independently | More settings to explain and test; a second path to the same result |
| C. Leave as is | Nothing to build | A critical incident nobody can be assigned to is only caught later by the SLA violation alert |

**Why.** An incident nobody can take is exactly the one most likely to be ignored, and the brief's example of automatic escalation (a critical incident not acknowledged in time) does not say the incident must already have an owner.

**Trade-off.** An unassigned incident has no technician to appear as "level 0" in the history; the first ESCALATED entry says "no technician assigned" in its description.

**Cross-questions.** *"What if the incident has no category, so nobody can be matched?"* It still escalates to the team lead, who can classify and assign it (the manual assign action already exists). *"Does this change the SLA clock?"* No; escalation is separate from the SLA monitor, and the response clock keeps running until acknowledgement.

### DEC-49: One final alert when escalation is exhausted

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-13 | M11 | ✅ user decision, to be built with M11 | User (option A of three) |

**Context.** The chain is technician (0), team lead (1), system administrator (2), IT manager (3). The handbook does not say what happens when a P1 or P2 is still not acknowledged after level 3.

**Decision.** The incident stays at level 3. The monitor raises one final "escalation exhausted" alert: an audit entry, an event and a notification to all administrators (SMS as well for P1), once per incident, and then nothing more from the escalation monitor. Acknowledging the incident still ends everything as before.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **A. One final exhausted alert** ✔ | Tells everyone who can still act that the chain has run out; one alert is easy to explain and to demo; no repeating job to stop | If the first alert is missed nothing repeats (the SLA violation alerts still fire) |
| B. Re-alert every N minutes | Hard to miss | Noisy; needs its own interval setting and a stop rule |
| C. Stop silently | Simplest | The end of the chain looks like success |

**Implementation note (kept inside the agreed schema, can be changed when M11 is built).** The exhausted alert reuses the existing audit action ESCALATED (the description says "escalation exhausted at level 3") and the existing notification event type INCIDENT_ESCALATED with its own wording, so Appendix A.3 and A.4 do not gain new values. If the team prefers distinct values, that is a schema change to agree with the Testing teammate first.

**Trade-off.** "Once per incident" needs a remembered fact; the incident already stores `escalation_level` (0 to 3), so the monitor can tell level 3 from "exhausted" with the audit trail (one exhausted entry exists) and needs no new column.

**Cross-questions.** *"Why not keep alerting?"* A repeating alert to people who already ignored three of them adds noise, not action; the SLA violation alerts are the continuing signal. *"Who counts as all administrators?"* Every user with the administrator role, as in the SLA violation notification.
