# I-ITSM Backend: Error and Issue Log

Every problem we hit, what caused it, and how it was fixed. Add newest entries at the bottom. Keep it honest: this is evidence of real debugging for the report (Testing / lessons learned sections).

Entry template:

```
### E-XXX: short title
- Date:
- Area: build | config | db | security | domain | api | other
- Symptom: what we saw (paste the key error line)
- Cause: what it actually was
- Fix: what we changed
- Prevention: how to avoid it next time
- Status: open | fixed
```

---

### E-001: Generated project used Spring Boot 4.1.1, handbook locks 3.x
- Date: 2026-10-15
- Area: build
- Symptom: `pom.xml` parent was `spring-boot-starter-parent 4.1.1`, with Boot 4 style starters (`spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, many `*-test` starters).
- Cause: Spring Initializr defaulted to the newest Boot version; the handbook (section 1.5) locks Spring Boot 3.x. Boot 4 also changes Jackson and starter names, which risks breaking jjwt, springdoc and AI-generated Spring 3 code.
- Fix: parent changed to 3.5.16 (first tried 3.5.7, which did not resolve on the user's machine); starters renamed to Boot 3 names (`spring-boot-starter-web`, `flyway-core` + `flyway-database-postgresql`, single `spring-boot-starter-test`).
- Prevention: check the Boot version in Initializr against the handbook before generating.
- Status: fixed (pending first compile to confirm)

### E-002: Wrong base package and coordinates
- Date: 2026-10-15
- Area: build
- Symptom: package `org.example.iitsm_backend`, groupId `org.example`, artifactId `IITSM_Backend`.
- Cause: Initializr defaults were not changed to the handbook values (`com.iitsm`, `iitsm-backend`).
- Fix: renamed packages in main and test, updated groupId/artifactId.
- Prevention: set Group/Artifact in Initializr per handbook 2.2.
- Status: fixed (empty `org`/`iitsm_backend` leftover folders may need manual deletion)

### E-003: Unused Spring Batch starter in the pom
- Date: 2026-10-15
- Area: build
- Symptom: `spring-boot-starter-batch-jdbc` (and its test starter) present although the project has no batch jobs.
- Cause: selected by mistake during Initializr setup.
- Fix: removed. Scheduled jobs use Spring Scheduling per the handbook.
- Prevention: only tick dependencies listed in handbook 2.2.
- Status: fixed

### E-004: Suspicious `<n>` tag in pom.xml
- Date: 2026-10-15
- Area: build
- Symptom: the original pom had `<n>IITSM_Backend</n>` where Maven expects `<name>`.
- Cause: unknown (likely an editing or paste glitch). Maven rejects unrecognised tags in the POM.
- Fix: replaced with `<name>iitsm-backend</name>` in the rewritten pom.
- Prevention: if a build ever complains about "Unrecognised tag", check the pom header first.
- Status: fixed

### E-005: Empty `application.properties`, app cannot start without a datasource
- Date: 2026-10-15
- Area: config
- Symptom: with JPA + Flyway on the classpath and no datasource config, startup fails.
- Cause: no DB URL / credentials configured, no profiles.
- Fix: added env-var driven datasource, JWT, CORS, mail settings and dev/demo/test profile files.
- Prevention: keep `.env.example` in sync whenever a new env var is added.
- Status: fixed (pending first run against local Postgres)

### E-006: Dependency scan flagged many CVEs on Spring Boot 3.5.16, no free patches exist
- Date: 2026-10-15
- Area: build
- Symptom: IDE scan (Mend.io) listed critical/high CVEs in spring-web, spring-webmvc, spring-expression, spring-security-web, tomcat-embed-core/websocket, jackson-core/databind, logback, postgresql 42.7.11 and others, all transitive from the 3.5.16 BOM.
- Cause: Spring Boot 3.5 (and Spring Framework 6.2, Spring Security 6.5) reached end of open-source support on 2026-06-30; 3.5.16 was the last free release, so fixes are only available in Boot 4.x or in paid extended support. Overriding only Tomcat/Jackson/etc. would not fix the Spring CVEs.
- Fix: moved the project to Spring Boot 4.1.1 (decision D-004). Pom updated: parent 4.1.1, `spring-boot-starter-webmvc`, `spring-boot-starter-flyway`, springdoc 3.0.3, `jjwt-gson` (instead of `jjwt-jackson`, because Boot 4 ships Jackson 3), Testcontainers `testcontainers-junit-jupiter` and `testcontainers-postgresql`, per-technology test starters. This reverses the part of E-001 that moved from 4.1.1 to 3.5.16; the original problem there was the wrong starter names, not the version.
- Prevention: re-run the scan after every dependency change; check the support status of the Boot version at spring.io before locking it in a handbook.
- Status: fixed (pending first compile; re-scan after compile and log any remaining findings)

### E-007: Remaining scan findings after the Boot 4.1.1 switch (Tomcat, Jackson, Logback, pgjdbc)
- Date: 2026-10-15
- Area: build
- Symptom: re-scan still flagged tomcat-embed-core/websocket 11.0.24 (critical 9.8 and 9.1 items), jackson-databind/core 3.1.5 and 2.21.5, logback 1.5.38, postgresql 42.7.13.
- Cause: Boot 4.1.1 manages these versions; newer patch releases exist upstream. Verified: CVE-2026-65637 (Tomcat, HTTP/2 no-authority bypass of strict SNI validation) fixed in 11.0.25; Tomcat 11.0.26 fixes 12 flaws incl. CVE-2026-87022 and CVE-2026-86350; CVE-2026-68497 (jackson-databind DoS via XML Duration/XMLGregorianCalendar binding) fixed in 3.1.6 and 2.21.6. Both Jackson lines are present (Boot uses Jackson 3, springdoc/swagger-core uses Jackson 2).
- Fix: pom `<properties>` overrides `tomcat.version`=11.0.26, `jackson-bom.version`=3.1.6, `jackson-2-bom.version`=2.21.6. Verified on 2026-10-16 with `.\mvnw dependency:tree`: Tomcat 11.0.26, Jackson 3 (tools.jackson) 3.1.6 and Jackson 2 (com.fasterxml) 2.21.6 all resolve, so the property names are correct (jackson-annotations stays at 2.21, annotations are only versioned major.minor).
- Accepted risk: logback CVE-2026-19880 and pgjdbc CVE-2026-107314/107315 (medium, no fix version identified). The app runs locally/in Docker, plain HTTP, trusted DB, no TLS/SNI, no XML date binding, so these are not reachable in our setup. Re-scan later and bump if a patch appears.
- Prevention: re-scan after each dependency change; note accepted risks in the report's security/limitations section.
- Status: fixed (versions verified with dependency:tree on 2026-10-16; dependency re-scan still to do; logback/pgjdbc accepted)

---

### E-008: `mvnw` not recognized in PowerShell
- Date: 2026-10-16
- Area: build
- Symptom: `mvnw : The term 'mvnw' is not recognized as the name of a cmdlet, function, script file, or operable program`
- Cause: PowerShell does not run scripts from the current folder unless the path is given.
- Fix: run `.\mvnw dependency:tree` (or `.\mvnw.cmd`). The first run is slow because it downloads Maven and all dependencies.
- Prevention: always prefix with `.\` in PowerShell.
- Status: fixed

### E-009: Postgres login failed because another Postgres already owned port 5432
- Date: 2026-10-16
- Area: db
- Symptom: app startup failed in Flyway/Hikari with `FATAL: password authentication failed for user "iitsm"` (SQL state 28P01), although the container was created with user and password `iitsm`.
- Cause: two processes were listening on port 5432 (`netstat -ano | findstr :5432` showed PIDs 8452 and 4208): Docker and a Postgres already running on Windows. The app reached the host Postgres, which has no `iitsm` user. `docker exec -it iitsm-db psql -U iitsm -d iitsm -c "select 1"` worked, which proved the container itself was fine.
- Fix: recreate the container on host port 5433 (`-p 5433:5432`) and point the app at it with `DB_URL=jdbc:postgresql://localhost:5433/iitsm`.
- Prevention: check `netstat -ano | findstr :5432` before starting the container; use 5433 on this machine. Docker Compose (Testing teammate) should also map a non-default host port or document the conflict.
- Status: fixed (confirmed: clean start on port 5433, 2026-10-16)

### E-010: `.env` copied from `.env.example` kept the wrong DB values
- Date: 2026-10-16
- Area: config
- Symptom: the same `password authentication failed` error after the `.env` file was loaded.
- Cause: `.env` still had `DB_URL=...localhost:5432/iitsm` and `DB_PASSWORD=change-me` from the example. Spring Boot does not read `.env` by itself; the file is loaded through the IntelliJ run configuration (Environment variables, folder icon, pick the `.env` file), and loaded values override the defaults in `application.properties`.
- Fix: set `DB_URL` to port 5433 and `DB_PASSWORD=iitsm` in `.env`.
- Prevention: after copying `.env.example` to `.env`, replace every `change-me` and check the port. Keep `.env.example` defaults matching the local docker command where possible.
- Status: fixed (confirmed: clean start, 2026-10-16)

### E-011: Postgres rejected the JVM time zone `Asia/Calcutta`
- Date: 2026-10-16
- Area: db
- Symptom: `FATAL: invalid value for parameter "TimeZone": "Asia/Calcutta"` (SQL state 22023) on first connection.
- Cause: the PostgreSQL JDBC driver sends the JVM default time zone as a startup parameter. On Windows in India the JVM reports `Asia/Calcutta`, a legacy name that the newer Debian-based `postgres:16` image no longer ships in its default time zone data (it only knows `Asia/Kolkata`). Nothing in our code asked for a time zone.
- Fix: `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))` at the start of `main()` in `IitsmBackendApplication`. UTC also matches the handbook rule that all timestamps are stored in UTC. `-Duser.timezone=UTC` as a VM option is an equivalent per-machine workaround.
- Prevention: every teammate and the Docker/CI setup get the fix automatically because it lives in code.
- Status: fixed (confirmed: clean start, 2026-10-16)

### E-012: M1 exception set was incomplete against the handbook
- Date: 2026-10-16
- Area: domain
- Symptom: `domain/exception` had 13 subclasses; handbook 2.5 M1 and Appendix B.2 list 17 codes. Missing: WORKLOAD_EXCEEDED (409), SLA_NOT_CONFIGURED (422), OPTIMISTIC_LOCK_CONFLICT (409), RATE_LIMITED (429). No global handler, error body, request ID filter, CORS or OpenAPI config existed either, although the folders were created.
- Cause: M1 was left half done between sessions (exception classes first, web layer not started).
- Fix: added `WorkloadExceededException`, `SlaNotConfiguredException`, `OptimisticLockConflictException`, `RateLimitedException`; wrote the rest of M1 (see ROADMAP section 2 and D-005).
- Prevention: compare each module against its handbook bullet list before calling it started; keep the Module status table honest ([~] until compiled and checked).
- Status: fixed (compiled 2026-10-16)

### E-013: GlobalExceptionHandler override had the wrong method name
- Date: 2026-10-16
- Area: build
- Symptom: `java: method does not override or implement a method from a supertype` at `GlobalExceptionHandler.java:124` (the `@Override` on `handleHandlerMethodValidation`). Only error in the build.
- Cause: the `ResponseEntityExceptionHandler` method is named `handleHandlerMethodValidationException`; the name was written from memory without the `Exception` suffix. Every other override matched.
- Fix: renamed the method to `handleHandlerMethodValidationException`.
- Prevention: keep `@Override` on framework hooks so a wrong name fails the build instead of silently never running; check hook names in the IDE (Ctrl+O on the superclass) before writing them.
- Status: fixed (build successful 2026-10-16)

### E-014: Mail health check fails at startup (connection refused on port 1025)
- Date: 2026-10-16
- Area: config
- Symptom: `WARN o.s.b.mail.health.MailHealthIndicator : Mail health check failed` with `MailConnectException: Couldn't connect to host, port: localhost, 1025` and `Connection refused`. The app itself started fine ("Started IitsmBackendApplication in 4.68 seconds").
- Cause: the mail catcher (Mailpit, SMTP on 1025) is not running yet, and Actuator's mail health indicator tries to connect to it. The call came through JMX (the IntelliJ run configuration exposes all endpoints over JMX), not through HTTP.
- Fix: `management.health.mail.enabled=false` in `application.properties`, so a mail outage can never turn `/actuator/health` DOWN. Notifications will degrade gracefully instead. Mailpit is started when M9 (notifications) is built: `docker run --name iitsm-mail -p 1025:1025 -p 8025:8025 -d axllent/mailpit`.
- Prevention: when a starter adds a health indicator for an external service, decide whether that service is critical to the app being "up" before leaving it on.
- Status: fixed (confirmed 2026-11-06: no mail warning on restart)

### E-015: Port 8080 already in use, but netstat shows nothing
- Date: 2026-11-06
- Area: config
- Symptom: `Web server failed to start. Port 8080 was already in use.` `netstat -ano | findstr :8080` printed nothing.
- Cause: the Windows service `MTAgentService` (`C:\Program Files\MiniTool ShadowMaker\AgentService.exe`, the backup tool's agent, auto-start) holds `[::]:8080` in a state netstat does not list, so `netstat -ano | findstr :8080` (and a taskkill loop over it) finds nothing. PowerShell `Get-NetTCPConnection | Where-Object LocalPort -eq 8080` shows the owning PID.
- Fix: either stop the agent for the session in an Administrator prompt (`net stop MTAgentService`, or `taskkill /IM AgentService.exe /F`; it starts again at reboot, and ShadowMaker scheduled backups do not run while it is stopped), or run the app on another port with `SERVER_PORT=8081`. Code and Docker defaults stay on 8080.
- Prevention: check ports with `Get-NetTCPConnection` (it shows IPv6 sockets and the owning process), not only netstat.
- Status: fixed (2026-11-06: agent stopped, app started on 8080 from IntelliJ)

### E-016: Hibernate `@Check` on an element collection generated the constraint twice
- Date: 2026-11-06
- Area: db
- Symptom: with the `schema-auto` profile, `create table technician_skills` failed: `ERROR: check constraint "ck_technician_skills_proficiency" already exists`. The app still started (ddl-auto only logs DDL errors), but the table was missing.
- Cause: `org.hibernate.annotations.@Check` placed on the `@ElementCollection` field of `SkillSet` was emitted both as a column constraint and as a table constraint with the same name in one CREATE TABLE.
- Fix: replaced it with the JPA 3.2 column-level form `@Column(check = @CheckConstraint(name = ..., constraint = ...))`. The table now has `proficiency smallint` with one `CHECK (1..5)`, as in Appendix A.1. Also changed the map value from Integer to Short because the column is SMALLINT (the first run had produced `integer`).
- Prevention: after a schema-auto start, read the startup log for `CommandAcceptanceException` and compare `\d <table>` with Appendix A; ddl-auto does not fail the start on DDL errors, and `update` never changes an existing column type (drop the table first).
- Status: fixed (confirmed 2026-11-06)


### E-017: Creating an incident failed: NULL in `reusable_solution`
- Date: 2026-11-06
- Area: domain
- Symptom: every POST /incidents returned 500; log: `null value in column "reusable_solution" of relation "incidents" violates not-null constraint`.
- Cause: the `Resolution` embeddable was null until an incident is resolved; Hibernate then writes NULL into every embedded column, but `reusable_solution` is `BOOLEAN NOT NULL DEFAULT false` (Appendix A.3).
- Fix: every incident starts with an empty `Resolution.none()` (all text null, reusable false); `Incident.getResolution()` still returns null until a technician resolves.
- Prevention: an embedded value object with a NOT NULL primitive column must never be null; initialise it in the field declaration.
- Status: fixed (smoke run 54/54)

### E-018: Editing a resolved incident returned 403 instead of 409
- Date: 2026-11-06
- Area: api
- Symptom: PUT on a RESOLVED/CLOSED incident by its reporter returned 403 UNAUTHORIZED_OPERATION.
- Cause: the access policy mixed a status rule ("editable until resolved") into the permission check, so the refusal came from the "who" check.
- Fix: `IncidentAccessPolicy.permits` decides only who may act; the status rule stays in the domain (`Incident.updateDetails`, `applyPriority`), which answers 409 INVALID_STATE_TRANSITION. `allowedActions` still hides EDIT and OVERRIDE_PRIORITY when the status forbids them. Decision D-010 (2).
- Prevention: 403 = wrong person, 409 = wrong moment. Keep the two checks in separate places.
- Status: fixed

### E-019: A restarted backend kept answering with old code
- Date: 2026-11-06
- Area: other
- Symptom: after a fix, tests still failed exactly as before; the log showed the old process id answering requests while the new start failed with "Port 8081 was already in use".
- Cause: the old Java process was not stopped: on this machine `Get-NetTCPConnection -State Listen` does not report the listener (the state column is empty), so the stop command matched nothing.
- Fix: stop the process by the PID printed in the startup log line ("Started IitsmBackendApplication ... with PID n"), then start again and confirm the new PID in the log.
- Prevention: after every restart, check that the "Started" line shows a new PID before testing.
- Status: fixed

### E-020: Duplicate bean `openApiConfig` after moving the class
- Date: 2026-11-06
- Area: build
- Symptom: startup failed with a duplicate bean definition `openApiConfig` after `OpenApiConfig` moved from `infrastructure/config` to `web/openapi`.
- Cause: the old compiled class stayed in `target/classes`, so component scanning found both the old and the new class. `mvnw clean` failed because the IntelliJ run held a lock on `target`.
- Fix: deleted the stale `target/classes/com/iitsm/infrastructure/config/OpenApiConfig.class` and rebuilt.
- Prevention: after moving or renaming a class, stop the running app and do a clean rebuild.
- Status: fixed

### E-021: Omitting an optional boolean gave 400 with no field errors
- Date: 2026-11-07
- Area: api
- Symptom: `POST /incidents/{id}/resolve` without `reusableSolution` returned 400 VALIDATION_FAILED "The request could not be understood" with empty `fieldErrors`. Found by the M8 smoke test.
- Cause: Jackson 3 (Boot 4) turns `FAIL_ON_NULL_FOR_PRIMITIVES` on by default. A record component of type `boolean` cannot take a missing JSON field, so the whole body is rejected as unreadable. Two DTOs had one: `ResolveRequest.reusableSolution` and `ServiceRequest.alwaysP1`.
- Fix: both are `Boolean` now and a missing value means false (`Boolean.TRUE.equals(...)` in the controllers).
- Prevention: request DTOs use wrapper types (`Boolean`, `Integer`) for every optional field; required ones get `@NotNull`, which also gives a proper field error.
- Status: fixed

### E-022: BUSINESS_HOURS does not fit sla_policies.calendar_type
- Date: 2026-11-07
- Area: db
- Symptom: creating an SLA policy with `calendarType: BUSINESS_HOURS` returned 500; log: `value too long for type character varying(12)`.
- Cause: a mismatch inside the locked handbook. Appendix A.2 sizes `calendar_type` VARCHAR(12), but the contract value (C.2 CalendarType) `BUSINESS_HOURS` has 14 characters. It never showed while only ALWAYS was accepted.
- Fix: `CalendarTypeConverter` stores BUSINESS_HOURS as `BUSINESS_HRS` (12 characters); the API still uses BUSINESS_HOURS. Schema and contract stay as agreed.
- Prevention: when an enum is stored as text, compare its longest value with the column length. Testing teammate: in seed rows use `BUSINESS_HRS` (or widen the column to 20 in V1 if nobody has run it yet, then the converter can go).
- Second symptom on the local `schema-auto` database: after the converter, inserts still failed on `sla_policies_calendar_type_check`. Hibernate had generated that CHECK from the old `@Enumerated` mapping, and `ddl-auto=update` never drops constraints. Fixed locally with `alter table sla_policies drop constraint sla_policies_calendar_type_check`; Flyway databases are not affected.
- Status: fixed (team to confirm the seed value)

---

## Known things to watch (not errors yet)

- M1 verified over HTTP (2026-11-06): an unauthenticated request returns 401 `TOKEN_INVALID` in the standard body (so `ApiErrorWriter` and its `ObjectMapper` work), unknown paths return 404 `NOT_FOUND` in the standard body, and `X-Request-Id` and `X-Frame-Options: DENY` headers are present.
- IDE inspection warnings in `GlobalExceptionHandler` are accepted, not errors: "Not annotated parameter overrides @NullMarked parameter" (Spring 7 uses JSpecify null annotations; only matters with a strict null checker such as NullAway, which we do not use), "Parameter 'ex' is never used" (the exception parameter is required so Spring can route to the handler method), and the spell checker flagging `Itsm` (add it to the IDE dictionary).
- Flyway `No migrations found` in the default profile is expected until V1 arrives (with `schema-auto` Flyway is off). The `Using generated security password` line is gone since M2: `UserDetailsServiceAutoConfiguration` is excluded in `application.properties`.
- Since M2 the JWT filter is active: requests with a valid Bearer token are authenticated; a bad token gives 401 TOKEN_INVALID, an expired one 401 TOKEN_EXPIRED, only on endpoints that need a login. Health, Swagger UI and `/api/v1/auth/{register,login,refresh}` are public.
- Deleting a skill that a category or technician still uses logs Hibernate `WARN ... violates foreign key constraint` and `SQLState: 23503`. Expected: `CatalogService.deleteSkill` flushes, catches the violation and returns 400 "the skill is still used". Not an error.
- If seeded `app_config` values break a rule (for example assignment weights not summing to 1.0), the app refuses to start with VALIDATION_FAILED naming the key; fix the row, not the code.
- Testing note for the expired-token case (T19): with the dev profile, a token can be signed with the dev-only default secret from `application-dev.properties`; in tests, use a fixed `Clock` instead.
- Boot 4 specifics: Jackson 3 (`tools.jackson.*` packages), Spring Security 7, Hibernate 7. If a library pulls in Jackson 2, it needs the compatibility module or a different serializer (that is why jjwt uses Gson here). springdoc 3.0.3 was built against Boot 4.0.5, check Maven Central for a newer 3.x if Swagger UI misbehaves on 4.1.1. Check Maven Central for a newer 4.1.x patch of the parent before the first commit.
- `IitsmBackendApplicationTests.contextLoads` will fail without a running database (or Testcontainers). Expected until the test setup is done by the Testing teammate.
- Flyway will warn about a missing/empty `db/migration` location until V1 is added.
