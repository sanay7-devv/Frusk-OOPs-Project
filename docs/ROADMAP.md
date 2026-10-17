# I-ITSM Backend: Roadmap and Progress

Living document. Update after every working session. Source of truth for scope: the team handbooks (Backend Lead Handbook, section 2.5 modules M1 to M14).

Last updated: 2026-10-16 (Week 1, Oct 12-18)

Legend: [x] done, [~] written but not yet verified, [ ] not started

---

## 1. Where we are right now

Project skeleton set up and aligned with the handbook. It compiles, and the Tomcat/Jackson version overrides are verified with `dependency:tree`. The app starts cleanly against local Postgres on port 5433 (confirmed 2026-10-16, see ERROR_LOG E-009 to E-011); M1 Foundations code is written (exception hierarchy, error body, global handler, request ID filter, CORS, security baseline, OpenAPI config) and compiles and starts; the standard-format 401 check over HTTP is still to confirm. M2 is next once M1 is verified.

## 2. Done so far

- [x] Spring Initializr project created (Java 21, Maven)
- [~] pom.xml realigned to the handbook: Spring Boot 4.1.1 (switched from 3.5.16, see D-004), groupId `com.iitsm`, artifactId `iitsm-backend`, removed unused Spring Batch starter, added jjwt, springdoc-openapi (Swagger UI), Testcontainers. Not yet compiled.
- [~] Package renamed from `org.example.iitsm_backend` to `com.iitsm` (main + test). Old empty folders may remain, delete them manually.
- [~] `application.properties` plus `application-dev`, `application-demo`, `application-test` profiles written (env-var driven, no secrets).
- [x] `.env.example` added; `.env` added to `.gitignore`
- [x] `docs/` folder with this roadmap and `ERROR_LOG.md`
- [~] M1 Foundations (2026-10-16, not yet compiled): the full exception family under `domain/exception` (base `ItsmException` + 17 subclasses, codes from Appendix B.2; added WorkloadExceeded, SlaNotConfigured, OptimisticLockConflict, RateLimited, which were missing from the first 13); `web/dto/ErrorResponse`; `web/handler/GlobalExceptionHandler` (extends ResponseEntityExceptionHandler, one place for every error); `web/filter/RequestIdFilter` (X-Request-Id header + MDC, logged via `logging.pattern.level`); `infrastructure/config/CorsConfig` (frontend origin only) and `OpenApiConfig` (Bearer scheme); `infrastructure/security/SecurityConfig` (stateless, CSRF off, security headers, 401/403 in the standard format via `ApiErrorWriter`, public paths: health, API docs, register/login/refresh).

## 3. Immediate next steps (in order)

1. [x] (2026-10-15, compiles on Boot 4.1.1 with the security overrides) Run `mvnw clean compile` and fix anything that breaks (log it in ERROR_LOG.md). If 4.1.1 is not resolvable, paste the exact Maven error into ERROR_LOG.md (it may be a network/proxy or another dependency, not the Boot version).
2. [x] (2026-10-16, container on host port 5433 because another Postgres on this machine owns 5432, see E-009; the app needs `DB_URL=jdbc:postgresql://localhost:5433/iitsm` and `DB_PASSWORD=iitsm` in `.env`, loaded via the IntelliJ run configuration, see E-010) Start local Postgres:
   `docker run --name iitsm-db -e POSTGRES_DB=iitsm -e POSTGRES_USER=iitsm -e POSTGRES_PASSWORD=iitsm -p 5433:5432 -d postgres:16`
