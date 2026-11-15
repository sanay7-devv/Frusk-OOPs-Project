# I-ITSM requirement traceability matrix (A13)

Written 2026-11-15 (decision DEC-118). Every requirement of the course brief (`OOP_S1_2026-2027_Project.pdf`) mapped to the module that builds it, the main classes, the endpoints, the screen that shows it and the evidence that it works. The Report teammate can paste from it; the Testing teammate can use the evidence column to see which requirement a test protects.

**Legend**
- **Screen:** `real` the screen calls the API; `fake` the screen exists but runs on hardcoded data; `stub` an empty placeholder; `none` no screen yet. Frontend state is from the review in `frontend/FRONTEND_GUIDE.md`.
- **Evidence:** `T01` to `T26` are the documented test cases (`docs/qa/test_cases.csv`, all PASS in CI). `m3`, `m4`, `m6` and so on are the backend lead's smoke suites (`smoke-tests/`, outside git); the number is the check count when it was last run. `unit` means a test class in `src/test`.
- Class names are in `com.iitsm`; the package is given on first use. Endpoints are relative to `/api/v1`. The live contract is `backend/docs/openapi/iitsm-api.json` (129 operations).

---

## 1. Minimum viable product

| Brief requirement | Module | Main classes | Endpoints | Screen | Evidence |
|---|---|---|---|---|---|
| Three user categories (Employee, Technician, Administrator) | M2 | `domain.user`: `User`, abstract `Role` with `EmployeeRole`, `TechnicianRole`, `AdministratorRole`, `PermissionKey`, `UserFactory` | `/auth/register`, `/auth/login`, `/admin/users`, `/admin/users/{id}/roles` | login and register `real`; users `real` | T17, T26, auth 27 |
| Incident create, view, update, assign, resolve, close | M4 | `domain.incident`: `Incident` (aggregate), `IncidentFactory`, `IncidentState` + 10 state classes; `application.incident`: `IncidentService`, `IncidentCreationService` | `POST /incidents`, `GET /incidents/{id}`, `PUT /incidents/{id}`, `/assign`, `/resolve`, `/close` | report form `real`, admin tickets `real`, technician screens `fake`, employee detail `stub` | T01 to T03, T11, T12, m4 54 |
| Priority from impact, urgency and business criticality | M5 | `domain.priority`: `PriorityEngine`, `WeightedPriorityStrategy`, `PriorityOverrideRule`, `PriorityBreakdown` | `POST /priority/what-if`, `POST /incidents/{id}/override-priority` | report form `real` (suggestion), admin detail `real` | T05, T06, unit `PriorityEngineTest` |
| At least two assignment strategies, switchable | M6 | `domain.assignment`: `AssignmentEngine`, `CompositeStrategy`, `SkillBasedStrategy`, `LoadBasedStrategy`, `RoundRobinStrategy`, `ExperiencePriorityStrategy`, `EligibilityFilter` | `GET /incidents/{id}/recommendations`, `PUT /admin/config` (`assignment.strategy`) | admin config `real`; team queue `fake` | T04, T07, T13, T25, m6 33 |
| SLA calculation, deadline tracking, violation detection | M7 | `domain.incident.SlaTracker`, `domain.sla`: `SlaPolicyResolver`, `WorkCalendar`; `application.sla.SlaMonitor` | `GET /sla/violations`, SLA fields of `GET /incidents/{id}` | admin SLA policies `real`; dashboard `real` | T15, T21, T23, m7 35, calendar 11 |
| At least two notification mechanisms | M9, A4, A6 | `domain.notification`: `NotificationChannel` port with in-app, WebSocket, e-mail, simulated SMS, simulated push and chat-webhook adapters; `NotificationDispatcher` | `GET /notifications`, `/notifications/preferences`, `/notifications/devices`, STOMP `/user/queue/notifications` | notifications `fake`, bell count `real` | T01, T13, T22, m9 72, a12_a4 |
| Complete incident history (audit) | M8, S3 | `domain.audit`: `AuditRecord` (immutable), `AuditAction`; `application.audit.AuditListener`; sealing: `AuditSealing`, `AuditChainVerifier` | `GET /incidents/{id}/history`, `GET /audit`, `GET /audit/verify` | admin audit log `real` (no Verify button yet) | T17, m8 24, m14 81 |
| At least five search and filter criteria | M10 | `infrastructure.persistence.CriteriaIncidentSearch`, `domain.incident.IncidentQuery` | `GET /incidents` takes 17 parameters: `q`, `code`, `status`, `priority`, `categoryId`, `serviceId`, `assigneeId`, `reporterId`, `slaState`, `minEscalationLevel`, `createdFrom`, `createdTo`, `mine`, `assignedToMe`, `page`, `size`, `sort`; saved views `/saved-filters` | admin tickets `real` | m10 135, s1 50 |
| At least two intelligent or automated features | M11, M12 | see section 4 (seven built) | see section 4 | partly | see section 4 |
| Persistence | all | PostgreSQL 16 with Flyway V1 to V10, Spring Data JPA, `domain.repository` ports | none | none | `Seed integrity` CI jobs, `db/checks/verify.sql` |

