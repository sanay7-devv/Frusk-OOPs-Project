# Frontend Improvement & Modernization Roadmap — `Improve.md`

**Target:** Enterprise ITSM Frontend Application (`frontend/src/`)  
**Status:** Architecture Assessment & Future Enhancements  
**Document Version:** 1.0 (2026-11-20)

---

## 1. Executive Summary

The frontend application has achieved full contract compliance with the ITIL OpenAPI 3.0 specification (`backend/docs/openapi/iitsm-api.json`), zero mock fallbacks, robust error handling, and server-side filtering across all roles (Employee, Technician, Team Lead, and Admin).

This document outlines high-impact architectural, visual, ergonomic, and performance enhancements that can elevate the user experience from functional to world-class enterprise tier.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND IMPROVEMENT PILLARS                    │
├─────────────────┬───────────────────┬──────────────────┬───────────────┤
│ 1. Performance  │ 2. Design & Theme │ 3. UX & Workflow │ 4. Realtime   │
│ • Code-splitting│ • Dual themes     │ • Command bar    │ • WS pill     │
│ • Bundle budget │ • Token auditing  │ • Skeletons      │ • Offline     │
│ • Recharts lazy │ • Micro-animation │ • Hotkeys        │ • Optimistic  │
└─────────────────┴───────────────────┴──────────────────┴───────────────┘
```

---

## 2. Bundle Optimization & Performance

### 2.1 Route-Level Code Splitting (`React.lazy` & `Suspense`)
- **Current State:** Vite outputs a single large bundle chunk (`dist/assets/index-*.js`, ~1.89 MB uncompressed, ~511 kB gzip). Vite displays the warning:
  `(!) Some chunks are larger than 500 kB after minification.`
- **Improvement:**
  - Wrap major role-based route views (`/admin/*`, `/lead/*`, `/tech/*`, `/employee/*`) and standalone heavy features (`ServiceGraph`, `Simulator`, `Reports`) with `React.lazy()` and `Suspense`.
  - Provide role-specific loading boundary skeletons so page transitions feel instantaneous.
- **Expected Impact:** Reduces initial bundle load by **~65%** (down to ~160 kB gzip for initial landing/login).

### 2.2 Vendor Chunk Partitioning in `vite.config.ts`
- **Current State:** Vendor libraries (MUI, Emotion, Recharts, TanStack Query, Axios) are packed into the main index bundle.
- **Improvement:** Configure `build.rollupOptions.output.manualChunks` in `vite.config.ts`:
  ```ts
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-charts': ['recharts'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-utils': ['axios'],
        },
      },
    },
  }
  ```
- **Expected Impact:** Improves long-term browser cache hit rates — updating application code will not invalidate heavy third-party vendor scripts.

### 2.3 Asset Compression & SVG Vector Migration
- **Current State:** Logo and static graphics use raster PNG files (e.g. `logo-*.png`, 221 kB).
- **Improvement:** Convert raster branding and illustrative assets to vector SVGs or compressed WebP with responsive `srcset`.
- **Expected Impact:** Eliminates ~200 kB of static asset transfer per cold page visit.

---

## 3. Design System, Theming & Visual Polish

### 3.1 Toggleable Dual Themes (Dark "Luminary Kinetic" & Light "Nordic Slate")
- **Current State:** The application is fixed to the dark theme (`theme.ts`, `mode: 'dark'`, primary `#6366f1`). While visually striking for NOC dashboards, corporate desktop users often require a crisp light theme in well-lit office environments.
- **Improvement:**
  - Add a theme toggle in the top user pill menu (`Dark` / `Light` / `System Preference`).
  - Introduce an enterprise light theme token palette (high-contrast slate backgrounds `#f8fafc`, crisp borders `#e2e8f0`, deep ink typography `#0f172a`, and indigo accents `#4f46e5`).
  - Persist user preference in `localStorage`.

### 3.2 Elimination of Remaining Inline Hex Overrides
- **Current State:** While `theme.ts` exports centralized `tokens` and `slaStateColor`, certain sub-components still contain scattered inline style overrides (e.g., `rgba(255, 255, 255, 0.04)`, `color: '#ffffff'`).
- **Improvement:**
  - Migrate all inline color declarations into semantic theme tokens in `theme.ts` (e.g. `tokens.glassBg`, `tokens.glassBorder`, `tokens.activeGlow`).
  - Enforce theme tokens via ESLint rules or styling utility helpers.

### 3.3 Visual Hierarchy & Micro-Animations
- **Current State:** Status transitions and state changes update instantaneously without visual transition feedback.
- **Improvement:**
  - **Status Glow & Pulsing:** Add subtle CSS pulse animations on critical alerts (e.g., active `P1` Major Incidents, SLA `AT_RISK` / `VIOLATED` count badges).
  - **Smooth Drawer & Modal Mounts:** Use subtle spring-easing transitions on dialogs, sliding inspection drawers, and filter trays.
  - **Glassmorphic Elevations:** Add subtle multi-layered drop shadows (`box-shadow: 0 4px 20px -2px rgba(0,0,0,0.5)`) and backdrop filters (`backdrop-filter: blur(12px)`) on top navigation and sticky ribbons.

---

## 4. User Experience & Ergonomic Workflows

### 4.1 Global Command Palette (`Cmd + K` / `Ctrl + K`)
- **Current State:** `Ctrl+K` is mapped locally to table search within `TechQueue.tsx`.
- **Improvement:**
  - Introduce an omnipresent Global Command Palette accessible from anywhere in the app.
  - Features:
    - Instant incident search by code (e.g., typing `INC-2026-00213` immediately opens the detail drawer or workbench).
    - Quick actions: `"Declare incident"`, `"Switch view to Technician"`, `"View Service Graph"`, `"Export workload CSV"`.
    - User and service jump list.

### 4.2 Skeleton Placeholders over Circular Spinners
- **Current State:** Loading states predominantly render `<LoadingState>` with a centered `<CircularProgress>`.
- **Improvement:**
  - Replace full-page loading spinners with tailored MUI `<Skeleton>` layouts matching the shape of tables, KPI cards, and detail headers.
  - Eliminates perceived layout shift (CLS) when data arrives.

### 4.3 Granular Optimistic UI Updates
- **Current State:** Mutations (such as acknowledging a ticket, submitting an internal comment, or adding a quick note) await full network round-trips before updating the UI list.
- **Improvement:**
  - Leverage TanStack Query's `onMutate` to immediately append comments or reflect status changes optimistically, reverting on the rare event of an API error.
  - Makes technician workflows feel local and zero-latency.

### 4.4 Sticky Context & Action Ribbons
- **Current State:** On long incident detail views (`TechWorkbench`, `AdminIncidentDetail`), scrolling down through extensive audit histories and attachments scrolls the action ribbon out of view.
- **Improvement:**
  - Make the action ribbon sticky at the top of the workbench container (`position: sticky`, `top: 0`, `zIndex: 10`, `backdrop-filter: blur(8px)`).
  - Technicians can trigger actions (`Resolve`, `Request Info`, `Escalate`) without scrolling back to the top.

---

## 5. Operations & Advanced ITIL Capabilities

### 5.1 NOC Wallboard Mode
- **Current State:** Admin Dashboard and Service Graph are designed for standard desktop browser windows.
- **Improvement:**
  - Provide a dedicated "Wallboard Mode" toggle for NOC and TV displays.
  - Features:
    - Auto-fullscreen with hidden sidebars and headers.
    - Large KPI readouts visible from distance.
    - Automatic cycling between Incident Overview, Service Health Graph, and Velocity Trends every 30 seconds.
    - Audio/visual chime alerts upon declaration of new P1/P2 incidents.

### 5.2 Service Graph Minimap & Blast-Radius Simulator
- **Current State:** `GraphCanvas.tsx` offers zoom and pan controls.
- **Improvement:**
  - Add a collapsible corner minimap displaying the full dependency graph topology and current viewport frame.
  - Add an interactive "Outage Simulator" mode on the graph: clicking a service highlights all downstream dependent services in red/orange to visualize cascade impact before performing scheduled maintenance.

### 5.3 Calendar Heatmap for SLA & Incident Volumes
- **Current State:** Trends display 7-day, 30-day, and 12-week velocity bar/line charts.
- **Improvement:**
  - Introduce a GitHub-style calendar contribution heatmap on the Reports screen displaying incident creation density and SLA violation clusters by day of week and hour of day.

---

## 6. Realtime, Network & Resilience

### 6.1 Realtime Connection Status Pill
- **Current State:** `useRealtime` manages WebSocket reconnects silently with toast alerts on total connection loss.
- **Improvement:**
  - Surface a small unobtrusive status pill in the top app bar:
    - 🟢 **Live** (Connected via WebSocket)
    - 🟡 **Connecting / Fallback** (Polling active)
    - 🔴 **Offline** (Backend unreachable, displaying offline banner)
  - Clicking the pill displays latency and allows manual reconnect attempts.

### 6.2 Offline Draft Preservation
- **Current State:** If a technician or employee drafts a long incident report, description, or root-cause explanation and the browser refreshes or loses connection, unsaved text is lost.
- **Improvement:**
  - Implement automatic local storage autosave (`useDraftAutosave`) for report forms, resolution notes, and handover summaries.
  - Automatically restore draft text upon reopening the dialog.

---

## 7. Testing & Quality Assurance

### 7.1 Automated Screen Integration Test Coverage
- **Current State:** Unit tests cover utilities, filters, config metadata, auth flows, and remaining task screens (`remaining-screens.test.tsx`, `auth-flow.test.tsx`, 37 tests passing).
- **Improvement:**
  - Add dedicated component test suites for `TechWorkbench.test.tsx` (verifying action button lifecycle gating against mocked `allowedActions`).
  - Add `TeamQueue.test.tsx` (verifying candidate recommendation selection and assign mutations).
  - Add `ServiceGraph.test.tsx` (verifying node impact highlights).

### 7.2 End-to-End (E2E) Workflow Automation
- **Current State:** Automated tests execute in Vitest / jsdom.
- **Improvement:**
  - Set up Playwright or Cypress for multi-role end-to-end integration:
    - Employee reports an incident → auto-categorization verified.
    - Team Lead views triage queue → assigns candidate.
    - Technician workbench acknowledges → requests info → resolves.
    - Employee confirms verification and rates resolution.

---

## 8. Prioritized Implementation Roadmap

| Priority | Feature / Improvement | Area | Effort | Impact |
|:---:|---|---|:---:|:---:|
| **P1** | **Route-level Code Splitting & Vendor Chunks** | Performance | Medium | 🚀 High |
| **P1** | **Sticky Action Ribbon on Workbench & Detail** | UX / Ergonomics | Low | 🌟 High |
| **P1** | **Skeleton Loaders for Tables and Cards** | UX / Polish | Low | 🌟 High |
| **P2** | **Global Command Palette (`Cmd + K`)** | Navigation / UX | Medium | 🌟 High |
| **P2** | **Realtime WebSocket Connection Indicator Pill** | Realtime | Low | Medium |
| **P2** | **Toggleable Dual Theme (Light Mode support)** | Theming | Medium | 🌟 High |
| **P3** | **Offline Form Draft Autosave** | Resilience | Low | Medium |
| **P3** | **Service Graph Minimap & Blast-Radius Highlights** | Visualizations | High | Medium |
| **P3** | **NOC Wallboard Display Mode** | Operations | Medium | Medium |
| **P3** | **Playwright E2E Integration Suite** | QA / Testing | High | 🚀 High |
