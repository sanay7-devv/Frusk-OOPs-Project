import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiveDashboard } from '../../api/dashboard';
import { getServiceHealthBoard, type ServiceHealth } from '../../api/services';
import { useAuth } from '../../auth/AuthContext';
import IncidentHeatmap from '../../components/IncidentHeatmap';
import LiveEventPulse from '../../components/LiveEventPulse';
import PriorityBadge from '../../components/PriorityBadge';
import RealtimeStatusPill from '../../components/RealtimeStatusPill';
import ServiceGraphMinimap from '../../components/ServiceGraphMinimap';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { slaStateColor, slaStateLabel, tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';

const REFRESH_MS = 15_000;

const HEALTH_COLOR: Record<ServiceHealth, string> = {
  OUTAGE: tokens.danger,
  DEGRADED: tokens.amber,
  HEALTHY: tokens.success,
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Paper
      component="section"
      aria-label={title}
      sx={{ p: 2, bgcolor: alpha(tokens.surfaceContainerLow, 0.8), border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}
    >
      <Typography component="h2" sx={{ fontSize: 14, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function Big({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <Box sx={{ flex: '1 1 140px', p: 2, borderRadius: '12px', bgcolor: alpha(color, 0.1), border: `1px solid ${alpha(color, 0.35)}` }}>
      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</Typography>
      <Typography sx={{ fontSize: 48, lineHeight: 1.1, fontWeight: 800, color, fontFamily: tokens.fontHeading }}>{value}</Typography>
    </Box>
  );
}

/** Full-screen NOC view: refreshes itself every 15 s and on every dashboard push from the server. */
export default function Wallboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [fsError, setFsError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  const allowed = !!user?.permissions?.includes('REPORT_VIEW');
  const live = useQuery({ queryKey: ['dashboard', 'wallboard', 'live'], queryFn: getLiveDashboard, refetchInterval: REFRESH_MS, enabled: allowed });
  const board = useQuery({ queryKey: ['dashboard', 'wallboard', 'services'], queryFn: getServiceHealthBoard, refetchInterval: REFRESH_MS, enabled: allowed });

  const toggleFullscreen = async () => {
    setFsError(null);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (e) {
      setFsError(e instanceof Error ? e.message : 'Full screen is not available in this browser.');
    }
  };

  if (!allowed) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography component="h1" variant="h5">Wallboard</Typography>
        <Typography sx={{ color: tokens.onSurfaceVariant, mt: 1 }}>You need the report permission to open the wallboard.</Typography>
      </Box>
    );
  }

  const byPriority = live.data?.byPriority ?? [];
  const count = (label: string) => byPriority.find((p) => p.label === label)?.count ?? 0;
  const atRisk = live.data?.atRisk ?? [];
  const services = board.data?.services ?? [];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: tokens.background, color: tokens.onSurface, p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography component="h1" sx={{ fontFamily: tokens.fontHeading, fontWeight: 800, fontSize: 28, flexGrow: 1 }}>
          Operations wallboard
        </Typography>
        <RealtimeStatusPill />
        <Typography aria-label="Current time" sx={{ fontFamily: tokens.fontMono, fontSize: 20 }}>{format(now, 'HH:mm:ss')}</Typography>
        <Button variant="outlined" onClick={toggleFullscreen}>{fullscreen ? 'Exit full screen' : 'Full screen'}</Button>
        <Button variant="outlined" onClick={() => navigate('/admin/dashboard')}>Back to dashboard</Button>
      </Box>
      {fsError && <Typography role="alert" sx={{ fontSize: 13, color: tokens.danger }}>{fsError}</Typography>}

      {live.isLoading && <LoadingState />}
      {live.isError && <ErrorState message={apiErrorMessage(live.error)} onRetry={() => live.refetch()} />}

      {live.data && (
        <>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Big label="Open incidents" value={live.data.counters.open} color={tokens.secondaryLight} />
            <Big label="P1 open" value={count('P1')} color={tokens.priority.P1} />
            <Big label="P2 open" value={count('P2')} color={tokens.priority.P2} />
            <Big label="P3 open" value={count('P3')} color={tokens.priority.P3} />
            <Big label="P4 open" value={count('P4')} color={tokens.priority.P4} />
            <Big label="SLA violations" value={live.data.counters.slaViolations} color={slaStateColor.VIOLATED} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' } }}>
            <Panel title="Nearest to missing SLA">
              {!atRisk.length && <Typography sx={{ color: tokens.onSurfaceVariant }}>No open incident is close to its SLA deadline.</Typography>}
              {atRisk.map((i) => (
                <Box
                  key={i.id}
                  component="button"
                  type="button"
                  onClick={() => navigate(`/admin/incidents/${i.id}`)}
                  sx={{ display: 'flex', width: '100%', alignItems: 'center', gap: 1.5, p: 1, mb: 0.6, border: 0, borderRadius: '8px', bgcolor: tokens.hover, color: tokens.onSurface, textAlign: 'left', cursor: 'pointer' }}
                >
                  <PriorityBadge priority={i.priority} />
                  <Typography sx={{ fontFamily: tokens.fontMono, fontWeight: 700, fontSize: 14 }}>{i.code}</Typography>
                  <Typography sx={{ flexGrow: 1, fontSize: 14 }} noWrap>{i.title}</Typography>
                  <Chip
                    size="small"
                    label={slaStateLabel[i.slaState]}
                    sx={{ fontSize: 12, color: slaStateColor[i.slaState], bgcolor: alpha(slaStateColor[i.slaState], 0.15) }}
                  />
                </Box>
              ))}
            </Panel>

            <Panel title="Service status">
              {board.isLoading && <LoadingState />}
              {board.isError && <ErrorState message={apiErrorMessage(board.error)} onRetry={() => board.refetch()} />}
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
                {services.map((s) => (
                  <Box key={s.id} sx={{ p: 1.2, borderRadius: '8px', border: `1px solid ${alpha(HEALTH_COLOR[s.status], 0.5)}`, bgcolor: alpha(HEALTH_COLOR[s.status], 0.1) }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>{s.name}</Typography>
                    <Typography sx={{ fontSize: 12, color: HEALTH_COLOR[s.status], fontWeight: 700 }}>{s.status}</Typography>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{s.open.total} open{s.open.P1 ? `, ${s.open.P1} P1` : ''}</Typography>
                  </Box>
                ))}
              </Box>
              {board.data && <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 1 }}>{board.data.label}</Typography>}
            </Panel>
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr 280px' } }}>
            <Panel title="Live events"><LiveEventPulse max={8} onSelect={(id) => navigate(`/admin/incidents/${id}`)} /></Panel>
            <Panel title="Incidents per day"><IncidentHeatmap days={98} /></Panel>
            <Panel title="Dependencies"><ServiceGraphMinimap size={240} onSelect={() => navigate('/admin/services/graph')} /></Panel>
          </Box>
        </>
      )}
    </Box>
  );
}
