import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { FastForward as AdvanceIcon, Warning as DrillIcon } from '@mui/icons-material';
import { advanceDemoClock, probeDemoClock, runOutageDrill, type DrillResult } from '../../api/demo';
import { requestRefresh } from '../../api/client';
import { getServices } from '../../api/services';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { formatDateTime } from '../../utils/format';
import { tokens } from '../../theme/theme';
import { failureMessage, reportFailure } from './adminErrors';

/**
 * Director's bar for the recorded demo: +10 min on the clock and an outage drill in one row.
 * Renders nothing unless the server answers the demo clock (404 on every other profile) and the user may change config.
 */
export default function DirectorBar({ defaultServiceId }: { defaultServiceId?: number | null }) {
  const { user } = useAuth();
  const allowed = !!user?.permissions?.includes('CONFIG_MANAGE');
  const clock = useQuery({ queryKey: ['demo-clock-probe'], queryFn: probeDemoClock, retry: false, enabled: allowed, staleTime: Infinity, refetchOnWindowFocus: false, refetchOnMount: false });
  if (!allowed || !clock.data) return null;
  return <Bar now={clock.data.now} defaultServiceId={defaultServiceId ?? null} />;
}

function Bar({ now, defaultServiceId }: { now: string; defaultServiceId: number | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [picked, setPicked] = useState('');
  const [drill, setDrill] = useState<DrillResult | null>(null);
  const services = useQuery({ queryKey: ['services'], queryFn: getServices });
  const serviceId = picked || (defaultServiceId != null ? String(defaultServiceId) : '');

  const advance = useMutation({
    mutationFn: () => advanceDemoClock(10),
    onSuccess: (view) => {
      qc.setQueryData(['demo-clock-probe'], view);
      toast('Clock moved forward 10 min', 'success');
      requestRefresh().catch((e) => toast(`Clock moved, but renewing the session failed: ${failureMessage(e)}`, 'error'));
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (e) => reportFailure(toast, e),
  });
  const start = useMutation({
    mutationFn: () => runOutageDrill(Number(serviceId)),
    onSuccess: (r) => {
      setDrill(r);
      toast('Outage drill started', 'success');
      qc.invalidateQueries({ queryKey: ['problems'] });
      qc.invalidateQueries({ queryKey: ['service-graph'] });
      qc.invalidateQueries({ queryKey: ['service-health'] });
    },
    onError: (e) => reportFailure(toast, e),
  });

  return (
    <Box sx={{ mb: 2, p: 1.5, borderRadius: '10px', border: `1px dashed ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography sx={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: tokens.onSurfaceVariant }}>Demo</Typography>
        <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>Clock {formatDateTime(now)}</Typography>
        <Button size="small" variant="outlined" disabled={advance.isPending} onClick={() => advance.mutate()}
          startIcon={advance.isPending ? <CircularProgress size={14} /> : <AdvanceIcon />} sx={{ textTransform: 'none' }}>
          +10 min
        </Button>
        <TextField select size="small" label="Failing service" value={serviceId} sx={{ minWidth: 200 }}
          onChange={(e) => setPicked(e.target.value)} error={services.isError} helperText={services.isError ? failureMessage(services.error) : undefined}>
          {(services.data ?? []).map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
        </TextField>
        <Button size="small" variant="contained" color="warning" disabled={!serviceId || start.isPending} onClick={() => start.mutate()}
          startIcon={start.isPending ? <CircularProgress size={14} /> : <DrillIcon />} sx={{ textTransform: 'none' }}>
          Start outage drill
        </Button>
        {drill?.problemId != null && (
          <Button size="small" component={Link} to={`/admin/problems/${drill.problemId}`} sx={{ textTransform: 'none' }}>
            Open the problem
          </Button>
        )}
      </Stack>
    </Box>
  );
}
