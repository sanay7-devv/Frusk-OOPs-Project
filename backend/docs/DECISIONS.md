# I-ITSM Backend: Decision Record

> **Purpose.** Every significant design decision, in the order it was taken: *when* (date and module), *what* we chose, *which alternatives* we weighed, *why*, the *trade-off* we accept, and the **cross-questions a reader of the report or a viewer of the video is likely to ask**, with short answers. Use it for the PDF report and the recorded video.
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
| [DEC-04](#dec-04-google-sign-in-as-an-extra-not-a-replacement) | Google sign-in as an extra, not a replacement | 2026-10-15 | M2b | ✅ built 2026-11-14 |
| [DEC-05](#dec-05-one-global-error-handler-and-one-error-shape) | One global error handler and one error shape | 2026-10-16 | M1 | ✅ |
| [DEC-06](#dec-06-request-id-in-a-header-not-in-the-error-body) | Request ID in a header, not in the error body | 2026-10-16 | M1 | ✅ |
| [DEC-07](#dec-07-temporary-schema-auto-profile) | Temporary `schema-auto` profile | 2026-11-06 | M2 | 🔁 Superseded 2026-11-15 by the Flyway migrations |
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
| [DEC-50](#dec-50-how-the-escalation-chain-moves) | How the escalation chain moves | 2026-11-14 | M11 | ✅ timer and exhausted wait chosen by the user |
| [DEC-51](#dec-51-escalation-preview-as-a-field-of-the-incident-detail) | Escalation preview as a field of the incident detail | 2026-11-14 | M11 | ✅ user decision |
| [DEC-52](#dec-52-the-demo-clock-is-a-forward-only-offset) | The demo clock is a forward-only offset | 2026-11-14 | M11 | ✅ user decision |
| [DEC-53](#dec-53-auto-verify-job) | Auto-verify job | 2026-11-14 | M11 | ✅ |
| [DEC-54](#dec-54-m9-notifications-mapping-delivery-storm-control-and-the-websocket-seam) | M9 notifications: mapping, delivery, storm control and the WebSocket seam | 2026-11-13 | M9 | ✅ |
| [DEC-M12-1](#dec-m12-1-tf-idf-similarity-with-its-own-calibrated-thresholds) | TF-IDF similarity with its own calibrated thresholds | 2026-11-14 | M12 | ✅ |
| [DEC-M12-2](#dec-m12-2-category-suggestion-blends-a-dictionary-with-past-categorised-incidents) | Category suggestion blends a dictionary with past categorised incidents | 2026-11-14 | M12 | ✅ user decision |
| [DEC-M12-3](#dec-m12-3-no-embeddings-in-this-part) | No embeddings in this part | 2026-11-14 | M12 | 🔁 Superseded 2026-11-16 by DEC-M12-10 |
| [DEC-M12-4](#dec-m12-4-the-llm-is-an-http-adapter-behind-a-port-with-redaction-and-strict-json) | The LLM is an HTTP adapter behind a port, with redaction and strict JSON | 2026-11-14 | M12 | ✅ |
| [DEC-M12-5](#dec-m12-5-fallback-wrapper-and-circuit-breaker) | Fallback wrapper and circuit breaker | 2026-11-14 | M12 | ✅ |
| [DEC-M12-6](#dec-m12-6-the-summary-is-post-as-in-the-contract) | The summary is POST, as in the contract | 2026-11-14 | M12 | ✅ user decision |
| [DEC-M12-7](#dec-m12-7-who-may-call-what) | Who may call what | 2026-11-14 | M12 | ✅ |
| [DEC-M12-8](#dec-m12-8-sla-risk-details-and-the-scan) | SLA risk details and the scan | 2026-11-14 | M12 | ✅ |
| [DEC-M12-9](#dec-m12-9-cache-rate-limit-and-no-connection-held-during-the-model-call) | Cache, rate limit and no connection held during the model call | 2026-11-14 | M12 | ✅ |
| [DEC-60](#dec-60-reports-for-everyone-scoped-by-the-callers-visibility) | Reports for everyone, scoped by the caller's visibility | 2026-11-14 | M10 | ✅ user decision |
| [DEC-61](#dec-61-the-slastate-filter-reads-the-stored-flags) | The `slaState` filter reads the stored flags | 2026-11-14 | M10 | ✅ |
| [DEC-62](#dec-62-csv-export-written-directly-capped-formula-safe) | CSV export written directly, capped, formula-safe | 2026-11-14 | M10 | ✅ |
| [DEC-63](#dec-63-coverage-risk-through-incident-history) | Coverage risk through incident history | 2026-11-14 | M10 | ✅ user decision |
| [DEC-64](#dec-64-post-incident-report-from-the-audit-trail-pdf-through-an-adapter) | Post-incident report from the audit trail, PDF through an adapter | 2026-11-14 | M10 | ✅ |
| [DEC-65](#dec-65-feedback-and-saved-views) | Feedback and saved views | 2026-11-14 | M10 | ✅ |
| [DEC-66](#dec-66-priority-what-if) | Priority what-if | 2026-11-14 | M10 | ✅ user decision |
| [DEC-100](#dec-100-google-id-tokens-verified-with-jjwt-and-googles-published-keys) | Google ID tokens verified with JJWT and Google's published keys | 2026-11-14 | M2b | ✅ user decision |
| [DEC-101](#dec-101-the-offline-fake-verifier-and-how-it-is-switched-on) | The offline fake verifier and how it is switched on | 2026-11-14 | M2b | ✅ user decision |
| [DEC-102](#dec-102-google-sign-in-rules-and-which-error-answers-what) | Google sign-in rules and which error answers what | 2026-11-14 | M2b | ✅ user decision |
| [DEC-103](#dec-103-small-choices-in-google-sign-in) | Small choices in Google sign-in | 2026-11-14 | M2b | ✅ |
| [DEC-80](#dec-80-who-may-use-the-dashboard-topic-and-how-destinations-are-checked) | Who may use the dashboard topic and how destinations are checked | 2026-11-14 | M13 | ✅ |
| [DEC-81](#dec-81-what-the-dashboard-pushes-events-then-counters-at-most-once-a-second) | What the dashboard pushes: events, then counters at most once a second | 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14) |
| [DEC-82](#dec-82-the-socket-closes-at-token-expiry) | The socket closes at token expiry | 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14) |
| [DEC-83](#dec-83-servicegraph-one-plain-class-for-three-walks) | `ServiceGraph`: one plain class for three walks | 2026-11-14 | M13 | ✅ |
| [DEC-84](#dec-84-e1-service-status-board) | E1 service status board | 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14) |
| [DEC-90](#dec-90-one-sliding-window-rate-limiter-enforced-at-the-door) | One sliding-window rate limiter, enforced at the door | 2026-11-14 | M14 | ✅ user decision |
| [DEC-91](#dec-91-sealed-audit-trail-s3-batch-seals-plus-one-digest-per-record) | Sealed audit trail (S3): batch seals plus one digest per record | 2026-11-14 | M14 | ✅ user decision |
| [DEC-92](#dec-92-password-policy) | Password policy | 2026-11-14 | M14 | ✅ user decision |
| [DEC-93](#dec-93-attachments) | Attachments | 2026-11-14 | M14 | ✅ user decision |
| [DEC-94](#dec-94-outages-answer-503-and-the-review-of-input-and-output) | Outages answer 503, and the review of input and output | 2026-11-14 | M14 | ✅ |
| [DEC-70](#dec-70-a-confident-ai-category-is-applied-when-the-reporter-gives-none) | A confident AI category is applied when the reporter gives none | 2026-11-14 | M4, M12 | ✅ user decision |
| [DEC-71](#dec-71-duplicate-check-on-create-and-correlation-into-problem-records) | Duplicate check on create and correlation into problem records | 2026-11-14 | M12 | ✅ user decision |
| [DEC-72](#dec-72-problem-record-lifecycle) | Problem-record lifecycle | 2026-11-14 | M12 | ✅ user decision |
| [DEC-73](#dec-73-major-incident-mode-known-outage-one-click-join-climbing-priority-root-cause) | Major Incident Mode: known outage, one-click join, climbing priority, root cause | 2026-11-14 | M12 (S2) | ✅ user decision |
| [DEC-74](#dec-74-e2-recurring-problem-detector) | E2 recurring-problem detector | 2026-11-14 | M12 (E2) | ✅ user decision |
| [DEC-75](#dec-75-a1-chatbot-intake-without-a-key) | A1 chatbot intake without a key | 2026-11-14 | M12 (A1) | ✅ user decision |
| [DEC-76](#dec-76-d2-outage-drill) | D2 outage drill | 2026-11-14 | M12 (D2) | ✅ user decision |
| [DEC-77](#dec-77-basic-parts-withdraw-mark-duplicate-reporter-edit-lock-security-setting) | Basic parts: withdraw, mark-duplicate, reporter edit lock, security setting | 2026-11-14 | M4, M10, M12, M14 | ✅ user decision |
| [DEC-78](#dec-78-actions-keep-answering-403-to-people-who-cannot-see-the-incident-t18) | Actions keep answering 403 to people who cannot see the incident (T18) | 2026-11-14 | M14 risk of DEC-42 | ✅ user decision |
| [DEC-110](#dec-110-grouping-into-a-problem-record-is-not-announced) | Grouping into a problem record is not announced | 2026-11-14 | M9 + M12 | ✅ user decision |
| [DEC-111](#dec-111-google-gemini-is-the-default-llm-provider) | Google Gemini is the default LLM provider | 2026-11-15 | M12 | ✅ user decision |
| [DEC-112](#dec-112-the-service-desk-simulator-s1-as-built) | The Service Desk Simulator (S1) as built | 2026-11-15 | S1 | ✅ built inside the design of DEC-44 and DEC-45; details open to veto |
| [DEC-113](#dec-113-minescalationlevel-filter-on-the-incident-list) | `minEscalationLevel` filter on the incident list | 2026-11-15 | M10 | ✅ |
| [DEC-114](#dec-114-index-review-and-scale-out-path-a7) | Index review and scale-out path (A7) | 2026-11-15 | M14 | ✅ |
| [DEC-115](#dec-115-observability-with-prometheus-and-grafana-a8) | Observability with Prometheus and Grafana (A8) | 2026-11-15 | M14 | ✅ |
| [DEC-116](#dec-116-password-reset-and-two-step-verification-a12) | Password reset and two-step verification (A12) | 2026-11-15 | M2 | ✅ |
| [DEC-117](#dec-117-mobile-push-as-a-simulated-channel-a4) | Mobile push as a simulated channel (A4) | 2026-11-15 | M9 | ✅ |
| [DEC-118](#dec-118-requirement-traceability-a13-and-what-was-decided-against-a5) | Requirement traceability (A13); cloud deployment (A5) decided against | 2026-11-15 | Documentation | ✅ user decision on A5 |

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
| 2026-10-15 | M2b | ✅ approved, built 2026-11-14 (DEC-100 to DEC-103) | ROADMAP D-001 |

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
| 2026-11-06, start of M2 | M2 | 🔁 Superseded on 2026-11-15: the migrations landed (PR #12, V1 to V9; V10 is ours); the profile file and `SchemaAutoSupport` were removed on 2026-11-15 (PR #26) | ROADMAP D-006 |

**Decision (historical; superseded on 2026-11-15, the profile is no longer used).** A separate profile lets Hibernate create the tables from the entities while the migration files (owned by the Testing teammate) have not arrived. Entities are written strictly to Appendix A, so the switch back is: delete the profile, drop the local database once, start with Flyway and `validate`.

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

**Context.** Most teams will show an LLM that suggests a category or chats. These three are deterministic, explainable, and each one only works because of design decisions already taken, so they double as proof of the architecture in the report and the recorded video. None depends on an API key.

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

> Two open questions from the design review (DEC-42) were put to the user with options before M11 was built. Both were built with M11 on 2026-11-14 (DEC-50); the exhausted alert reaches every administrator since the E-034 fix the same day.

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

---

### DEC-54: M9 notifications: mapping, delivery, storm control and the WebSocket seam

| When | Module | Status |
|---|---|---|
| 2026-11-13 | M9 | ✅ taken inside the frame fixed by DEC-40 and DEC-42; any line can be vetoed |

**Decision.** The listener turns events into notifications **after commit, on its own single worker thread**; every channel is an adapter behind `NotificationChannel`; people and wording are decided by plain classes in the domain (`NotificationEventType`, `NotificationRules`, `NotificationFactory`) so they can be tested without Spring.

**1. Mapping the single `IncidentChanged` action onto the 15 event types** (closes the open question of DEC-42)

| Audit action | Event type | Recipients (actor never told, except the receipt) |
|---|---|---|
| INCIDENT_CREATED | INCIDENT_CREATED | reporter (receipt, also when they are the actor) |
| ASSIGNED, REASSIGNED | INCIDENT_ASSIGNED | reporter, new assignee |
| ACKNOWLEDGED | INCIDENT_ACKNOWLEDGED | reporter |
| PRIORITY_CHANGED | PRIORITY_CHANGED | assignee, reporter |
| INFO_REQUESTED, INFO_PROVIDED | same names | reporter, assignee |
| RESOLVED, CLOSED | INCIDENT_RESOLVED, INCIDENT_CLOSED | reporter |
| VERIFIED, REOPENED | INCIDENT_VERIFIED, INCIDENT_REOPENED | assignee |
| ESCALATED | INCIDENT_ESCALATED | holders of the new level (critical), assignee |
| DUPLICATE_LINKED | DUPLICATE_SUSPECTED | reporter, assignee (used by M12); since DEC-110 only when the incident is closed as a duplicate, not when it is grouped into a problem record |
| CLASSIFIED, PRIORITY_CALCULATED, WORK_STARTED, COMMENT_ADDED | none | nobody: a pipeline step, or too chatty |

`TriageNeeded` gives TRIAGE_NEEDED to every team lead; `SlaWarning` gives SLA_WARNING to the assignee (team leads when unassigned); `SlaViolated` gives SLA_VIOLATED to every administrator (critical) and the assignee.

**2. Delivery.**

| Topic | Choice | Options not taken | Reason |
|---|---|---|---|
| Timing | `@TransactionalEventListener(AFTER_COMMIT)` plus `@Async` on a **single-thread** executor | Synchronous in the transaction (a mail failure would roll back the incident); an outbox table (needs columns the agreed schema lacks); a thread pool (the digest needs events in order) | Handbook: mail failure never rolls back an incident. One thread keeps the order of events, so the warnings of a monitor run arrive before the run-finished event |
| Email | Handed to a small scheduler: one try plus 3 retries, wait 2 s doubling (`notification.email.*`), then dropped and logged without the address | Retrying on the worker thread (a dead mail server would stall every notification) | DEC-42; the inbox row is the durable record |
| What is stored | Rows only for IN_APP and SMS_SIM; EMAIL, WEBSOCKET and CHAT leave no row | A row per channel | The table has no status or retry columns (DEC-42); one row per notification keeps the inbox free of duplicates. The CHECK of Appendix A.4 still lists all four channel names |
| Chat webhook | A room, not a person: one post per event for SLA violations and escalations, and for P1 assignment, triage and SLA warning; the URL is a live setting, empty means only logged | One post per recipient | A shared room must not see the same line five times |
| Order inside a delivery | Inbox first (the push carries the id of the inbox row), then WebSocket, SMS, email | | The browser can mark a pushed message read through the API |

**3. Preferences.** Per user, event type and channel; no row means on; `PUT` replaces the whole set. Locked: the inbox always; SLA_VIOLATED for administrators; INCIDENT_ESCALATED for team leads and administrators (`NotificationRules.isCritical`, decided per person, so the settings screen and the delivery use the same rule). `GET` returns all 60 switches with `locked`; `PUT` refuses a locked switch, `CHAT` and unknown values with 400. SMS_SIM is for P1 only whatever the switch says.

**4. Storm control.** `SlaMonitor` publishes `SlaRunCompleted` at the end of a run; warnings are held until then. A person with more than `notification.digest.threshold` (default 5) warnings gets one digest (no incident id), the others get single messages. P1 incidents and SLA violations are never held. A hold older than 10 minutes is flushed anyway, so a run that never finishes cannot swallow warnings. The hold is in memory: a restart in the middle of a run loses at most that run's pending warnings, which the inbox of the next violation covers (single instance, as DEC-42).

**5. WebSocket seam (module M13 owns the rest).** Assumed: the STOMP session is named after the user id; `WebSocketConfig` sets that from the access token on CONNECT (header `Authorization: Bearer`), refuses CONNECT without a valid token, allows SUBSCRIBE only to `/user/queue/notifications`, and refuses client SEND. `/ws` is a public HTTP path because a browser cannot add headers to the handshake. Not done here: closing the session at token expiry, the dashboard topic and per-destination permissions (M13, DEC-42).

**Trade-off.** In-memory holds and an in-memory broker mean one instance; a mail that fails four times is gone (the inbox still has the message); a person who is offline misses the push but not the inbox row.

**Cross-questions.**
- *"How do you know a mail failure cannot roll back an incident?"* The listener only starts after the commit, on another thread; the smoke test stops the mail server and the incident, inbox rows and push still work.
- *"Why is the channel interface an Adapter?"* Five technologies (SQL, SMTP, STOMP, a log with a table, HTTP) hide behind one `send`; the dispatcher never knows which.
- *"Why not one row per channel, as the table allows?"* The inbox would show the same message several times and the table cannot say whether a mail was delivered.
- *"What stops an administrator from muting violation alerts?"* `PUT` answers 400 for those switches and delivery ignores preferences for them.
- *"What happens with 200 warnings in one run?"* Each person gets one digest; P1 warnings still arrive one by one.

---

## M12 Intelligence and AI (core)

> Numbered DEC-M12-1 to DEC-M12-9 so they cannot clash with decisions the M9 and M10 sessions record in parallel; renumber to DEC-48 and on when the branches are merged.

### DEC-M12-1: TF-IDF similarity with its own calibrated thresholds

| When | Module | Status | Also in |
|---|---|---|---|
| 2026-11-14 | M12 | ✅ (the IDF corpus was chosen by the user) | SYSTEM_GUIDE 12c.3 and 12c.6, DEC-42 |

**Decision.** The default similarity is TF-IDF cosine over stemmed words, titles counted double. The word-rarity weights (IDF) come from the texts of **all incidents of the last 90 days** (`ai.idf.window.days`), cached for a minute; the compared candidates are only **open incidents of the same service created inside `dup.window.hours`**. The thresholds are separate settings: `dup.tfidf.threshold.duplicate` 0.55, `dup.tfidf.threshold.related` 0.35 and `resolution.min.similarity` 0.30. The handbook's 0.80 / 0.65 / 0.60 stay in the keys for embeddings and are not used.

**Why separate numbers.** Those thresholds were written for embedding cosine, which scores paraphrases around 0.8 to 0.9. TF-IDF scores the same paraphrase around 0.5 to 0.85, because it only sees shared words. Using 0.80 would miss most real duplicates.

**How it was calibrated.** 20 labelled queries (8 duplicates, 6 related, 6 unrelated) against 6 existing incidents and 8 background incidents (`smoke-tests/m12_calibrate.py`). Duplicates scored 0.53 to 0.85, related 0.19 to 0.54, so 0.55 gives precision 100 % and recall 87.5 % for DUPLICATE, and 0.35 keeps 4 of 6 related pairs. The full table is in SYSTEM_GUIDE 12c.6.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **TF-IDF cosine, IDF from 90 days of all incidents** ✔ | Offline, deterministic, explainable (the shared words), stable weights even when only 2 candidates exist | Misses paraphrases that share no word ("cannot reach the office" against "network unreachable") |
| TF-IDF with IDF from the candidates only | No extra query | With 1 to 3 candidates every word looks equally rare, so scores jump around |
| Plain word-overlap (Jaccard) | Trivial | Common words ("error", "cannot") inflate scores |
| Embeddings | Understands synonyms | Needs a second provider and key (see DEC-M12-3) |

**Trade-off.** Scores depend on the corpus: a bigger corpus lowers the weight of common words, so the numbers above are a starting point and the thresholds are live settings the team can retune.

**Cross-questions.** *"Why not 0.80 as the handbook says?"* That number belongs to embeddings; we measured TF-IDF on a labelled set and chose 0.55. *"How do you know it works?"* The labelled set, the table, and the staged duplicate pairs in `m12_smoke.py`. *"Does it find duplicates on other services?"* No, by design (handbook 1.7: same service, last 24 hours).

### DEC-M12-2: Category suggestion blends a dictionary with past categorised incidents

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ user decision |

**Decision.** Two independent signals, combined like two witnesses: `1 - (1 - dictionary)(1 - history)`, capped at 0.95. The dictionary (`ai/keywords.json`, edited by the Report teammate) links a category to the topics whose name words appear in its name; each matched word adds its weight `w` and the dictionary confidence is `1 - 0.5^(sum w)`. The history signal is the share of the five most similar past categorised incidents that carry the category, times the best similarity. Impact and urgency come from phrase cues, the longest matching phrase winning; a number of people named also sets impact.

**Options.** Dictionary only (predictable, never learns); past incidents only (needs data, a fresh database suggests nothing); **blend** ✔ (works on day one and improves).

**Trade-off.** The dictionary is English and tuned to common IT words; a category with an unusual name and no history is never suggested. Wrong suggestions are cheap: below 0.60 nothing is shown and the user can always override.

**Cross-questions.** *"Why noisy-or and not an average?"* Agreement between two weak signals should raise confidence, an average would lower the strong one. *"Why cap at 0.95?"* A keyword match is evidence, not proof.

### DEC-M12-3: No embeddings in this part

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | 🔁 Superseded 2026-11-16 by DEC-M12-10 (embeddings built) |

**Decision (historical).** The embeddings path (`incident_embeddings`, asynchronous computation after commit, hourly backfill) is not built. The table stays unused. `TextAnalysisService.findSimilar` is the interface an embedding engine would implement; the fallback wrapper already routes similarity to one place.

**Why.** The Anthropic API has no embeddings endpoint, so real embeddings need a second provider, a second key and a second failure mode, and cannot be verified offline. TF-IDF is the default in DEC-42 anyway.

**Options.** Skip ✔; store TF-IDF vectors in the table (small, but they are not embeddings and add a write path and a listener for no gain); full embeddings through a second provider (largest scope).

**Cross-questions.** *"The handbook says embeddings."* It also says keyword similarity is the fallback and that the no-key path must work; the default is the one we can verify, and the seam for the other is in place.

### DEC-M12-4: The LLM is an HTTP adapter behind a port, with redaction and strict JSON

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ |

**Decision.** (The default provider is Gemini since DEC-111; the Anthropic adapter below remains selectable.) `LlmClient` is a two-method port (`isAvailable`, `complete`). `AnthropicLlmClient` calls `POST /v1/messages` with the JDK `HttpClient`: no SDK dependency, a per-request timeout set from `ai.timeout.seconds`, no retries (a retry would double the wait; the fallback is the retry). Model `LLM_MODEL` (default `claude-haiku-5-5`), `anthropic-version` and base URL are properties; the key is `LLM_API_KEY` and is never logged. No sampling parameters are sent (current models reject them) and effort is `low` (a short classification should not think for long). Prompts are resource files. `LlmTextAnalysisService` sends only the title, description and category names (for summaries: comment and audit text without names), after `TextRedactor` removed emails, IP addresses and tokens; incident text is untrusted and travels as quoted JSON values. The answer must be one JSON object of the exact shape; a category id that is not in the active list, a number out of range or any other shape is a failure.

**Options.** The official Java SDK (typed, but a new dependency tree and its own retry and timeout behaviour that would have to be switched off); **plain HTTP** ✔ (the brief asked for HTTP, full control of the 8-second limit); a provider-neutral framework (more code than the three calls need).

**Smoke runs.** `LLM_PROVIDER=fake` swaps in `ScriptedLlmClient`, which never touches the network, answers in valid JSON, echoes the redacted text it received (so a check can prove redaction) and fails on demand from inside the text (`[[LLM_FAIL]]`, `[[LLM_BAD_JSON]]`, `[[LLM_BAD_CATEGORY]]`). It is a property, not a profile, so a production start with the default value always uses the real client.

**Cross-questions.** *"What stops prompt injection?"* The model only chooses among ids we validate and returns fields we validate; the worst an injected text can do is pick a wrong category, which the user can override. *"What leaves the system?"* Title, description and category names, redacted; never emails, IP addresses, tokens, names or ids of people.

### DEC-M12-5: Fallback wrapper and circuit breaker

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ (DEC-42 chose the breaker; this fixes its numbers) |

**Decision.** `FallbackTextAnalysisService` is the `@Primary` implementation. `ai.primary` (live) picks LLM or KEYWORD. With LLM primary and a key, an exception, timeout or malformed answer is logged as a warning and the keyword engine answers. After `ai.breaker.failures` (3) consecutive failures the LLM is skipped for `ai.breaker.cooloff.seconds` (60); the first request after the cool-off is the trial (success closes the breaker, failure re-opens it). Similarity is always TF-IDF and never goes to the model.

**Trade-off.** The breaker is per instance and in memory (like the config cache, DEC-18). During the cool-off a recovered provider is not used until the trial. After the cool-off several concurrent requests may all be let through as trials.

**Cross-questions.** *"Why a breaker at all?"* Without it a provider outage costs 8 seconds on every keystroke-triggered suggestion.

### DEC-M12-6: The summary is POST, as in the contract

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ user decision |

**Decision.** `POST /incidents/{id}/summary`, as in the handbook (Appendix B), the API Data Dictionary and `planned-endpoints.json`. The task text for this session said GET; the contract wins. A summary can call a paid model, so it also fits POST and counts against the rate limit.

**Other differences from the contract, for the frontend.** `SimilarIncident` has one extra field, `match` (`DUPLICATE` or `RELATED`); `SlaRisk` has `atRisk` and `threshold` besides `score`, `level` and `factors`; the generated schema names are `CategorySuggestionView`, `IntakeSuggestionView`, `SimilarIncidentView`, `SuggestedResolutionView`, `ThreadSummaryView`, `SlaRiskView` (the JSON shape is the one in Appendix C.6). The frontend's `intelligence.ts` already matches (it ignores the extra fields).

### DEC-M12-7: Who may call what

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ |

**Decision.** The three `/intelligence/*` calls need `INCIDENT_CREATE` (every user has it: the contract says "any"). The per-incident calls check visibility first and answer **404 `INCIDENT_NOT_FOUND`** to a caller who may not see the incident (DEC-21, DEC-42); `similar` is open to every viewer (reporter, assignee, team lead, admin); `suggested-resolutions`, `summary` and `sla-risk` need the assignee, a team lead or an admin, and a viewer who is none of these (the reporter) gets **403**. The `@PreAuthorize` on the staff calls keeps employees out at once with 403.

**Privacy note.** `POST /intelligence/similar` returns the code, title and status of other people's open incidents on the same service to any employee: that is the feature (join the existing ticket instead of filing another). Only titles, never descriptions.

### DEC-M12-8: SLA risk details and the scan

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ |

**Decision.** The handbook's four factors with the weights as settings (`sla.risk.weight.*`, sum 1.0). Gaps the handbook left: nobody assigned counts as load 1.0 ("nobody is working on it"); no similar resolved incident counts as history 0.5 (neutral); the elapsed share uses the policy's calendar and freezes while the clock is paused; a resolved incident scores 0. Levels: HIGH from `sla.risk.threshold`, MEDIUM from threshold minus 0.30, else LOW (0.40 at the default, matching the contract). The scan visits incidents being worked on (assigned, acknowledged, in progress, pending info, reopened) that still have a running clock, each in its own transaction, and publishes `SlaAtRisk` once per crossing, tracked in an in-memory set.

**Trade-off.** After a restart the set is empty, so an incident that was already at risk is announced once more. The first scan runs at most 30 seconds after start, so a restart re-announces quickly rather than after five minutes. Nothing listens to `SlaAtRisk` yet; M9 can notify the assignee from it.

### DEC-M12-9: Cache, rate limit and no connection held during the model call

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ |

**Decision.** Identical suggestion requests within `ai.cache.ttl.seconds` (60, 0 turns it off) get the same answer; the key is a hash of the operation, `ai.primary` and the text. Each user may make `ai.ratelimit.per.minute` (20) suggestion or summary requests in any sliding minute, then 429 `RATE_LIMITED`; cache hits count, the per-incident reads (`similar`, `suggested-resolutions`, `sla-risk`) are not limited. Both are in memory and per instance (DEC-42); module M14's general rate limiting will replace the limiter. Data is read in short read-only transactions and the engine runs afterwards, so a slow model call never holds a database connection.

**Cross-questions.** *"Is the limit safe behind two instances?"* No: each instance counts separately; stated openly in DEC-42.

---

## M10 Search and reports (2026-11-14)

Numbers DEC-60 to DEC-66 are used so they do not collide with decisions written in parallel for M9, M11 and M12 (DEC-48 onward). The user chose the options of DEC-60, DEC-63 and DEC-66 on 2026-11-14.

### DEC-60: Reports for everyone, scoped by the caller's visibility

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 | ✅ user decision |

**Decision.** Every report except workload and coverage risk may be called by any logged-in user and counts only the incidents that user may see: employees their own, technicians their own and assigned ones, team leads and administrators all (the same rule as the incident list, DEC-26). Workload and coverage risk need `TEAM_VIEW`, because they show other people's work. Every number is one `COUNT` or `GROUP BY` in the database (`NativeReportRepository`); definitions of open, resolved, violated, judged and met are in one place (SYSTEM_GUIDE 12b.2).

**Options considered.** Administrators only, as the API Data Dictionary says (simplest, but then "role visibility in reports" cannot be shown and employees have no view of their own numbers) · administrators and team leads with `REPORT_VIEW` · **everyone, scoped** ✔.

**Why.** Role visibility becomes visible in the demo (the same screen with different numbers per role), and a total can be proven against the list the same user sees. Aggregates are computed in the database so they equal a direct count by construction; a Java loop over entities could drift and would load every incident.

**Trade-offs.** The contract says "Who: Admin" for the reports; the frontend may still show the screen to administrators only. Native SQL ties the reports to PostgreSQL (FILTER aggregates, `date_trunc`), which is the only database we run. The compliance definition (violated = a violation row or resolved late) differs from the live SLA state by up to one monitor interval, as in DEC-61.

**Cross-questions.** *"Why are open + resolved = total?"* The ten statuses split into the seven open ones and RESOLVED, VERIFIED, CLOSED. *"What counts as an SLA violation?"* An incident with a row in `sla_violations`, or resolved after its deadline; duplicates and withdrawn incidents are not judged. *"Why can an employee see the overview?"* It only counts their own incidents.

### DEC-61: The `slaState` filter reads the stored flags

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 | ✅ follows DEC-42 |

**Decision.** `GET /incidents?slaState=` filters on the fire-once warning and violated flags, the paused marker and the status, written as Criteria predicates that follow the branches of `SlaTracker.stateAt` (SYSTEM_GUIDE 12b.1). `AT_RISK` is accepted and matches nothing until M12.

**Why.** With business hours (DEC-39) elapsed time cannot be computed in SQL. The flags are written by the monitor within one interval.

**Trade-off.** A list can say OK while the detail already says WARNING or VIOLATED, for up to one monitor interval. Documented in the guide and in TEAM_UPDATES.

**Cross-question.** *"Why not compute it in Java after the query?"* Paging and totals would be wrong: the filter must run in the database.

### DEC-62: CSV export written directly, capped, formula-safe

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 | ✅ |

**Decision.** `GET /reports/export?type=` writes CSV straight to the response, capped at `report.export.max.rows` (default 10000); the incident export reads the list in pages of 200. Text cells starting with `=`, `+`, `-`, `@`, tab or carriage return get a leading apostrophe; numbers are not touched.

**Options.** `StreamingResponseBody` on another thread (rejected: the JWT is not carried to the async dispatch, so the final authorization check could fail on a stateless API) · build the file in memory (rejected: unbounded) · **write directly in the request thread** ✔.

**Trade-off.** The request thread is busy while writing; the row cap bounds it. A cell such as "-5" given as text becomes "'-5" (safe, slightly different).

**Cross-question.** *"Is the apostrophe enough?"* It is the OWASP advice; Excel and Sheets show the text without the apostrophe and do not run it.

### DEC-63: Coverage risk through incident history

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 (E3) | ✅ user decision |

**Decision.** A service has no category in the schema, so the pairs come from history: services and categories seen together on incidents in the last 90 days (`coverage.window.days`). For each pair, the pool is the technicians the assignment engine would accept for that category: active, AVAILABLE or BUSY, holding at least one required skill (anyone if none is required). Flagged when criticality is at least `coverage.min.criticality` (4) and the pool is smaller than `coverage.min.holders` (2). Per-skill holder counts are shown so a lone holder of one skill is visible.

**Options.** Every category with a list of critical services · every critical service times every category (noisy) · **history pairs** ✔. For the pool: strictly AVAILABLE and all skills (stricter, would flag more) · **same rule as assignment** ✔.

**Why.** The report predicts what assignment will do: a category is "at risk" exactly when the engine would find nobody or one person.

**Trade-off.** A service never used with a category is not listed; a new risky pair appears only after its first incident.

**Cross-question.** *"Why include BUSY?"* BUSY technicians still receive incidents, so excluding them would overstate the risk.

### DEC-64: Post-incident report from the audit trail, PDF through an adapter

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 (E4) | ✅ library chosen in DEC-42 |

**Decision.** One report per incident, computed from `audit_records` (timeline, wall-clock time per status, people), the incident (SLA due times, resolution) and `sla_violations`. Visible to whoever can see the incident; reporters do not get internal-note entries. Open incidents give a report so far. The PDF is made by `OpenPdfPostIncidentRenderer` (OpenPDF 3.0.5, package `org.openpdf`) behind the port `PostIncidentPdfRenderer`.

**Rules.** The current status runs to now; CLOSED is final and has no duration; a reopened incident visits some statuses twice and their times add up.

**Trade-offs.** Wall-clock time, not business hours (the SLA outcome already uses business hours). OpenPDF is permissively licensed and has a table API; the port keeps the library replaceable.

**Cross-question.** *"What if the audit trail is missing entries?"* The report starts from NEW at creation time and follows only entries that change the status.

### DEC-65: Feedback and saved views

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 | ✅ shapes proposed here, the dictionary has none for saved views |

**Feedback.** `POST /incidents/{id}/feedback`, rating 1 to 5, comment up to 1000. Answers follow DEC-20: 404 for a stranger, 403 for a viewer who is not the reporter, 409 before RESOLVED and 409 on a second rating (the primary key on `incident_id` backs this at the database level; a race gives the same 409). `GIVE_FEEDBACK` in `IncidentAccessPolicy` means "reporter"; `IncidentViewMapper` fills `feedback` and adds the action to `allowedActions`. Feedback is not audited (no audit action exists for it and the contract of `AuditAction` is fixed).

**Saved views.** `GET /saved-filters`, `POST /saved-filters {name, filter}` (201), `DELETE /saved-filters/{id}` (204). The filter is a JSON object with the keys of `GET /incidents` only; unknown keys and bad values are 400 with `filter.<key>` field errors. Names are unique per user (checked in code, as DEC-17 does for the SLA default, so the table stays as in Appendix A.4) and the count per user is limited by `saved.filters.max`. Another user's view is 404.

**Cross-question.** *"Why not store the query string?"* JSON can be replayed by any client and validated; a string would break whenever a filter is added.

### DEC-66: Priority what-if

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M10 (A11) | ✅ user decision |

**Decision.** One read-only `POST /priority/what-if` with two modes: `incidentId` (service and category from the incident; the caller must see it; the response also shows the stored priority and score) or `serviceId` with optional `categoryId` for raw input. It builds a `PriorityInput` and calls the live `PriorityEngine` with the current settings, so the answer matches what a real incident would get, and adds the SLA minutes of the resulting priority. Nothing is saved, audited or versioned.

**Options.** `GET /incidents/{id}/priority-preview` only · two endpoints · **one POST with two modes** ✔.

**Trade-off.** The Security-category test is repeated from `IncidentService` (six lines) because that class could not be changed in this module; C3 will replace both with a setting.

**Cross-question.** *"How do you know the what-if is the same as the real calculation?"* It calls the same engine; the smoke test creates an incident with the same inputs and compares priority and score.

---

## M11 Escalation, auto-verify and the demo clock (2026-11-14)

### DEC-50: How the escalation chain moves

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M11 | ✅ the timer anchor and the exhausted wait were chosen by the user; the rest follows DEC-42, DEC-48, DEC-49 | User (recommended option for the anchor, a new setting for the exhausted wait) |

**Context.** DEC-48 and DEC-49 say what the chain covers; they do not say how the monitor measures "how long at this level", what the final alert waits for, or what to do at a level nobody holds.

**Decision.**
1. **Chain of Responsibility.** `EscalationHandler` is the abstract link; `TechnicianHandler` (0), `TeamLeadHandler` (1), `SystemAdminHandler` (2) and `ItManagerHandler` (3) each own one level. A handler passes an incident at another level to the next link; for its own level it returns the step to perform once the time its level may take has passed. The time comes from the `escalation_policies` row of the level above (the row says "minutes at the previous level before moving up to this one"). The domain classes know nothing about Spring.
2. **The timer (user's choice).** "How long at this level" is the newest of: creation, ASSIGNED, REASSIGNED, ESCALATED and PRIORITY_CHANGED in the audit trail. No new column. A reassignment restarts the timer and keeps the level (DEC-42), so a reassign cannot hide a critical incident; a priority raised to P1 starts its timers then, not at creation.
3. **The exhausted wait (user's choice).** The incident stays at level 3 for the new setting `escalation.exhausted.minutes` (default 15, 1 to 1440) before the one final alert of DEC-49.
4. **"Once per incident" without a column.** The exhausted alert is an ESCALATED audit entry whose description starts with `Incident.EXHAUSTED_PREFIX` ("Escalation exhausted at level 3"); the monitor checks for such an entry. A text prefix is the one place we accept a text rule here (see C3 in DEC-46); it is one constant, in the domain, with a repository method named for it.
5. **A level nobody holds is passed over (DEC-42).** The incident climbs on in the same run: each hop is its own audit entry and event, and the passed-over one has no recipients and says "nobody holds this level, passed over". Level 3 always stays, even if empty, because the exhausted alert goes to all administrators. A manual escalation raises exactly one level and does not skip.
6. **Assigning an incident that is in triage (reading of DEC-48).** "Assigning or acknowledging it stops the climb" is read as: the triage climb (no technician) stops, the technician gets a fair window (the assignment restarts the timer, level kept) and the incident is then an ordinary unacknowledged assigned incident; acknowledging stops everything. The alternative reading, that an assigned incident never climbs again, would contradict the rule for incidents assigned from the start, so it was not built. **If the user meant the alternative, it is a small change in `IncidentState.isUnattended`.**
7. **What the monitor publishes.** One `IncidentChanged` (action ESCALATED, written to the audit trail by `AuditListener` in the same transaction) and one `IncidentEscalated` per hop; for the final alert one `IncidentChanged` and one `EscalationExhausted`. The notification module (M9) sends INCIDENT_ESCALATED to `recipientIds`; for the exhausted alert it uses the same type with its own wording, to every administrator, with SMS for P1.
8. **Who may escalate by hand.** The assignee (needs INCIDENT_HANDLE), a team lead (INCIDENT_VIEW_TEAM) or an administrator (INCIDENT_VIEW_ALL), from ASSIGNED, ACKNOWLEDGED and IN_PROGRESS, never at level 3 (409). The status does not change (handbook 1.8). The reason is an internal note, hidden from the reporter.

**Options considered (timer anchor).**

| Option | For | Against |
|---|---|---|
| **A. Newest of creation, assign, reassign, escalate, priority change** ✔ | Fair window for each new owner; no new column | One audit query per watched incident per run |
| B. A reassignment resets the level to 0 | Easy to say | A reassign loop hides a critical incident |
| C. Counted from creation only | No lookup | An incident assigned late gives the technician almost no time |

**Options considered (exhausted wait).** Same time as the level-3 policy (no new setting), a new setting (chosen), or at once on reaching level 3 (the manager gets no time to react).

**Trade-offs.** One more setting to explain; the exhausted alert depends on a text prefix. A busy run costs one small query per candidate (P1 and P2 only, never acknowledged ones).

**Cross-questions.** *"Why does a reassigned P1 not start again at level 0?"* The chain exists because the first owner did not react; a new owner does not make the incident less urgent. *"Can two monitors escalate the same incident twice?"* No: the incident row has a version, so one of two concurrent writers gets a conflict and retries next run, and a second run finds the timer restarted by the first entry. *"What if M9 is not merged?"* The audit entries and the two events are complete without it; M9 only listens.

### DEC-51: Escalation preview as a field of the incident detail

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M11 (A11) | ✅ user decision | User (recommended option) |

**Decision.** `IncidentDetail` gets `escalationPreview`: `{kind (RAISE or EXHAUSTED), fromLevel, toLevel, targetRole, dueAt, secondsRemaining, recipients: [{id, name}]}`, or null when nothing is coming (not P1 or P2, acknowledged, already exhausted). It is computed by the same planner as the monitor, so the preview and the real escalation cannot disagree. Only staff see it: the assignee, team leads and administrators; the reporter gets null (the list of people to be woken is not for them).

**Options.** A field on the detail (chosen: no extra call, shows on the incident screen), a separate `GET /incidents/{id}/escalation-preview` (extra call), both (more surface).

**Cross-questions.** *"Does this slow the lists?"* No. Only the detail computes it; lists do not.

### DEC-52: The demo clock is a forward-only offset

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M11 (D1) | ✅ user decision | User (recommended option) |

**Decision.** In the `demo` profile only, the `Clock` bean is an `AdjustableClock`: the system clock plus an offset that an administrator can only increase, `POST /admin/demo/clock/advance {minutes}` (1 to 1440 per call), `GET /admin/demo/clock` (current time and offset). Both need CONFIG_MANAGE, both exist only in the `demo` profile (`@Profile("demo")` on the controller and on `DemoClockConfig`; `ClockConfig` is `@Profile("!demo")`), and every advance is a CONFIG_CHANGED audit entry. Scheduled jobs keep running in real time (every 15 to 30 seconds in the demo) and read the moved clock, so a hop happens within one monitor interval after the advance.

**Options.** Offset only (chosen: deterministic, nothing runs fast), offset plus a speed multiplier (livelier, but timestamps and job intervals become confusing), offset with reset (handy between takes, but time going backwards breaks audit order and SLA flags).

**Things to know for the recording.** The access token is judged against the same clock: after advancing more than 15 minutes the next call may answer TOKEN_EXPIRED; refresh it (the refresh token lasts 7 days). It is for the recorded demo only; the production and test profiles cannot reach it.

**Cross-questions.** *"Is this not a back door?"* It does not exist as a bean or a route unless the profile is `demo`, which is never the production profile; the permission is the same one that guards settings.

### DEC-53: Auto-verify job

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M11 (G2) | ✅ | Backend lead (follows DEC-46) |

**Decision.** `AutoVerifyMonitor` finds incidents RESOLVED at least `verify.auto.hours` ago (existing key, default 48, demo 0.033), re-checks each inside its own transaction, moves it to VERIFIED and then CLOSED with `ClosureReason.AUTO_VERIFIED`; both steps are audit entries with no actor. Idempotent (a closed incident is no longer RESOLVED). The interval is a new setting `verify.monitor.interval.seconds` (default 300, demo 30), read again after every run, like the other monitors, instead of the property `app.autoverify.monitor-interval-seconds` that only existed in the demo properties file (that property is now unused; the demo seed should set the new key to 30).

**Cross-questions.** *"What if the reporter replies at the same moment?"* The transaction re-reads the incident; the version column makes one of the two writers lose, and the loser is retried or refused cleanly.

---

## M2b Google sign-in (session D, DEC-100 to DEC-109)

### DEC-100: Google ID tokens verified with JJWT and Google's published keys

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M2b | ✅ user decision | User ("Approve all", recommended option) |

**Decision.** `JjwtGoogleIdTokenVerifier` parses the token with JJWT (already in the project). A `GoogleJwksKeyLocator` fetches Google's key set from `https://www.googleapis.com/oauth2/v3/certs` with `java.net.http`, picks the key by the token's `kid` header, accepts only RS256, caches the keys for the `Cache-Control: max-age` Google sends (one hour if missing) and refetches early (at most once a minute) when it sees an unknown `kid`. After the signature and expiry (one minute of clock skew) are good, `GoogleClaimsChecker` checks issuer (`accounts.google.com` or `https://accounts.google.com`), audience (equal to `GOOGLE_CLIENT_ID`), and that subject and email exist. If Google's keys cannot be fetched and nothing is cached, sign-in answers 503 `SERVICE_UNAVAILABLE`; it never accepts an unchecked token.

**Options.** (a) JJWT plus our own key fetch (chosen: no new dependency, every check visible in our own classes); (b) Google's `google-api-client` verifier (least code, but about 3 MB of dependencies and the checks are hidden); (c) Nimbus JOSE+JWT (good key caching, but a second JWT library beside JJWT).

**Why.** The verification is the security-relevant part of the feature, so it should be readable in class. It also keeps the Adapter pattern visible: `GoogleIdTokenVerifier` is the port in `application.auth`, the adapters live in `infrastructure.google`.

**Cross-questions.** *"Why not the oauth2-client starter?"* The frontend already holds the ID token from the Google button; the backend only has to check it, not run the OAuth redirect flow (D-001). *"What if Google rotates keys?"* An unknown `kid` triggers one refetch. *"What if Google is down?"* Cached keys keep working; with an empty cache the answer is 503, not a bypass.

### DEC-101: The offline fake verifier and how it is switched on

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M2b | ✅ user decision | User ("Approve all", recommended option) |

**Decision.** Property `app.google.verifier` (env `GOOGLE_VERIFIER`), `google` by default or `fake`. The fake accepts HS256 tokens signed with a fixed key and passes them through the same `GoogleClaimsChecker`, so expiry, issuer and audience are really tested. `GoogleSignInConfig` refuses to start with `fake` unless the `dev`, `demo` or `test` profile is active.

**Options.** (a) Property with a profile guard (chosen); (b) property without the guard (a stray setting in production would let anyone mint a token); (c) a separate `google-fake` Spring profile (more moving parts for the same result).

**Cross-questions.** *"Is the fixed key a back door?"* It exists only when the property says `fake`, and the application will not start that way outside the three non-production profiles (same idea as DEC-52).

### DEC-102: Google sign-in rules and which error answers what

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M2b | ✅ user decision | User ("Approve all", recommended option) |

**Decision.** `POST /auth/google {idToken}` returns the normal `AuthResponse`.
- A bad token (signature, expiry, audience, issuer, missing claims) gives 401 `TOKEN_INVALID`.
- Account-level problems give 401 `INVALID_CREDENTIALS`, the same answer as a wrong password: `email_verified` false, no account with auto-registration off, deactivated account, or an account already linked to a different Google subject. Nothing is linked in those cases.
- A locked account gives 423 `ACCOUNT_LOCKED`, even with a valid token.
- Every failure is audited as `LOGIN_FAILED` ("Failed Google login: ...", user id when known). Google failures do not add to `failed_logins` (a signed token cannot be guessed, and counting them would let anyone lock a victim out). A success resets the counter.
- The account is found by `google_sub` first (it never changes), then by the verified email, which links it by storing `google_sub`.
- Auto-registration is the `app_config` key `auth.google.autoregister` (`true` or `false`, default `false`): a new EMPLOYEE-only user, `password_hash` NULL, name from the token or the part before the `@`. A Google-only user's password login answers `INVALID_CREDENTIALS` (D-001).

**Options.** (b) specific codes such as `GOOGLE_EMAIL_UNVERIFIED` (clearer for the login page, but tells strangers whether an email has an account and needs new contract entries); (c) count unverified and deactivated attempts toward lockout (consistent with passwords, but lets anyone with a Google account lock a victim by sending the victim's email).

**Cross-questions.** *"Why link by email at all?"* Only because Google states the email is verified; an unverified email is never trusted. *"What stops account takeover through a recycled email?"* Once linked, the `google_sub` is checked first and a different sub on the same email is refused.

### DEC-103: Small choices in Google sign-in

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M2b | ✅ | Backend lead (session D) |

**Decision.** (1) `GoogleSignInService` is a new class; `AuthService` changed in one line only (`issueTokens` is package-visible), so session C's password-policy edits merge cleanly. (2) `POST /auth/google` is in `SecurityConfig.PUBLIC_PATHS`; rate limiting comes from session C's login interceptor, keyed by IP. (3) Failed key fetches answer 503 with the code `SERVICE_UNAVAILABLE`; the shared `ErrorCode` enum was not touched. (4) Rejection reasons (wrong audience, expired, ...) go only to the audit trail, never to the caller. (5) A blank `GOOGLE_CLIENT_ID` makes every Google sign-in fail (logged as a warning at startup) rather than accept any audience.

**Cross-questions.** *"Why a separate service?"* Single responsibility: password flows and the Google flow share only token issuing.

## M13 Real-time layer, dashboard and service graph (2026-11-14)

### DEC-80: Who may use the dashboard topic and how destinations are checked

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M13 | ✅ follows DEC-42 |

**Decision.** One table in code (`StompDestinationPolicy`) maps each STOMP destination to the permission it needs: `/user/queue/notifications` any logged-in user, `/topic/dashboard` `REPORT_VIEW`. Anything else is refused. `REPORT_VIEW` is the permission of `GET /dashboard/live`, held only by administrators, so the socket and the REST call give the same answer. The CONNECT interceptor now stores a `StompPrincipal` (user, permissions, token expiry) instead of a bare name, so SUBSCRIBE can read the permissions without a database call.

**Options considered.** Spring Security's message authorization (`@EnableWebSocketSecurity`): heavier, a second rule language beside `@PreAuthorize`. A role-name check: rejected by DEC-09.

**Trade-off.** Permissions are the ones in the token at connect time; a role change applies at the next connect (at most one token lifetime, the same window as REST, DEC-10).

**Cross-questions.** *"Why can a technician not watch the dashboard?"* The topic carries every incident of the organisation; technicians do not hold `REPORT_VIEW`. *"Is subscribing checked on every message?"* No, once at SUBSCRIBE; the broker then delivers to subscribers.

### DEC-81: What the dashboard pushes: events, then counters at most once a second

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14, option A) |

**Decision.** Two message shapes on `/topic/dashboard`: (1) `DashboardEvent {type, incidentId, code, priority, status, at}` for each incident event (types are `NotificationEventType` values, plus `SLA_WARNING` and `SLA_VIOLATED`; pipeline steps without a type are not pushed), (2) `{type: "COUNTERS", counters {total, open, critical, resolved, slaViolations}, byPriority, at}` after a change (at most once a second) and every `dashboard.counters.interval.seconds` (30) in silence. Counters use the definitions of `/reports/overview` over all incidents, from the same query, so the two can never disagree. `GET /dashboard/live` returns the same counters, `byPriority` (open incidents per priority, P1 to P4 always listed), the last 20 events (read from the audit trail, newest first, so they survive a restart) and up to 10 `atRisk` incidents: open, no SLA violated yet, and either a resolution warning was sent, the risk scan flagged it (M12), or a response warning was sent before acknowledgement.

**Observer.** `DashboardListener` is one more `@TransactionalEventListener(AFTER_COMMIT)` beside audit and notification, on its own single thread (`dashboardExecutor`), so a rolled-back change is never shown, a slow socket never delays the request, and events keep their order. It reads the incident's current code, priority and status after the commit. The STOMP send hides behind the `DashboardPublisher` port (Adapter).

**Options considered.** Counters embedded in every event: one shape, but nothing is pushed while quiet and every event pays the counters query. Events only, the frontend refetches: simplest server, doubles traffic. Chosen: separate shapes, coalesced, because one incident creation publishes several events and should cost one counters query.

**Trade-off.** Counters can trail an event by up to one second; a restart loses nothing (counters come from the database).

**Cross-questions.** *"Is one second guaranteed?"* The event arrived 1.3 s after the HTTP call started in the first smoke run, which includes the whole creation pipeline; counters follow on the next tick. *"Why read the audit trail for recent events?"* They then agree with history and no in-memory buffer is lost on restart.

### DEC-82: The socket closes at token expiry

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14, option A) |

**Decision.** On CONNECT the interceptor records the token's expiry; a decorator around Spring's WebSocket handler (`WebSocketSessions`) knows the open sessions, and one scheduled task per session closes it with code 4001 `TOKEN_EXPIRED` at that second. Every frame after the expiry is also refused. The client refreshes its token, reconnects, and polls meanwhile (contract B.5). This closes the DEC-10 window for sockets.

**Options considered.** A sweeper every N seconds: simpler, up to N seconds late. Handing over a refreshed token on the open socket: nicest for the user, but opens a client SEND path and needs more code.

**Trade-off.** One timer per session in memory (single instance, DEC-42); the demo clock (D1) moving forward does not close sockets by itself, but the next frame is refused.

**Cross-questions.** *"What if the server restarts?"* All sockets drop; clients reconnect. *"Why 4001?"* Codes 4000 to 4999 are reserved for applications (RFC 6455).

### DEC-83: `ServiceGraph`: one plain class for three walks

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M13 | ✅ extends DEC-16 and DEC-42 (Java traversal with a visited set) |

**Decision.** `domain/service/ServiceGraph` is a plain class over service ids, built once per request from the active services. It gives `impactOf(id)` (downstream: who needs this service), `upstreamOf(id)` (what it needs) and `commonUpstream(ids)` (what every given service needs; used by S2 for the probable root cause). All three are breadth-first with a visited set, so distance is the shortest number of edges and a cycle written straight into the database cannot loop. `commonUpstream` ranks candidates by the largest distance from any affected service, then the sum, then the id; each affected service counts as its own upstream at distance 0.

**Why.** Example: Payment and Portal depend on Auth, Auth depends on Database. Common upstream of Payment and Portal is Auth (largest distance 1) then Database (2): the root cause is the closest shared service. `ItService.dependsOnTransitively` stays for the cycle check at write time.

**Options considered.** A recursive query in the database: harder to test, not needed at tens of services. Walking `ItService.getDependencies()` directly: lazy loading and set hashing of entities hide the algorithm.

**Cross-questions.** *"Complexity?"* O(V + E) per walk. *"Why not depth-first?"* Breadth-first gives the shortest distance the contract asks for.

### DEC-84: E1 service status board

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M13 | ✅ user decision (approved 2026-11-14, option A) |

**Decision.** `GET /api/v1/services/status`, any logged-in user. `{basis: "REPORTED_INCIDENTS", label: "Based on reported incidents", windowDays, generatedAt, services: [{id, name, criticality, status, reason, causedBy [{id, name, distance}], open {total, P1..P4}, slaCompliancePercent, slaJudged}]}`. OUTAGE: an open P1 on the service. DEGRADED: an open P2, or an OUTAGE on any service it depends on, at any distance (`causedBy` names them, nearest first). Otherwise HEALTHY. Open counts include P3 and P4 but only P1, P2 and upstream outages change the status. SLA compliance is the SLA compliance report's definition (`met / judged`) over incidents created in the last `status.sla.window.days` (30) days, null when nothing was judged. Sorted OUTAGE, DEGRADED, HEALTHY, then name; active services only.

**Why.** It answers "poor visibility into service health" (DEC-47) from data the system already has, and it is honest about its source.

**Trade-off.** A failing service nobody reported shows HEALTHY, hence the label. Employees see counts and names of services, never an incident.

**Cross-questions.** *"Why transitive?"* If Database is down, Payment is likely down even before anyone reports it. *"Why does a P2 upstream not propagate?"* Only an outage (P1) propagates, so one slow dependency does not light up the whole graph.

## M14 Hardening and the sealed audit trail (2026-11-14)

### DEC-90: One sliding-window rate limiter, enforced at the door

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M14 | ✅ user decision ("Approve all", option A) | User, relayed by the supervisor |

**Decision.** One class, `RateLimiter` (`application/ratelimit`), keeps for each (bucket, key) the instants of the requests in the last 60 seconds and refuses the request that would exceed the limit: exactly "at most N in any minute", no burst at a window edge. A `RateLimitFilter` (inside the security chain, so the caller is known) enforces three limits before the controllers run, so `AuthService`, `IncidentService` and `IncidentController` know nothing about it:

| Bucket | Applies to | Key | Setting (live, `app_config`) | Default |
|---|---|---|---|---|
| LOGIN | `POST /auth/login` | client address + e-mail from the body | `ratelimit.login.per.minute` | 10 |
| LOGIN_ADDRESS | same call | client address alone (one address trying many e-mails) | 5 x the setting above | 50 |
| GOOGLE | `POST /auth/google` (module M2b) | client address | the same login setting | 10 |
| INCIDENT_CREATE | `POST /incidents` | user id | `ratelimit.incident.create.per.minute` | 20 (handbook) |
| AI | the suggestion endpoints | user id | `ai.ratelimit.per.minute` (existing) | 20 |
| DENIED_AUDIT | audit entries for refused requests (403) | user id, or address when not logged in | `ratelimit.denied.audit.per.minute` | 20 |

`AiRateLimiter` (module M12) keeps its name and signature and now delegates to the shared limiter; its behaviour is unchanged (the smoke test checks 3 per minute, then 429). A refusal is 429 `RATE_LIMITED` in the standard body with a `Retry-After` header (seconds until the oldest counted request leaves the window).

**The audit flood (DEC-42 risk on DEC-38).** Every 403 is audited, so a client looping on a forbidden call could fill `audit_records`. Per user (or address), the first N refusals of a minute are written; the next one writes a single entry "Further ACCESS_DENIED entries for user 7 are not written for the next minute (limit reached; latest: ...)"; the rest are not written. The 403 itself is always returned, and writing the audit entry never changes the answer.

**Options considered.**

| Option | For | Against |
|---|---|---|
| **Sliding-window log** ✔ | Exact; the algorithm `AiRateLimiter` already used, so no behaviour change; easy to explain with a table of timestamps | Keeps up to N timestamps per key (tiny at this size) |
| Token bucket | Smooth, standard in gateways | Two numbers per limit; harder to explain; changes the AI behaviour |
| Fixed one-minute counter | Simplest | 20 requests at 10:00:59 and 20 more at 10:01:00 both pass |

**Where it is enforced.** A filter, not a controller or an `AuthService` edit: the login e-mail is found by reading the first 4 KB of the body (a body over 4 KB is a 400 on login) and the body is handed on unchanged. Because the limit sits outside `AuthService`, the Google sign-in session adds its endpoint to the same rule without touching this code. Memory: login keys contain e-mail addresses, so above 10,000 tracked keys the limiter drops those with an empty window.

**Trade-offs and cross-questions.** *"Is this safe behind two instances or a proxy?"* No: in memory and per instance, as DEC-42 states openly. The client address is the socket address; behind a reverse proxy the proxy must forward the real one (or every user shares one address). *"Does a limit lock a real user out?"* Only for the rest of the minute, and a different e-mail from the same address still works up to the address cap. *"Why 10 logins a minute when the account locks after 5 failures?"* The lockout (DEC-12) protects one account over time; the rate limit protects the server and slows a script that spreads attempts over many accounts.

### DEC-91: Sealed audit trail (S3): batch seals plus one digest per record

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M14 (S3, DEC-44) | ✅ user decision ("Approve all", option A) | User, relayed by the supervisor |

**Decision.** A scheduled job (`audit.seal.interval.seconds`, default 300, demo 30) seals the audit records written since the last seal: it takes their digests, adds the previous seal's hash and stores the SHA-256 of the lot in `audit_seals (id, from_id, to_id, record_count, hash, prev_hash, created_at)`. A second table, `audit_seal_entries (record_id, seal_id, digest)`, keeps the digest of every sealed record. `GET /audit/verify` recomputes everything and answers which record, or which seal, no longer matches; `POST /audit/seal` ("seal now", administrators) seals immediately for the demo. Each new seal hash is written to the application log (`AUDIT SEAL #7 covers records 120-161 ... hash=...`), a place outside the database. Neither call is itself audited (a seal run writing audit records would never finish sealing).

**Why a second table.** DEC-44 promised "the system names the altered record". With only the agreed `audit_seals` table, verification can say "seal 7, records 120 to 161, is wrong" but not which of the 42 rows changed. One digest row per record makes the answer exact, at the price of one more table (listed for the Testing teammate). `audit_records` itself is untouched, so the write path takes no lock and the V5 trigger stays optional.

**What is hashed.** Record digest = SHA-256 of `id|createdAt (microseconds)|actorId|action|incidentId|previousState|newState|description` (`-` for a null column; description last, so a `|` in it is harmless). Seal hash = SHA-256 of `prevHash|fromId|toId|count|digest1,digest2,...`. Both rules live in `AuditSealing` (domain), used by sealing and verifying alike, so they cannot drift apart. The first seal's previous hash is 64 zeros.

**What verify reports.** `{intact, sealsChecked, recordsChecked, unsealedRecords, lastSealId, lastSealHash, problemCount, firstProblem, problems[]}` where a problem is `{recordId, sealId, problem, message}`:

| Problem | Meaning | Example |
|---|---|---|
| `RECORD_CHANGED` | a record's content differs from what was sealed | someone edits row 140 in SQL: `firstProblem = {recordId: 140, sealId: 7, problem: RECORD_CHANGED}` |
| `RECORD_MISSING` | a sealed record was deleted | row 140 deleted |
| `RECORD_INSERTED` | a record sits inside a sealed id range but was never sealed | a row forged with a low id |
| `SEAL_ENTRIES_MISSING` | the number of digest rows differs from `record_count` | digest rows removed |
| `SEAL_ALTERED` | the seal hash does not match its own entries | `audit_seals` edited |
| `SEAL_CHAIN_BROKEN` | a seal does not continue from the one before | a seal removed or `prev_hash` edited |

Records newer than the last seal are reported as `unsealedRecords` (at most one interval of exposure). The verifier is pure domain code (`AuditChainVerifier`), so it can be tested without a database.

**Settling time.** An audit row gets its id when it is inserted but becomes visible when its transaction commits. A scheduled run therefore seals only records older than 10 seconds, so a slow transaction cannot leave a lower id appearing after a higher one was sealed (which would look like `RECORD_INSERTED`). "Seal now" skips the wait. An advisory lock (`pg_advisory_xact_lock`) lets only one instance seal at a time.

**Options considered.** (a) Seals plus per-record digests (chosen); (b) only `audit_seals`: names a range, not the record; (c) one seal per record: doubles the writes of the busiest table. Hash columns on every record (DEC-44's other option) would serialise concurrent writers.

**Cross-questions.** *"Is this a blockchain?"* No: a hash chain kept by one party; it proves integrity, not consensus. *"What if the attacker recomputes the seals?"* They must rewrite the digest table and every later seal; the seal hashes already written to the log (or mailed to the IT manager) cannot be changed from the database, and the latest one is shown by verify for comparison. *"What does the V5 trigger add?"* Prevention; the seals add proof. *"What about records written in the last five minutes?"* Reported as unsealed, never as intact-by-default.

### DEC-92: Password policy

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M14 | ✅ user decision ("Approve all", option A) | User, relayed by the supervisor |

**Decision.** The contract rule stays (8 to 72 characters, one letter, one digit; API Data Dictionary C.3) and three rules are added, in the pure domain class `PasswordPolicy`: at most 72 **bytes** (72 accented letters are 144 bytes, which BCrypt cannot hash); not a common password (about 110 base words such as `password`, `qwerty`, `welcome`, `iloveyou`, `iitsm`, alone or followed by up to four digits or symbols: `Password1`, `Welcome123!`); and not containing the e-mail's part before the `@` (4 or more characters) or a word of the person's name (4 or more characters). A class-level validator `@ValidPassword` on `RegisterRequest` and `CreateUserRequest` reports the broken rule on the `password` field of the usual `fieldErrors`, so there is **no change to `AuthService`**. The login request now limits the password to 200 characters, so a huge body is never hashed.

**Options considered.** (A) contract + blocklist + no personal part (chosen: NIST SP 800-63B favours a blocklist and length over composition rules, and the seed and test passwords keep working); (B) add upper, lower, digit and symbol rules (NIST advises against, and it would break the seeds); (C) A plus a setting for the minimum length (more to explain, no gain here).

**Effect on the existing smoke scripts.** `auth_smoke.py` registers "Smoke User" with a password that starts with "Smoke": the name rule refuses it (400 on `password`). Expected; the script's password needs another prefix (reported to the supervisor, not edited).

**Cross-questions.** *"Why not check against a breach list?"* It needs a large file or an external service; the short blocklist covers the passwords tried first. *"Is a password reset in scope?"* No (A12, last priority).

### DEC-93: Attachments

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M14 | ✅ user decision ("Approve all", option A) | User, relayed by the supervisor |

**Decision.** `POST /incidents/{id}/attachments` (multipart field `file`), `GET /incidents/{id}/attachments`, `GET /attachments/{id}/download`, as in the contract. Rules, all checked in `AttachmentService` and the domain classes `AttachmentType` and `AttachmentName`:

| Rule | How |
|---|---|
| Who | The people who may see the incident (`IncidentAccessPolicy.canView`, read-only call); anyone else gets 404 `INCIDENT_NOT_FOUND` on the incident routes and 404 `NOT_FOUND` on a download, so nothing reveals that a file exists |
| Type | png, jpg, jpeg, gif, pdf, txt, log, decided from the **first bytes** (magic numbers; text must be valid UTF-8 without control characters), never from the content type the browser sent; the file name's extension must also belong to the sniffed type (a PDF called `x.png` is refused); the stored content type is the sniffed one |
| Size | 5 MB (5,242,880 bytes is accepted, one more is not); the multipart limit of Spring is 6 MB so our own message appears; a larger upload is also a 400 in the standard body, never a stack trace |
| Count | at most 10 per incident |
| Names | the display name keeps only the last path segment, replaces control characters and `< > : " \| ? * ; %`, drops leading dots and is cut to 200 characters; the file on disk has a random UUID name |
| Storage | outside the web root, in `app.attachments.dir` (env `ATTACHMENTS_DIR`, default `./data/attachments`, git-ignored): `<dir>/<incidentId>/<uuid>`, no extension, no user text in the path, and every resolved path is checked to stay inside the folder; the row in `incident_attachments` keeps the relative path |
| Download | `Content-Disposition: attachment`, the sniffed content type, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, so the browser never renders or runs an upload on the API's origin |
| Audit | every upload is an `ATTACHMENT_ADDED` entry in the same transaction ("Attachment added: name (type, bytes)") |
| Consistency | the file is written before the row; if the transaction rolls back, an after-completion hook deletes the file. A row whose file vanished from the disk answers 404, not 500 |

The bytes go through an `AttachmentStorage` port with `DiskAttachmentStorage` as the Adapter, so a cloud bucket could replace the disk later without touching the service.

**Options considered.** Disk folder from a property (chosen: Appendix A has `storage_path`, a Docker volume can be mounted there); a folder under the user's home (differs per machine); bytes in the database (the schema has no column for them). **Trade-off.** Files and rows can drift if someone deletes the folder; the download answers 404 and the backup must cover both.

**Cross-questions.** *"A virus scan?"* Out of scope; types are limited to inert formats and are never executed or rendered by the server. *"Why not trust the extension?"* A renamed program passes an extension check; the first bytes do not lie as easily. *"SVG?"* Not allowed: it can carry script.

### DEC-94: Outages answer 503, and the review of input and output

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14 | M14 | ✅ | Backend lead (follows DEC-42, "Outage behaviour") |

**Decision.** *Database down:* a connection that cannot be had (`CannotCreateTransactionException`, `DataAccessResourceFailureException`, `JDBCConnectionException`, `SQLTransientConnectionException`, `TransientDataAccessResourceException`) is answered by the global handler with 503 `SERVICE_UNAVAILABLE` in the standard body ("The service is temporarily unavailable (database not reachable)...") plus `Retry-After: 30`; the log gets one WARN line with the root cause, not a trace. The pool's `connection-timeout` is 3 seconds (`DB_CONNECT_TIMEOUT_MS`), so the answer comes in seconds, not 30. The pool recovers by itself when the database returns (verified). *AI down:* the suggestion paths already fall back to the keyword engine (DEC-M12-5), so the user normally never sees an AI failure; as a safety net an `LlmException` that escapes is 503 as well (the AI message). Every operation in the generated contract lists 503.

**Input review.** Every request body was read. Added: `@Size` on the login e-mail and password, refresh token, config key and value, and on the lists (`dependencyIds`, `requiredSkillIds`, technician `skills`, the saved-view filter map); a malformed multipart body is a 400, not a 500. Everything else already had type, range and length rules.

**Output encoding.** The API returns JSON, which encodes text itself; the HTML e-mail escapes user text (`EmailChannel.escape`), the CSV export neutralises formulas (DEC-62), the PDF is built from a typed model, and downloads are always attachments with `nosniff`.

**Cross-questions.** *"Why not 500 for a database error?"* 500 says "our bug"; 503 says "try again", which is what the user should do, and the contract and the frontend can treat it differently. *"Does a request that needs no database (a valid token on a cached setting) still work?"* Yes; only what touches the database fails.

---

## M12 rest: duplicates, problem records, Major Incident Mode (session A, 2026-11-14)

> Numbered DEC-70 to DEC-78 (session A's range). Every choice below was one of nine questions put to the user with options, a worked example and a recommendation (`A-m12-options.md` in the session notes); the user answered "Approve all", so every recommended option stands. Basic parts (G3, mark-duplicate, G4, C3) were approved with the same message.

### DEC-70: A confident AI category is applied when the reporter gives none

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M4, M12 | ✅ user decision (closes the open question of DEC-33 and DEC-42) |

**Decision.** `IncidentCreationService` asks the intelligence engine for a category when the request has none. At `autocat.apply.confidence` (new setting, default 0.60, the same as the show threshold) or more it is applied, the incident is classified with it and the normal assignment follows; the audit says "Classified as Network by the AI suggestion (confidence 0.65, keyword)". Below it the incident waits in triage as before. The call is not rate-limited (it is part of creating the incident) and runs before the transaction opens, so no database connection is held during a model call (DEC-M12-9).

| Option | Example: "VPN drops every few minutes", no category | Verdict |
|---|---|---|
| **A: apply at 0.60 (setting)** ✔ | Network applied, assigned at once | The handbook pipeline ("given category, else AI suggestion, else triage"); the threshold is live |
| B: apply only at 0.80 | stays in triage (the keyword engine rarely reaches 0.80) | Safer, but the keyword path would never help |
| C: never apply | stays in triage | Suggestions stay advice only |

**Trade-off.** A wrong category sends the incident to a technician with the wrong skills; the audit entry names the source and confidence, and a team lead can still reassign. **Effect on old scripts:** incidents created without a category in the shared smoke suites may now be classified and assigned (`autocat.apply.confidence = 1` restores the old triage behaviour).

**Cross-questions.** *"Is it not risky to let a model route tickets?"* The category only chooses among our own active categories and is validated; the threshold is a setting; the audit trail shows who decided.

### DEC-71: Duplicate check on create and correlation into problem records

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ user decision (questions 2 and 3) |

**Decision.** *Duplicate check.* Before the transaction, the draft is compared (TF-IDF, DEC-M12-1) with the open incidents of the same service inside `dup.window.hours`. A match at `dup.tfidf.threshold.duplicate` (0.55) or more is **409 `DUPLICATE_INCIDENT`** with every match at 0.35 or more in `similar` (`id, code, title, similarity, status`), unless the request has `confirmNotDuplicate: true`. *Correlation.* After the incident is saved, `ProblemCorrelator` groups it under a problem record when (a) an open incident of the same service resembles it at the related threshold (0.35), confirmed or not, or (b) it is P1 to P3 and an open P1 or P2 sits on a service it depends on, or that depends on it, created no longer ago than `problem.correlation.window.minutes` (60). The anchor's record is joined, or a new record is opened with the anchor's title and service. Every grouping is audited on each incident that changed (`DUPLICATE_LINKED`, no actor).

| Option for correlation | Example (Payment depends on Database) | Verdict |
|---|---|---|
| **A: same service with similar text, or a neighbour service with an open P1/P2 in the window, new incident P1 to P3** ✔ | 10:00 P1 "Database timeouts"; 10:10 "Checkout fails" on Payment: grouped. A P4 "printer jam" on Payment: not grouped | Explainable, hard to fool with noise |
| B: graph and window only, any priority | the P4 printer jam would be grouped too | Too many false groups |
| C: same service and text only | Payment and Database incidents stay apart | Misses the handbook's "service and one that depends on it" |

**Trade-offs.** A wrong group hides a separate problem: an administrator can ungroup (DEC-72) and every grouping is in the audit trail. The handbook's "when a P1 opens, flag dependants" is covered from the other side: the dependants' later incidents join the P1's record. The two thresholds are the TF-IDF ones, not the handbook's 0.80 and 0.65 (DEC-M12-1). A failure while grouping never undoes the incident (logged, ungrouped).

**Cross-questions.** *"What if two people report the same thing at once?"* Both pass the check (neither exists yet); the second is then grouped with the first by the related rule. *"Why 409 and not just a warning?"* The reporter confirms with one click and the 409 carries the matches, which is the handbook contract.

### DEC-72: Problem-record lifecycle

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 | ✅ user decision (question 4); **changed by the user the same day** ("go with A": no automatic cascade, see below) |

**Decision (as changed).** The lead of a record is derived, never stored: the highest priority, then the earliest created (DEC-46, G5); incidents that only joined an outage never lead. **Resolving the lead resolves nothing else.** When the lead of an open record is resolved, every other open, non-joiner incident of the record gets one **internal note** (staff only, also audited as an internal entry): "The lead incident INC-x of problem record #n was resolved: <root cause>. If the cause is the same, a team lead or administrator can close the whole record with Resolve problem." The record stays OPEN, and the people who joined the outage get their one "resolved" notice (DEC-73). **`POST /problems/{id}/resolve`** (team lead or administrator) is the one-click "resolve whole problem": the given fix goes to every open incident of the record, the lead included, through a new domain move `Incident.resolveWithProblem` that is legal from every open status (the normal resolve needs IN_PROGRESS); the record becomes RESOLVED; the joiners are notified once (not again if the lead was already resolved). An administrator can `DELETE /problems/{id}/incidents/{incidentId}` to take one incident out (audited), and a team lead or administrator can open a record by hand with `POST /problems {title?, incidentIds}` (DEC-74). A RESOLVED record accepts no more joins or groupings.

| Option | Verdict |
|---|---|
| **A: no automatic cascade; staff are told and one click resolves the whole problem** ✔ (the user's change) | Grouping puts *related* incidents in a record, and a related incident may need its own fix |
| B (the first version of this decision): the lead resolved resolves the rest by itself | Rejected by the user after `m10_smoke.py` showed it: two incidents with near-identical text on one service were grouped and resolving one closed the other with someone else's fix |
| C: the record closes by itself when every incident is resolved, no cascade | No saving of work and nobody decides |

**Example.** "VPN down for everyone" is the lead and "VPN slow on floor 3" is grouped as related. Fixing the VPN server must not close the floor-3 ticket: its technician sees the note, checks, and a team lead presses Resolve problem only if the cause is the same. The handbook also calls resolving linked incidents an administrator action (here widened to team leads).

**Trade-off.** One more step for staff when the cause really is the same; in return nothing is closed with a fix that was never checked against it.

**Cross-questions.** *"Why a new domain move and not the normal resolve?"* An incident that nobody has started cannot go through ACKNOWLEDGED and IN_PROGRESS just to be closed with someone else's fix; the move is one method on `OpenState`, the shared parent of the six open states. *"Why an internal note and not a notification?"* The people who must decide are the technicians and leads on the other incidents, the reporters need no new message about a ticket that is not resolved.

### DEC-73: Major Incident Mode: known outage, one-click join, climbing priority, root cause

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 (S2, builds on DEC-44) | ✅ user decision (question 5) |

**Decision.** `GET /problems/known-outages?serviceId=` (any user) lists the open records on the service or on any service it depends on (graph traversal), as `{problemId, title, service, leadCode, leadPriority, affectedUsers, since, alreadyJoined}`: no reporter, no description. `POST /problems/{id}/join` (any user) creates a small incident for the joiner: same service, category, impact and urgency as the lead, one user, linked to the record and to the lead, **closed at once as DUPLICATE** (no triage, no SLA clock, no escalation). The lead's affected users go up by one and its priority is calculated again by the same engine, so the handbook's own multiplier (x1.25 from 10 users, x1.5 from 101) lifts the priority by itself: a lead with impact 4, urgency 3, criticality 2 and 9 users is P3; the tenth person makes it P2. Joining twice returns the first joiner incident; joining a resolved outage is 409. When the lead is resolved (or the whole record is resolved by a team lead or administrator, DEC-72) each joiner gets one in-app notice (`INCIDENT_RESOLVED`, sent through `NotificationDispatcher` after the commit, because their own incident is already closed and the normal events never reach them). `GET /problems/{id}/root-cause` names the probable root cause: for every affected service the set of everything it depends on, the services in every set (an affected service counts as its own upstream at distance 0), ranked by the farthest then the total distance; the dependency paths from each affected service are returned as evidence (`ServiceGraph.commonUpstream`, written by the M13 session). Example: Payment and Portal both depend on Auth, Auth on Database: Auth first, Database second.

| Option for the join | Verdict |
|---|---|
| A: only a note and a counter on the lead, no incident for the joiner | The joiner has nothing to follow and no notice target |
| **B: a small linked incident closed as DUPLICATE** ✔ | Visible in "my incidents", notified on resolution, no change to triage, escalation or the SLA monitor |
| C: the joiner's incident stays open and is resolved by the cascade | Triage, escalation and SLA monitors would have to learn to skip it |

**Trade-offs.** Joiner incidents appear in reports as duplicates (that is what they are). The root cause is only as good as the graph: a cause that is not a service in it is not found, and a single affected service names itself first (the explanation says so). The notice reuses the "resolved" wording; a joiner-specific text is a task for the Report teammate (the template key per audience is in `notification-templates.properties`).

**Cross-questions.** *"Why does the priority change with no human action?"* The affected-users factor is part of the handbook formula and joining changes that input. *"Could someone inflate the count?"* One join per person per record (a second call returns the first), and an administrator sees every join in the audit trail of the lead.

### DEC-74: E2 recurring-problem detector

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 (E2, builds on DEC-47) | ✅ user decision (question 6) |

**Decision.** `GET /problems/recurring` (team lead, administrator) is computed on each call, nothing is stored. REPEATED_FIX: the same service and category resolved at least `recurring.min.count` (3) times in `recurring.window.days` (30), among incidents with no problem record. REPEATED_REOPEN: an incident reopened at least `recurring.min.reopens` (2) times. A team lead turns a proposal into a record with `POST /problems`; the proposal then disappears.

| Option | Verdict |
|---|---|
| **A: computed on read, accepted by a person** ✔ | Never stale; a human decides |
| B: a job creates records itself | Records appear nobody asked for |
| C: A plus a daily notice | More noise before the list is proven useful; can be added later |

**Cross-questions.** *"How is this different from duplicates?"* Duplicates are the same failure reported several times within a day; a recurring problem comes back over weeks after being fixed.

### DEC-75: A1 chatbot intake without a key

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 (A1, builds on DEC-43) | ✅ user decision (question 7) |

**Decision.** `POST /intelligence/chat {draft, expecting, answer}` is one turn of a **stateless** guided conversation. Slots in order: DESCRIPTION (at least 20 characters, the incident minimum), SERVICE (matched by name or by a distinctive word in the text, else the bot lists the services), AFFECTED_USERS (a number, "just me", "a few", "everyone"), then CONFIRM with a summary and `readyToFile: true`. Category, impact and urgency are never asked: they come from `suggest-intake`, which already falls back to the keyword engine, so the flow works without a key and an LLM key only improves those three fields. Filing is the normal `POST /incidents`, so the duplicate check, the known-outage banner, priority and assignment apply unchanged.

| Option | Verdict |
|---|---|
| **A: stateless draft passed back and forth** ✔ | No server memory, works behind a restart, easy to test |
| B: server-side sessions with an id | State to expire and share across instances |
| C: frontend wizard only | The "chatbot" would not be an intelligence feature |

**Cross-questions.** *"Is it a real chatbot?"* It is a slot-filling dialogue (the usual shape of an enterprise help-desk bot) whose language understanding is the existing intake engine; free-form conversation is not claimed.

### DEC-76: D2 outage drill

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M12 (D2, builds on DEC-45) | ✅ user decision (question 8) |

**Decision.** `POST /admin/demo/outage-drill {rootServiceId}` exists only in the `demo` profile (no bean and no route elsewhere, like the demo clock, DEC-52) and needs CONFIG_MANAGE. It files, through the normal creation pipeline, two incidents on the failing service and one on each service that depends on it (up to four), from ordinary employees in turn, with `confirmNotDuplicate`. Correlation, priorities, assignment and audit are the real ones; the texts are `resources/demo/outage-drill.json` (`{root}` and `{service}` placeholders, editable by the Report teammate). The answer lists the codes, the dependants and the problem record. A second run adds to the same open record.

| Option | Verdict |
|---|---|
| **A: use the services and employees that exist** ✔ | Nothing is invented; the demo data decides the story |
| B: create its own demo services and employees | Pollutes the catalog |

**Cross-questions.** *"Is the demo not faked?"* The incidents are filed by the same code a user triggers; only the texts and the button are prepared.

### DEC-77: Basic parts: withdraw, mark-duplicate, reporter edit lock, security setting

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M4, M10, M12, M14 (G3, G4, C3 from DEC-46) | ✅ user decision (rules stand as written) |

**Decision.** *G3 withdraw.* `POST /incidents/{id}/withdraw {reason 10 to 1000}`, the reporter only, legal in CLASSIFIED, ASSIGNED and ACKNOWLEDGED; the incident closes with `WITHDRAWN`, the reason becomes a public note, the technician's load drops at once (load counts only active statuses). `WITHDRAW` is a new `IncidentAction` (an addition to the contract). A withdrawn or duplicate-closed incident cannot be reopened (only VERIFIED and AUTO_VERIFIED closures can). *Mark-duplicate.* `POST /incidents/{id}/mark-duplicate {duplicateOfId}`, administrator or team lead, from any open status; the target must be a different, existing incident that is not itself a duplicate (400 names the original); closes as DUPLICATE, sets `duplicate_of_id`, audits `DUPLICATE_LINKED`, leaves a public note naming the original. Both moves live in one new parent class `OpenState` (six open states share them). *G4.* From ASSIGNED on, only a team lead or administrator may change impact, urgency or affected users; the reporter keeps editing the description; sending an unchanged value is not a change; before assignment the reporter edits everything. Wrong person is 403, but a closed incident is still 409 (E-M12B-1). *C3.* `priority.security.category` (default "Security", text, 100 characters) replaces the hard-coded name in `PriorityRecalculator` and `PriorityWhatIfService`; the category and everything under it trigger rule 1. Internal audit entries are created only through `AuditRecord.internal(...)`; the prefix constant is private and `AuditRecord.of` refuses a public text that starts with it.

**Trade-off.** G4 changes the documented edit of T24 (two simultaneous PUTs of impact by the reporter): the Testing teammate edits the description or sends the PUTs as an administrator.

### DEC-78: Actions keep answering 403 to people who cannot see the incident (T18)

| When | Module | Status |
|---|---|---|
| 2026-11-14 | M14 risk of DEC-42 | ✅ user decision (question 9, option A) |

**Decision.** The DEC-42 risk "404 on actions for non-viewers" is **not** changed. T18 in the Testing handbook ("technician 2 acknowledges an incident assigned to technician 1: 403") stays as documented; reads still answer 404 (DEC-21). The cost is stated openly: an authenticated user can learn that an incident id exists by trying an action on it.

**Cross-questions.** *"Is that not an information leak?"* Yes, of the existence of an id to a logged-in user, which the incident code format already makes guessable; the codes are sequential and carry no content.

---

## Integration of the parallel modules (2026-11-14)

### DEC-110: Grouping into a problem record is not announced

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-14, regression after merging M12 rest, M13, M14 and M2b | M9 + M12 | ✅ user decision | User (option A of three) |

**Context.** M12 records `DUPLICATE_LINKED` for two different moves: closing an incident as a duplicate (`mark-duplicate`, a known-outage join) and grouping an open incident into a problem record (correlation, DEC-71). M9 (DEC-54) maps `DUPLICATE_LINKED` to `DUPLICATE_SUSPECTED`, "INC-x may be a duplicate", for the reporter and the assignee. So a reporter who had just confirmed "not a duplicate" (`confirmNotDuplicate`) was told it may be one, and every grouping sent extra mails. Found by `m9_smoke.py` on the merged build.

**Decision.** `NotificationRules.announced(action, newState)`: `DUPLICATE_LINKED` is announced only when the incident's new status is CLOSED (closed as a duplicate). Grouping keeps the status, so it notifies nobody; staff see it in the incident history and on the problem view. Joiners still get their one "outage resolved" notice (DEC-73), and the person who acts is never told about their own action (DEC-54).

**Options.** A, quiet grouping (chosen); B, a separate, reworded notice for grouping ("linked with related reports, work continues"), more transparent but one more mail per grouping; C, unchanged.

**Why.** The reporter's own confirmation must not be contradicted, and the inbox stays meaningful. The rule needs no new audit action or schema value: the status change already tells the two moves apart.

**Cross-questions.** *"How does a reporter learn their incident is part of a bigger outage?"* The incident detail shows its `problemId`, and the known-outage banner on the report form shows open outages before they file. *"Why not a new audit action GROUPED?"* `AuditAction` values are part of the agreed schema (Appendix A.4); the status distinguishes the two cases without changing it.

### DEC-111: Google Gemini is the default LLM provider

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-15 | M12 | ✅ user decision | User ("I would be using a Gemini key") |

**Decision.** A second adapter, `GeminiLlmClient`, implements the existing `LlmClient` port and is the default (`app.llm.provider=gemini`). It calls `POST {base}/v1beta/models/{model}:generateContent` with the JDK `HttpClient` (no SDK, as DEC-M12-4), sends the system prompt as `system_instruction`, the redacted user message as the one turn of `contents`, and `generationConfig {responseMimeType: application/json, maxOutputTokens: 1024}`; it reads the text parts of the first candidate and skips thought summaries. The key goes in the `x-goog-api-key` header, never in the URL. A blocked prompt (`promptFeedback.blockReason`), a candidate stopped for SAFETY, RECITATION or PROHIBITED_CONTENT, a non-200 status or an empty answer throws `LlmException`, which the fallback wrapper turns into the keyword answer (DEC-M12-5). Model and base URL default per provider: `gemini-3.5-flash-lite` (Google's recommended fast model for new projects, minimal thinking by default), `https://generativelanguage.googleapis.com`. The key is read from `LLM_API_KEY`, or `GEMINI_API_KEY` when that is empty. An unknown provider value stops the start with a clear message.

**Options.** (a) Gemini adapter beside Anthropic, Gemini default (chosen: the team has a Gemini key; one more class shows the Adapter pattern with two real providers); (b) replace the Anthropic adapter (less code, but loses a working adapter); (c) Google's Java SDK (typed, but a new dependency tree and its own retry and timeout behaviour, the same reasons as DEC-M12-4).

**What did not change.** Prompts, redaction, strict JSON validation, timeout, circuit breaker, cache, rate limit and the no-key path; TF-IDF similarity never goes to the model.

**Verified.** Offline, against a stub of the Gemini API (`smoke-tests/gemini_stub_check.py`, 10/10): URL and model, key in the header and not the URL, JSON output requested, thought parts skipped, category and intake answered with `source` LLM, a blocked prompt and an HTTP 500 fall back to KEYWORD. **Verified against the real Gemini service on 2026-11-15** with the team's key in the git-ignored `backend/.env` (`LLM_API_KEY`): `POST /intelligence/suggest-category` on a VPN text answered category VPN at 0.99 and `POST /intelligence/suggest-intake` on an urgent finance outage answered impact 4, urgency 5, both with `source` LLM (not the keyword fallback). The key is never written to the repository, the logs or these documents.

**Cross-questions.** *"Why not the Gemini SDK?"* The same reasons as for Anthropic: full control of the 8-second limit and no hidden retries. *"What if Google changes the model?"* The model is a setting (`LLM_MODEL`); the code only knows the request shape. *"Is the key safe?"* It is read from the environment, sent only in a header, and never logged.


### DEC-112: The Service Desk Simulator (S1) as built

| When | Module | Status | Decided by |
|---|---|---|---|
| 2026-11-15 | S1 | ✅ built inside the design approved in DEC-44 and DEC-45; the choices below were made while building and are open to veto | Backend Lead (user asked to finish the remaining work) |

**What was built.** `POST /api/v1/admin/simulations` (needs `CONFIG_MANAGE`) replays the most recent N real incidents in memory through the real `AssignmentEngine` under up to three configurations and returns, per configuration: SLA violations (count and percent), mean and 90th-percentile time to resolve, mean wait, how evenly the work was spread (Jain's fairness index, 1.0 is perfectly even), incidents nobody could take, how often the simulated choice equals the technician who really got the incident, and a per-technician breakdown. `POST /api/v1/admin/simulations/apply` writes a configuration's strategy and weights to the live settings through `ConfigService` (audited as CONFIG_CHANGED), which is the "Apply" button. Nothing else is written.

**Inputs.** The workload is the last 10 to 500 incidents (default 100) with their real arrival spacing, or the same arrivals compressed 1 to 20 times (`speedUp`) to imitate an outage storm. A configuration is a strategy (COMPOSITE, SKILL, LOAD, ROUND_ROBIN, EXPERIENCE_PRIORITY), any of the five composite weights (they must still add up to 1.0) and an optional number of technicians (the first N by id). Anything left out keeps the live value. As DEC-45 decided, there is no automatic search of the weight space.

**The model, stated next to every result (`assumptions` in the response).** A technician works one incident at a time, always taking the waiting incident with the highest priority (then the earliest arrival). Handling time is the median acknowledged-to-resolved time per priority in the replayed history (fixed fallbacks of 45, 90, 180 and 240 minutes for P1 to P4 when a priority has no history), multiplied by 1.3 minus 0.1 times the technician's experience level: level 1 takes 20% longer, level 3 the base, level 5 20% less. The load the strategies see is the weighted load of everything assigned and not yet finished, as `WorkloadTracker` counts it live. Familiarity with a service starts at zero and grows as the replay resolves incidents. An incident nobody is eligible for waits in triage until someone frees up. The allowed time is the gap between creation and the real resolution deadline on the wall clock (business-hours calendars are not applied). Availability and maximum load are today's values. Incidents closed as duplicate or withdrawn, and ones without priority or category, are left out and counted.

**Options.**

| Option | For | Against |
|---|---|---|
| **In-memory discrete-event loop over the real domain classes** (chosen, as DEC-44) | Same code as production; nothing written; deterministic | Needs the handling-time model above |
| Write sandbox incidents to the database | Simple | Pollutes real data and the audit trail |
| A separate copy of the assignment rules | No coupling to entities | Two sets of rules that drift apart; defeats the point |

Sub-decisions: (1) **How the replay avoids changing real data.** The engine and the eligibility filter read the real `User` and `TechnicianProfile` entities, so the loop cannot run on copies. The service runs in a read-only transaction (Hibernate never flushes it), and the only thing the replay moves, each technician's round-robin memory (`lastAssignedAt`), is restored after every scenario and in a `finally`. The smoke suite proves that the audit trail, incidents, settings, round-robin memory and notifications are unchanged afterwards. (2) **A storm is the real arrivals compressed**, not synthetic incidents: no invented data, and `IncidentFactory` is not needed. (3) **Technician count takes the first N by id**: simple and repeatable, though it can pick someone who is away (then they take nothing, which is itself part of the picture). (5) **The round-robin rotation starts empty in every scenario** (found by the smoke suite on a database that already had real assignments: the real memory was set at today's time while the replayed incidents are weeks older, so technicians with a recent real assignment looked permanently "just served" and were starved; the real values are restored afterwards; ERROR_LOG E-036). (4) **Ordering inside the loop is fixed** (a finish before an arrival at the same instant, then first scheduled), so the same request always gives the same answer.

**Verified.** `smoke-tests/s1_smoke.py` 50/50 on the Flyway seed (212 incidents): access (401, 403), the default run and every field, determinism, three configurations in request order with different results, fewer technicians never shorten the wait, a storm never shortens the wait, custom weights, validation (four configurations, weights not adding to 1, unknown strategy, too few incidents, bad speed-up), no writes, apply with audit and restore, and the escalation filter of DEC-113. Example on the seed, last 200 incidents at 8 times speed: composite 59.5% of incidents past their deadline, load-only 37.0%, round robin 65.0%.

**Limits to state in the report.** It is a model, not a forecast: real technicians multitask and take breaks. The seed's assignments were generated, not chosen by the engine, so the "matches the real assignee" figure (47 to 58% on the seed) is a diagnostic and not a validation here; on a real history it would show how close the model is to what actually happened. The handling times of the seed are long because the seed generator made them long.

**Cross-questions.** *"How do you know the simulation matches reality?"* The model's rules are written out beside the result, and the agreement with the real assignee is reported; replaying a real history under the configuration that was live then should mostly reproduce the real choices. *"Does simulating change anything?"* No: a read-only transaction, nothing is saved, no audit entry, no notification; the suite checks it. *"Why not machine learning?"* A simulation is explainable and needs no training data. *"Why does the load-only strategy win under a storm?"* With work arriving faster than it can be done, balancing the queue matters more than matching skills; with the real spacing the composite strategy may do better, which is what the tool lets an administrator see before changing the setting.


### DEC-113: `minEscalationLevel` filter on the incident list

| When | Module | Status |
|---|---|---|
| 2026-11-15 | M10 | ✅ |

**Context.** The frontend review (`frontend/FRONTEND_GUIDE.md`) found that the team-lead escalations screen needs only incidents already escalated, and `GET /incidents` had no way to ask for them: the client would have to page through everything and filter.

**Decision.** `GET /incidents?minEscalationLevel=` (0 to 3, inclusive: level 1 and above, and so on) added to the existing filters. It is combined with the usual role-based visibility, so an employee still sees only their own incidents. A value outside 0 to 3 is 400.

| Option | For | Against |
|---|---|---|
| **A filter on the existing list** (chosen) | One more parameter; paging, sorting and visibility come for free | Triage escalation level 0 stays "not escalated" |
| A separate `GET /escalations` endpoint | Could include the preview | A second list with its own paging and visibility rules to keep in step |
| Filter in the browser | No backend change | Pages through every incident to find a few |

**Verified.** `smoke-tests/s1_smoke.py` (the last section): level 0 equals no filter, level 1 and 2 return exactly the rows the database holds at that level, an employee sees only their own, 3 is empty on the seed, 4 and -1 are 400. Contract: 119 operations, `iitsm-api.*` re-exported.

**Cross-question.** *"Why not include the escalation preview?"* The preview needs the policy tables per incident; the detail view already has it, and the list only needs the level.


### DEC-114: Index review and scale-out path (A7)

| When | Module | Status |
|---|---|---|
| 2026-11-15 | M14 | ✅ the written half; the load test with numbers is the Testing teammate's |

**Decision.** A7 (DEC-43) is split as DEC-43 said: the Backend Lead writes an index review and a scale-out path (`backend/docs/SCALING.md`), the Testing teammate runs the load test and records the numbers. The review is a **desk review of the query shapes against the migrated schema**, not a measurement, because the seed (212 incidents) is too small for PostgreSQL to prefer an index; each recommended index is to be confirmed with `EXPLAIN (ANALYZE)` at 100,000 incidents before it is kept.

**Findings.** Seven gaps, the most valuable first: no `created_at` index on `audit_records` for the admin audit list; no `resolved_at` index on `incidents`, which the recurring-problem detector, suggested resolutions, auto-verify and the coverage report all filter on; the SLA, risk and escalation monitors scan all incidents although they read only open ones (partial indexes); a composite index for the duplicate check and known-outage queries; the `q` search with a leading wildcard (trigram index only if the data grows); and the missing partial unique index for the global SLA default (DEC-17). The schema belongs to the Testing teammate, so these are handed over as a numbered migration to write (V11), never an edit of an applied one.

**Single-instance assumptions** (a table in `SCALING.md` with the fix for each): the six scheduled jobs run on every instance (fix: an advisory lock per job, the pattern the audit seal already uses), the settings cache and the in-memory rate limiter are per instance, the STOMP broker is in memory, and attachments live on one disk (already behind the `AttachmentStorage` port).

**Honest limit.** The system is built and demonstrated at one instance; the path to two or three instances is written, not run.

**Cross-questions.** *"Is it scalable?"* To a point, and the page says which components assume one instance and what replaces each. *"Why no load test numbers from you?"* They are the Testing teammate's half of A7 (DEC-43); `SCALING.md` section 5 tells her what to measure.


### DEC-115: Observability with Prometheus and Grafana (A8)

| When | Module | Status |
|---|---|---|
| 2026-11-15 | M14 / A8 | ✅ built; the Prometheus and Grafana containers were not run here (see Verified) |

**Decision.** The backend exports its metrics in the Prometheus text format on `/actuator/prometheus` (Micrometer's Prometheus registry). The endpoint is **closed by default and token-guarded**: `MetricsTokenFilter` answers only to `Authorization: Bearer <METRICS_TOKEN>` (env `METRICS_TOKEN`, at least 16 characters; compared in constant time); with no token configured the path is 404, so an install that never heard of metrics exposes nothing. The path is permitted in `SecurityConfig` because a Prometheus server cannot log in, and the filter is the lock.

**What is exported.**
- Free from Micrometer: HTTP latency histograms and counts by `uri` and `status`, JVM memory and threads, CPU, the HikariCP pool.
- Gauges of the desk now (`BusinessGauges`, a `MeterBinder` reusing the live dashboard's counters, refreshed at most every 10 seconds): `iitsm_incidents_all`, `iitsm_incidents_open`, `iitsm_incidents_critical`, `iitsm_incidents_resolved_current`, `iitsm_sla_violations_recorded`, `iitsm_incidents_open_by_priority{priority}`.
- Counters of what happened (`BusinessMetrics`, one more Observer of the domain events, incremented after commit): `iitsm_incidents_reported_total`, `iitsm_incidents_resolved_total`, `iitsm_sla_warnings_total{priority,clock}`, `iitsm_sla_violations_total{priority,clock}`, `iitsm_escalations_total{to_level}`, `iitsm_escalations_exhausted_total`, `iitsm_triage_needed_total`, `iitsm_simulations_total`, and `iitsm_ai_calls_total{operation,engine}` where `engine` is `llm`, `keyword`, `keyword_after_failure` or `keyword_breaker_open`.

**Files.** `backend/observability/`: `prometheus.yml` (scrape every 15 seconds with the bearer token from a git-ignored file), `docker-compose.observability.yml` (adds Prometheus on 9090 and Grafana on 3001 to the existing stack without editing `deploy/`), Grafana provisioning and the dashboard `iitsm.json` (15 panels), and a README.

| Option | For | Against |
|---|---|---|
| **Public path, static scrape token, closed when unset** (chosen) | Works with Prometheus' own bearer-token setting; secure by default; no extra port | One more secret to hand to Prometheus |
| Require a normal user JWT | No new secret | Tokens last 15 minutes; Prometheus cannot refresh them |
| A separate management port | Keeps metrics off the API port | The security chain and the Docker ports get a second path to configure; the token is still wanted |
| Leave it public | Simplest | Business numbers and internals open to anyone who finds the path |

**Verified.** Against a running backend: the endpoint answers 401 to no token, a wrong token and a normal user's JWT, 200 to the right token; the gauges equal the dashboard's numbers (212 incidents, 11 open, 41 violations on the seed); creating an incident, an AI call and a simulation moves the matching counters; the `http_server_requests` series carry the `uri` and `status` labels the dashboard filters on. All 22 metric names used by the dashboard's queries were checked against the live output (three counters appear only after their first event, by design). The dashboard JSON and the YAML files were parsed. **Not run:** the Prometheus and Grafana containers themselves (their images were not downloaded in this session), so the provisioning has not been seen rendering.

**Cross-questions.** *"Why a token and not the login?"* A scraper has no session. *"What happens if the database is down during a scrape?"* The gauges keep their last snapshot and the scrape still answers. *"Does this slow the API?"* The gauges read a snapshot at most ten seconds old; the counters are an increment.


### DEC-116: Password reset and two-step verification (A12)

| When | Module | Status |
|---|---|---|
| 2026-11-15 | M2 / A12 | ✅ built |

**Password reset.** `POST /auth/password-reset/request {email}` always answers 202 with the same body, so nobody can tell who has an account; if the account exists and is active, a single-use link with a 256-bit random secret is mailed (`PasswordResetNotifier` port, `PasswordResetMailer` adapter through the same SMTP setup as the notification mails). Only the SHA-256 hash of the secret is stored (`password_reset_tokens`); asking again cancels the older links; a link works for `auth.password.reset.minutes` (default 30, range 5 to 1440). `POST /auth/password-reset/confirm {token, newPassword}` applies the same `PasswordPolicy` as registration, uses the link up, signs out every session of the account (all refresh tokens revoked) and clears a lock from failed logins; a wrong, used or expired link is one and the same 400. Asking is rate-limited like logging in (per address and e-mail). A Google-only account (no password) may use it to set a first one. Both steps are audited (`PASSWORD_RESET_REQUESTED`, `PASSWORD_CHANGED`).

**Two-step verification (TOTP, RFC 6238).** Optional and per person. `POST /auth/mfa/setup` makes a 160-bit secret and returns it with an `otpauth://` address for a QR code; it counts only after `POST /auth/mfa/enable {code}` proves the app shows matching codes; `POST /auth/mfa/disable {code}` needs a current code; `GET /auth/mfa` says whether it is on. At login, a right password without a code answers 401 `MFA_REQUIRED` and the client sends the same login again with `totp`; a wrong code is 401 `INVALID_MFA_CODE` and **counts as a failed login**, so guessing codes locks the account (423) like guessing passwords. A code is accepted for its 30-second step and one step either side, and **never twice**: the last accepted step is stored and only a later step passes. An administrator can turn it off for someone who lost their phone (`POST /admin/users/{id}/mfa/reset`, USER_MANAGE, audited as `MFA_DISABLED`). Google sign-in and token refresh are not asked for a code: Google has verified the person, and the refresh belongs to a session that already passed.

| Option | For | Against |
|---|---|---|
| **TOTP with an authenticator app** (chosen) | An open standard; works offline; shows a real second factor | The secret must be stored |
| Codes by e-mail or SMS | No app | The same mailbox that can reset the password; SMS is only simulated here |
| Mandatory for administrators | Stronger | A demo that locks the administrator out; left as a setting for later |
| Recovery codes | Self-service recovery | A second table and a second secret to protect; the administrator reset covers the need |

**Schema.** Migration V10: `users.totp_secret`, `totp_enabled`, `totp_last_step`; table `password_reset_tokens`; the new audit actions in the CHECK.

**Verified.** `smoke-tests/a12_a4_smoke.py` (72 checks, the A12 half): the real reset mail read from Mailpit (link, subject, validity), identical answers for known and unknown e-mail, no mail for an unknown one, only a hash stored, weak password refused, link usable once, old password rejected, old sessions signed out, a second request cancels the first link, an expired link refused, setup/enable/disable, MFA_REQUIRED and INVALID_MFA_CODE, replay of the enabling code refused, the next step's code accepted, five wrong codes lock the account, administrator reset and its audit. The Java TOTP matches the RFC 6238 test vectors (six timestamps checked in `jshell`) and an independent Python implementation agrees with the server in every run. The 40 existing automated tests (T01 to T26 among them) pass on the migrated schema.

**Limits.** The TOTP secret is stored as text in the application database (an encrypted column would need a key to manage); there are no recovery codes; MFA is not mandatory for any role.

**Cross-questions.** *"Can I tell which e-mails have accounts?"* No: same status, body and timing class for every e-mail, and no mail for an unknown one. *"What if someone watches me type the code?"* It works once and only until its step passes; replay is refused. *"Why does a wrong code lock me?"* Otherwise six digits could be guessed in a few thousand tries.


### DEC-117: Mobile push as a simulated channel (A4)

| When | Module | Status |
|---|---|---|
| 2026-11-15 | M9 / A4 | ✅ built as a simulation, like the SMS channel |

**Decision.** A sixth channel, `PUSH_SIM`, delivers to every device the person registered. Devices: `POST /notifications/devices {token, platform WEB|ANDROID|IOS}` (201 new, 200 when the same device registers again), `GET /notifications/devices`, `DELETE /notifications/devices/{id}`; the token is shown only as its last six characters; one device belongs to one person at a time (registering it as someone else moves it); at most `notification.push.devices.max` (default 5) per person. Delivery goes through a port, `PushGateway`; the shipped adapter, `SimulatedPushGateway`, writes the message to the log. Like the simulated text message, the channel also stores one row with channel `PUSH_SIM`, so `GET /notifications?channel=PUSH_SIM` shows what was pushed, which makes it demonstrable without a phone. A real Firebase, Apple or Web Push gateway is one more implementation of the port, with no change to the notification code.

**When it pushes** (`NotificationRules.pushApplies`): the urgent events of a P1 or P2 incident (assigned, triage needed, SLA warning, SLA violated, escalated), and at any priority when the reporter is asked for information or the incident is resolved; never to the chat room. A person with no device gets nothing.

**It is not a per-user switch.** The preference matrix stays 15 events by 4 channels (60 switches), so the contract, the frontend and the Testing teammate's checks do not change; push follows the registered devices instead.

| Option | For | Against |
|---|---|---|
| **Simulated channel behind a gateway port** (chosen) | Demonstrable, testable, honest; the real provider is a drop-in | No message reaches a real phone |
| A real Firebase adapter | Real delivery | Needs credentials and a mobile app, neither of which exist (the frontend is a web app) |
| A per-user switch like the other channels | Consistent | Changes the 60-switch contract and every check that counts it |

**Schema.** Migration V10: table `push_devices` (unique token, platform CHECK) and `PUSH_SIM` in the notifications channel CHECK.

**Verified.** `a12_a4_smoke.py` (the A4 half): register (201), register again (200, same id), bad platform and short token (400), the sixth device refused, another user cannot remove my device (404), a device moves to its new owner, a P4 incident pushes nothing, a P1 on Payment pushes to a technician's device with the incident named and the row labelled `PUSH_SIM`, asking the reporter for information pushes to the reporter's device, the preference list is still 60 switches, a person with no device gets no rows.

**Cross-question.** *"Is this real push?"* No, and it says so everywhere: the transport is simulated, the design is complete up to the gateway, and the adapter that talks to a provider is the only missing class.


### DEC-118: Requirement traceability (A13) and what was decided against (A5)

| When | Module | Status |
|---|---|---|
| 2026-11-15 | Documentation | ✅ A13 written; A5 dropped by user decision |

**A13.** `backend/docs/TRACEABILITY.md` maps every requirement of the course brief (MVP, the three user kinds, functional sections, intelligent features A to G, OOP requirements, error handling, security, persistence, deliverables, the three demonstration workflows and the innovation list) to the module, the main classes, the endpoints, the screen (real, fake, stub or none, honestly) and the evidence (T01 to T26, smoke suites, unit tests). It states plainly that workflows 2 and 3 cannot be recorded until the frontend screens of `frontend/FRONTEND_GUIDE.md` exist.

**A5 cloud deployment: not doing it** (user decision 2026-11-15). The demonstration runs locally with Docker Compose (`deploy/`). The report says so, and the scale-out path in `SCALING.md` is the answer to "how would it evolve". **Microservices** are likewise not built: a modular monolith with a documented path.

**Cross-question.** *"Why no cloud deployment?"* It adds an account, cost and a failure mode to the recording and earns no marks that the local stack does not; the Docker images and the environment variables are the same ones a cloud service would use.

### DEC-M12-10: Gemini embeddings for similarity, TF-IDF as the fallback (B3)

| When | Module | Status |
|---|---|---|
| 2026-11-15 (PR #29) | M12 | ✅ built; supersedes DEC-M12-3 |

**Context.** DEC-M12-3 left embeddings out because the Anthropic API has no embeddings endpoint and a second provider looked like too much. Since DEC-111 the default LLM is Google Gemini, which also offers an embedding model on the same free key, so the objection no longer holds, and the handbook (M12, job table 2.7) asks for embeddings, `incident_embeddings` and an `EmbeddingBackfill` job.

**Decision.** Embeddings score similarity when every vector exists; otherwise TF-IDF scores, as before.
* An `EmbeddingClient` port (Adapter) with `GeminiEmbeddingClient` and a null-object `DisabledEmbeddingClient`; model `gemini-embedding-001`, 768 dimensions.
* `EmbeddingListener` embeds a new incident after commit on its own thread; `EmbeddingBackfillJob` fills the gaps (and recomputes vectors of another model) every 60 seconds, 20 at a time.
* Vectors are stored in the existing table `incident_embeddings` with the model name (no new migration).
* One cap of 60 texts per minute for everything, a circuit breaker like the LLM one, a 10-minute cache of query vectors, redaction before sending.
* Scoring is all or nothing (`EmbeddingSimilarity`): one missing vector sends the whole request to TF-IDF, so two score scales are never mixed.
* Thresholds `dup.embedding.threshold.duplicate` 0.93 and `.related` 0.90; TF-IDF stays 0.55 and 0.35. Each match says its `source` (`EMBEDDING` or `KEYWORD`).
* Key: `EMBEDDING_API_KEY`, else `LLM_API_KEY` when the LLM provider is Gemini; the Anthropic key is never sent to Google.

**Options.** Keep TF-IDF only and document the deviation (the earlier choice); embeddings through a second paid provider; **embeddings on the existing Gemini key with TF-IDF fallback** ✔; store embeddings and compare in the database (pgvector, a new extension and migration: not worth it at a few hundred incidents).

**Why 0.93 and 0.90, not the handbook's 0.80 and 0.65.** Gemini vectors are bunched. The pair was calibrated during B3 on the 212 seed incidents (DEC-M12-10); at that time unrelated pairs had a median cosine near 0.85 and same-issue pairs near 0.95 (not re-measured since). At 0.80 almost everything would be a "duplicate". Both values are live settings.

**Trade-off.** An external call per new incident and per search (kept inside the free tier by the cap and the cache); a few seconds after creation an incident has no vector and the check uses TF-IDF; scores of the two engines are not comparable, hence `source`.

**Cross-questions.** *"What happens with no internet or no key?"* The disabled adapter or the breaker sends everything to TF-IDF; nothing fails. *"Why not mix the two?"* The scales differ (median 0.85 for unrelated pairs against near 0 for TF-IDF), so a mixed ranking would be meaningless. *"Is user text sent to Google?"* Only title and description, after redaction of emails, IP addresses and secrets.

### DEC-M12-11: `AT_RISK` replaces OK and WARNING, from one shared source (B1)

| When | Module | Status |
|---|---|---|
| 2026-11-15 (PR #28) | M12, M10 | ✅ |

**Decision.** `slaState` can now be `AT_RISK`. The SLA risk scan (`SlaRiskService`) implements a small domain port, `SlaRiskFlags.flaggedIds()`, which the view mapper (`IncidentViewMapper`) and the search (`CriteriaIncidentSearch`) both read. An incident is `AT_RISK` when it is open, its resolution clock is running, it is not violated and its id is flagged; it takes over from `OK` and `WARNING` (so those two filters leave flagged ids out). `VIOLATED`, `PAUSED` and `MET` are never replaced.

**Options.** Compute the score on every list read (too slow); store a flag column (a migration and a second writer); **read the scan's flags through one port** ✔.

**Trade-off.** The flags are as fresh as the last scan (every `sla.risk.scan.interval.seconds`), so a list can trail the detail by one interval.

**Cross-question.** *"Can the list and the detail disagree?"* No: both read the same port.

### DEC-M12-12: Report export as PDF through a sink and a renderer port (B2)

| When | Module | Status |
|---|---|---|
| 2026-11-15 (PR #27) | M10 | ✅ |

**Decision.** `GET /reports/export` takes `format=csv|pdf` (default csv). `ReportExportService` writes rows into an `ExportSink`, so one code path produces the numbers for both formats; the PDF is drawn by an `OpenPdfReportRenderer` behind the `ReportPdfRenderer` port (Adapter). The row cap and permissions are unchanged. Any other `format` is 400 `VALIDATION_FAILED` before anything is written (earlier the value was silently ignored).

**Options.** A second service for PDF (two copies of every report query); **one sink, two writers** ✔; PDF only for the post-incident report (the old state, a gap against the handbook's Tier 3 "PDF export").

**Trade-off.** A PDF is built in memory, bounded by the row cap, and says when it cut the table short.
