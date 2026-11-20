import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { FastForward as AdvanceIcon, Warning as DrillIcon } from '@mui/icons-material';
import {
  ADVANCE_MAX, ADVANCE_MIN, advanceDemoClock, getDemoClock, isDemoUnavailable, runOutageDrill, type DrillResult,
} from '../../api/demo';
import { requestRefresh } from '../../api/client';
import { getServices } from '../../api/services';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../utils/errors';
import { tokens } from '../../theme/theme';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { reportFailure } from './adminErrors';

const QUICK = [10, 60, 240];

export default function DemoControls() {
  const { user } = useAuth();
  if (!user?.permissions?.includes('CONFIG_MANAGE')) {
    return <EmptyState message="Demo controls need the CONFIG_MANAGE permission." />;
  }
  return <DemoScreen />;
}

function DemoScreen() {
  const clock = useQuery({ queryKey: ['demo-clock'], queryFn: getDemoClock, retry: false });
  if (clock.isLoading) return <LoadingState />;
  if (clock.isError && isDemoUnavailable(clock.error)) {
    return (
      <Box>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: tokens.onSurface, mb: 2 }}>Demo controls</Typography>
        <EmptyState message="Demo controls are only available on the demo profile. Start the backend with SPRING_PROFILES_ACTIVE=demo to use the clock and the outage drill." />
      </Box>
    );
  }
  if (clock.isError) return <ErrorState message={apiErrorMessage(clock.error)} onRetry={() => clock.refetch()} />;
  if (!clock.data) return <EmptyState message="The demo clock did not answer." />;
  return <DemoPanels now={clock.data.now} offsetMinutes={clock.data.offsetMinutes} />;
}

function DemoPanels({ now, offsetMinutes }: { now: string; offsetMinutes: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [minutes, setMinutes] = useState('10');
  const [serviceId, setServiceId] = useState('');
  const [drill, setDrill] = useState<DrillResult | null>(null);

  const m = Number(minutes);
  const minutesBad = minutes.trim() === '' || !Number.isInteger(m) || m < ADVANCE_MIN || m > ADVANCE_MAX;

  const services = useQuery({ queryKey: ['services'], queryFn: getServices });

  const advance = useMutation({
    mutationFn: (by: number) => advanceDemoClock(by),
    onSuccess: (view, by) => {
      qc.setQueryData(['demo-clock'], view);
      toast(`Clock moved forward ${by} min`, 'success');
      // The access token is checked against the same clock: renew it so the session survives a big jump.
      requestRefresh().catch((e) => toast(`Clock moved, but renewing the session failed: ${apiErrorMessage(e)}`, 'error'));
    },
    onError: (e) => reportFailure(toast, e),
  });
  const startDrill = useMutation({
    mutationFn: () => runOutageDrill(Number(serviceId)),
    onSuccess: (r) => {
      setDrill(r);
      toast('Outage drill started', 'success');
    },
    onError: (e) => reportFailure(toast, e),
  });

  return (
    <Box>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: tokens.onSurface }}>Demo controls</Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, mb: 2, fontSize: 14 }}>
        Aids for the recorded demo; they exist only on the demo profile. Each action is written to the audit trail.
      </Typography>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Demo clock</Typography>
          <Typography sx={{ fontSize: 14 }}>Application time: <strong>{new Date(now).toLocaleString()}</strong></Typography>
          <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mb: 2 }}>
            {offsetMinutes} min ahead of real time
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            {QUICK.map((q) => (
              <Button key={q} variant="outlined" size="small" disabled={advance.isPending} onClick={() => advance.mutate(q)}>
                +{q >= 60 ? `${q / 60} h` : `${q} min`}
              </Button>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small" label="Minutes to advance" value={minutes} onChange={(e) => setMinutes(e.target.value)}
              error={minutesBad} helperText={minutesBad ? `Whole number from ${ADVANCE_MIN} to ${ADVANCE_MAX}` : `${ADVANCE_MIN} to ${ADVANCE_MAX}; never backwards`}
            />
            <Button variant="contained" disabled={minutesBad || advance.isPending} onClick={() => advance.mutate(m)}
              startIcon={advance.isPending ? <CircularProgress size={16} /> : <AdvanceIcon />} sx={{ mt: 0.25 }}>
              Advance
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Outage drill</Typography>
          <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mb: 2 }}>
            Files two incidents on the failing service and one on each service that depends on it, so Major Incident Mode starts in one click.
          </Typography>
          {services.isLoading && <LoadingState />}
          {services.isError && <ErrorState message={apiErrorMessage(services.error)} onRetry={() => services.refetch()} />}
          {services.data && (
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField select size="small" label="Failing service" value={serviceId} sx={{ minWidth: 220 }}
                onChange={(e) => setServiceId(e.target.value)}>
                {services.data.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
              </TextField>
              <Button variant="contained" color="warning" disabled={!serviceId || startDrill.isPending}
                startIcon={startDrill.isPending ? <CircularProgress size={16} /> : <DrillIcon />} sx={{ mt: 0.25 }}
                onClick={() => startDrill.mutate()}>
                Start drill
              </Button>
            </Stack>
          )}
          {drill && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <div><strong>{drill.rootService.name}</strong> is down; {drill.incidentCodes.length} incidents filed ({drill.incidentCodes.join(', ')}).</div>
              {drill.dependents.length > 0 && <div>Dependents: {drill.dependents.map((d) => d.name).join(', ')}.</div>}
              <div>{drill.note}</div>
              {drill.problemId != null && (
                <Button component={Link} to={`/admin/problems/${drill.problemId}`} size="small" sx={{ mt: 1 }}>Open the problem</Button>
              )}
            </Alert>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