---

## 2. What each kind of user can do

### Employee

| Brief requirement | Endpoints | Screen |
|---|---|---|
| Register and log in | `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/refresh`, `/auth/logout`, password reset `POST /auth/password-reset/request` and `/confirm`, two-step verification `/auth/mfa/*` | login and register `real`; reset and MFA screens `none` |
| Report an incident | `POST /incidents`, suggestions `POST /intelligence/suggest-category`, `/suggest-intake`, `/similar`, chatbot `POST /intelligence/chat` | report form `real` |
| View submitted incidents | `GET /incidents?mine=true` | my incidents `stub`, home `fake` |
| Track status | `GET /incidents/{id}`, `/history` | employee detail `stub` |
| Add information, respond to support requests | `POST /incidents/{id}/provide-info`, `/comments` | `none` |
| View resolution information | `GET /incidents/{id}` (resolution block) | `stub` |
| Give feedback after resolution | `POST /incidents/{id}/feedback` | `none` |
| Withdraw or confirm | `POST /incidents/{id}/withdraw`, `/verify`, `/reopen` | `none` |

### Technician

| Brief requirement | Endpoints | Screen |
|---|---|---|
| View assigned incidents | `GET /technicians/me/queue` | queue `fake` |
| Acknowledge | `POST /incidents/{id}/acknowledge` | `fake` |
| Investigate, add notes | `POST /incidents/{id}/comments`, `GET /incidents/{id}/suggested-resolutions`, `/similar`, `POST /incidents/{id}/summary` | workbench `fake` |
| Update status | `POST /incidents/{id}/start`, `/resolve` | `fake` |
| Request additional information | `POST /incidents/{id}/request-info` | `fake` |
| Provide resolution details | resolve request body (notes, root cause, reusable solution) | `fake` |
| View current workload | `GET /technicians/me/workload`, `PUT /technicians/me/availability` | workload `fake` |

### Administrator

| Brief requirement | Endpoints | Screen |
|---|---|---|
| Manage users and technicians | `/admin/users`, `/admin/users/{id}/roles`, `/admin/technicians/{id}`, `/admin/technicians/{id}/skills`, `/admin/skills`, `POST /admin/users/{id}/mfa/reset` | users `real` |
| Manage IT services | `/admin/services`, `/admin/services/{id}/dependencies` | services `real`, dependency graph `real` (cards, not a drawn graph) |
| Configure SLA policies | `/admin/sla-policies`, `/admin/escalation-policies` | SLA `real`, escalation `real` |
| Configure categories | `/admin/categories` | categories `real` |
| Configure assignment strategies | `PUT /admin/config` (78 settings), simulator `POST /admin/simulations` and `/apply` | config `real`; simulator `none` |
| Monitor incidents | `GET /incidents`, `GET /dashboard/live`, STOMP `/topic/dashboard`, `GET /services/status` | dashboard `real`, tickets `real` |
| View reports | `GET /reports/overview`, `/services`, `/trends`, `/priority-distribution`, `/category-distribution`, `/sla-compliance`, `/workload`, `/coverage-risk`, `/export` | reports `real` (computed in the browser, not from these endpoints) |
| View audit logs | `GET /audit`, `/audit/verify`, `POST /audit/seal` | audit log `real` |
| Monitor SLA violations | `GET /sla/violations` | `real` inside tickets and dashboard |

---

## 3. Functional requirements of the brief

