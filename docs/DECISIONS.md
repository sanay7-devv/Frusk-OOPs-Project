# I-ITSM Backend: Decision Record

> **Purpose.** Every significant design decision, in the order it was taken: *when* (date and module), *what* we chose, *which alternatives* we weighed, *why*, the *trade-off* we accept, and the **cross-questions an examiner is likely to ask**, with short answers. Use it to prepare for the demo and viva.
>
> **How it relates to other docs.** `ROADMAP.md` section 6 keeps the short index (D-numbers); this file holds the full reasoning. `SYSTEM_GUIDE.md` explains *what* the system does; this file explains *why* it is built that way.
>
> **Rule.** A new decision gets an entry in the same change as the code. Decisions on innovative features are taken together with the team, after comparing options.

**Status values:** ✅ Accepted · 🔁 Superseded · ⏳ Temporary (will be removed) · 📌 Deferred

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
| Audit of `LOGIN_FAILED`, `ACCESS_DENIED` (M2) | M8 audit trail | The audit table and listeners do not exist yet |
| `GET /incidents/{id}/history` (M4) | M8 | History *is* the audit trail |
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
