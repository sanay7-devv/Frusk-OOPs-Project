import { Paper, Typography, Box, Stack } from '@mui/material';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { tokens } from '../../../theme/theme';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';

export const PRIORITY_COLORS: Record<string, string> = { P1: '#f43f5e', P2: '#fb923c', P3: '#f59e0b', P4: '#06b6d4' };
export const CHART_COLORS = { created: '#6366f1', resolved: '#10b981', met: '#10b981', violated: '#f43f5e', bar: '#6366f1' };
export const AXIS = { stroke: tokens.onSurfaceVariant, fontSize: 12 } as const;
export const TOOLTIP_STYLE = {
  background: tokens.surfaceContainerHigh, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 8, color: tokens.onSurface, fontSize: 12,
};

export interface DateRange { from: string; to: string }

/** Titled card; shows loading, error or empty state, otherwise the chart. */
export function ChartCard<T>({ title, query, isEmpty, emptyMessage, action, children }: {
  title: string; query: UseQueryResult<T>; isEmpty: (d: T) => boolean; emptyMessage: string;
  action?: ReactNode; children: (d: T) => ReactNode;
}) {
  let body: ReactNode;
  if (query.isLoading) body = <LoadingState />;
  else if (query.isError) body = <ErrorState message={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  else if (query.data === undefined || isEmpty(query.data)) body = <EmptyState message={emptyMessage} />;
  else body = children(query.data);
  return (
    <Paper sx={{ p: 2.5, height: '100%', bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={1} flexWrap="wrap">
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, color: tokens.onSurface }}>{title}</Typography>
        {action}
      </Stack>
      <Box>{body}</Box>
    </Paper>
  );
}
