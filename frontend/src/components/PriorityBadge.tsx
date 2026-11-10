import { Chip } from '@mui/material';
import { priorityColor, priorityLabel } from '../theme/theme';
import type { Priority } from '../api/types';
export default function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <Chip size="small" label="Unprioritized" />;
  return <Chip size="small" label={priorityLabel[priority]} sx={{ bgcolor: priorityColor[priority], color: '#fff' }} />; // text, not colour alone
}
