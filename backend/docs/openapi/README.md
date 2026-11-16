# I-ITSM API contract (OpenAPI)

The contract is **generated from the running code**, so it can never drift from what the backend actually does. Endpoints of modules not built yet came from `src/main/resources/openapi/planned-endpoints.json` (written from Appendices B and C of the API Data Dictionary) and carried the tag **Planned**; when a module was built its planned entries were deleted. Since 2026-11-14 every agreed endpoint is built (129 operations on 2026-11-16; the code has 132 endpoint methods, the 3 extra exist only in the `demo` profile), the planned file is empty.

Files here (exported from the running backend):

| File | Use |
|---|---|
| `iitsm-api.yaml` | Read it, diff it in pull requests |
| `iitsm-api.json` | Import into Postman (Import > File) or code generators |

## How to view it

| What | Where (backend running locally) |
|---|---|
| Swagger UI (try requests, "Authorize" with a Bearer token) | `http://localhost:8080/swagger-ui.html` |
| Raw contract, JSON | `http://localhost:8080/v3/api-docs` |
| Raw contract, YAML | `http://localhost:8080/v3/api-docs.yaml` |

All three are public (no login). Log in with `POST /api/v1/auth/login`, copy `accessToken`, click **Authorize** and paste it.

## Status of an endpoint

| In the contract | Meaning |
|---|---|
| Any tag other than **Planned** | Implemented and smoke-tested against the running app |
| Tag **Planned**, `x-module: Mn` | Agreed shape, not built yet; arrives with module Mn |

Every implemented operation lists the error codes it can return (`@ApiErrors`), each with the standard error body `{timestamp, status, code, message, path, fieldErrors}` and an example.

## Error codes

Appendix B.2 plus the generic framework codes of decision D-005 (`NOT_FOUND`, `REQUEST_REJECTED`). The full list with HTTP status and meaning is the `ErrorCode` enum (`com.iitsm.web.openapi.ErrorCode`). Clients should fall back to the HTTP status for any code they do not know.

## Additions to Appendices B and C

Everything the backend added on top of the original contract. Frontend and Testing: please read.

