import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';
import { getWorkloadReport } from '../../../api/reports';
import { ChartCard } from '../reports/common';
import { tone } from '../palette';

export function CapacityCard() {
  const query = useQuery({ queryKey: ['dashboard', 'workload'], queryFn: getWorkloadReport, refetchInterval: 30_000 });
  return (
    <ChartCard
      title="Team capacity"
      query={query}
      isEmpty={(d) => d.length === 0}
      emptyMessage="No technicians yet."
      action={<Typography component={RouterLink} to="/admin/reports" sx={{ fontSize: 12, color: tokens.secondaryLight }}>Workload report</Typography>}
    >
      {(rows) => (
        <Stack spacing={1.5} sx={{ maxHeight: 360, overflowY: 'auto' }}>
          {[...rows].sort((a, b) => (b.maxLoad ? b.load / b.maxLoad : 0) - (a.maxLoad ? a.load / a.maxLoad : 0)).map((t) => {
            const pct = t.maxLoad > 0 ? Math.min(100, (t.load / t.maxLoad) * 100) : 0;
            const full = t.maxLoad > 0 && t.load >= t.maxLoad;
            return (
              <Box key={t.technicianId}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography sx={{ fontSize: 13, color: tokens.onSurface }}>{t.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: full ? tone.danger : tokens.onSurfaceVariant }}>
                    {t.load} of {t.maxLoad} slots used{full ? ' (full)' : ''}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  aria-label={`${t.name} load`}
                  sx={{ height: 6, borderRadius: 3, bgcolor: tokens.surfaceContainerHigh, '& .MuiLinearProgress-bar': { bgcolor: full ? tone.danger : tokens.secondary } }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </ChartCard>
  );
}
