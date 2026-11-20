import { Box, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { useMemo } from 'react';
import { getTrends } from '../api/reports';
import { tokens } from '../theme/theme';
import { apiErrorMessage } from '../utils/errors';
import { EmptyState, ErrorState, LoadingState } from './StateViews';

export interface IncidentHeatmapProps {
  /** How many days back from today to show (default 98 = 14 weeks). */
  days?: number;
  /** Called with the day (yyyy-MM-dd) when a cell is clicked, for example to filter the incident list. */
  onSelectDay?: (day: string) => void;
}

const CELL = 16;
const GAP = 3;
const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

/**
 * Calendar heatmap of incident volume per day, from `GET /reports/trends` (bucket=day, field `created`).
 * Days the server does not return are drawn empty (zero incidents).
 */
export default function IncidentHeatmap({ days = 98, onSelectDay }: IncidentHeatmapProps) {
  const range = useMemo(() => {
    const today = new Date();
    return { from: startOfDay(subDays(today, days - 1)), to: endOfDay(today) };
  }, [days]);

  const q = useQuery({
    queryKey: ['reports', 'trends', 'heatmap', days],
    queryFn: () => getTrends({ from: range.from.toISOString(), to: range.to.toISOString() }, 'day'),
    refetchInterval: 60_000,
  });

  const grid = useMemo(() => {
    const byDay = new Map<string, number>();
    (q.data ?? []).forEach((p) => byDay.set(p.date.slice(0, 10), p.created));
    // Column = week (Monday first), row = weekday.
    const cells: { day: string; count: number; col: number; row: number }[] = [];
    const firstOffset = (range.from.getDay() + 6) % 7;
    for (let i = 0; i < days; i++) {
      const d = addDays(range.from, i);
      const idx = i + firstOffset;
      const key = format(d, 'yyyy-MM-dd');
      cells.push({ day: key, count: byDay.get(key) ?? 0, col: Math.floor(idx / 7), row: idx % 7 });
    }
    const max = Math.max(1, ...cells.map((c) => c.count));
    return { cells, max, cols: Math.floor((days - 1 + firstOffset) / 7) + 1 };
  }, [q.data, range, days]);

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data?.length) return <EmptyState message="No incidents in this period." />;

  const shade = (count: number) =>
    count === 0 ? tokens.hover : alpha(tokens.secondary, 0.2 + 0.8 * (count / grid.max));
  const total = grid.cells.reduce((s, c) => s + c.count, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateRows: `repeat(7, ${CELL}px)`, gap: `${GAP}px`, pt: 0 }}>
          {WEEKDAYS.map((w, i) => (
            <Typography key={i} sx={{ fontSize: 12, lineHeight: `${CELL}px`, color: tokens.onSurfaceVariant }}>
              {w}
            </Typography>
          ))}
        </Box>
        <Box
          role="img"
          aria-label={`Incidents created per day over the last ${days} days, ${total} in total`}
          sx={{
            display: 'grid',
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            gridAutoFlow: 'column',
            gridAutoColumns: `${CELL}px`,
            gap: `${GAP}px`,
          }}
        >
          {grid.cells.map((c) => (
            <Tooltip key={c.day} title={`${c.day}: ${c.count} incident${c.count === 1 ? '' : 's'}`}>
              <Box
                component={onSelectDay ? 'button' : 'div'}
                type={onSelectDay ? 'button' : undefined}
                onClick={onSelectDay ? () => onSelectDay(c.day) : undefined}
                aria-label={`${c.day}: ${c.count} incidents`}
                sx={{
                  gridColumn: c.col + 1,
                  gridRow: c.row + 1,
                  width: CELL,
                  height: CELL,
                  p: 0,
                  border: 0,
                  borderRadius: '3px',
                  bgcolor: shade(c.count),
                  cursor: onSelectDay ? 'pointer' : 'default',
                }}
              />
            </Tooltip>
          ))}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Fewer</Typography>
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <Box key={r} sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: r === 0 ? tokens.hover : alpha(tokens.secondary, 0.2 + 0.8 * r) }} />
        ))}
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>More (max {grid.max} a day)</Typography>
      </Box>
    </Box>
  );
}
