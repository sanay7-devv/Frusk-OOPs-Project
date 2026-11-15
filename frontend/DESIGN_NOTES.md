# Frusk service portal

The operational interface uses neutral surfaces, restrained blue accents and system typography. Incidents and the global audit ledger have one table view. Existing reporting, ticket creation, assignment, permissions, Google sign-in, registration and route aliases are preserved.

## Focused overview

The administrator dashboard replaces the previous KPI/chart section with four counts, a status distribution, active-priority bars and a service workload table. These use the incident records already loaded by the dashboard. A scope label identifies when the loaded records are only part of the full dataset. Completed includes RESOLVED, VERIFIED and CLOSED; awaiting-response incidents remain active. Unclassified priority stays visible. Service groups use service IDs, and SLA breaches use the recorded SLA state. No resolution times or SLA success rates are invented. Tied backlogs are described explicitly.

Team workload and recent activity are available in a collapsed secondary section. The global scroll meter, floating animation toggle, repeated promotional headers, duplicate card/table switches and alternate administrator ticket view were removed. Employee report previews, filters and pagination remain. Sign-in demo roles are collapsed by default.

## Optional room

The interactive workshop is collapsed by default and loads only when opened. It retains drag rotation, accessible rotate/zoom/reset buttons and help-desk/ticket-rack/cabinet stations. Desktop uses the object hotspots; mobile keeps labelled station shortcuts. Cabinet files load the latest six incidents from the existing store/API. Administrators can follow a selected file's audit trail; other roles stay within their workspace. Escape closes the station and restores focus. Room geometry is original code inspired by UniVault's spatial navigation.

## Verification and scope

Production build and frontend checks cover role-login navigation, laptop stage controls, room incident/audit mapping and retry states, employee table previews, and analysis calculations. Calculation cases include verified completion, waiting/unassigned work, unclassified priority, service identity, SLA violations and empty datasets. Browser review uses labelled demo sessions because the live backend is unavailable locally.

PR #18 was already closed without merging and is left closed. No backend/database changes or deployment are included. Run `npm ci` and `npm run dev` in `frontend` for local review.
