import { useQuery } from '@tanstack/react-query';
import { getPriorityDistribution } from '../../../api/reports';
import { ChartCard } from '../reports/common';
import { PriorityDonut } from '../reports/Charts';
import { lastDays } from './dates';

export function PriorityCard() {
  const period = lastDays(30);
  const dist = useQuery({ queryKey: ['dashboard', 'priority', period.from], queryFn: () => getPriorityDistribution(period), refetchInterval: 60_000 });
  return (
    <ChartCard title="Incidents by priority, last 30 days" query={dist} isEmpty={(d) => d.length === 0} emptyMessage="No incidents in the last 30 days.">
      {(d) => (
        <PriorityDonut data={d} center={{ caption: 'Total incidents', value: String(d.reduce((sum, row) => sum + row.count, 0)) }} />
      )}
    </ChartCard>
  );
}
