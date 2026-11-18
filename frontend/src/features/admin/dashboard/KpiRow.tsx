import { Grid, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../../../theme/theme';
import { getLiveDashboard } from '../../../api/dashboard';
import { getOverview, getSlaCompliance } from '../../../api/reports';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';
import { lastDays } from './dates';

function Kpi({ label, value, hint, color, to }: { label: string; value: string | number; hint: string; color: string; to: string }) {
  const navigate = useNavigate();
  return (
    <Paper
      role="link"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(to); }}
      sx={{
        p: 2.5, height: '100%', cursor: 'pointer', bgcolor: tokens.surfaceContainerLow,
        border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px', borderTop: `3px solid ${color}`,
        '&:hover, &:focus-visible': { borderColor: color, outline: 'none' },
      }}
    >
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ color: tokens.onSurface, fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>{value}</Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12 }}>{hint}</Typography>
    </Paper>
  );
}

export function KpiRow() {
  const today = lastDays(1);
  const period = lastDays(30);
  const live = useQuery({ queryKey: ['dashboard', 'live'], queryFn: getLiveDashboard, refetchInterval: 30_000 });
  const todayOverview = useQuery({ queryKey: ['dashboard', 'overview-today', today.from], queryFn: () => getOverview(today), refetchInterval: 30_000 });
  const compliance = useQuery({ queryKey: ['dashboard', 'sla-compliance', period.from], queryFn: () => getSlaCompliance(period, 'priority') });

  if (live.isLoading || todayOverview.isLoading) return <LoadingState />;
  if (live.isError || todayOverview.isError || !live.data || !todayOverview.data) {
    return (
      <ErrorState
        message={apiErrorMessage(live.error ?? todayOverview.error)}
        onRetry={() => { live.refetch(); todayOverview.refetch(); }}
      />
    );
  }
  const c = live.data.counters;
  const rows = compliance.data ?? [];
  const judged = rows.reduce((a, r) => a + r.met + r.violated, 0);
  const met = rows.reduce((a, r) => a + r.met, 0);
  const complianceHint = compliance.isError
    ? 'Compliance unavailable'
    : judged > 0 ? `${Math.round((met / judged) * 1000) / 10}% met, last 30 days` : 'No SLA results in the last 30 days';

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Kpi label="Reported today" value={todayOverview.data.total} hint="Incidents created today" color={tokens.secondary} to="/admin/tickets?tab=today" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Kpi label="Open now" value={c.open} hint={`${c.total} incidents in total`} color={tokens.primary} to="/admin/tickets?tab=all&status=ACTIVE" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Kpi label="Critical (P1)" value={c.critical} hint="Open P1 incidents" color="#f43f5e" to="/admin/tickets?tab=all&priority=P1" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Kpi label="SLA violations" value={c.slaViolations} hint={complianceHint} color="#fb923c" to="/admin/reports" />
      </Grid>
    </Grid>
  );
}
