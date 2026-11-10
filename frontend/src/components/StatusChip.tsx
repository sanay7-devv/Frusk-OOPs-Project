import { Chip } from '@mui/material';
import { statusColor } from '../theme/theme';
import type { IncidentStatus } from '../api/types';
export default function StatusChip({ status }: { status: IncidentStatus }) {
  const reopened = status === 'REOPENED';
  return <Chip size="small" label={status.replace(/_/g, ' ')}
    variant={reopened ? 'outlined' : 'filled'}
    sx={reopened ? { color: statusColor[status], borderColor: statusColor[status] } : { bgcolor: statusColor[status], color: '#fff' }} />;
}
