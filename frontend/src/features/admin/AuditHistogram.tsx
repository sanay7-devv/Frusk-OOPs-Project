import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AuditEntryView } from '../../api/audit';
import { tokens } from '../../theme/theme';

const HOUR = 3600_000;

interface Bucket {
  start: number;
  label: string;
  count: number;
}

/** Counts the given records per clock hour (viewer's time zone), including empty hours between the first and the last. */
export function bucketByHour(items: AuditEntryView[]): Bucket[] {
  if (items.length === 0) return [];
  const counts = new Map<number, number>();
  for (const e of items) {
    const t = new Date(e.timestamp);
    t.setMinutes(0, 0, 0);
    counts.set(t.getTime(), (counts.get(t.getTime()) ?? 0) + 1);
  }
  const keys = [...counts.keys()];
  const first = Math.min(...keys);
  const last = Math.max(...keys);
  const out: Bucket[] = [];
  for (let t = first; t <= last; t += HOUR) {
    const d = new Date(t);
    out.push({
      start: t,
      label: `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${String(d.getHours()).padStart(2, '0')}:00`,
      count: counts.get(t) ?? 0,
    });
  }
  return out;
}

export default function AuditHistogram({ items }: { items: AuditEntryView[] }) {
  const data = useMemo(() => bucketByHour(items), [items]);
  if (data.length === 0) return null;
  return (
    <Box sx={{ mb: 2, p: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: tokens.onSurface }}>Events per hour</Typography>
      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 1 }}>
        Counted from the {items.length} records on this page, in your local time.
      </Typography>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={tokens.outlineVariant} vertical={false} />
          <XAxis dataKey="label" stroke={tokens.onSurfaceVariant} fontSize={12} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} stroke={tokens.onSurfaceVariant} fontSize={12} />
          <Tooltip
            contentStyle={{ background: tokens.surfaceContainerHigh, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="count" name="Events" fill={tokens.primary} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
