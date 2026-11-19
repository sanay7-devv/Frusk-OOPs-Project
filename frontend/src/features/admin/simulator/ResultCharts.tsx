import { Box, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { tokens } from '../../../theme/theme';
import type { ConfigurationView } from '../../../api/simulations';
import { AXIS, TOOLTIP_STYLE } from '../reports/common';

/** One colour per configuration (max 3), from the theme tokens. */
export const SERIES = [tokens.primary, tokens.secondary, tokens.tertiary] as const;

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow }}>
      <Typography sx={{ fontWeight: 600, fontSize: 14, color: tokens.onSurface }}>{title}</Typography>
      {note && <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 1 }}>{note}</Typography>}
      {children}
    </Box>
  );
}

interface Group { metric: string; [config: string]: number | string }

/** Rows = metrics, one bar per configuration within each row. */
function grouped(results: ConfigurationView[], metrics: [string, (r: ConfigurationView) => number][]): Group[] {
  return metrics.map(([metric, get]) => {
    const row: Group = { metric };
    results.forEach((r) => { row[r.name] = get(r); });
    return row;
  });
}

function GroupedBars({ data, results, unit }: { data: Group[]; results: ConfigurationView[]; unit: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={tokens.outlineVariant} vertical={false} />
        <XAxis dataKey="metric" {...AXIS} />
        <YAxis {...AXIS} unit={unit} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {results.map((r, i) => (
          <Bar key={r.name} dataKey={r.name} fill={SERIES[i % SERIES.length]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ResultCharts({ results }: { results: ConfigurationView[] }) {
  const times = grouped(results, [
    ['Mean wait', (r) => r.meanWaitMinutes], ['Mean resolve', (r) => r.meanResolveMinutes], ['p90 resolve', (r) => r.p90ResolveMinutes],
  ]);
  const rates = grouped(results, [
    ['SLA violations', (r) => r.slaViolationPercent], ['Matches real assignee', (r) => r.matchesRealAssigneePercent],
  ]);

  // Load spread: one row per technician name, one bar per configuration (utilisation %).
  const names = Array.from(new Set(results.flatMap((r) => r.perTechnician.map((t) => t.name))));
  const spread: Group[] = names.map((n) => {
    const row: Group = { metric: n };
    results.forEach((r) => {
      const t = r.perTechnician.find((x) => x.name === n);
      if (t) row[r.name] = t.utilizationPercent;
    });
    return row;
  });

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
      <Card title="Time to resolve" note="Minutes; lower is better.">
        <GroupedBars data={times} results={results} unit=" min" />
      </Card>
      <Card title="SLA and fit" note="Percent of replayed incidents. Fewer violations is better.">
        <GroupedBars data={rates} results={results} unit="%" />
      </Card>
      {spread.length > 0 && (
        <Box sx={{ gridColumn: { lg: '1 / -1' } }}>
          <Card title="Load spread per technician" note="Share of the replay each technician was busy; an even spread means a fair split.">
            <GroupedBars data={spread} results={results} unit="%" />
          </Card>
        </Box>
      )}
    </Box>
  );
}
