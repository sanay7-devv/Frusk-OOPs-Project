import { Box } from '@mui/material';
import { statusColor, tokens } from '../theme/theme';
import type { IncidentStatus } from '../api/types';
import { humanizeEnum } from '../utils/format';

import { alpha } from '@mui/material/styles';
const FRIENDLY_LABELS: Record<string, string> = {
  NEW: 'Submitted',
  CLASSIFIED: 'Triaged',
  ASSIGNED: 'Assigned',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In progress',
  PENDING_USER_INFO: 'Waiting for details',
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
  const color = isWithdrawn ? tokens.textDisabled : (statusColor[status] || tokens.onSurfaceVariant);
  const rawKey = isWithdrawn ? 'WITHDRAWN' : status;
  const label = friendly ? (FRIENDLY_LABELS[rawKey] || humanizeEnum(rawKey)) : humanizeEnum(rawKey);

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
        bgcolor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.42)}`,
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
          fontFamily: 'Geist, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          color: color,
          lineHeight: 1.2,
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