| Brief section | Module | Main classes | Endpoints | Evidence |
|---|---|---|---|---|
| Incident data: ID, reporter, category, description, service, impact, urgency, priority, creation time, status, assignee, SLA, investigation, resolution, closure | M4 | `Incident` fields and `Resolution`, `IncidentComment`, `SlaTracker`, `ClosureReason` | `GET /incidents/{id}` | m4, T01 |
| Classification into categories; new ones without touching other code | M3 | `domain.category.Category` (tree with required skills), `CategoryRepository`, `application.catalog.CatalogService` | `GET /categories`, `/admin/categories` | m3 42 |
| Intelligent priority from impact, urgency, criticality, affected users, service | M5 | `PriorityEngine` + `PriorityStrategy` interface (the algorithm and its rationale are in `SYSTEM_GUIDE.md` section 9 and `DECISIONS.md`) | `POST /priority/what-if` | T05, T06, `PriorityEngineTest` |
| Technician recommendation: skills, category, availability, workload, experience, priority, previous experience with the service | M6 | `AssignmentFactors` (five factors, weights 0.35 / 0.25 / 0.15 / 0.10 / 0.15), `EligibilityFilter`, `WorkloadTracker` | `GET /incidents/{id}/recommendations` | T04, T07, `EligibilityFilterTest`, `WorkloadTrackerTest` |
| Change the strategy without redesign | M6 | `AssignmentStrategy` interface, `AssignmentEngine`, live `app_config` | `PUT /admin/config` | T04 |
| SLA per service; identify, calculate, track response and resolution, violations, warnings, record | M7 | `SlaPolicy`, `SlaPolicyResolver`, `SlaTracker`, `SlaMonitor`, `sla_violations` table | `GET /sla/violations` | T15, T21, T23, `SlaTrackerTest` |
| Lifecycle with illegal transitions refused | M4 | State pattern: `IncidentState`, `NewState` to `ClosedState`, `StateFactory`; `InvalidStateTransitionException` | every action endpoint answers 409 | T11, T12 |
| Notifications for created, assigned, priority changed, SLA approaching, SLA violated, resolved, closed; new mechanism easy to add | M9 | 15 `NotificationEventType`s, `NotificationChannel` port, `NotificationFactory`, `NotificationRules` | `/notifications` | m9 72 |
| Audit records with timestamp, user, action, incident, previous and new state, description | M8 | `AuditRecord`, `AuditListener`, DB trigger rejecting update and delete (V7) | `GET /audit`, `/incidents/{id}/history` | T17, `db/checks/verify.sql` |
| Search by ID, date, status, priority, category, service, technician, SLA status | M10 | `CriteriaIncidentSearch` | `GET /incidents` | m10 135 |
| Reports: overview, technician workload, service analysis, more | M10 | `ReportService`, `NativeReportRepository`, `CoverageRiskService`, `PostIncidentReportService` | `/reports/*`, `/incidents/{id}/post-incident-report` and `/pdf` | m10 135 |

---

## 4. Intelligent features (brief A to G)

| Brief item | Built as | Main classes | Endpoints | Screen | Evidence |
|---|---|---|---|---|---|
| A. Duplicate detection | TF-IDF similarity, 409 on create | `TfIdfModel`, `Tokenizer`, `IncidentCreationService`, `DuplicateIncidentException` | `POST /incidents` (409 `DUPLICATE_INCIDENT`), `POST /intelligence/similar`, `GET /incidents/{id}/similar`, `POST /incidents/{id}/mark-duplicate` | report form `real` | T16, m12 55 |
| B. Incident correlation | Problem records grouped by service and the dependency graph | `application.problem`: `ProblemService`, `ProblemCorrelator`, `KnownOutageService`; `domain.service.ServiceGraph` | `/problems`, `/problems/{id}/root-cause`, `/problems/known-outages`, `/problems/{id}/join`, `/problems/recurring` | `none` | m12b 107 |
| C. Automatic escalation | Chain of Responsibility, scheduled monitor | `domain.escalation`: `EscalationChain`, `EscalationHandler` + 4 handlers; `application.escalation.EscalationMonitor` | `POST /incidents/{id}/escalate`, `escalationPreview` in the detail | escalations `fake` | T22, m11 |
| D. Smart technician recommendation | Explainable five-factor score | `AssignmentEngine`, `AssignmentFactors` | `GET /incidents/{id}/recommendations` | team queue `fake` | T04, m6 |
| E. SLA risk detection | Weighted score with a scheduled scan | `SlaRiskScorer`, `application.intelligence.SlaRiskService` | `GET /incidents/{id}/sla-risk` | `none` | m12 55 |
| F. Incident categorization | Keyword engine by default, Gemini optional, circuit breaker and fallback | `TextAnalysisService`, `KeywordTextAnalysisService`, `infrastructure.ai`: `GeminiLlmClient`, `FallbackTextAnalysisService` | `POST /intelligence/suggest-category`, `/suggest-intake` | report form `real` | m12 55, verified with the real Gemini service |
| G. Suggested resolution | Similar resolved incidents | `IntelligenceService` | `GET /incidents/{id}/suggested-resolutions` | `none` | m12 55 |

