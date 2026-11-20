import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { getIncident } from '../../../api/incidents';
import PriorityBadge from '../../../components/PriorityBadge';
import SlaCountdown from '../../../components/SlaCountdown';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import StatusChip from '../../../components/StatusChip';
import { tokens } from '../../../theme/theme';
import { formatDateTime } from '../../../utils/format';
import { apiErrorMessage } from '../../../utils/errors';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 0.75 }}>
    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{label}</Typography>
    <Box sx={{ fontSize: 13, textAlign: 'right' }}>{children}</Box>
  </Stack>
);

/** Side panel opened by `?open=<id>`; the full page stays one click away. */
export default function IncidentDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['incidents', 'drawer', id], queryFn: () => getIncident(id!), enabled: id != null });
  const i = q.data;
  return (
    <Drawer anchor="right" open={id != null} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, top: 64, height: 'calc(100% - 64px)', bgcolor: tokens.surfaceContainerLow, p: 2.5 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 700 }}>{i ? i.code : 'Incident'}</Typography>
        <IconButton onClick={onClose} aria-label="Close panel"><CloseIcon /></IconButton>
      </Stack>
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />}
      {i && (
        <>
          <Typography sx={{ fontSize: 15, mb: 1.5 }}>{i.title}</Typography>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2, whiteSpace: 'pre-wrap' }}>{i.description}</Typography>
          <Divider sx={{ borderColor: tokens.outlineVariant }} />
          <Row label="Status"><StatusChip status={i.status} closureReason={i.closureReason} /></Row>
          <Row label="Priority"><PriorityBadge priority={i.priority} /></Row>
          <Row label="Service">{i.service.name}</Row>
          <Row label="Category">{i.category?.name ?? 'None'}</Row>
          <Row label="Reporter">{i.reporter.name}</Row>
          <Row label="Assignee">{i.assignee?.name ?? 'Unassigned'}</Row>
          <Row label="Escalation level">{i.escalationLevel}</Row>
          <Row label="Resolution SLA"><SlaCountdown due={i.resolutionDue} slaState={i.slaState} /></Row>
          <Row label="Created">{formatDateTime(i.createdAt)}</Row>
          <Button component={RouterLink} to={`/admin/incidents/${i.id}`} variant="contained" fullWidth sx={{ mt: 2, textTransform: 'none' }}>
            Open full page
          </Button>
        </>
      )}
    </Drawer>
  );
}
