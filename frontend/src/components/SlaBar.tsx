import { Box, Tooltip } from '@mui/material';
import type { SlaState } from '../api/types';
import { slaStateColor, tokens } from '../theme/theme';

interface SlaBarProps {
  createdAt?: string | null;
  due?: string | null;
  slaState: SlaState;
  height?: number;
  width?: string | number;
}

export default function SlaBar({
  createdAt,
  due,
  slaState,
  height = 5,
  width = '100%',
}: SlaBarProps) {
  let percent = 0;
  if (slaState === 'MET') {
    percent = 100;
  } else if (slaState === 'VIOLATED') {
    percent = 100;
  } else if (createdAt && due) {
    const start = new Date(createdAt).getTime();
    const end = new Date(due).getTime();
    const total = end - start;
    if (total > 0) {
      const elapsed = Date.now() - start;
      percent = Math.min(100, Math.max(5, Math.round((elapsed / total) * 100)));
    }
  }

  const color = slaStateColor[slaState] ?? slaStateColor.OK;

  return (
    <Tooltip title={`SLA: ${slaState} (${percent}% elapsed)`} arrow>
      <Box
        sx={{
          width,
          height,
          bgcolor: tokens.outlineVariant,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: `${percent}%`,
            height: '100%',
            bgcolor: color,
            borderRadius: 2,
            transition: 'width 0.4s ease',
            boxShadow: `0 0 6px ${color}66`,
          }}
        />
      </Box>
    </Tooltip>
  );
}
