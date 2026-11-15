# Frusk service studio

Bauhaus colour and geometry, with rounded bento cards, soft pastel artwork backgrounds and open spacing. The complaint form keeps a quiet background and clear field hierarchy. The shared theme carries the palette into existing technician, lead and administrator views.

## Interactions

- The original SVG laptop changes from report to repair to audit. Drag/swipe horizontally, use the stage buttons, or focus the artwork and press left/right arrow keys. Stage changes stay user-controlled. Reduced-motion settings remove movement.
- Scroll-triggered reveals and short card staggers use IntersectionObserver and the native Web Animations API. Content remains visible if those APIs are unavailable. Geometry drifts around the laptop; the Motion toggle cancels movement, and system reduced-motion preferences disable it automatically. The top edge tracks scroll progress. Observers, animations and listeners are cleaned up on route changes.
- Employee, admin and technician home pages use an original CSS 3D service workshop. Drag to rotate the physical room; keyboard-accessible rotation/zoom/reset buttons provide the same view controls. The help desk leads to reporting or the role’s queue/manager. The ticket rack and record cabinet load the latest six reports on demand from the existing incident store/API. Select a folder to pull it out, see its details, and (for admins) follow the incident-specific audit trail. The cabinet uses vertical file spines; the rack uses readable report cards. Mobile stations remain available below the scene, and cabinet files scroll horizontally. Escape closes the station and returns focus. The room is original code, inspired by the spatial navigation of UniVault, without reusing its artwork or source.
- Navigation has a mobile disclosure, Escape handling, visible focus and a skip link. The sign-in form appears before artwork on phones.
- My incidents and administrator incidents use a searchable, filterable card board with ticket previews. Administrator previews link to the incident audit view.
- Audit search accepts an incident ID or code and filters events by people/system. The API timestamp field is used for live events.
- Routes load separately, keeping the sign-in entrance from downloading every dashboard upfront.

## Data and existing behaviour

The existing predefined demo accounts remain available and are labelled as sample workspaces. Only mock sessions use illustrative timeline events; incident cards use the shared store. The card board shares the newly merged incident store with the existing ticket-management view. Live board requests call `GET /incidents`; incident audit calls `GET /incidents/{id}/history`, resolving a code through the list API first. Existing API permissions remain authoritative. Empty, loading, error and retry states are included.

The latest main branch’s admin settings, register form, Google sign-in integration, ticket management, global audit ledger, route aliases and dashboard API wiring are retained. The card board is an additional view beside Manage tickets; the incident story is an additional view beside All audit events. Existing dashboard and complaint-form behaviours are retained. The Google fallback is explicitly labelled as a demo when no client ID is configured. No backend or database changes are included. The live API was not available locally during visual review; response fields were checked against the backend DTOs.

## Validation

- Production TypeScript/Vite build.
- Existing three role-login navigation tests, with Task 3 cleanup/route assertions retained and the renamed submit button reflected.
- Service-poster stage selection and keyboard cycle tests.
- Workshop tests cover on-demand loading, actual incident-to-audit ID mapping, employee-scoped requests, Escape/focus restoration, and API error/retry without fabricated data.
- Browser review of login, employee/admin home, complaint form, incident filtering/preview, audit navigation, and the actual swipe gesture.
- Responsive review at 390px and 768px widths, including mobile navigation.

Vercel deployment is outside this change. Run `npm ci` and `npm run dev` in `frontend` for local preview.
