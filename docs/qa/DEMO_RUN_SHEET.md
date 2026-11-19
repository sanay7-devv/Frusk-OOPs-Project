# Task 3 recording and dry-run sheet

Use the disposable local demo stack. Fill the measurement fields on the recording laptop. CI evidence does not measure that laptop or replace the screen recording. Reset before each take with `bash db/tools/reset-demo.sh`.

## Recording-day preflight

1. From a fresh checkout, run `time bash db/tools/reset-demo.sh` and record first-build and warm-reset times separately. Confirm frontend `http://localhost:3000`, backend `http://localhost:8080/actuator/health`, and mail catcher `http://localhost:8025`.
2. Type real seed credentials into the form: `employee1@iitsm.demo`, `employee2@iitsm.demo`, `asha.rao@iitsm.demo`, password `Demo@1234`. For technician steps, use the account actually assigned to the incident. The preset mock-login buttons do not test backend login.
3. Confirm 18 fictional accounts, 200 historical and 12 staged incidents, and no open Payment incident. Check mail catcher receives the demo notifications.
4. Confirm demo timer settings: SLA monitor 30 seconds, escalation monitor 15 seconds with one minute per level, and auto-verification about two minutes. Verify the configured AI key works or show the `KEYWORD` fallback source. Record whichever path actually ran.

## Segment 1 — employee reports, system assigns

As employee1, raise a fictional Payment outage with impact 5, urgency 5 and 150 affected users. Show score 187, P1, ASSIGNED, the 3-minute response and 20-minute resolution deadlines, assigned technician, notification and initial audit entries. Record the incident code: ______.

## Segment 2 — technician and reporter complete the lifecycle

As the assigned technician, acknowledge and start work. Request information: “Which synthetic checkout transaction failed?” As employee1, reply: “The fictional campus fee checkout failed at confirmation.” As technician, resolve with a synthetic root cause, notes and steps. As employee1, verify. As admin, close. Show each state change and one audit entry per transition.

## Segment 3 — major incident mode

As admin, start the demo outage drill with Database as root service. Open the problem record and root-cause view; show the linked incidents and Database as common upstream cause. As employee2, view the known outage and join it. The joined incident remains ASSIGNED until the grouped outage is resolved. Resolve the problem as admin and show linked incidents reaching RESOLVED.

## Segment 4 — administrator and reports

As admin, open reports. Show overview total and service, priority and category breakdowns; the distributions should sum to the overview total. Show trend, SLA compliance, technician workload and coverage risk. Export CSV and show the file opens safely (a formula-like title is prefixed in the export). Open the audit list and show the incident transitions from segments 1–3.

## Segment 5 — security and sealed audit

Run security checks on a separate fresh reset or after every other segment: `python3 deploy/security_checks.py` deliberately locks an account and advances the demo clock by 16 minutes. Expect the JSON evidence to show cross-user 404/403, admin 403 with `ACCESS_DENIED`, invalid and expired token 401, field-validation 400, lockout 423, and rate limit 429 with `Retry-After`.

For the browser script-text check, raise an incident with `<script>alert(1)</script>` in title and description and add it as a comment. Open the incident detail. Record whether the literal text appears and whether any alert executes. The API test proves storage and JSON response only; mark browser behavior PASS only after seeing it.

For the audit seal demo, after generating audit entries call `POST /api/v1/audit/seal` as admin, then `GET /api/v1/audit/verify`; expect `intact: true`. Run `bash db/tools/tamper-demo-audit.sh tamper`; verify again and expect `intact: false`. Run `bash db/tools/tamper-demo-audit.sh restore`; expect `intact: true` again. The helper only targets `iitsm-demo` and refuses a database without successful demo-only V200. CI tests this round trip, but repeat it by hand before recording.

## Evidence to fill, never infer from CI

| Item | Result / link |
|---|---|
| Fresh checkout commit and second laptop | |
| Laptop, OS, Docker version | |
| First build time | |
| Warm reset time; under two minutes? | |
| Mail catcher, timers, AI source | |
| Five segments completed | |
| Browser script-text result | |
| Security/Postman CI run | |
| Screen recording | |
| Reviewer and date | |

## Dry-run log

Run twice each week and before every take; add dated rows rather than replacing old results.

| Date | Commit | Laptop | Segments 1–5 | Reset time | Defect / issue link | Runner |
|---|---|---|---|---|---|---|
| | | | | | | |

Repository-owner branch protection and deployment access are team settings; record their status separately from Task 3 test results.