3. [ ] Get V1 to V6 migrations from the Testing teammate (were due Oct 14), place in `src/main/resources/db/migration`, confirm Flyway runs on startup.
4. [ ] Agree schema change with Testing for Google sign-in (D-001, APPROVED): in V1 (before anyone runs it) make `users.password_hash` nullable and add `google_sub VARCHAR(100) NULL UNIQUE`. If V1 was already run by anyone, add V7 instead. Update Appendix A.1 and the OpenAPI file by pull request, then tell the team.
5. [~] M1 Foundations (exceptions + global handler + request ID filter + CORS). Compiles and starts (build successful and clean startup 2026-10-16); the 401 check over HTTP in the standard format is still to confirm. Done-when (handbook 2.5): an exception from a test endpoint comes back in the standard format. The Testing teammate owns the test.
6. [ ] M2 login (User, Role hierarchy, BCrypt, JWT, refresh, lockout).
7. [ ] Publish the OpenAPI file (stub controllers + DTOs from Appendices B and C, plus `POST /auth/google`). Deadline was Oct 15, tell the team the real date if late.
8. [ ] M2b Google sign-in (after M2 login passes its done-when check): add `POST /auth/google`, Google ID token verification, account linking by email, tests. See D-001 for the design.

## 4. Module status (handbook 2.5)

| Module | Description | Status |
|---|---|---|
| M1 | Foundations: exception hierarchy, global handler, CORS, request ID, OpenAPI config | [~] |
| M2 | Users, roles, authentication, authorization (JWT, lockout) | [ ] |
| M2b | Google sign-in extra (`POST /auth/google`), built after M2 | [ ] |
| M3 | Catalog and configuration (services, categories, SLA policies, app_config) | [ ] |
| M4 | Incident aggregate and State machine, creation pipeline | [ ] |
| M5 | Priority engine | [ ] |
| M6 | Technician assignment strategies | [ ] |
| M7 | SLA engine and monitor | [ ] |
| M8 | Events and audit trail | [ ] |
| M9 | Notifications (4 channels) | [ ] |
| M10 | Search and reports | [ ] |
| M11 | Escalation (Chain of Responsibility) | [ ] |
| M12 | Intelligence and AI (with keyword fallback) | [ ] |
| M13 | Real-time layer, dashboard, service graph | [ ] |
| M14 | Hardening | [ ] |

## 5. Timeline (from handbook)

| Week | Dates | Backend goal | Status |
|---|---|---|---|
| 1 | Oct 12-18 | Setup, M1, M2 (login works), skeleton of M4, OpenAPI file, thin slice | In progress |
| 2 | Oct 19-25 | M3, M4 full state machine + creation pipeline, M5. Working incident endpoints to Frontend by Oct 22 | |
| 3 | Oct 26-Nov 1 | M6, M7, M8. Technician endpoints by Oct 28 | |
| 4 | Nov 2-8 | M9, M10, M11, M12 start, admin endpoints. Reports/admin endpoints by Nov 4 | |
| 5 | Nov 9-15 | M12 rest, M13, M14, bug fixes. Feature freeze Nov 14 | |
| 6 | Nov 16-22 | Code freeze Nov 16. Record Nov 17-19. Submit by Nov 20 | |

Cut order if behind: Google sign-in (M2b), thread summarizer, PDF export, saved views, notification preferences, business-hours calendars, dependency graph.

## 6. Decisions log

