import { useQuery } from '@tanstack/react-query';
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
      {(d) => {
        const totalCount = d.reduce((acc, curr) => acc + curr.count, 0);
        const center = mttr !== 'No data'
          ? { caption: 'Avg to resolve', value: mttr }
          : { caption: 'Total incidents', value: String(totalCount) };
        return <PriorityDonut data={d} center={center} />;
      }}
    </ChartCard>
  );
}
