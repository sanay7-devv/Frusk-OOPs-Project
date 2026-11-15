# Task 3 test report

Baseline T01–T26 evidence: 2026-11-14, commit `86096c49aea8ec71cebe4317bbb38af9eb870809`, [successful CI run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624315622). The [Task 3 follow-up run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43736234225) on 2026-11-15 passed all six jobs, including the expanded Postman and security checks. The [original PR integration run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624733027) also passed before PR #12 was merged.

## Result

| Measure | Recorded result |
|---|---:|
| Handbook cases T01–T26 | 26 passed, 0 failed |
| Backend tests in seeded jobs | 40 run; 38 passed, 2 seed-only checks skipped in the schema-only job |
| Frontend tests at this snapshot | 3 passed |
| Seed generator tests | 7 passed |
| API smoke requests | 40 passed |
| Postman collection (follow-up) | 71 requests, 149 assertions passed |
| Security dry run (follow-up) | 30 checks passed |
| Open blocker bugs at this snapshot | 0 recorded |

The exact expected and observed result for each handbook case is in [test_cases.csv](test_cases.csv). That table now records the run date and commit. CI run links contain the job results; the Postman, smoke and security JSON reports are uploaded as demo-stack evidence. The six follow-up jobs also uploaded backend test reports. A bug about stale frontend login selectors, issue #11, was fixed by PR #16 and has since been closed.

## Coverage and limits

T01–T04 and T08–T26 use real HTTP, PostgreSQL and controlled test time where appropriate. T05–T07 check priority and assignment boundaries at the domain level. T10 and T16 run against a seeded Docker stack. CI also verifies database migrations, seed integrity, audit immutability, frontend build and snapshot/restore.

The handbook's T16 example gives duplicate/related similarity thresholds of 0.80/0.65. The implemented TF-IDF engine uses **0.55/0.35** (DEC-M12-1). The seeded VPN case returned a duplicate response and its observed match was at least 0.80, so the case passes against both that example and the implemented threshold. These values should be explained in the final PDF.

## Security checks for the report

| Check | Recorded result | Evidence |
|---|---|---|
| Employee calls admin users/config endpoints | 403 `UNAUTHORIZED_OPERATION`; two `ACCESS_DENIED` audit rows | T17 in the CI run above |
| Other technician acts on an assigned incident | 403 `UNAUTHORIZED_OPERATION`; state and audit unchanged | T18 |
| Expired access token and reused refresh token | 401 `TOKEN_EXPIRED`; reused refresh rejected as `TOKEN_INVALID` | T19 |
| Five wrong passwords | Account locks; correct password returns 423 `ACCOUNT_LOCKED` until test time advances 15 minutes | T20 |
| Read another user's incident by changing its ID | 404 `INCIDENT_NOT_FOUND`; acting on it returns 403 | Follow-up CI run, security JSON |
| Script text in incident title, description and comment | Stored and returned unchanged as JSON data; browser rendering still needs a visual check | Follow-up CI run, security JSON |
| Oversized title, description, comment, password and upload | Title, description, comment and password rejected with 400 field errors; 6 MB upload rejected by T10 | Follow-up CI run, security JSON; T10 |
| More than ten login attempts per minute | 429 `RATE_LIMITED` with `Retry-After` | Follow-up CI run, security JSON |

## Lessons and next checks

A green Linux/UTC CI run alone did not prove the suite works on another laptop: the app startup test assumed a local PostgreSQL service, and Spring tests could inherit the host time zone. The Task 3 follow-up branch moves startup tests to disposable Testcontainers PostgreSQL and fixes their time zone to UTC. The added CI report artifact preserves failed backend test output for review.

The expanded Postman folders and security dry run passed against the disposable CI stack. Before the final recording, follow [DEMO_RUN_SHEET.md](DEMO_RUN_SHEET.md), visually confirm script text is never executed in the browser, exercise the sealed-audit tamper helper, measure reset time on the recording laptop, and capture a fresh-clone demonstration. The helper has passed shell syntax review but its manual seal/tamper/restore sequence is not yet recorded. Repository-owner branch protection and required CI checks still need the owner to enable them.