| ID | Date | Decision | Reason |
|---|---|---|---|
| D-001 | 2026-10-15 | APPROVED, will be implemented as module M2b. Google sign-in is an extra on top of email/password JWT login. Frontend uses the Google Sign-In button, backend exposes `POST /auth/google { idToken }`, verifies the ID token (audience = our client id, issuer, expiry, email_verified), and returns the normal `AuthResponse` (same JWT access/refresh tokens). No `oauth2-client` starter. Schema: `users.password_hash` nullable, new `users.google_sub` (unique, nullable). Rules: first Google login creates an EMPLOYEE-only user (same as register); an existing account with the same email is linked by storing `google_sub`; Google-only users have no password, so password login for them returns INVALID_CREDENTIALS; lockout and rate limiting apply as for normal login. New env var `GOOGLE_CLIENT_ID` (add to `.env.example`). Built only after M2 works. | Easier sign-up/sign-in, but must not replace password login (tests T19/T20 and the seed users depend on it). Contract and schema changes go through the normal pull-request process. |
| D-002 | 2026-10-15 | Use Spring Boot 3.5.x instead of 4.x | SUPERSEDED by D-004. Was: handbook locks Boot 3.x; library and AI-assistant compatibility |
| D-003 | 2026-10-15 | Base package is `com.iitsm` with layers web / application / domain / infrastructure | Handbook 2.3 |
| D-004 | 2026-10-15 | Use Spring Boot 4.1.1 (Spring Framework 7, Spring Security 7, Hibernate 7, Jackson 3) instead of 3.5.16. Pom changes: `spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, springdoc 3.0.x, `jjwt-gson` instead of `jjwt-jackson`, Testcontainers 2.x artifact names, per-technology test starters. Frontend and other teammates are unaffected (REST contract unchanged); only the Backend Lead writes Spring code. | Spring Boot 3.5 reached end of free support on 2026-06-30 (3.5.16 was the last free release), and the dependency scan flagged many CVEs in Spring, Tomcat and Jackson that will never be patched on 3.5. No backend code existed yet, so switching now costs almost nothing. Boot 4.1 has free support into 2027 (Boot 4.0 ends 2026-12-31, so 4.1, not 4.0). Handbook locks "Spring Boot 3.x": Report teammate to be told to state Boot 4.1.1 in the technology stack and selection report. |
| D-005 | 2026-10-16 | M1 error handling: (1) one `@RestControllerAdvice` extending `ResponseEntityExceptionHandler`, so Spring's own errors (404, 405, 415, bad JSON, missing params) also use the standard body; (2) the request ID goes in the `X-Request-Id` response header and the logs, not in the body, so the error body stays exactly as in the contract; the 500 message quotes it; (3) framework errors with no contract code use generic codes `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `NOT_ACCEPTABLE`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_REJECTED` (400 reuses `VALIDATION_FAILED`); (4) a baseline `SecurityConfig` is part of M1 so CORS, headers and standard-format 401/403 work before M2 adds the JWT filter. | Handbook 2.5 M1 asks for one handler mapping every exception, CORS for the frontend only, security headers, request ID filter, Bearer scheme. Generic codes are an addition to Appendix B.2: Frontend and Report must be told. |

## 7. Open questions / blockers

- Testing teammate: needs the M1 class names and codes to write the exception tests (handbook 2.8, give names early): `ItsmException` (code, status) and its 17 subclasses in `com.iitsm.domain.exception`, `GlobalExceptionHandler` in `com.iitsm.web.handler`, `RequestIdFilter` in `com.iitsm.web.filter`, `ErrorResponse` in `com.iitsm.web.dto`. The Backend Lead does not write under `src/test` (handbook 1.4).
- Frontend and Report teammates: error body unchanged, but generic codes `NOT_FOUND`, `METHOD_NOT_ALLOWED`, `NOT_ACCEPTABLE`, `UNSUPPORTED_MEDIA_TYPE`, `REQUEST_REJECTED` exist beyond Appendix B.2 (D-005); the frontend should fall back to the HTTP status for any code it does not know. Add them to the contract by pull request.
- Testing teammate: V1 to V6 migrations and compose file (overdue).
- Testing teammate: can V1 be updated for nullable `password_hash` + `google_sub` before anyone has run it, or does it need V7?
- Frontend and Testing teammates need to be told about `POST /auth/google` (not yet in Appendix B). Needs an OpenAPI pull request first, then Appendix B/C and the Frontend handbook (login screen) updated. Frontend needs the Google client id; Testing should add a test case beyond the 26 and note the new nullable column in seed rows.
- Report teammate: Spring Boot version is 4.1.1, not 3.x as in the handbooks (D-004). Update the technology stack table, tech selection report and security section (reason: 3.5 is out of free support, unpatched CVEs).
- Boot 4 things to remember while coding: Jackson 3 package is `tools.jackson.*` (not `com.fasterxml.jackson.*`, except annotations); use `spring-boot-starter-*-test` slices; Spring Security 7 (lambda DSL `SecurityFilterChain` only); Hibernate 7. Search for Boot 4 specific answers, many tutorials are still Boot 3.
- Report teammate: mention Google sign-in in the security section (implemented) and keep SSO/MFA listed as documented-only.
- Decide how to test `POST /auth/google` without real Google: put token verification behind an interface so tests can fake it (fits the Adapter pattern).
