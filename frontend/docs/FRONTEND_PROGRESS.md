# Frontend: who is doing what

> For Sanay and everyone helping on `frontend/`. **Read this before you start an item** from `FRONTEND_WORK_LEFT.md`, and add yourself to "In progress" when you start, so nobody does the same work twice.
> The full item list (with what is done and what is left) stays in `frontend/docs/FRONTEND_WORK_LEFT.md`. This page only says **who** owns **which files/areas** right now and what each person has finished.

Last updated: 2026-11-18

## 1. Where the frontend stands

| | |
|---|---|
| Code checked | `main` `50794aa` "30% done" (Sanay, 2026-11-18) |
| Build | `tsc --noEmit` 0 errors, `vite build` passes (one large chunk warning), `npm test` 3/3 |
| Checklist | 247 items done, 389 open (re-checked line by line against the code on 2026-11-18) |

## 2. Done by Sanay (do not redo)

From commits `1f351c2` (PR #15/#16), `1ea86cc` (new design and theme) and `50794aa` (30% done), checked in the code:

- **Mocks and fakes removed everywhere in the api layer**: no `mock-` tokens, `SEED_INCIDENTS`, `MOCK_*`, `PREDEFINED_*`, silent `catch { return mock }`, fake Google chooser or impersonation. Writes in `api/admin.ts` now surface real errors.
- **Contract fixes**: `minEscalationLevel`, `reporterId`, `WITHDRAW`, `BUSY`, `source: EMBEDDING`, SLA-risk levels, typed comments/history, category tree flattened, reassign needs technician + reason (min 10), Escalations uses `/reassign`, technician payload with `experienceLevel`/`maxLoad`, categories send `parentId`/`requiredSkillIds`.
- **Employee**: Home, My incidents and incident detail on the real API (error states, realtime keys, withdraw on `WITHDRAW`, verify → rating, 10-char reasons); Report form with live suggestions, real attachments upload, known-outage banner + join, priority what-if, duplicate 409 handling.
- **Shared**: Notifications fully on the API (list, read, read-all, reply, verify, preferences); Login with real Google button only; Register with redirect and password rule; AppShell telemetry and fake impersonation removed; nav Workbench link fixed; `RootRedirect` waits for loading; `useRealtime` invalidates the employee/tech/lead/admin keys.
- **Technician / lead**: Workbench timeline shows real audit text, major/problem/duplicate shown; workload duplicate key fixed; TeamQueue only CLASSIFIED, correct invalidation keys, routes to `/tech/incidents/:id`; Escalations server-filtered.
- **Admin**: incident detail comments real and actions gated by `allowedActions`; Config saves only changed keys and Reset works; audit log links incidents by `incidentCode`; Tickets uses `minEscalationLevel`, real reassign errors.

## 3. In progress (claimed, do not start these)

Helpers work on their own branches from `main` `50794aa` and open a pull request into `main` after review. Each one adds new files and touches shared files only with a few lines.

| Area | Who | Branch | Files it changes | Checklist items | Status |
|---|---|---|---|---|---|
| Audit log: Verify & Seal (S3), filters, paging | helper (fe-audit-seal) | `frontend/audit-verify-seal` | `features/admin/AuditLog.tsx`, new audit panel/api file, `api/admin.ts` (audit part only) | G12, G14 "Audit Verify + Seal" | PR #36 open, review passed |
| Reports on `/reports/*` with charts and CSV/PDF export | helper (fe-reports) | `frontend/reports-real-api` | `features/admin/Reports.tsx` (rewrite), new `api/reports.ts`, new `features/admin/reports/` | G13, G14 coverage risk / SLA violations list | building |
| Problems / Major Incident screens | helper (fe-problems) | `frontend/problems-major-incident` | new `api/problems.ts`, new `features/problems/`, routes + nav (few lines), small hooks in `TechWorkbench.tsx` (problem link) and `TechQueue.tsx` (War Room button) | F2 L468, F4 L540, F6 L579, G7 L796, G14 Problems | building |
| Forgot/reset password, two-step login, account security | helper (fe-auth-mfa) | `frontend/auth-reset-mfa` | new screens, `api/auth.ts`, `utils/errors.ts`, small changes in `Login.tsx`, `Register.tsx` (field-error bug), `AppShell.tsx` (account menu), routes | E5 L197-199, E6 L211, E8 L235 L241, E9 L255, L330 | PR #37 open, review passed |

**Sanay**: please avoid these files until the PRs above are merged (or tell us and we will rebase on your change). Everything else in `FRONTEND_WORK_LEFT.md` is free.

## 4. Done by helpers

Nothing merged yet.

## 5. Notes for the team

- Commit `50794aa` went straight to `main` without a pull request. Please use a branch + PR (the team rule) so others can see the change before it lands.
- `50794aa` also changed `deploy/backend.Dockerfile` (CRLF fix for `mvnw`, runtime image JRE → JDK). That file belongs to Testing/DevOps; tell them, and say why the JDK image is needed (it makes the image larger).
- Known bug found in the re-check, being fixed by fe-auth-mfa: `Register.tsx` maps server `fieldErrors` as an object, but the contract sends an array `{field, message}`, so field errors never reach the form.

## Changelog

| Date | Change |
|---|---|
| 2026-11-18 | Page created. Checklist re-checked against `50794aa`; four helper pieces claimed (audit seal, reports, problems, account security). |
