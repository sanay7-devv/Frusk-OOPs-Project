# Explaining my Task 3 work

My responsibility is Testing and DevOps: make the project reproducible, provide realistic fictional test data, test the required behavior, and record evidence of failures as well as successes.

## Database migrations

A migration is a numbered database change. Flyway runs each migration once and records its checksum. This lets another developer start the same database without manually creating tables. V1-V6 establish the original schema; V7 adds the remaining handbook tables, relationships, indexes and append-only audit protection. V8 supplies the audit-sealing tables required by the newer backend. New corrections use new migration files so existing databases can upgrade safely.

## Seed data

Seeds populate the schema with fictional examples: 18 accounts, 200 historical incidents, 180 feedback entries and 12 staged incidents. They demonstrate roles, assignment, priority, SLA rules and report history. The Python generator produces the SQL reproducibly. SQL checks verify relationships and dates; Java checks confirm that passwords and priority calculations agree with the actual backend. Demo-only timer overrides live separately from ordinary data.

## Tests

Unit tests isolate calculations, including priority boundaries, assignment eligibility, weighted workload and SLA pause arithmetic. Integration tests start the real backend on a random port and send real HTTP requests against a disposable PostgreSQL container. Each case creates its own fictional accounts, catalog entries and incident state.

A controlled test clock advances time instantly. It verifies token expiry, the 15-minute login lockout, the seven-day reopening limit, SLA warnings and escalation without waiting in real time. It does not change the production clock. The simultaneous-update test sends two edits using the same version and checks that one succeeds while the other receives a conflict; this prevents silent lost updates.

The test matrix maps results to T01-T26 from the handbook. A successful pipeline does not by itself prove every handbook case passed: any nonblocking contract checks and unresolved failures must be stated separately in the matrix.

## DevOps

Docker Compose starts the backend, frontend, PostgreSQL and a local mail catcher together. Reset recreates the disposable demo data. Snapshot and restore allow a demonstration to return to a known state. The automated round trip changes an account after taking a snapshot, restores it, and verifies that the original account and database checks return.

GitHub Actions runs backend tests, frontend tests, the frontend build, dev seed checks, demo seed checks, and a complete Docker/API/Postman workflow. Evidence is retained in job logs and uploaded reports. The Postman workflow uses real login tokens and follows an incident through resolution, verification and closure.

## Short presentation answer

“I built the Testing and DevOps setup. It creates and checks the database and fictional demo data, runs unit and real-API tests, and automates the project startup and snapshot/restore workflow. I used a controlled clock to test time-sensitive rules quickly and a 26-case checklist to distinguish passing behavior from backend issues. My changes are reviewed through a separate branch and pull request.”
