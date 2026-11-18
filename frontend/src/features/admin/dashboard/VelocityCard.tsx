import { useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getTrends } from '../../../api/reports';
import { ChartCard } from '../reports/common';
import { TrendChart } from '../reports/Charts';
import { lastDays } from './dates';

const RANGES = {
  '7d': { label: '7 days', days: 7, bucket: 'day' },
  '30d': { label: '30 days', days: 30, bucket: 'day' },
  '12w': { label: '12 weeks', days: 84, bucket: 'week' },
} as const;
type RangeKey = keyof typeof RANGES;

export function VelocityCard() {
  const [range, setRange] = useState<RangeKey>('7d');
  const r = RANGES[range];
  const from = lastDays(r.days);
  const query = useQuery({
    queryKey: ['dashboard', 'trends', range, from.from],
    queryFn: () => getTrends(from, r.bucket),
    refetchInterval: 60_000,
  });
  return (
    <ChartCard
      title="Created and resolved"
      query={query}
      isEmpty={(d) => d.length === 0}
      emptyMessage="No incidents in this period."
      action={(
        <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v: RangeKey | null) => v && setRange(v)} aria-label="Chart period">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <ToggleButton key={k} value={k} sx={{ textTransform: 'none', fontSize: 12, px: 1.5 }}>{RANGES[k].label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}
    >
      {(d) => <TrendChart data={d} />}
    </ChartCard>
  );
}
