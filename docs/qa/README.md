# Task 3 validation evidence

The database/seed pipeline is implemented on `testing/database-migrations`, PR #12.

## Verified milestone

Commit `1979923f27bd643e77bfc032f39098d6e4ab94d6`, GitHub Actions run `43619875616`:

- Python generator: seven tests passed (multiplier/flooring boundaries, overrides, quoting, invalid rating, invalid times, self-assignment, missing skills).
- Dev and demo seed CI both passed: regenerated files match, Flyway loads the data, Hibernate accepts the mappings, all 18 passwords match, all 212 incident priorities and override explanations match the Java engine.
- SQL data checks passed: 200 closed/12 staged counts, 180 ratings, priority distribution, chronological audit chains, service-specific SLA dates, valid assignee skills, technician load, three correlated incidents, no open Payment, and audit UPDATE/DELETE/TRUNCATE rejection.
- Schema-only backend check and frontend production build passed.
- Existing frontend test failure remains tracked by issue #11.

Final verified implementation commit `af1fa3a699cbfac517d9f88f649a199e55b01b43`, Actions run `43621082128`: all six jobs passed. This includes 17 schema-only backend tests (plus the two seed compatibility tests in dev/demo jobs), three frontend tests, 40 real API smoke requests, 38 Postman requests with 83 passing assertions, fresh Docker startup, database integrity, and a snapshot/mutate/restore round trip. Seven Python generator tests run in each seed job. The frontend selector/cleanup issue is fixed in this branch; issue #11 can close when the PR merges.

## The required functional cases

`test_cases.csv` records the 26 handbook cases and their expected outcomes. The current matrix records seven PASS, nine PARTIAL, and ten NOT_RUN cases after the first automated workflow run. PASS may be a unit-level case where the handbook scenario is a domain boundary. PARTIAL explicitly identifies checks still required. Replace a status only after executing its complete scenario and attach the commit, date and output/screenshot. Smoke checks that overlap part of a case do not count as completion of that case.

Known integration details: the Java backend uses TF-IDF defaults for similarity rather than the handbook's original embedding thresholds. Confirm expectations for T16 against the actual engine and document the difference. The frontend's predefined demo buttons use mock tokens; type real seeded credentials to test the backend.

## Demo dry run

1. Reset the disposable demo project. Open frontend and mail catcher.
2. Log in with `employee1@iitsm.demo`, `tech1@iitsm.demo`, and `asha.rao@iitsm.demo`, password `Demo@1234`.
3. Check there are no open Payment incidents; report a fresh Payment incident with impact 5, urgency 5, 150 users.
4. Confirm P1, service-specific SLA deadlines, assigned technician, audit trail and notifications. Use the actual assignee account for acknowledge/start.
5. Request more information, reply as reporter, resolve with meaningful notes, verify, close and rate.
6. Reset; exercise an unacknowledged incident and the demo timers with the backend clock controls. Confirm each escalation is recorded once.
7. Reset again before recording; a staged timestamp that was close to its warning can move past that point while setting up.

## Bug report fields

Record title, reproduction, expected result, actual result, evidence, commit, date and reporter. Label by area and severity and assign to the relevant owner. Do not merge while required checks fail. Branch protection and the project board require repository-owner settings and are not configured by these files.
