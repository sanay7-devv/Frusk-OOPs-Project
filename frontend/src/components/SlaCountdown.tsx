import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Pause as PauseIcon, Check as CheckIcon, Schedule as ScheduleIcon } from '@mui/icons-material';
import type { SlaState } from '../api/types';

/** Counts from the server's due timestamp (not from page load). Never computes SLA state itself. */
export default function SlaCountdown({
  due,
  createdAt,
  slaState,
}: {
  due: string | null;
  createdAt: string;
  slaState: SlaState;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (slaState === 'MET') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#4ade80' }}>
        <CheckIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 600 }}>
          Met
        </Typography>
      </Box>
    );
  }

  if (slaState === 'PAUSED') {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#94a3b8' }}>
        <PauseIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 500 }}>
          Paused
        </Typography>
      </Box>
    );
  }

  if (!due) {
    return (
      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#64748b' }}>
        -
      </Typography>
    );
  }

  const dueMs = new Date(due).getTime();
  const left = dueMs - now;
  const total = dueMs - new Date(createdAt).getTime();
  const fmt = (ms: number) => {
    const s = Math.floor(Math.abs(ms) / 1000);
    const m = Math.floor(s / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`;
  };

  if (left < 0) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#f43f5e' }}>
        <ScheduleIcon sx={{ fontSize: 14 }} />
        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700 }}>
          Overdue {fmt(left)}
        </Typography>
      </Box>
    );
  }

  const isWarning = total > 0 && left / total < 0.25;
  const color = isWarning ? '#fb923c' : '#38bdf8';

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: color }}>
      <ScheduleIcon sx={{ fontSize: 14 }} />
      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 600 }}>
        {fmt(left)} left
      </Typography>
    </Box>
  );
}
