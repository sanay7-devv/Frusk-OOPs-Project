import { searchAudit, type AuditAction, type AuditEntryView, type AuditSearchParams } from '../../api/audit';
import type { Page } from '../../api/types';

export type AuditQuery = Omit<AuditSearchParams, 'action'> & { actions?: AuditAction[] };

/**
 * GET /audit takes one `action`. For several, ask once per action and merge newest first.
 * Each action is paged on its own, so page N holds page N of every chosen action.
 */
export async function searchAuditActions(q: AuditQuery): Promise<Page<AuditEntryView>> {
  const { actions = [], ...rest } = q;
  if (actions.length <= 1) return searchAudit({ ...rest, action: actions[0] });
  const pages = await Promise.all(actions.map((action) => searchAudit({ ...rest, action })));
  const items = pages.flatMap((p) => p.items).sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.id - a.id);
  const size = rest.size ?? 25;
  const totalPages = Math.max(...pages.map((p) => p.totalPages));
  return { items, page: rest.page ?? 0, size, totalItems: totalPages * size, totalPages } as Page<AuditEntryView>;
}