---

## 5. Object-oriented design requirements

| Brief requirement | Where it is shown |
|---|---|
| Encapsulation | `Incident` has no public setters: state changes only through behavior methods (`acknowledge`, `assign`, `resolve`, `escalate`, `withdraw`); `User` guards login bookkeeping and two-step state; services return view records, never entities |
| Abstraction | `AssignmentStrategy`, `PriorityStrategy`, `WorkCalendar`, `TextAnalysisService`, the ports `NotificationChannel`, `LlmClient`, `AttachmentStorage`, `GoogleIdTokenVerifier`, `PushGateway`, `PasswordResetNotifier` |
| Inheritance (real is-a only) | `Role` to `EmployeeRole`, `TechnicianRole`, `AdministratorRole`; `ItsmException` to 22 specific exceptions; `OpenState` to six open states; `FactorStrategy` to the weighted strategies |
| Polymorphism | `Incident` calls `acknowledge()` on whatever `IncidentState` the status maps to; the engine ranks with whichever `AssignmentStrategy` the setting names; each `NotificationChannel` is sent to the same way |
| Interfaces | the ports above, and `Repository` interfaces in `domain.repository` implemented by Spring Data in `infrastructure.persistence` |
| Composition | `User` has `Role`s; `TechnicianRole` owns a `TechnicianProfile` with a `SkillSet`; `Incident` owns a `SlaTracker` and a `Resolution` |
| Association and aggregation | incident to reporter, assignee, service and category; problem record to its incidents; service to its dependencies |
| Exception handling | `ItsmException` family (code and HTTP status), one `GlobalExceptionHandler`, filter-level errors through `ApiErrorWriter` (section 6) |
| Collections and data structures | `PriorityQueue` of timed events in `DeskSimulation`, `EnumMap`/`EnumSet` for states and channels, graph traversal in `ServiceGraph`, sliding windows in `RateLimiter`, hash chain in `AuditSealing` |
| At least two design patterns | seven required ones plus more: State, Strategy, Observer, Factory, Repository, Adapter, Chain of Responsibility, Template Method (`FactorStrategy.rank`), Command (`IncidentCommand`, `IncidentCommandRunner`), Decorator (`WebSocketSessions`), Circuit breaker. Where each is: `SYSTEM_GUIDE.md` section 14 |

---

## 6. Exception and error handling

| Brief situation | Code and status | Class | Evidence |
|---|---|---|---|
| Invalid login | `INVALID_CREDENTIALS` 401 (same message for unknown email and wrong password) | `InvalidCredentialsException` | T20, auth 27 |
| Unauthorized operation | `UNAUTHORIZED_OPERATION` 403, `CONFLICT_OF_INTEREST` 403 | `UnauthorizedOperationException`, `ConflictOfInterestException` | T17, T18, T25 |
| Invalid incident | `INCIDENT_NOT_FOUND` 404 | `IncidentNotFoundException` | m4 54 |
| Invalid state transition | `INVALID_STATE_TRANSITION` 409 | `InvalidStateTransitionException` | T11, T12 |
| Technician unavailable | `TECHNICIAN_UNAVAILABLE` | `TechnicianUnavailableException` | T13 (a reporter never sees the error: the incident waits in triage) |
| Technician workload exceeded | `WORKLOAD_EXCEEDED` | `WorkloadExceededException` | T07 |
| Service not found | `SERVICE_NOT_FOUND` 404 | `ServiceNotFoundException` | T14 |
| Missing SLA configuration | `SLA_NOT_CONFIGURED` 422 | `SlaNotConfiguredException` | T15 |
| Duplicate incident | `DUPLICATE_INCIDENT` 409 | `DuplicateIncidentException` | T16 |
| Database failure | `SERVICE_UNAVAILABLE` 503 with `Retry-After` | `ServiceUnavailableException` | m14 81 |
| Network failure | AI: automatic fallback to the keyword engine; mail: retries then drops with a log; Google keys: 503 | `FallbackTextAnalysisService`, `EmailChannel` | m12, gemini stub check |
| Invalid user input | `VALIDATION_FAILED` 400 with `fieldErrors` | `InputValidationException` | T09, T12 |
| Also built | `TOKEN_EXPIRED`, `TOKEN_INVALID`, `ACCOUNT_LOCKED` 423, `OPTIMISTIC_LOCK_CONFLICT` 409, `RATE_LIMITED` 429, `MFA_REQUIRED`, `INVALID_MFA_CODE` | | T19, T20, T24, a12_a4 |

