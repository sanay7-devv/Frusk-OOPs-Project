import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

/**
 * Where the problem screens live and what the caller may do there.
 * The screens are shared by the team-lead (/lead/problems) and admin (/admin/problems) workspaces.
 * Permissions mirror ProblemController: TEAM_VIEW for list, detail, root cause, create and resolve;
 * INCIDENT_VIEW_ALL (administrators) for taking an incident out of a record.
 */
export function useProblemAccess() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isAdminArea = pathname.startsWith('/admin');
  const perms = user?.permissions ?? [];
  return {
    basePath: isAdminArea ? '/admin/problems' : '/lead/problems',
    incidentPath: (incidentId: number) =>
      isAdminArea ? `/admin/tickets/${incidentId}` : `/tech/incidents/${incidentId}`,
    canManage: perms.includes('TEAM_VIEW'),
    canUngroup: perms.includes('INCIDENT_VIEW_ALL'),
  };
}

/** Problem screen base path for staff outside the problem screens (workbench, queue); null when neither workspace is open to them. */
export function useProblemBasePath(): string | null {
  const { workspaces } = useAuth();
  if (workspaces.includes('lead')) return '/lead/problems';
  if (workspaces.includes('admin')) return '/admin/problems';
  return null;
}
