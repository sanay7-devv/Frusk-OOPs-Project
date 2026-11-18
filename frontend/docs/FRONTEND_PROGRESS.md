# Frontend: who is doing what

> For Sanay and everyone helping on `frontend/`. **Read this before you start an item** from `FRONTEND_WORK_LEFT.md`, and add yourself to "In progress" when you start, so nobody does the same work twice.
> The full item list (with what is done and what is left) stays in `frontend/docs/FRONTEND_WORK_LEFT.md`. This page only says **who** owns **which files/areas** right now and what each person has finished.

Last updated: 2026-11-18

## 1. Where the frontend stands

| | |
|---|---|
| Code checked | `main` after helper PRs #36 to #39 (2026-11-18), on top of `50794aa` "30% done" (Sanay) |
| Build | `tsc --noEmit` 0 errors, `vite build` passes (one large chunk warning), `npm test` 3/3, CI green on every merged PR |
| Checklist | **283 of 636 done (44%)**, 353 open of which 67 partly done. Was 247 after the re-check of `50794aa`; the helper PRs added 36. |

## 2. Done by Sanay (do not redo)

From commits `1f351c2` (PR #15/#16), `1ea86cc` (new design and theme) and `50794aa` (30% done), checked in the code:

- **Mocks and fakes removed everywhere in the api layer**: no `mock-` tokens, `SEED_INCIDENTS`, `MOCK_*`, `PREDEFINED_*`, silent `catch { return mock }`, fake Google chooser or impersonation. Writes in `api/admin.ts` now surface real errors.
- **Contract fixes**: `minEscalationLevel`, `reporterId`, `WITHDRAW`, `BUSY`, `source: EMBEDDING`, SLA-risk levels, typed comments/history, category tree flattened, reassign needs technician + reason (min 10), Escalations uses `/reassign`, technician payload with `experienceLevel`/`maxLoad`, categories send `parentId`/`requiredSkillIds`.
- **Employee**: Home, My incidents and incident detail on the real API (error states, realtime keys, withdraw on `WITHDRAW`, verify → rating, 10-char reasons); Report form with live suggestions, real attachments upload, known-outage banner + join, priority what-if, duplicate 409 handling.
- **Shared**: Notifications fully on the API (list, read, read-all, reply, verify, preferences); Login with real Google button only; Register with redirect and password rule; AppShell telemetry and fake impersonation removed; nav Workbench link fixed; `RootRedirect` waits for loading; `useRealtime` invalidates the employee/tech/lead/admin keys.
- **Technician / lead**: Workbench timeline shows real audit text, major/problem/duplicate shown; workload duplicate key fixed; TeamQueue only CLASSIFIED, correct invalidation keys, routes to `/tech/incidents/:id`; Escalations server-filtered.
- **Admin**: incident detail comments real and actions gated by `allowedActions`; Config saves only changed keys and Reset works; audit log links incidents by `incidentCode`; Tickets uses `minEscalationLevel`, real reassign errors.

## 3. In progress (claimed, do not start these)

Two areas claimed (round 2, 2026-11-18). To claim an area, add a row here (area, who, branch, files it changes, checklist items, status) before you start, and keep shared files (`routes/AppRoutes.tsx`, `layouts/navConfig.ts`, `layouts/AppShell.tsx`, `api/types.ts`, `utils/errors.ts`, `theme/theme.ts`) to a few added lines.

| Area | Who | Branch | Files it changes | Checklist items | Status |
|---|---|---|---|---|---|
| Technician screens: server-driven SLA clocks and bug fixes | helper (fe-tech-sla) | `frontend/tech-sla-fixes` | `features/technician/TechQueue.tsx`, `TechWorkbench.tsx`, `TechWorkload.tsx`, `components/SlaCountdown.tsx` | F0 L388, F1, F2, F3 SLA and bug items (bugs 8-12, 15, 16, 18) | building |
| Admin Dashboard on real data (`/reports/overview`, `/dashboard/live`) | helper (fe-dashboard) | `frontend/dashboard-real-data` | `features/admin/Dashboard.tsx`, new files under `features/admin/dashboard/`, new `api/dashboard.ts` | G2, G15 bug 7 | building |

## 4. Done by helpers

Each piece was reviewed against the contract and the backend code, built together with the others, and merged after green CI. None has been clicked through against a running backend yet (do that before the video).

| Piece | PR | What it adds | Checklist |
|---|---|---|---|
| Audit log: Verify & Seal (S3) | [#36](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/36) | `api/audit.ts`, `AuditSealPanel.tsx`: "Verify chain" (intact / first problem), "Seal now" (new seal or "nothing new"); audit log with server paging, filters (action, actor, incident, from/to), expandable rows with previous → new state, explicit action colours | G12, G14 Audit Verify + Seal: 8 ticked, 4 partly |
| Account security | [#37](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/37) | `/forgot-password`, `/reset-password` (token removed from the address bar), two-step login (`MFA_REQUIRED` → 6-digit code), `/account/security` (TOTP set up, enable, disable), account menu on the user pill, new error codes and `Retry-After` seconds, Register field errors fixed | E5, E6, E8, E9, summary: 6 ticked, 5 partly |
| Problems / Major Incident Mode | [#38](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/38) | `api/problems.ts`, `features/problems/`: list + detail for leads (`/lead/problems`) and admins (`/admin/problems`), linked incidents, root cause, remove incident (admin), resolve whole problem, recurring problems; the fake War Room in TechQueue replaced by "Open problem"; Workbench problem chip links to it | F1, F4, F5, F6, G7, G14: 3 ticked, 7 partly |
| Reports on `/reports/*` | [#39](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/39) | `api/reports.ts`, `features/admin/reports/`: shared date range, 4 KPI cards, created vs resolved, SLA compliance by priority/service/technician, priority donut, categories, services, technician workload, coverage risk, SLA violations, CSV and PDF export (with real error messages) | G13, G14: 19 ticked, 2 partly |

Backend change made for these (with the lead's approval): CORS now exposes `Retry-After` ([#35](https://github.com/sanay7-devv/Frusk-OOPs-Project/pull/35), DEC-119).

## 5. Notes for the team

- Commit `50794aa` went straight to `main` without a pull request. Please use a branch + PR (the team rule) so others can see the change before it lands.
- `50794aa` also changed `deploy/backend.Dockerfile` (CRLF fix for `mvnw`, runtime image JRE → JDK). That file belongs to Testing/DevOps; tell them, and say why the JDK image is needed (it makes the image larger).
- Bug found in the re-check and fixed in #37: `Register.tsx` mapped server `fieldErrors` as an object, but the contract sends an array `{field, message}`, so field errors never reached the form.

## Changelog

| Date | Change |
|---|---|
| 2026-11-18 | Page created. Checklist re-checked against `50794aa`; four helper pieces claimed (audit seal, reports, problems, account security). |
| 2026-11-18 | Helper PRs #36 to #39 merged after review and green CI; section 3 emptied, section 4 lists them; checklist now 283 of 636 done. |
| 2026-11-18 | Round 2 claimed: technician SLA fixes, admin Dashboard on real data. |