---

## 7. Security

| Brief requirement | How | Where | Evidence |
|---|---|---|---|
| Authentication | JWT access tokens (15 minutes) and rotated refresh tokens, Google sign-in (verified ID token), optional two-step verification (TOTP), password reset by mailed link | `AuthService`, `GoogleSignInService`, `MfaService`, `PasswordResetService`, `JwtService` | T19, T20, m2b 32, a12_a4 72 |
| Role-based authorization | Spring authorities are `PermissionKey` names, `@PreAuthorize("hasAuthority(...)")`, `IncidentAccessPolicy` for who may do what to an incident | `SecurityConfig`, every controller | T17, T18, T26 |
| Password protection | BCrypt, a password policy (length, letter and digit, a list of common passwords, not containing the name or e-mail part), five-strike lockout, rotating refresh tokens that revoke all sessions on re-use | `PasswordPolicy`, `User`, `AuthService` | T20, m14 81 |
| Input validation | Bean Validation on every DTO, field limits, upload checks by file content, CSV formula protection | DTO records, `AttachmentType`, `CsvWriter` | T09, T10 |
| Secure API access | CORS limited to the frontend origin, security headers, rate limits (login, incident creation, AI, password reset), request IDs, token-guarded metrics endpoint | `SecurityConfig`, `RateLimitFilter`, `MetricsTokenFilter` | m14 81, a12_a4 |
| Protection against unauthorized operations | 403 with an `ACCESS_DENIED` audit row; 404 for incidents a person may not see | `GlobalExceptionHandler`, `AuditListener` | T17, T18 |
| Tamper-evident audit | Hash-chained seals over the audit records; `GET /audit/verify` names the first altered record | `AuditSealService`, `AuditChainVerifier` | m14 81 |

Documented limits (for the report): the refresh token and the TOTP secret live in the application database (the refresh token only as a hash); rate limits and the settings cache are per instance (`SCALING.md`).

---

## 8. Persistence

| Brief item | Where |
|---|---|
| Users, technicians | `users`, `user_roles`, `employee_profiles`, `technician_profiles`, `technician_skills`, `administrator_profiles`, `refresh_tokens`, `password_reset_tokens` |
| Services, categories, SLA policies | `services`, `service_dependencies`, `categories`, `category_skills`, `skills`, `sla_policies`, `escalation_policies` |
| Incidents, resolution information | `incidents` (resolution columns), `incident_comments`, `incident_attachments`, `problem_records`, `feedback` |
| Audit records | `audit_records`, `audit_seals`, `audit_seal_entries`, `sla_violations` |
| Notifications and settings | `notifications`, `notification_preferences`, `push_devices`, `app_config`, `saved_filters` |

The schema is Flyway `V1` to `V10` (`backend/src/main/resources/db/migration`), owned by the Testing teammate except V10 (A12 and A4), which came with the code that needs it. PostgreSQL is justified in the technology report: transactions, constraints (CHECKs, triggers), partial indexes and `pg_advisory_xact_lock` for the audit seals.

---

## 9. Deliverables

