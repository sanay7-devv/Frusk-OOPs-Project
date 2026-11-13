# I-ITSM API contract (OpenAPI)

The contract is **generated from the running code**, so it can never drift from what the backend actually does. Endpoints of modules not built yet come from `src/main/resources/openapi/planned-endpoints.json` (written from Appendices B and C of the API Data Dictionary) and carry the tag **Planned**. When a module is built, its controller documents itself and its planned entries are deleted from that file.

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
| `POST /auth/google` (planned, M2b) | Auth | Google sign-in as an extra | D-001 |

## Coming additions (accepted 2026-11-13, shapes not designed yet)

These features were accepted after the contract was published. Their endpoints are added to the Planned part as each one is designed; until then they are not in the files here. Details per role: `../TEAM_UPDATES.md`.

| Feature | Expect | Module |
|---|---|---|
| Reporter withdraw | `POST /incidents/{id}/withdraw` with a reason | M10 |
| Coverage risk report, post-incident report | new `/reports/...` operations; PDF | M10 |
| Escalation preview | a field on `IncidentDetail` | M11 |
| Major Incident Mode | known-outage lookup for the report form, join action, root cause on `/problems/{id}` | M12, M13 |
| Recurring-problem detector | suggestions on `/problems` | M12 |
| Service status board | a status per service | M13 |
| Service Desk Simulator | one operation to run a simulation | after M13 |
| Sealed audit trail | `GET /audit/verify` | M14 |
| Demo aids (demo profile only) | move the clock forward; start an outage drill | M11, M12 |
| Chat-webhook channel | a new notification channel value | M9 |

## Regenerating the export

With the backend running on port 8081 (`SERVER_PORT=8081`, profiles `dev,schema-auto`), from the project folder that contains `IITSM_Backend` and `smoke-tests`:

```bash
python -I smoke-tests/check_contract.py IITSM_Backend/backend/docs/openapi
```

It checks the contract (every `$ref` resolves, unique operation ids, path parameters declared, every operation has a success response and implemented ones list their errors) and rewrites both files.