| Addition | Where | Why | Decision |
|---|---|---|---|
| `version` in `IncidentDetail`; optional `version` on `PUT /incidents/{id}` | Incidents | Detect a concurrent edit before saving (409 `OPTIMISTIC_LOCK_CONFLICT`) | D-010 (9) |
| `factors` (skill, load, experience, priorityFit, familiarity) and `excluded` (technician + reason) in `GET /incidents/{id}/recommendations`; response wrapped as `{strategy, recommendations, excluded}` | Incidents | Explainable recommendations | D-011, DEC-30 |
| `PUT /admin/technicians/{id}` (experience, escalation level, max load, availability) | Admin | Edit a technician profile without re-granting the role | D-011 (6) |
| `PUT /technicians/me/availability` | Technicians | Technicians set their own availability | D-011 (6) |
| Admin catalog lists return plain arrays, not the paged wrapper | Admin | Lists are small (tens of items) | D-009 (7) |
| `GET /admin/config` items also carry `defaultValue` | Admin | Show the default next to the current value | D-009 (5) |
| Generic codes `NOT_FOUND` (category, skill, policy, unknown path) and `REQUEST_REJECTED` (403, CORS) | All | No contract code existed for these | D-005, D-008 |
| Taken email on register: 400 `VALIDATION_FAILED` with `fieldErrors: [{field: "email", message: "is already registered"}]` | Auth | No dedicated code in B.2 | D-008 (5) |
| Every response has an `X-Request-Id` header | All | Quote it when reporting a problem | D-005 |
| `GET /notifications` takes an optional `channel` (default `IN_APP`, `SMS_SIM` allowed) | Notifications | List the simulated text messages | DEC-54 |
| `NotificationPreference` carries `locked`; `GET /notifications/preferences` returns every event type on every personal channel (60); `PUT` replaces the saved set and answers 400 for a locked switch | Notifications | Draw locked toggles disabled; critical alerts cannot be switched off | DEC-40, DEC-54 |
| The `channel` enum of a notification stays `IN_APP, EMAIL, WEBSOCKET, SMS_SIM` in what is stored; the code also knows `CHAT` (a room, never stored, never a preference) | Notifications | Chat webhook channel | DEC-43 A6, DEC-54 |
| STOMP over WebSocket at `/ws`: `Authorization: Bearer` header on CONNECT, subscribe to `/user/queue/notifications` (not part of the REST contract) | Real time | Live push of new notifications | DEC-54 |
| `escalationPreview` in `IncidentDetail` (staff only, otherwise null): `{kind, fromLevel, toLevel, targetRole, dueAt, secondsRemaining, recipients}` | Incidents | A team lead sees when the incident will next escalate and to whom (A11) | DEC-51 |
| `POST /incidents/{id}/escalate` takes `{reason}`; 409 at level 3 and in statuses other than ASSIGNED, ACKNOWLEDGED, IN_PROGRESS | Incidents | Manual escalation, status unchanged | DEC-50 |
| `GET /admin/demo/clock` and `POST /admin/demo/clock/advance` exist **only in the demo profile**, so they are not in this file; `{minutes: 1..1440}`, administrators only | Admin | Recorded demo (D1): move the clock forward | DEC-52 |
| `POST /auth/google {idToken}` returns the normal `AuthResponse` | Auth | Google sign-in as an extra (built, M2b) | D-001, DEC-100 to DEC-103 |
| `POST /incidents/{id}/withdraw {reason}` (reporter; CLASSIFIED, ASSIGNED, ACKNOWLEDGED; closes as WITHDRAWN) | Incidents | G3 | DEC-46, DEC-77 |
| `match` (`DUPLICATE` or `RELATED`) on similar incidents; the 409 `DUPLICATE_INCIDENT` body carries `similar` | Intelligence | Show likely duplicates apart from related reports | DEC-M12-1, DEC-71 |
| `POST /problems`, `GET /problems/{id}/root-cause`, `GET /problems/known-outages?serviceId=`, `GET /problems/recurring`, `POST /problems/{id}/join`, `POST /problems/{id}/resolve` (team lead, admin), `DELETE /problems/{id}/incidents/{incidentId}` | Problems | Major Incident Mode (S2), recurring problems (E2); resolving the lead does not close the others (DEC-72) | DEC-71 to DEC-74 |
| `POST /intelligence/chat {draft, answer}` | Intelligence | Chatbot intake (A1), stateless guided flow | DEC-75 |
| `GET /services/status` (any logged-in user) | Services | Service status board (E1) | DEC-84 |
| STOMP `/topic/dashboard` (REPORT_VIEW): `DashboardEvent` per incident event plus `COUNTERS` messages; socket closed with 4001 at token expiry | Real time | Live dashboard (M13) | DEC-80 to DEC-82 |
| `GET /audit/verify`, `POST /audit/seal` (AUDIT_VIEW) | Audit | Sealed audit trail (S3) | DEC-91 |
| 429 `RATE_LIMITED` with `Retry-After` on login, Google sign-in, incident creation and AI calls; 503 `SERVICE_UNAVAILABLE` on every operation when the database is down | All | M14 hardening | DEC-90, DEC-94 |
| `POST /admin/demo/outage-drill {rootServiceId}` exists **only in the demo profile** (not in this file) | Admin | Recorded demo (D2) | DEC-76 |
| `POST /admin/simulations` (replay recent incidents under up to three configurations, writes nothing), `POST /admin/simulations/apply` (CONFIG_MANAGE) | Admin: service desk simulator | S1 | DEC-112 |
| `GET /incidents?minEscalationLevel=` (0 to 3) | Incidents | Escalations screen | DEC-113 |
| `POST /auth/password-reset/request` (always 202), `POST /auth/password-reset/confirm` (204; 400 on a bad link or password), public | Auth | Forgotten password (A12) | DEC-116 |
| `POST /auth/login` takes an optional `totp`; new 401 codes `MFA_REQUIRED` and `INVALID_MFA_CODE` | Auth | Two-step verification (A12) | DEC-116 |
| `GET /auth/mfa`, `POST /auth/mfa/setup`, `/enable`, `/disable`; `POST /admin/users/{id}/mfa/reset` (USER_MANAGE) | Auth, Admin | Two-step verification (A12) | DEC-116 |
| `GET/POST /notifications/devices`, `DELETE /notifications/devices/{id}`; channel value `PUSH_SIM` in notification rows | Notifications | Simulated mobile push (A4) | DEC-117 |
| `/actuator/prometheus` exists in the running app but is not in this file (it answers only to the scrape token) | Actuator | Observability (A8) | DEC-115 |

## Still to come

All features accepted on 2026-11-13 are built (see the table above), including the Service Desk Simulator (S1, built 2026-11-15). Details per role: `../TEAM_UPDATES.md`.

## Regenerating the export

With the backend running on port 8081 (`SERVER_PORT=8081`, profile `dev`, Flyway builds the schema), from the project folder that contains `IITSM_Backend` and `smoke-tests`:

```bash
python -I smoke-tests/check_contract.py IITSM_Backend/backend/docs/openapi
```

It checks the contract (every `$ref` resolves, unique operation ids, path parameters declared, every operation has a success response and implemented ones list their errors) and rewrites both files.
