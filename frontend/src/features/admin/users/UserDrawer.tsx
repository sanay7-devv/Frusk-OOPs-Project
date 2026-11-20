import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, Stack, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { getDirectoryUser, type DirectoryUser } from '../../../api/adminDirectory';
import { listIncidents } from '../../../api/incidents';
import type { IncidentSummary } from '../../../api/types';
import PriorityBadge from '../../../components/PriorityBadge';
import StatusChip from '../../../components/StatusChip';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { humanizeEnum } from '../../../utils/format';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { monoLabelSx } from '../adminForm';
import { EXPERIENCE_LABELS, PROFICIENCY_LABELS, isLead } from './techForm';

export interface DrawerActions {
  onEdit: (u: DirectoryUser) => void;
  onTechnician: (u: DirectoryUser) => void;
  onResetMfa: (u: DirectoryUser) => void;
  onToggleActive: (u: DirectoryUser) => void;
}

const PAGE = 8;

function IncidentList({ title, userId, kind }: { title: string; userId: number; kind: 'assigneeId' | 'reporterId' }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['admin-user-incidents', kind, userId],
    queryFn: () => listIncidents({ [kind]: userId, size: PAGE, sort: 'createdAt,desc' }),
  });
  return (
    <Box>
      <Typography sx={{ ...monoLabelSx, mb: 1 }}>
        {title}{q.data ? ` (${q.data.totalItems})` : ''}
      </Typography>
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />}
      {q.data && q.data.items.length === 0 && <EmptyState message="No incidents" />}
      <Stack spacing={1}>
        {q.data?.items.map((i: IncidentSummary) => (
          <Box key={i.id} onClick={() => navigate(`/admin/tickets/${i.id}`)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/tickets/${i.id}`); }}
            sx={{ p: 1.25, borderRadius: 2, cursor: 'pointer', border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow,
              '&:hover': { borderColor: tokens.primary } }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography sx={{ fontSize: 13, fontFamily: 'JetBrains Mono, monospace', color: tokens.primaryLight }}>{i.code}</Typography>
              <PriorityBadge priority={i.priority} />
              <StatusChip status={i.status} />
            </Stack>
            <Typography sx={{ fontSize: 13, mt: 0.5, color: tokens.onSurface }}>{i.title}</Typography>
          </Box>
        ))}
      </Stack>
      {q.data && q.data.totalItems > PAGE && (
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 1 }}>
          Showing the latest {PAGE} of {q.data.totalItems}. Search the Tickets screen for the rest.
        </Typography>
      )}
    </Box>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 0.5 }}>
      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 13, color: tokens.onSurface, textAlign: 'right' }}>{value}</Typography>
    </Stack>
  );
}

export default function UserDrawer({ userId, onClose, actions }: { userId: number | null; onClose: () => void; actions: DrawerActions }) {
  const q = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => getDirectoryUser(userId as number),
    enabled: userId != null,
  });
  const u = q.data;
  const t = u?.technician ?? null;

  return (
    <Drawer anchor="right" open={userId != null} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 460 }, top: 64, height: 'calc(100% - 64px)', bgcolor: tokens.surfaceContainerLow, borderLeft: `1px solid ${tokens.outlineVariant}`, p: 3 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800 }}>{u?.name ?? 'Account'}</Typography>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{u?.email}</Typography>
        </Box>
        <IconButton aria-label="Close" onClick={onClose}><CloseIcon /></IconButton>
      </Stack>

      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />}
      {u && (
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {u.roles.map((r) => (
              <Chip key={r} size="small" label={r === 'TECHNICIAN' && isLead(u) ? 'Team lead' : r.charAt(0) + r.slice(1).toLowerCase()}
                sx={{ fontSize: 12, bgcolor: tokens.surfaceContainerHigh }} />
            ))}
            <Chip size="small" label={u.active ? 'Active' : 'Deactivated'} color={u.active ? 'success' : 'default'} sx={{ fontSize: 12 }} />
          </Stack>

          <Box>
            <Row label="Department" value={u.department ?? 'Not set'} />
            <Row label="Location" value={u.location ?? 'Not set'} />
            {u.administrator && <Row label="Administrator scope" value={u.administrator.scope === 'IT_MANAGER' ? 'IT manager' : 'System administrator'} />}
            {u.administrator && <Row label="Receives escalations" value={u.administrator.scope === 'IT_MANAGER' ? 'Level 3 (IT manager)' : 'Level 2 (system administrator)'} />}
          </Box>

          {t && (
            <Box>
              <Typography sx={{ ...monoLabelSx, mb: 1 }}>Technician profile</Typography>
              <Row label="Availability" value={t.availability === 'AVAILABLE' && t.maxLoad > 0 && t.currentLoad >= t.maxLoad ? 'Full' : humanizeEnum(t.availability)} />
              <Row label="Experience" value={`${t.experienceLevel} · ${EXPERIENCE_LABELS[t.experienceLevel] ?? ''}`} />
              <Row label="Escalation level" value={t.escalationLevel >= 1 ? '1 (team lead)' : '0 (technician)'} />
              <Row label="Workload" value={`${t.currentLoad} of ${t.maxLoad} (${t.activeIncidents} active incident${t.activeIncidents === 1 ? '' : 's'})`} />
              <LinearProgress variant="determinate" value={t.maxLoad > 0 ? Math.min(100, (t.currentLoad / t.maxLoad) * 100) : 0} sx={{ my: 1, height: 6, borderRadius: 3 }} />
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mt: 1, mb: 0.5 }}>Skills</Typography>
              {t.skills.length === 0
                ? <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No skills assigned.</Typography>
                : (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {t.skills.map((s) => (
                      <Chip key={s.skillId} size="small" label={`${s.name} · ${s.proficiency} ${PROFICIENCY_LABELS[s.proficiency] ?? ''}`} sx={{ fontSize: 12 }} />
                    ))}
                  </Stack>
                )}
            </Box>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" onClick={() => actions.onEdit(u)} sx={{ textTransform: 'none' }}>Edit</Button>
            {t && <Button size="small" variant="outlined" onClick={() => actions.onTechnician(u)} sx={{ textTransform: 'none' }}>Technician profile</Button>}
            <Button size="small" variant="outlined" onClick={() => actions.onResetMfa(u)} sx={{ textTransform: 'none' }}>Reset two-step verification</Button>
            <Button size="small" variant="outlined" color={u.active ? 'error' : 'success'} onClick={() => actions.onToggleActive(u)} sx={{ textTransform: 'none' }}>
              {u.active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </Stack>

          <Divider sx={{ borderColor: tokens.outlineVariant }} />
          <IncidentList title="Reported" userId={u.id} kind="reporterId" />
          {u.roles.includes('TECHNICIAN') && <IncidentList title="Assigned" userId={u.id} kind="assigneeId" />}
        </Stack>
      )}
    </Drawer>
  );
}
