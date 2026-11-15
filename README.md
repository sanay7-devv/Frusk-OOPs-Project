<div align="center">

<img src="icons/logo.png" alt="IITSM Logo" width="120" height="120" />

# IITSM Enterprise — Intelligent IT Service Management

**Next-Generation, Role-Driven Enterprise ITIL v4 Incident Management & Operations Cockpit**

[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/MUI-v5-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![React Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?logo=react-query&logoColor=white)](https://tanstack.com/)
[![CI](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/workflows/ci.yml/badge.svg)](https://github.com/sanay7-devv/Frusk-OOPs-Project/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Proprietary-004d99)](#)

</div>

---

## 📋 Overview

**IITSM Enterprise** is a high-performance single-page application (SPA) engineered for mission-critical IT service operations. Built with **React 18**, **TypeScript**, and **Material UI (MUI v5)**, it implements **ITIL v4** incident workflows and offers dedicated, context-aware workspaces for **Employees**, **Technicians**, **Team Leads**, and **Administrators**.

The frontend features the **Reliant Slate** corporate design system, providing high-density data visualizations, live SLA countdown meters, AI-powered dispatch recommendations, and simulated real-time telemetry.

---

## 🌟 Key Workspaces & Capabilities

### 1. 👨‍💻 Technician SRE Cockpit
* **My Queue (`/tech/queue`)**:
  * Real-time triage stream with live status indicators and `⌘K` quick-search.
  * Marcus Chen profile with **5-slot concurrency quota** and visual progress track.
  * Incident cards with color-coded SLA urgency indicators (`P1 Critical`, `P2 High`, `P3 Medium`).
  * Action modals: Append Investigation Note, Request Info (with SLA pause), War Room Bridge, and Ticket Reassignment.
* **Workload & Capacity (`/tech/workload`)**:
  * 4 KPI bento blocks: Active Concurrency Load (80% radial gauge), 30-Day SLA Met Rate (96.4%), MTTR (38m 12s), and First Contact Resolution (78.2%).
  * Upcoming SLA commitment deadlines table with live countdown progress meters.
  * Active shift status card with shift elapsed track, handover request dialog, and standby alert dispatcher.
  * 14-day dual-axis SVG chart showing daily resolution volume gradient bars and cubic Bézier SLA compliance curves.
* **Incident Diagnosis Workbench (`/tech/incidents/:id`)**:
  * Real-time diagnostic console with log filtering (`ERROR`, `WARN`, `INFO`), stream pause/resume, and synthetic probe execution.
  * ITIL ML Runbook Automation with 4-step executable mitigation workflows (pod draining, lock clearing, TCP verification).
  * Investigation timeline & notes composer with *Internal SRE* vs *Public Update* toggles.
  * Infrastructure telemetry rail (CPU, memory, ingress I/O, error rates, and blast radius dependency mapping).

---

### 2. 🛡️ Team Lead Command Center
* **Team Triage Queue (`/lead/team-queue`)**:
  * Unassigned incoming queue with 4 operational summary cards (Unassigned Team Queue, MTTA, Shift Engineers, Match Accuracy).
  * 1-Click **Auto-Assign All Eligible** batch dispatch powered by ITIL v4 heuristic scoring.
  * **AI Assignment Match Inspector**: Side-by-side candidate comparison evaluating domain competency (98%), shift concurrency quotas (3/5 slots), and historical MTTR.
  * Interactive shift rebalancing simulation dialog.
* **Level-1 Escalations Desk (`/lead/escalations`)**:
  * Operational supervisor dashboard with `DEFCON-3 ACTIVE` live monitoring badge.
  * Ticking SLA countdown timers with automated response timeout indicators.
  * Supervisory actions: Assume command, force-assign senior engineers, open P1 War Room audio/video bridges, approve SLA clock freezes, and dispatch L2 executive briefings.
  * Cause distribution analytics breakdown (SLA timeouts 42%, skill gaps 35%, blast radius 23%) and policy matrix editor.

---

### 3. 👥 Employee Self-Service Portal
* **Employee Home (`/employee/home`)**:
  * Clean, accessible landing hub with quick-launch incident reporting cards.
  * Active ticket status tracker, scheduled maintenance alerts, and knowledge base search.
* **Incident Reporting (`/employee/report`)**:
  * Guided multi-step form with category selection, impact/urgency prioritization, and attachment uploads.
* **My Incidents & Detail (`/employee/incidents`, `/employee/incidents/:id`)**:
  * Personal ticket history, real-time status tracker, and bidirectional communication thread with assigned technicians.

---

### 4. ⚙️ Administrative Governance
* **Incident Analytics Dashboard (`/admin/dashboard`)**:
  * Global incident trends, SLA breach risk matrices, and mean-time metrics.
* **Enterprise Infrastructure & Config**:
  * **User Management (`/admin/users`)** & **Employee Directory (`/admin/employees`)**.
  * **Service Catalog (`/admin/services`)** & Interactive **Dependency Graph (`/admin/services/graph`)** powered by ReactFlow.
  * **SLA Policies (`/admin/sla`)**, **Escalation Settings (`/admin/escalation`)**, and **Audit Log (`/admin/audit`)**.
  * Dynamic user impersonation mode allowing administrators to preview and test any employee workspace seamlessly.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework & Language** | [React 18](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Build & Tooling** | [Vite](https://vitejs.dev/) |
| **UI Components & Icons** | [Material UI (MUI v5)](https://mui.com/), `@mui/icons-material` |
| **State & Server Cache** | [TanStack React Query v5](https://tanstack.com/query/latest) |
| **Client Routing** | [React Router DOM v7](https://reactrouter.com/) |
| **Form Management** | [React Hook Form](https://react-hook-form.com/) + [Zod Validation](https://zod.dev/) |
| **Data Visualization** | [ReactFlow](https://reactflow.dev/) (service graphs), SVG charts (workload & velocity) |
| **Design Tokens** | Reliant Slate Enterprise Theme |
| **Testing** | [Vitest](https://vitest.dev/), React Testing Library, JSDOM |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.x or v20.x recommended)
* **npm** (v9.x or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/frusk.git
   cd frusk
   ```

2. Navigate to the frontend directory and install dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Configure environment variables (optional):
   ```bash
   cp .env.example .env
   ```

4. Launch the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Available Scripts

Inside the `frontend/` directory, you can run:

* `npm run dev` — Launches the Vite development server with Hot Module Replacement (HMR).
* `npm run build` — Runs TypeScript type-checking (`tsc`) and compiles the production bundle via Vite.
* `npm run preview` — Locally previews the compiled production build.
* `npm run test` — Executes the Vitest unit test suite.

---

## 🔑 Pre-Configured Demo Accounts (Offline Bypass)

The application includes an **Offline Database Bypass** mode on the login screen. You can test each workspace instantly with one click:

| Role | Pre-configured Email | Workspace Scope |
| :--- | :--- | :--- |
| **Administrator** | `admin@iitsm.local` | Full access across Admin, Lead, Tech & Employee views |
| **Team Lead** | `lead@iitsm.local` | Team queue, allocation inspector, and escalations desk |
| **Technician** | `tech@iitsm.local` | SRE triage queue, workload capacity, and diagnostic workbench |
| **Employee** | `employee@iitsm.local` | Employee home, report incident, and ticket tracking |

---

## 📁 Repository Structure

```text
Frusk/
├── .gitignore              # Configured repository ignore rules
├── README.md               # Main project documentation
├── icons/                  # Application branding and logos
│   └── logo.png
└── frontend/               # Single-Page Application (SPA)
    ├── package.json        # Dependencies and build scripts
    ├── vite.config.ts      # Vite configuration
    ├── tsconfig.json       # TypeScript compiler options
    ├── src/
    │   ├── api/            # API client, types & endpoints
    │   ├── auth/           # Role-based auth context & guards
    │   ├── components/     # Reusable UI widgets & modals
    │   ├── features/       # Role-specific workspaces
    │   │   ├── admin/      # Admin dashboard, users, SLA, services
    │   │   ├── lead/       # Team triage queue & escalations desk
    │   │   ├── technician/ # Tech queue, workload & diagnosis workbench
    │   │   ├── employee/   # Employee portal & ticket submission
    │   │   └── shared/     # Login, registration & notifications
    │   ├── layouts/        # AppShell, navigation & responsive drawers
    │   ├── routes/         # AppRoutes & protected route guards
    │   └── theme/          # Reliant Slate design tokens
    └── public/             # Static assets & favicon
```

---

## 📄 License

This project is developed for enterprise IT service management demonstration. All rights reserved.

