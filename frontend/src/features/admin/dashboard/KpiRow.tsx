import { Box, Chip, Grid, LinearProgress, Paper, Stack, Typography, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Today as TodayIcon,
  FolderOpen as FolderIcon,
  WarningAmber as CriticalIcon,
  HourglassBottom as SlaIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { tokens, priorityColor } from '../../../theme/theme';
import { getLiveDashboard } from '../../../api/dashboard';
import { getOverview, getSlaCompliance } from '../../../api/reports';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { apiErrorMessage } from '../../../utils/errors';
import { lastDays } from './dates';
import { tone } from '../palette';

interface KpiProps {
  label: string;
  value: string | number;
  hint: string;
  color: string;
  to: string;
  icon: React.ReactNode;
  pill?: { text: string; color: string };
  secondary?: React.ReactNode;
  progress?: number;
}

function Kpi({ label, value, hint, color, to, icon, pill, secondary, progress }: KpiProps) {
  const navigate = useNavigate();
  return (
    <Paper
      role="link"
      tabIndex={0}
      onClick={() => navigate(to)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(to); }}
      sx={{
        p: 2.5,
        width: '100%',
        height: '100%',
        minHeight: 196,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flex: 1,
        cursor: 'pointer',
        bgcolor: tokens.surfaceContainerLow,
        background: `linear-gradient(180deg, ${alpha(color, 0.08)} 0%, ${alpha(tokens.surfaceContainerLow, 0.95)} 45%)`,
        border: `1px solid ${tokens.outlineVariant}`,
        borderTop: `3.5px solid ${color}`,
        borderRadius: '14px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        '&:hover, &:focus-visible': {
          borderColor: color,
          boxShadow: `0 8px 24px -4px ${alpha(color, 0.35)}`,
          transform: 'translateY(-2px)',
          outline: 'none',
        },
      }}
    >
      {/* Top Header Box: Row 1 = Label + Icon; Row 2 = Pill */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
          <Typography
            sx={{
              color: tokens.onSurfaceVariant,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              fontFamily: 'Sora, sans-serif',
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(color, 0.14),
              color: color,
              border: `1px solid ${alpha(color, 0.28)}`,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Box sx={{ minHeight: 22, display: 'flex', alignItems: 'center' }}>
          {pill && (
            <Chip
              size="small"
              label={pill.text}
              sx={{
                height: 20,
                fontSize: 10.5,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                bgcolor: alpha(pill.color, 0.15),
                color: pill.color,
                border: `1px solid ${alpha(pill.color, 0.35)}`,
              }}
            />
          )}
        </Box>
      </Box>

      {/* Middle Metric Row: Big Number */}
      <Box sx={{ my: 1 }}>
        <Typography
          sx={{
            color: tokens.onSurface,
            fontSize: 36,
            fontWeight: 800,
            lineHeight: 1.1,
            fontFamily: 'Sora, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </Typography>
      </Box>

      {/* Footer Row: Progress bar or Secondary note & Hint */}
      <Box sx={{ mt: 'auto', pt: 1.2, borderTop: `1px solid ${alpha(tokens.white, 0.05)}` }}>
        <Box sx={{ minHeight: 20, display: 'flex', alignItems: 'center', mb: 0.6 }}>
          {progress !== undefined ? (
            <Box sx={{ width: '100%' }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, Math.max(0, progress))}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: alpha(tokens.white, 0.08),
                  '& .MuiLinearProgress-bar': {
                    bgcolor: color,
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          ) : (
            secondary
          )}
        </Box>
        <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12, lineHeight: 1.3, minHeight: 18 }} noWrap>
          {hint}
        </Typography>
      </Box>
    </Paper>
  );
}

export function KpiRow() {
  const today = lastDays(1);
  const period = lastDays(30);
  const live = useQuery({ queryKey: ['dashboard', 'live'], queryFn: getLiveDashboard, refetchInterval: 30_000 });
  const todayOverview = useQuery({ queryKey: ['dashboard', 'overview-today', today.from], queryFn: () => getOverview(today), refetchInterval: 30_000 });
  const compliance = useQuery({ queryKey: ['dashboard', 'sla-compliance', period.from], queryFn: () => getSlaCompliance(period, 'priority') });

  if (live.isLoading) return <LoadingState />;
  if (live.isError || !live.data) {
    return (
      <ErrorState
        message={apiErrorMessage(live.error)}
        onRetry={() => { live.refetch(); todayOverview.refetch(); }}
      />
    );
  }
  const c = live.data.counters;
  const reportedToday = todayOverview.data?.total ?? 0;
  const resolvedToday = todayOverview.data?.resolved ?? 0;
  const rows = compliance.data ?? [];
  const judged = rows.reduce((a, r) => a + r.met + r.violated, 0);
  const met = rows.reduce((a, r) => a + r.met, 0);
  const complianceRate = judged > 0 ? Math.round((met / judged) * 1000) / 10 : 100;
  const complianceHint = compliance.isError
    ? 'Compliance unavailable'
    : judged > 0 ? `${complianceRate}% met, last 30 days` : 'No SLA results in the last 30 days';

  const byPriority = live.data.byPriority ?? [];
  const p2Count = byPriority.find((p) => p.label === 'P2')?.count ?? 0;
  const p3Count = byPriority.find((p) => p.label === 'P3')?.count ?? 0;
  const p4Count = byPriority.find((p) => p.label === 'P4')?.count ?? 0;

  return (
    <Grid container spacing={2} sx={{ mb: 3, alignItems: 'stretch' }}>
      {/* 1. Reported today */}
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
        <Kpi
          label="Reported Today"
          value={reportedToday}
          hint="Incidents created today"
          color={tokens.secondary}
          to="/admin/tickets?tab=today"
          icon={<TodayIcon sx={{ fontSize: 18 }} />}
          pill={{ text: '24h Activity', color: tokens.secondary }}
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <CheckIcon sx={{ fontSize: 13, color: priorityColor.P4 }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: priorityColor.P4, fontFamily: 'JetBrains Mono, monospace' }}>
                {resolvedToday} resolved today
              </Typography>
            </Box>
          }
        />
      </Grid>

      {/* 2. Open now */}
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
        <Kpi
          label="Open Now"
          value={c.open}
          hint={`${c.total} incidents in total`}
          color={tokens.primary}
          to="/admin/tickets?tab=all&status=ACTIVE"
          icon={<FolderIcon sx={{ fontSize: 18 }} />}
          pill={{ text: `${c.total} Total`, color: tokens.primaryLight }}
          secondary={
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: tokens.onSurfaceVariant }}>
                Queue:
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: priorityColor.P2 }}>
                {p2Count} P2
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: priorityColor.P3 }}>
                • {p3Count} P3
              </Typography>
              <Typography sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: priorityColor.P4 }}>
                • {p4Count} P4
              </Typography>
            </Stack>
          }
        />
      </Grid>

      {/* 3. SLA violations (shifted to 3rd column) */}
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
        <Kpi
          label="SLA Violations"
          value={c.slaViolations}
          hint={complianceHint}
          color={tone.caution}
          to="/admin/reports"
          icon={<SlaIcon sx={{ fontSize: 18 }} />}
          pill={{ text: `${complianceRate}% Met`, color: complianceRate >= 90 ? priorityColor.P4 : priorityColor.P2 }}
          progress={complianceRate}
          secondary={
            <Typography sx={{ fontSize: 11, color: tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
              {met} met / {judged} judged
            </Typography>
          }
        />
      </Grid>

      {/* 4. Critical (P1) (now 1st from the right!) */}
      <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
        <Kpi
          label="Critical (P1)"
          value={c.critical}
          hint={c.critical === 0 ? 'Zero active P1 emergency blockers' : 'Requires immediate SRE command'}
          color={tone.danger}
          to="/admin/tickets?tab=all&priority=P1"
          icon={<CriticalIcon sx={{ fontSize: 18 }} />}
          pill={{
            text: c.critical === 0 ? 'All Clear' : 'Active Alert',
            color: c.critical === 0 ? priorityColor.P4 : tone.danger,
          }}
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: c.critical === 0 ? priorityColor.P4 : tone.danger,
                  boxShadow: `0 0 6px ${c.critical === 0 ? priorityColor.P4 : tone.danger}`,
                }}
              />
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: c.critical === 0 ? priorityColor.P4 : tone.danger,
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {c.critical === 0 ? 'Target MTTR < 15m' : 'Sev-1 incident in progress'}
              </Typography>
            </Box>
          }
        />
      </Grid>
    </Grid>
  );
}
