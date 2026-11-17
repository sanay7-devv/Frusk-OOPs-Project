import type { Workspace } from '../auth/AuthContext';
export const NAV: Record<Workspace, { label: string; to: string }[]> = {
  employee: [
    { label: 'Home', to: '/employee/home' }, { label: 'Report incident', to: '/employee/report' },
    { label: 'My incidents', to: '/employee/incidents' }, { label: 'Notifications', to: '/notifications' },
  ],
  tech: [
    { label: 'My queue', to: '/tech/queue' },
    { label: 'Workload', to: '/tech/workload' },
    { label: 'Notifications', to: '/notifications' },
  ],
  lead: [
    { label: 'Team queue', to: '/lead/team-queue' }, { label: 'Escalations', to: '/lead/escalations' },
    { label: 'Notifications', to: '/notifications' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard' }, { label: 'Tickets', to: '/admin/tickets' },
    { label: 'Users', to: '/admin/users' }, { label: 'Services', to: '/admin/services' },
    { label: 'Dependency graph', to: '/admin/services/graph' }, { label: 'SLA policies', to: '/admin/sla' },
    { label: 'Categories', to: '/admin/categories' }, { label: 'Config', to: '/admin/config' },
    { label: 'Escalation', to: '/admin/escalation' }, { label: 'Audit log', to: '/admin/audit' },
    { label: 'Reports', to: '/admin/reports' },
  ],
};
