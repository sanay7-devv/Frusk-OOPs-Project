import { Box, Chip } from '@mui/material';
import { priorityColor, priorityLabel } from '../theme/theme';
import type { Priority } from '../api/types';

export default function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) {
    return (
      <Chip
        size="small"
        label="Unprioritized"
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          color: '#94a3b8',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          fontWeight: 600,
        }}
      />
    );
  }

  const color = priorityColor[priority] || '#38bdf8';

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.8,
        px: 1.2,
        py: 0.3,
        borderRadius: '9999px',
        bgcolor: `${color}18`,
        border: `1px solid ${color}45`,
        boxShadow: `0 0 10px ${color}20`,
        verticalAlign: 'middle',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      <Box
        component="span"
        sx={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11,
          fontWeight: 700,
          color: color,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          lineHeight: 1.2,
        }}
      >
        {priorityLabel[priority]}
      </Box>
    </Box>
  );
}
