import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, PlayArrow as RunIcon, DoneAll as ApplyIcon } from '@mui/icons-material';
import { getAdminConfig, type ConfigItem } from '../../api/admin';
import {
  applySimulation, runSimulation, SIM_LIMITS, SIM_STRATEGIES, WEIGHT_NAMES, type ConfigurationView, type SimStrategy,
  type SimulationView, type WeightName,
} from '../../api/simulations';
import { useAuth } from '../../auth/AuthContext';
import { apiErrorMessage } from '../../utils/errors';
import { tokens } from '../../theme/theme';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';
import ResultCharts, { SERIES } from './simulator/ResultCharts';
import { hasErrors, toRequest, validateRun, type ConfigDraft, type RunDraft } from './simulator/validation';
import { reportFailure } from './adminErrors';

// Live setting keys behind the five weights (ConfigKey on the backend).
const WEIGHT_CONFIG_KEY: Record<WeightName, string> = {
  skill: 'assignment.weight.skill', load: 'assignment.weight.load', experience: 'assignment.weight.experience',
  priorityFit: 'assignment.weight.priority', familiarity: 'assignment.weight.familiarity',
};
const WEIGHT_LABEL: Record<WeightName, string> = {
  skill: 'Skill', load: 'Load', experience: 'Experience', priorityFit: 'Priority fit', familiarity: 'Familiarity',
};
const mono = { fontFamily: 'JetBrains Mono, monospace', fontSize: 12 } as const;
const fmt = (n: number, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toString();

let nextKey = 1;
function liveDraft(items: ConfigItem[], name: string): ConfigDraft {
  const v = (k: string) => items.find((i) => i.key === k)?.value;
  const strategy = v('assignment.strategy') as SimStrategy | undefined;
  const weights = {} as Record<WeightName, string>;
  for (const w of WEIGHT_NAMES) weights[w] = v(WEIGHT_CONFIG_KEY[w]) ?? '';
  return {
    key: nextKey++, name, strategy: strategy && SIM_STRATEGIES.includes(strategy) ? strategy : 'COMPOSITE',
    technicians: '', weights,
  };
}

export default function Simulator() {
  const { user } = useAuth();
  if (!user?.permissions?.includes('CONFIG_MANAGE')) {
    return <EmptyState message="The simulator needs the CONFIG_MANAGE permission." />;
  }
  return <SimulatorScreen />;
}

function SimulatorScreen() {
  const cfg = useQuery({ queryKey: ['admin-config-settings'], queryFn: getAdminConfig });
  if (cfg.isLoading) return <LoadingState />;
  if (cfg.isError) return <ErrorState message={apiErrorMessage(cfg.error)} onRetry={() => cfg.refetch()} />;
  if (!cfg.data) return <EmptyState message="The live settings are not available." />;
  return <SimulatorForm live={cfg.data} />;
}

function SimulatorForm({ live }: { live: ConfigItem[] }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState<RunDraft>(() => ({
    lastIncidents: '100', speedUp: '1', configs: [liveDraft(live, 'Current settings')],
  }));
  const [result, setResult] = useState<SimulationView | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ConfigurationView | null>(null);

  const errors = useMemo(() => validateRun(draft), [draft]);
  const invalid = hasErrors(errors);

  const run = useMutation({
    mutationFn: () => runSimulation(toRequest(draft)),
    onSuccess: (r) => setResult(r),
    onError: (e) => reportFailure(toast, e),
  });
  const apply = useMutation({
    mutationFn: (c: ConfigurationView) => applySimulation({
      strategy: c.strategy as SimStrategy,
      weights: Object.fromEntries(WEIGHT_NAMES.map((w) => [w, Number(c.weights[w])])),
    }),
    onSuccess: (_d, c) => {
      toast(`"${c.name}" is now the live assignment setting`, 'success');
      setApplyTarget(null);
      qc.invalidateQueries({ queryKey: ['admin-config-settings'] });
    },
    onError: (e) => reportFailure(toast, e),
  });

  const patch = (key: number, p: Partial<ConfigDraft>) =>
    setDraft((d) => ({ ...d, configs: d.configs.map((c) => (c.key === key ? { ...c, ...p } : c)) }));
  const addConfig = () =>
    setDraft((d) => ({ ...d, configs: [...d.configs, liveDraft(live, `Configuration ${d.configs.length + 1}`)] }));
  const removeConfig = (key: number) => setDraft((d) => ({ ...d, configs: d.configs.filter((c) => c.key !== key) }));
  const submit = () => {
    setShowErrors(true);
    if (!invalid) run.mutate();
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.onSurface }}>Service Desk Simulator</Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, mb: 2, fontSize: 14 }}>
        Replay recent incidents in memory under up to {SIM_LIMITS.maxConfigurations} assignment setups and compare them.
        Nothing is written until you apply a winner. Each setup starts from the live settings.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Last incidents to replay" size="small" value={draft.lastIncidents}
            onChange={(e) => setDraft({ ...draft, lastIncidents: e.target.value })}
            error={showErrors && !!errors.lastIncidents}
            helperText={showErrors && errors.lastIncidents ? errors.lastIncidents : `${SIM_LIMITS.incidentsMin} to ${SIM_LIMITS.incidentsMax}`}
            sx={{ minWidth: 220 }}
          />
          <TextField
            label="Speed-up (arrival compression)" size="small" value={draft.speedUp}
            onChange={(e) => setDraft({ ...draft, speedUp: e.target.value })}
            error={showErrors && !!errors.speedUp}
            helperText={showErrors && errors.speedUp ? errors.speedUp : `${SIM_LIMITS.speedUpMin} to ${SIM_LIMITS.speedUpMax}; above 1 simulates an outage storm`}
            sx={{ minWidth: 260 }}
          />
        </Stack>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: `repeat(${Math.min(draft.configs.length, 3)}, 1fr)` } }}>
          {draft.configs.map((c, i) => {
            const ce = errors.configs[i] ?? {};
            return (
              <Box key={c.key} sx={{ p: 2, borderRadius: 2, border: `1px solid ${tokens.outlineVariant}`, borderTop: `3px solid ${SERIES[i % SERIES.length]}` }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Setup {i + 1}</Typography>
                  {draft.configs.length > 1 && (
                    <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => removeConfig(c.key)}>Remove</Button>
                  )}
                </Stack>
                <Stack spacing={1.5}>
                  <TextField label="Name" size="small" value={c.name} onChange={(e) => patch(c.key, { name: e.target.value })}
                    error={showErrors && !!ce.name} helperText={showErrors ? ce.name : undefined} />
                  <TextField select label="Strategy" size="small" value={c.strategy}
                    onChange={(e) => patch(c.key, { strategy: e.target.value as SimStrategy })}>
                    {SIM_STRATEGIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                  <TextField label="Technicians (first N, empty = all)" size="small" value={c.technicians}
                    onChange={(e) => patch(c.key, { technicians: e.target.value })}
                    error={showErrors && !!ce.technicians}
                    helperText={showErrors && ce.technicians ? ce.technicians : `${SIM_LIMITS.techniciansMin} to ${SIM_LIMITS.techniciansMax}`} />
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Weights (used by COMPOSITE; must add up to 1.0)
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {WEIGHT_NAMES.map((w) => (
                      <TextField key={w} label={WEIGHT_LABEL[w]} size="small" value={c.weights[w]}
                        onChange={(e) => patch(c.key, { weights: { ...c.weights, [w]: e.target.value } })}
                        error={showErrors && !!ce.weights?.[w]} helperText={showErrors ? ce.weights?.[w] : undefined} />
                    ))}
                  </Box>
                  {ce.weightSum && <Alert severity={showErrors ? 'error' : 'warning'} sx={{ fontSize: 12 }}>{ce.weightSum}</Alert>}
                </Stack>
              </Box>
            );
          })}
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }} alignItems="center">
          <Button startIcon={<AddIcon />} onClick={addConfig} disabled={draft.configs.length >= SIM_LIMITS.maxConfigurations}>
            Add setup
          </Button>
          <Button variant="contained" onClick={submit} disabled={run.isPending}
            startIcon={run.isPending ? <CircularProgress size={16} /> : <RunIcon />}>
            Run simulation
          </Button>
        </Stack>
      </Paper>

      {run.isPending && <LoadingState />}
      {result && !run.isPending && <Results result={result} onApply={setApplyTarget} />}

      <ConfirmDialog
        open={!!applyTarget}
        title="Apply to live settings?"
        description={applyTarget
          ? `"${applyTarget.name}": strategy ${applyTarget.strategy} and its five weights become the live assignment settings for all new incidents. This is audited as CONFIG_CHANGED.`
          : undefined}
        confirmLabel="Apply"
        isLoading={apply.isPending}
        onConfirm={() => applyTarget && apply.mutate(applyTarget)}
        onClose={() => setApplyTarget(null)}
      />
    </Box>
  );
}

