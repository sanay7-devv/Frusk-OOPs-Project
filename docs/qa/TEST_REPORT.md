# Task 3 test report

Baseline T01–T26 evidence: 2026-11-14, commit `86096c49aea8ec71cebe4317bbb38af9eb870809`, [successful CI run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624315622). The [Task 3 follow-up run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43736234225) on 2026-11-15 passed all six jobs, including the expanded Postman and security checks, at commit `3bc8ab6`. The [latest main baseline run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44892607485) on 2026-11-21 passed all six jobs at commit `e7623495292e3dcb91858befe0e5862be57a35ce`. The [PR #83 code run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44915764035) passed all six jobs at commit `2f7b4e9d62296109aad1f21a178a289f62db63d2`. The [latest PR #83 run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44917367587) also passed all six jobs at commit `afafedc2e3e82a3a92a011683ca8cec221976dfe`, rerunning T01–T26 and validating the documentation updates. PR #83 merged into `main` on 2026-11-21 as `cdaddef`. The [original PR integration run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624733027) also passed before PR #12 was merged.

## Result

| Measure | Recorded result |
|---|---:|
| Handbook cases T01–T26 | 26 passed, 0 failed in the latest PR #83 CI run |
| Backend tests | PR #83: 62 discovered; 60 passed, 0 failed; 2 demo-only checks skipped in the normal backend job; both seed jobs ran all 62 |
| Frontend tests | PR #83: 45 passed across 9 files |
| Seed generator tests | 7 passed |
| API smoke requests | 40 passed |
| Postman collection | PR #83: 71 requests, 149 assertions passed |
| Security dry run | PR #83: 30 checks passed |
| Browser script-text check | Chromium: title, description and comment stayed literal; no script executed; [CI run and JSON/PNG evidence](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395271) |
| A7 stage-0 load | 10/25/50 concurrency and five-minute mixed profile passed with 0 HTTP errors; [measurements and artifact](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395273) |
| Open blocker bugs at this snapshot | 0 recorded |

The exact expected and observed result for each handbook case is in [test_cases.csv](test_cases.csv). Each row points to the latest successful 2026-11-21 PR #83 run and tested commit. The backend test job and both seed jobs uploaded Surefire reports; the demo job uploaded API, Postman and security evidence. A bug about stale frontend login selectors, issue #11, was fixed by PR #16 and has since been closed.

## Coverage and limits

T01–T04 and T08–T26 use real HTTP, PostgreSQL and controlled test time where appropriate. T05–T07 check priority and assignment boundaries at the domain level. T10 and T16 run against a seeded Docker stack. CI also verifies database migrations, seed integrity, audit immutability, frontend build and snapshot/restore.

The handbook's T16 example gives duplicate/related similarity thresholds of 0.80/0.65. The implemented TF-IDF engine uses **0.55/0.35** (DEC-M12-1). The seeded VPN case returned a duplicate response and its observed match was at least 0.80, so the case passes against both that example and the implemented threshold. These values should be explained in the final PDF.

## Security checks for the report

The automated API requests below ran against the disposable demo stack on 2026-11-21 at commit `afafedc`. The [latest successful PR #83 CI run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44917367587) contains `demo-stack-evidence/iitsm-security-checks.json`; T10 and T16 also have `iitsm-handbook-contracts.json`. Browser rendering was subsequently verified in Chromium in [run 44924395271](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395271); its demo-stack artifact includes the JSON result and screenshot.

| Check | Request and input | Observed result | Date and evidence |
|---|---|---|---|
| Cross-user incident access | Employee2 `GET /incidents/{employee1IncidentId}`; employee2 `POST /incidents/{id}/acknowledge` | 404 `INCIDENT_NOT_FOUND`; 403 `UNAUTHORIZED_OPERATION` | 2026-11-21, run 44917367587 security JSON; T18 |
| Admin authorization and audit | Employee1 `GET /admin/users`; admin `GET /audit?actorId={employee1Id}&action=ACCESS_DENIED` | 403 and a recorded `ACCESS_DENIED` row | 2026-11-21, run 44917367587 security JSON; T17 |
| Invalid and expired tokens | `GET /auth/me` with garbage token; advance demo clock 16 minutes, then use old employee token | 401 `TOKEN_INVALID`; 401 `TOKEN_EXPIRED` | 2026-11-21, run 44917367587 security JSON; T19 |
| Script text as data | `POST /incidents` with `<script>alert(1)</script>` in title and description; add the same text as a comment | API returned unchanged JSON. Chromium displayed the title, description and comment as literal text; no alert executed. | 2026-11-21, API run 44917367587; Chromium run 44924395271, JSON and screenshot artifact |
| Input limits and upload | Title 201 chars, description 5001, comment 4001, password over 72 UTF-8 bytes; 6 MB upload and executable | 400 `VALIDATION_FAILED` with matching field errors; invalid uploads rejected | 2026-11-21, run 44917367587 security JSON; T10 contract JSON |
| Lockout and rate limiting | Five wrong passwords, then correct password; repeated login for one address/email | 423 `ACCOUNT_LOCKED`; 429 `RATE_LIMITED` with `Retry-After` | 2026-11-21, run 44917367587 security JSON; T20 |

## Case evidence index

The 26 rows in [test_cases.csv](test_cases.csv) give the scenario, expected and actual result, date, tested commit and CI run. For T01–T04, T08–T09, T11–T15 and T17–T26, inspect the `HandbookIntegrationTest` Surefire XML in the backend test artifact of the [latest 2026-11-21 PR #83 run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44917367587). T05–T07 are covered by `PriorityEngineTest` and `EligibilityFilterTest` in that artifact. T10 and T16 are real-HTTP checks in `iitsm-handbook-contracts.json` in the demo-stack artifact. The report uses CI logs and downloadable test outputs as evidence; individual screenshots for each case have not been captured.

## Additional regression coverage on this branch

The Task 3 changes merged by PR #83 add backend coverage for tokenizer/TF-IDF similarity, keyword category and intake fallback, SLA risk factors, permission unions, escalation boundaries, successful incident state transitions, exception mappings and the validation error response. Frontend coverage includes MFA errors, report drill-downs and filters. CI recorded 62 backend tests (60 passed, 2 demo-only skips in the normal job) and 45 frontend tests; T01–T26 also passed in the backend and demo-stack suites.

The handbook's R11 unit-test classes are present and passed in PR #83 CI. Remaining manual work is listed in `TESTING_WORK_LEFT.md`; the recording-laptop reset, team rehearsal and final video are not measured by CI.

### Frontend test inventory

The 45 frontend tests span nine files and passed in the PR #83 CI run:

- `auth-flow.test.tsx` — sign-in routing, authentication flow, and rejection of empty or malformed credentials before an API call.
- `incident-ui.test.tsx` — status labels, SLA countdown states and colors.
- `remaining-screens.test.tsx` — report, audit, account-security and problem-screen interactions, plus a rendered incident-priority filter check that verifies the URL and server request.
- `features/admin/config/configMeta.test.ts` — configuration values and grouping.
- `features/admin/servicegraph/layout.test.ts` — service-graph layout.
- `features/admin/simulator/validation.test.ts` — simulator input validation and request conversion.
- `features/admin/tickets/filters.test.ts` — ticket filter query parsing.
- `features/admin/users/techForm.test.ts` — technician form validation and data conversion.
- `features/lead/shared/violationsCsv.test.ts` — safe CSV export values.

### A7 stage-0 load evidence

The [successful disposable-runner job](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/44924395273) ran at commit `b14d229` on 2026-11-21. Incident count rose from 212 to 1,543. Creation and read/report requests had no HTTP errors:

| Concurrency | Create p50 / p95 (ms) | Read/report p50 / p95 (ms) |
|---:|---:|---:|
| 10 | 460.45 / 571.47 | 57.76 / 86.97 |
| 25 | 546.86 / 670.08 | 78.86 / 109.66 |
| 50 | 842.92 / 1,020.09 | 114.17 / 164.81 |

The five-minute mixed profile completed 3,683 transactions with no HTTP errors. It sampled backend CPU at 316.54% peak and memory at 754.5 MiB peak; the disposable create limit was restored successfully. These stage-0 measurements do not cover a 10,000- or 100,000-incident database. See [SCALING.md](../../backend/docs/SCALING.md) for the mix and limitations.

## Lessons and next checks

A green Linux/UTC CI run alone did not prove the suite works on another laptop: the app startup test assumed a local PostgreSQL service, and Spring tests could inherit the host time zone. The Task 3 follow-up branch moves startup tests to disposable Testcontainers PostgreSQL and fixes their time zone to UTC. The added CI report artifact preserves failed backend test output for review.

The expanded Postman folders and security dry run passed against the disposable CI stack. Before the final recording, follow [DEMO_RUN_SHEET.md](DEMO_RUN_SHEET.md), visually confirm script text is never executed in the browser, exercise the sealed-audit tamper helper, measure reset time on the recording laptop, and capture a fresh-clone demonstration. CI verifies the helper's intact → altered → restored sequence; a manual recording-day rehearsal is still needed. Repository-owner branch protection and required CI checks still need the owner to enable them.
