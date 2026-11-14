# Task 3: database and synthetic demo data

All accounts, incidents, organisations, and feedback in this dataset are fictional.

## What is included

- 18 users, including two administrators, a team lead, five technicians, eight employees, and two additional multi-role users. Everyone holds EMPLOYEE.
- All demo passwords are `Demo@1234`, stored as a shared cost-10 BCrypt hash; email addresses use `@iitsm.demo`.
- Eight services, twelve categories, skills, dependencies, global and Payment-specific SLAs, and current backend configuration defaults.
- 200 CLOSED/VERIFIED incidents with audit history and 180 feedback entries. Priority counts: P1 10, P2 40, P3 90, P4 60. Forty recurring issues have five differently worded reports each.
- Twelve recent fixtures: a three-incident Network problem cluster, an open VPN near-duplicate candidate, assigned/in-progress/pending-info/resolved states, a resolution warning candidate and a breached SLA. No open Payment incident. Tech4 is AWAY; tech5 has weighted load 10/10.

## Rebuild and load

From the repository root:

```sh
python3 db/tools/prepare_seeds.py
python3 db/tools/test_seed_generator.py
```

The preparation command regenerates CSV/SQL and copies canonical `db/` SQL to backend resources. It connects to no database. Review generated diffs before committing them.

Flyway locations already configured by the backend:

- Schema/test: `classpath:db/migration` (V1–V7), no demo users.
- Dev: schema plus `classpath:db/seed` (V100–V102).
- Demo: schema, seed, plus `classpath:db/demo` (V200).

V100 inserts reference data; V101 inserts historical incidents; V102 stages recent cases. They run once on a fresh database through Flyway and are recorded in its history table. V200 shortens timers only for demo. A dev database used for a long time will have old staged timestamps: use a fresh disposable demo database when recording.

After a fresh load, run `psql -v ON_ERROR_STOP=1 -f db/checks/verify.sql` using your local database connection settings. CI runs this automatically for both dev and demo seed locations, with schedulers disabled during validation.

V1–V6 were already exercised in CI, so their checksums are preserved. V7 adds missing handbook tables, the problem foreign key, foreign-key indexes, and the audit UPDATE/DELETE/TRUNCATE rejection triggers. Its name and numbering deliberately reflect an additive fix rather than rewriting an applied migration.

## How to explain your work

1. Migrations create the database structure; seed files fill it with a repeatable demonstration dataset.
2. The CSV contains human-readable incident content. The generator calculates the score, priority, deadlines, timestamps, audit events and feedback instead of entering those independently.
3. Score is impact × urgency × service criticality × affected-user multiplier, rounded down. Users 1–9 use 1; 10–100 use 1.25; 101+ use 1.5. Score bands are 60/30/10, with Security and Payment overrides.
4. Service-specific SLA rows take precedence over global defaults. Historical timestamps and violation flags follow those deadlines.
5. Database checks prove the data has the expected counts and relationships. Backend context startup verifies the schema matches the Java model. Neither check alone proves all 26 functional test cases.

## Demo accounts

See `docs/content/seed_accounts.csv`. Useful accounts: `employee1`, `tech1`, `priya.nair`, `asha.rao`, `rahul.mehta`, `karthik`, `neha` (append `@iitsm.demo`).

Demo timer overrides: SLA monitor 30 seconds, escalation monitor 15 seconds, escalation one minute per level, auto-verification after 0.033 hours with a 30-second monitor.

Synthetic fixtures demonstrate starting states. The seeded problem grouping does not prove automatic correlation, and the VPN candidate's duplicate score must still be measured against the running intelligence engine. Embedding rows are deliberately absent. These data files do not implement missing backend features.

## Remaining Task 3 deliverables

The 26 functional cases with evidence, complete API collection, Compose stack, reset/snapshot/restore tooling, and full QA report remain separate work. No pass status is claimed for cases not executed. Schema and seed CI evidence is available in PR #12.
