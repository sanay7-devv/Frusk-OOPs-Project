import type { Workspace } from '../auth/AuthContext';
export interface NavItem { label: string; to: string; permission?: string; group?: string }
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
    { label: 'Dashboard', to: '/admin/dashboard', group: 'Operations' },
    { label: 'Incidents', to: '/admin/incidents', group: 'Operations' },
    { label: 'Problems', to: '/admin/problems', group: 'Operations' },
    { label: 'Simulator', to: '/admin/simulator', permission: 'CONFIG_MANAGE', group: 'Operations' },
    { label: 'Users', to: '/admin/users', group: 'Catalog' },
    { label: 'Services', to: '/admin/services', group: 'Catalog' },
    { label: 'Dependency graph', to: '/admin/services/graph', group: 'Catalog' },
    { label: 'Categories', to: '/admin/categories', group: 'Catalog' },
    { label: 'SLA policies', to: '/admin/sla', group: 'Policy' },
    { label: 'Escalation', to: '/admin/escalation', group: 'Policy' },
    { label: 'Config', to: '/admin/config', group: 'Policy' },
    { label: 'Reports', to: '/admin/reports', group: 'Insight' },
    { label: 'Audit log', to: '/admin/audit', group: 'Insight' },
    { label: 'Demo controls', to: '/admin/demo', permission: 'CONFIG_MANAGE', group: 'Tools' },
    { label: 'Account security', to: '/account/security', group: 'Tools' },
  ],
};
