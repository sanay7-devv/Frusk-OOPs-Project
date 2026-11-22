# ReSolv Frontend — Raise it. Track it. Resolve it.

A modern, role-based single-page application (SPA) for the ReSolv campus service desk. Designed following enterprise ITIL principles, this frontend provides separate workspaces for employees, technicians, team leads, and administrators.

---

## 🛠️ Technology Stack

- **Core Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool & Bundler**: [Vite](https://vitejs.dev/)
- **UI & Component System**: [Material UI (MUI v5)](https://mui.com/) + Emotion
- **Server State & Caching**: [TanStack React Query v5](https://tanstack.com/query/latest)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/) (with JWT auto-refresh interceptors)
- **Real-Time Communication**: [@stomp/stompjs](https://stomp-js.github.io/) (STOMP over WebSocket + polling fallback)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Visualizations**: [ReactFlow](https://reactflow.dev/) (service graphs) & [Recharts](https://recharts.org/) (reports)
- **Testing**: [Vitest](https://vitest.dev/) + React Testing Library + JSDOM

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### 2. Environment Setup
Create a `.env` file from the example configuration:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
```

### 3. Installation & Running
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm run test

# Type-check and build for production
npm run build
```

The application runs locally on `http://localhost:5173`.

---

## 🏛️ Core Architectural Principles

### 1. Multi-Workspace Architecture
Users can hold multiple roles simultaneously (e.g. an employee who is also an administrator). The frontend supports 4 distinct workspaces:
- **`employee`** (`/employee/*`): Report incidents, track tickets, view notifications.
- **`tech`** (`/tech/*`): Personal ticket queue, workbench, and workload metrics.
- **`lead`** (`/lead/*`): Team queue management and escalation resolution (assigned to technicians with `escalationLevel: 1`).
- **`admin`** (`/admin/*`): System dashboard, incident registry, user management, service catalog, dependency graphs, SLA policies, categories, and audit logs.

Users with access to multiple roles can switch workspaces instantly using the dropdown selector in the top navigation bar.

### 2. Server-Driven Lifecycle & Security Rules
- **Lifecycle actions come strictly from the server**: Action buttons (such as *Acknowledge*, *Resolve*, *Reopen*, *Escalate*) are rendered solely based on the `allowedActions` array returned by the API for each incident. The frontend never hardcodes or computes state transition logic.
- **Never compute SLA or priority on the client**: Deadlines, SLA status (`OK`, `WARNING`, `AT_RISK`, `VIOLATED`, `MET`, `PAUSED`), and priority scores (`P1`–`P4`) are computed strictly by the backend. The client only displays these values and counts down toward server-provided deadlines.
- **Isolated API layer**: Components must never invoke `axios` directly; all HTTP calls are encapsulated within `src/api/`.

### 3. Token & Authentication Strategy
- **Access Token**: Stored **in-memory only** to prevent XSS-based token theft.
- **Refresh Token**: Stored in `localStorage` and sent when restoring sessions or refreshing expired access tokens.
- **Axios Interceptor**: Automatically catches `401 TOKEN_EXPIRED`, fetches a fresh access token (with token rotation), updates authorization headers, and transparently retries the original request.

### 4. Real-Time Updates & Cache Synchronization
- A single **STOMP WebSocket** connection is initiated upon login:
  - Subscribes to `/user/queue/notifications` for incident events and notifications.
  - Subscribes to `/topic/dashboard` for live administrative dashboard metrics.
- When an event arrives, it triggers a Toast notification and **invalidates React Query cache keys** (such as `['unread']` and `['incidents']`), triggering automatic data refetches without page reloads.
- If the WebSocket disconnects, the client gracefully falls back to polling `/notifications/unread-count` every 10 seconds.

---

## 📁 Directory & File Guide

```
frontend/
├── index.html                   # HTML mount template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript compiler configuration
├── vite.config.ts               # Vite configuration
├── .env.example                 # Environment variable templates
└── src/
    ├── main.tsx                 # App bootstrap and context providers
    ├── App.tsx                  # Root component (WebSocket init + routes)
    ├── api/                     # HTTP client and backend communication
    ├── auth/                    # Auth context, session restore, route guards
    ├── components/              # Shared UI components
    ├── features/                # Workspace views and page screens
    ├── layouts/                 # AppShell and navigation configuration
    ├── realtime/                # STOMP WebSocket and polling fallback
    ├── routes/                  # Central React Router definitions
    ├── theme/                   # Material UI theme, priority & status colors
    └── utils/                   # Error translation and Zod form schemas
```

---

### Detailed Breakdown

#### 🔹 App Root
- **`src/main.tsx`**: Bootstraps the React DOM tree and sets up the global context hierarchy:
  1. `<ThemeProvider>` & `<CssBaseline>` (MUI styling and CSS reset)
  2. `<QueryClientProvider>` (React Query state and cache manager)
  3. `<ToastProvider>` (Global alerts and snackbars)
  4. `<BrowserRouter>` (URL routing)
  5. `<AuthProvider>` (User session and active workspace)
- **`src/App.tsx`**: Mounts the `useRealtime()` WebSocket hook and renders `<AppRoutes />`.

---

#### 🔹 `src/auth/` (Authentication & Authorization)
- **`AuthContext.tsx`**:
  - Manages `user`, `workspace`, `workspaces`, and `loading` states.
  - Restores user sessions on page reload using the stored refresh token.
  - Exposes `signIn`, `signOut`, and `setWorkspace`.
  - Determines accessible workspaces via `workspacesFor(user)`.
- **`RequireRole.tsx`**:
  - Route guard component (`RequireWorkspace`).
  - Redirects unauthenticated visitors to `/login`.
  - Blocks users trying to view workspaces their roles do not allow.

---

#### 🔹 `src/api/` (Data Access Layer)
- **`client.ts`**:
  - Configures Axios with base URL and authorization headers.
  - Manages in-memory access tokens and localStorage refresh tokens.
  - Contains response interceptor for automatic token refresh on `401 TOKEN_EXPIRED`.
- **`types.ts`**:
  - Central TypeScript interfaces: `CurrentUser`, `IncidentSummary`, `IncidentDetail`, `Resolution`, `PriorityBreakdown`, `SlaState`, `IncidentStatus`, `IncidentAction`, `AppNotification`, and `ApiError`.
- **`auth.ts`**: Endpoints for `/auth/login`, `/auth/register`, `/auth/logout`, and `/auth/me`.
- **`incidents.ts`**: Endpoints for listing, fetching details, creating incidents, executing lifecycle actions (`/incidents/:id/:action`), viewing history, and adding comments.
- **`intelligence.ts`**: Endpoints for AI features: category suggestions, intake parsing, and finding duplicate/similar incidents.
- **`notifications.ts`**: Endpoints for listing notifications, fetching unread counts, and marking notifications as read.

---

#### 🔹 `src/layouts/` (Shell & Navigation)
- **`AppShell.tsx`**:
  - Main application frame for logged-in users.
  - **Top AppBar**: Logo, workspace switcher dropdown, unread notification counter badge, user name, and logout button.
  - **Permanent Left Drawer**: Navigation links customized to the current workspace.
  - **`<Outlet />`**: Renders the matched route content.
- **`navConfig.ts`**: Navigation link definitions mapped per workspace (`employee`, `tech`, `lead`, `admin`).

---

#### 🔹 `src/routes/` (Routing)
- **`AppRoutes.tsx`**:
  - Central route registry.
  - Public routes: `/login`, `/register`.
  - Protected routes (nested inside `<RequireWorkspace>` and `<AppShell>`):
    - **Employee**: `/employee/home`, `/employee/report`, `/employee/incidents`, `/employee/incidents/:id`
    - **Technician**: `/tech/queue`, `/tech/incidents/:id`, `/tech/workload`
    - **Team Lead**: `/lead/team-queue`, `/lead/escalations`
    - **Administrator**: `/admin/dashboard`, `/admin/incidents`, `/admin/incidents/:id`, `/admin/users`, `/admin/services`, `/admin/services/graph`, `/admin/sla`, `/admin/categories`, `/admin/config`, `/admin/escalation`, `/admin/audit`, `/admin/reports`
  - Fallback routes and default redirects.

---

#### 🔹 `src/components/` (Shared UI Components)
- **`ActionButtons.tsx`**: Renders workflow buttons strictly mapped from `allowedActions` (e.g. *Start work*, *Resolve*, *Verify*, *Reopen*, *Escalate*).
- **`PriorityBadge.tsx`**: Color-coded chip for priorities (`P1 Critical`, `P2 High`, `P3 Medium`, `P4 Low`).
- **`SlaCountdown.tsx`**: Real-time timer counting down to server response and resolution deadlines. Handles `MET`, `PAUSED`, and overdue states.
- **`StatusChip.tsx`**: Status indicator pill styling each incident lifecycle stage.
- **`Toast.tsx`**: Global snackbar alert provider and hook (`useToast`).
- **`StateViews.tsx`**: Consistent UI state views: `LoadingState` (skeletons), `EmptyState`, and `ErrorState` with retry.

---

#### 🔹 `src/realtime/` (WebSockets)
- **`useRealtime.ts`**: Manages STOMP connection over WebSocket. Listens to notifications, triggers toasts, invalidates React Query cache, and polls every 10 seconds if disconnected.

---

#### 🔹 `src/theme/` & `src/utils/`
- **`theme/theme.ts`**: MUI light theme definitions and color constants for priorities and statuses matching the design handbook.
- **`utils/errors.ts`**: Maps server error codes (`INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `CONFLICT_OF_INTEREST`, `OPTIMISTIC_LOCK_CONFLICT`, etc.) into clear, friendly error messages.
- **`utils/validation.ts`**: Zod schemas for incident creation and password validation matching server rules.

---

#### 🔹 `src/features/` (Feature Screens)
Contains the screen implementations organized by workspace:
- **`shared/`**:
  - `Login.tsx`: Login form with Zod validation, error handling, and redirection to the user's default workspace.
  - `Register.tsx`: User registration screen.
  - `Notifications.tsx`: Notification list and unread manager.
- **`employee/`**:
  - `EmployeeHome.tsx`, `ReportIncident.tsx`, `MyIncidents.tsx`, `EmployeeIncidentDetail.tsx`.
- **`technician/`**:
  - `TechQueue.tsx`, `TechWorkbench.tsx`, `TechWorkload.tsx`.
- **`lead/`**:
  - `TeamQueue.tsx`, `Escalations.tsx`.
- **`admin/`**:
  - `Dashboard.tsx`, `AllIncidents.tsx`, `AdminIncidentDetail.tsx`, `Users.tsx`, `Services.tsx`, `ServiceGraph.tsx`, `SlaPolicies.tsx`, `Categories.tsx`, `Config.tsx`, `EscalationSettings.tsx`, `AuditLog.tsx`, `Reports.tsx`.

---

## 📌 Coding Conventions & Checklist

When developing or extending this frontend:
1. ✅ **Never call `axios` in components**: Add all network requests in `src/api/`.
2. ✅ **Render actions from `allowedActions`**: Do not check status strings to decide if an action button is visible.
3. ✅ **Let the backend calculate SLA & Priority**: Display server values only.
4. ✅ **Validate input using Zod schemas**: Ensure client validation matches backend constraints defined in `src/utils/validation.ts`.
5. ✅ **Leverage React Query cache**: Use `useQuery` for fetching and `useMutation` with query invalidation for mutations.
