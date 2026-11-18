import { Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';
import { getOverview, getPriorityDistribution } from '../../../api/reports';
import { ChartCard } from '../reports/common';
import { PriorityDonut, formatMinutes } from '../reports/Charts';
import { lastDays } from './dates';

export function PriorityCard() {
  const period = lastDays(30);
  const dist = useQuery({ queryKey: ['dashboard', 'priority', period.from], queryFn: () => getPriorityDistribution(period), refetchInterval: 60_000 });
  const overview = useQuery({ queryKey: ['dashboard', 'overview-period', period.from], queryFn: () => getOverview(period), refetchInterval: 60_000 });
  const o = overview.data;
  const mttr = overview.isError ? 'Unavailable'
    : !o ? '...'
    : o.resolved > 0 && o.avgResolutionMinutes > 0 ? formatMinutes(o.avgResolutionMinutes) : 'No data';
  return (
    <ChartCard title="Incidents by priority, last 30 days" query={dist} isEmpty={(d) => d.length === 0} emptyMessage="No incidents in the last 30 days.">
      {(d) => (
        <>
          <PriorityDonut data={d} />
          <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13, mt: 1 }}>
            Average time to resolve: <strong style={{ color: tokens.onSurface }}>{mttr}</strong>
          </Typography>
        </>
      )}
    </ChartCard>
  );
}
