# Task 3 test report

Evidence snapshot: 2026-11-14, commit `86096c49aea8ec71cebe4317bbb38af9eb870809`, [successful CI run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624315622). The later [Task 3 PR integration run](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/runs/43624733027) also passed before PR #12 was merged.

## Result

| Measure | Recorded result |
|---|---:|
| Handbook cases T01–T26 | 26 passed, 0 failed |
| Backend tests in seeded jobs | 40 run; 38 passed, 2 seed-only checks skipped in the schema-only job |
| Frontend tests at this snapshot | 3 passed |
| Seed generator tests | 7 passed |
| API smoke requests | 40 passed |
| Postman collection | 38 requests, 83 assertions passed |
| Open blocker bugs at this snapshot | 0 recorded |

The exact expected and observed result for each handbook case is in [test_cases.csv](test_cases.csv). That table now records the run date and commit. CI run links contain the job results; the Postman and smoke reports are uploaded as demo-stack evidence. A bug about stale frontend login selectors, issue #11, was fixed by PR #16 and has since been closed.

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
| Read another user's incident by changing its ID | Not separately recorded yet | Follow-up security dry run |
| Script text in incident title, description and comment | Not separately recorded yet | Follow-up security dry run |
| Oversized title, description, comment, password and upload | 6 MB upload rejected by T10; remaining field limits not separately recorded | T10; follow-up security dry run |
| More than ten login attempts per minute | Not separately recorded yet | Follow-up security dry run |

## Lessons and next checks

A green Linux/UTC CI run alone did not prove the suite works on another laptop: the app startup test assumed a local PostgreSQL service, and Spring tests could inherit the host time zone. The Task 3 follow-up branch moves startup tests to disposable Testcontainers PostgreSQL and fixes their time zone to UTC. The added CI report artifact preserves failed backend test output for review.

Before the final recording, run the security dry run above, complete the remaining Postman workflow folders, measure the reset on the recording laptop, and capture a fresh-clone demonstration. Repository-owner branch protection and required CI checks still need the owner to enable them.
