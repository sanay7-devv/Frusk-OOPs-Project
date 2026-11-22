import { Paper, Typography, Box, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { theme, tokens } from '../../../theme/theme';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';

const { palette } = theme;
export const PRIORITY_COLORS: Record<string, string> = {
  P1: palette.error.main, P2: palette.warning.main, P3: palette.warning.light, P4: palette.secondary.main,
};
export const CHART_COLORS = {
  created: palette.primary.main, resolved: palette.success.main, met: palette.success.main, violated: palette.error.main, bar: palette.primary.main,
};
export const AXIS = { stroke: tokens.onSurfaceVariant, fontSize: 12 } as const;
export const TOOLTIP_STYLE = {
  background: tokens.surfaceContainerHigh, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 8, color: tokens.onSurface, fontSize: 12,
};

export interface DateRange { from: string; to: string }

/** Titled card; shows loading, error or empty state, otherwise the chart. */
export function ChartCard<T>({
  title,
  query,
  isEmpty,
  emptyMessage,
  action,
  icon,
  badge,
  borderTopColor,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  isEmpty: (d: T) => boolean;
  emptyMessage: string;
  action?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  borderTopColor?: string;
  children: (d: T) => ReactNode;
}) {
  let body: ReactNode;
  if (query.isLoading) body = <LoadingState />;
  else if (query.isError) body = <ErrorState message={apiErrorMessage(query.error)} onRetry={() => query.refetch()} />;
  else if (query.data === undefined || isEmpty(query.data)) body = <EmptyState message={emptyMessage} />;
  else body = children(query.data);
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        bgcolor: tokens.surfaceContainerLow,
        border: `1px solid ${tokens.outlineVariant}`,
        borderTop: borderTopColor ? `3.5px solid ${borderTopColor}` : `1px solid ${tokens.outlineVariant}`,
        borderRadius: '14px',
        boxShadow: borderTopColor ? `0 4px 20px -4px ${alpha(borderTopColor, 0.12)}` : 'none',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} spacing={1} flexWrap="wrap">
        <Stack direction="row" alignItems="center" spacing={1.2}>
          {icon}
          <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 700, color: tokens.white, fontFamily: 'Sora, sans-serif' }}>
            {title}
          </Typography>
          {badge}
        </Stack>
        {action}
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}>{body}</Box>
    </Paper>
  );
}