function Results({ result, onApply }: { result: SimulationView; onApply: (c: ConfigurationView) => void }) {
  const { workload, results, best, bestReason, assumptions } = result;
  if (results.length === 0 || workload.incidents === 0) {
    return <EmptyState message="There were no replayable incidents. Create or close some incidents, then run again." />;
  }
  const excluded = Object.entries(workload.excluded ?? {});
  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Replayed workload</Typography>
        <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant }}>
          {workload.incidents} incidents
          {workload.from && workload.to ? `, ${new Date(workload.from).toLocaleString()} to ${new Date(workload.to).toLocaleString()}` : ''}
          , arrivals compressed ×{workload.speedUp}.
          {excluded.length > 0 && ` Left out: ${excluded.map(([k, n]) => `${n} ${k}`).join('; ')}.`}
        </Typography>
        {best && (
          <Alert severity="success" sx={{ mt: 1.5 }}>
            <strong>Best: {best}.</strong> {bestReason}
          </Alert>
        )}
      </Paper>

      <ResultCharts results={results} />

      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Setup</TableCell><TableCell align="right">SLA violations</TableCell>
              <TableCell align="right">Mean wait (min)</TableCell><TableCell align="right">Mean resolve (min)</TableCell>
              <TableCell align="right">p90 resolve (min)</TableCell><TableCell align="right">Unassigned</TableCell>
              <TableCell align="right">Fairness</TableCell><TableCell align="right">Matches real</TableCell><TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((r, i) => (
              <TableRow key={r.name}>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: SERIES[i % SERIES.length] }} />
                    <span>{r.name}</span>
                    <Chip size="small" label={r.strategy} sx={{ ...mono }} />
                    {r.name === best && <Chip size="small" color="success" label="best" />}
                  </Stack>
                </TableCell>
                <TableCell align="right">{r.slaViolations} of {r.incidents} ({fmt(r.slaViolationPercent, 2)}%)</TableCell>
                <TableCell align="right">{fmt(r.meanWaitMinutes)}</TableCell>
                <TableCell align="right">{fmt(r.meanResolveMinutes)}</TableCell>
                <TableCell align="right">{fmt(r.p90ResolveMinutes)}</TableCell>
                <TableCell align="right">{r.unassigned}</TableCell>
                <TableCell align="right" title="Jain's index: 1.0 is perfectly even">{fmt(r.fairness, 2)}</TableCell>
                <TableCell align="right">{fmt(r.matchesRealAssigneePercent)}%</TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<ApplyIcon />} onClick={() => onApply(r)}>Apply</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 600, mb: 1 }}>Assumptions</Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5, color: tokens.onSurfaceVariant, fontSize: 14 }}>
          {assumptions.map((a) => <li key={a}>{a}</li>)}
        </Box>
      </Paper>
    </Stack>
  );
}
