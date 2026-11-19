import { Box } from '@mui/material';
import { statusColor } from '../theme/theme';
import type { IncidentStatus } from '../api/types';

const FRIENDLY_LABELS: Record<string, string> = {
  NEW: 'Submitted',
  CLASSIFIED: 'Triaged',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  PENDING_USER_INFO: 'Waiting for Details',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  WITHDRAWN: 'Withdrawn',
};

export default function StatusChip({
  status,
  closureReason,
  friendly = false,
}: {
  status: IncidentStatus;
  closureReason?: string | null;
  friendly?: boolean;
}) {
  const isWithdrawn = status === 'CLOSED' && closureReason === 'WITHDRAWN';
  const color = isWithdrawn ? '#64748b' : (statusColor[status] || '#94a3b8');
  const reopened = status === 'REOPENED';
  const rawKey = isWithdrawn ? 'WITHDRAWN' : status;
  const label = friendly ? (FRIENDLY_LABELS[rawKey] || status.replace(/_/g, ' ')) : (isWithdrawn ? 'WITHDRAWN' : status.replace(/_/g, ' '));

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.7,
        px: 1.2,
        py: 0.3,
        borderRadius: '9999px',
        bgcolor: reopened ? 'rgba(244, 63, 94, 0.15)' : `${color}18`,
        border: `1px solid ${reopened ? '#f43f5e' : `${color}40`}`,
        boxShadow: `0 0 8px ${color}15`,
        verticalAlign: 'middle',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          bgcolor: color,
        }}
      />
      <Box
        component="span"
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 10.5,
          fontWeight: 600,
          color: color,
          letterSpacing: '0.03em',
          lineHeight: 1.2,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
