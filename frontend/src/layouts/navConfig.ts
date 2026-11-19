import type { Workspace } from '../auth/AuthContext';
export interface NavItem { label: string; to: string; permission?: string }
export const NAV: Record<Workspace, NavItem[]> = {
  employee: [
    { label: 'Home', to: '/employee/home' },
    { label: 'Report incident', to: '/employee/report' },
    { label: 'My incidents', to: '/employee/incidents' },
    { label: 'Service status', to: '/employee/status' },
    { label: 'Notifications', to: '/notifications' },
  ],
  tech: [
    { label: 'My queue', to: '/tech/queue' },
    { label: 'Workload', to: '/tech/workload' },
    { label: 'Notifications', to: '/notifications' },
  ],
  lead: [
    { label: 'Team queue', to: '/lead/team-queue' }, { label: 'Escalations', to: '/lead/escalations' },
    { label: 'Problems', to: '/lead/problems' },
    { label: 'Notifications', to: '/notifications' },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard' }, { label: 'Tickets', to: '/admin/tickets' },
    { label: 'Problems', to: '/admin/problems' },
    { label: 'Users', to: '/admin/users' }, { label: 'Services', to: '/admin/services' },
    { label: 'Dependency graph', to: '/admin/services/graph' }, { label: 'SLA policies', to: '/admin/sla' },
    { label: 'Categories', to: '/admin/categories' }, { label: 'Config', to: '/admin/config' },
    { label: 'Escalation', to: '/admin/escalation' }, { label: 'Audit log', to: '/admin/audit' },
    { label: 'Reports', to: '/admin/reports' },
    { label: 'Simulator', to: '/admin/simulator', permission: 'CONFIG_MANAGE' },
    { label: 'Demo controls', to: '/admin/demo', permission: 'CONFIG_MANAGE' },
  ],
};