| Brief deliverable | Where it is |
|---|---|
| Problem analysis; requirements specification | the Report teammate's document; business rules in the backend handbook 1.7, `SYSTEM_GUIDE.md` |
| System architecture; technology stack | `SYSTEM_GUIDE.md` sections 2 to 4 and 14; `DECISIONS.md` DEC-02 |
| UML diagrams (use case, class), ER diagram | the Report teammate (diagrams); Mermaid class and sequence diagrams in `SYSTEM_GUIDE.md` |
| Source code | the shared repository, `main` |
| Database design | Flyway migrations, `db/README.md`, `SYSTEM_GUIDE.md` section 13 |
| Testing (at least 15 cases) | 26 cases in `docs/qa/test_cases.csv` with evidence in `docs/qa/README.md`, 40 automated tests in CI; the Testing teammate is adding the consolidated test report |
| Demonstration video | run sheet in `DECISIONS.md` DEC-45 (the Testing teammate is adding a dry-run checklist) |
| Technology selection report (nine questions) | the Report teammate, answers from `DECISIONS.md` and `SCALING.md` (question 9: how the system evolves with more users) |

---

## 10. The three demonstration workflows

The backend supports each end to end. The right-hand column is how much of it the frontend can show today.

| Workflow | Steps and the call behind each | Frontend today |
|---|---|---|
| **1. Employee reports, system prioritizes, technician assigned, notification generated** | Report `POST /incidents` (suggestions from `/intelligence/*`), priority from `PriorityEngine`, assignment by `AssignmentEngine`, notification by `NotificationDispatcher` | Report form `real`; the technician's side and notifications `fake` |
| **2. Technician investigates, SLA monitored, resolved, user notified** | `acknowledge`, `start`, `request-info` (SLA pauses), demo clock `POST /admin/demo/clock/advance`, `resolve`, `verify`, `feedback`, `GET /incidents/{id}/history` | all `fake` or `stub` |
| **3. Multiple incidents reported, duplicates or related identified, correlated, escalated** | Outage drill `POST /admin/demo/outage-drill`, `GET /problems`, `/problems/{id}/root-cause`, `POST /problems/{id}/join`, `POST /problems/{id}/resolve`, escalation `EscalationMonitor` | `none` |

Workflows 2 and 3 need the screens listed in `frontend/FRONTEND_GUIDE.md` (P0 and P1) before they can be recorded.

---

## 11. Innovation challenges

| Brief extension | Built | Where |
|---|---|---|
| AI-assisted classification | yes | `POST /intelligence/suggest-category`, Gemini with keyword fallback |
| AI-based resolution recommendation | yes | `GET /incidents/{id}/suggested-resolutions` |
| Incident similarity detection | yes | TF-IDF, `/intelligence/similar` |
| Automated root-cause analysis | yes | `ServiceGraph.commonUpstream`, `GET /problems/{id}/root-cause` |
| Predictive SLA violation detection | yes | `SlaRiskScorer`, `GET /incidents/{id}/sla-risk` |
| Service dependency graph | yes | `GET /services/graph`, `/services/{id}/impact`, `GET /services/status` |
| Real-time notifications and dashboard | yes | STOMP `/user/queue/notifications`, `/topic/dashboard` |
| Mobile push notifications | simulated (A4) | `PushSimulatedChannel` behind the `PushGateway` port; `POST /notifications/devices` |
| Voice-based incident reporting | no (frontend, A2) | |
| Chatbot incident reporting | yes | `POST /intelligence/chat` |
| Automated escalation | yes | M11 |
| Event-driven architecture | yes | Spring events: `IncidentChanged`, `SlaViolated`, `IncidentEscalated` and others, with audit, notification, dashboard and metrics listeners |
| Analytics and visualization | backend yes | `/reports/*`; the Grafana dashboard in `backend/observability` (A8) |
| Containerization, CI/CD | yes (Testing teammate) | `deploy/`, `.github/workflows/ci.yml` |
| Observability | yes (A8) | `/actuator/prometheus` behind a scrape token, Prometheus and Grafana files in `backend/observability` |
| Cloud deployment | no, decided against; the demo runs locally with Docker Compose | |
| Microservices | no; a modular monolith with a documented scale-out path | `SCALING.md` |
| Beyond the brief | Service Desk Simulator (S1), Major Incident Mode (S2), sealed audit trail (S3), adjustable demo clock, outage drill, coverage risk report, post-incident report | `SYSTEM_GUIDE.md` sections 12b to 12i |
