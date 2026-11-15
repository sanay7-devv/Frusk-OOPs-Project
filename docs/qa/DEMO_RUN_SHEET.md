# Task 3 recording run sheet

Use the disposable local demo stack. This sheet is for the final screen recording and its measured evidence; fill the blanks on the laptop used to record. The CI results establish automated behavior, but they do not measure that laptop or replace the recording.

## Preflight

1. From a fresh checkout, run `time bash db/tools/reset-demo.sh`. Record the elapsed time below. The first build may be slower than a warm reset.
2. Open the frontend at `http://localhost:3000`, backend health at `http://localhost:8080/actuator/health`, and captured mail at `http://localhost:8025`.
3. Sign in by typing real seeded credentials: `employee1@iitsm.demo`, `tech1@iitsm.demo`, and `asha.rao@iitsm.demo` use `Demo@1234`. Use the actual assigned technician account for the lifecycle; it may not be tech1. The preset mock-login buttons do not exercise backend authentication.
4. Check that the seed has 18 fictional accounts, 200 historical and 12 staged incidents, and no open Payment incident. Keep the terminal and browser visible in the recording where useful.

## Three workflows to show

1. **Report and assign:** As employee1, raise a fictional Payment outage with impact 5, urgency 5, and 150 affected users. Show priority score 187, P1, ASSIGNED, the 3-minute response and 20-minute resolution deadlines, the assigned technician, notifications, and the initial audit entries.
2. **Investigate and close:** As the assigned technician, acknowledge, start work, request information, and resolve with a root cause, notes and steps. As employee1, provide the requested information and verify the fix. As admin, close the incident. Show one audit entry for each transition.
3. **Major incident mode:** As admin, start the demo outage drill with Database as root service. Open its problem record and root-cause view. As employee2, view the known outage and join it; the joined incident remains ASSIGNED until the grouped outage is resolved. Resolve the problem as admin and show its linked incidents and audit trail.

Show the admin reports after the workflows: overview totals, service/priority/category breakdowns, trend, SLA, technician workload, coverage, and CSV export. The Postman collection also checks intelligence fallback and notification preferences. The automated security checks cover unauthorized access, validation, lockout, rate limit and token expiry.

## Audit seal demonstration (disposable demo database only)

After generating audit entries, call `POST /api/v1/audit/seal` as admin and then `GET /api/v1/audit/verify`; record the passing result. To demonstrate detection of an altered sealed row, run `bash db/tools/tamper-demo-audit.sh tamper`, repeat verification and record the failure, then run `bash db/tools/tamper-demo-audit.sh restore` and verify that it passes again. The helper refuses a database without the successful demo-only V200 migration. Use a fresh demo reset if the exercise is interrupted.

Run `python3 deploy/security_checks.py` only after other demo actions, or on a separate fresh reset: it deliberately triggers account lockout and advances the demo clock by 16 minutes to check token expiry. CI runs it automatically against the disposable stack.

## Record the evidence

| Item | Recording-day result |
| --- | --- |
| Fresh checkout commit | |
| Laptop, OS, Docker version | |
| First build time | |
| Warm `reset-demo.sh` time | |
| Under two minutes on recording laptop? | |
| Three workflows, reports, audit seal | |
| Security and Postman CI run URL | |
| Screen recording link | |
| Reviewer/date | |

Repository-owner branch protection and any deployment permissions remain owner settings; record their status separately from Task 3 test results.
