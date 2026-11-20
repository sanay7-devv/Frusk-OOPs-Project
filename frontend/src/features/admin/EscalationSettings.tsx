import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import {
  createAdminEscalationPolicy, deleteAdminEscalationPolicy, getAdminConfig, getAdminEscalationPolicies, updateAdminConfig,
  updateAdminEscalationPolicy, type AdminEscalationPolicy,
} from '../../api/admin';
import PriorityBadge from '../../components/PriorityBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage, fieldErrors } from '../../utils/errors';
import { alpha } from './palette';
import { reportFailure, failureMessage } from './adminErrors';

const POLICIES_KEY = ['admin-escalation-policies'];
const SIBLING_KEYS: string[][] = [];
const CONFIG_KEY = ['admin-config-settings'];

// Who an incident is escalated to at each level (docs/SYSTEM_GUIDE.md section 7.5 and the escalation module).
const TARGETS: Record<number, string> = { 1: 'Team Lead', 2: 'System Admin', 3: 'IT Manager' };
const PRIORITIES = ['P1', 'P2'] as const; // the server only allows escalation levels for P1 and P2
const MAX_LEVEL = 3;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 1440;

const headSx = { fontWeight: 700, color: tokens.onSurfaceVariant, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' };
const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface },
  '& fieldset': { borderColor: tokens.outlineVariant },
  '& .MuiFormHelperText-root': { fontSize: 12 },
};

function waitText(p: AdminEscalationPolicy) {
  return p.level === 1
    ? `${p.timeoutMinutes} min unacknowledged by the technician`
    : `${p.timeoutMinutes} min unacknowledged at level ${p.level - 1} (${TARGETS[p.level - 1] ?? `level ${p.level - 1}`})`;
}

function fieldMap(e: unknown): Record<string, string> {
  return Object.fromEntries(fieldErrors(e).map((f) => [f.field, f.message]));
}

interface EditState { policy: AdminEscalationPolicy | null; priority: string; level: number; timeout: string }

function PolicyDialog({ state, highestOf, onClose, onSaved }: { state: EditState; highestOf: (priority: string) => number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [priority, setPriority] = useState(state.priority);
  const [timeout, setTimeoutValue] = useState(state.timeout);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const editing = state.policy !== null;
  const level = editing ? state.level : highestOf(priority) + 1;

  const save = useMutation({
    mutationFn: () => {
      const body = { priority, level, timeoutMinutes: Number(timeout) };
      return editing ? updateAdminEscalationPolicy(state.policy!.id, body) : createAdminEscalationPolicy(body);
    },
    onSuccess: () => {
      toast(editing ? `${priority} level ${level} updated` : `${priority} level ${level} added`, 'success');
      onSaved();
    },
    onError: (e) => {
      setErrors(fieldMap(e));
      setFormError(failureMessage(e));
    },
  });

  const n = Number(timeout);
  const timeoutInvalid = timeout.trim() === '' || !Number.isInteger(n) || n < TIMEOUT_MIN || n > TIMEOUT_MAX;
  const timeoutError = errors.timeoutMinutes ?? (timeout !== '' && timeoutInvalid ? `Whole minutes from ${TIMEOUT_MIN} to ${TIMEOUT_MAX}` : undefined);

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, color: tokens.onSurface } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{editing ? `Edit ${state.priority} level ${level}` : 'Add escalation level'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} mt={0.5}>
          {!editing && (
            <TextField select label="Priority" size="small" value={priority} onChange={(e) => setPriority(e.target.value)} error={!!errors.priority} helperText={errors.priority} sx={fieldSx}>
              {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
          )}
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            {level <= MAX_LEVEL ? `Level ${level}: escalates to the ${TARGETS[level]}.` : ''}
            {level > MAX_LEVEL && <Box component="span" sx={{ color: tokens.tertiaryLight }}> {priority} already has all {MAX_LEVEL} levels.</Box>}
            {errors.level && <Box component="span" sx={{ color: tokens.tertiaryLight }}> {errors.level}</Box>}
          </Typography>
          <TextField
            label="Minutes before escalating" type="number" size="small" fullWidth autoFocus value={timeout}
            onChange={(e) => { setTimeoutValue(e.target.value); setErrors((x) => ({ ...x, timeoutMinutes: '' })); }}
            error={!!timeoutError} helperText={timeoutError ?? (level === 1 ? 'Minutes the technician has to acknowledge' : `Minutes the ${TARGETS[level - 1] ?? 'previous level'} has to acknowledge`)}
            inputProps={{ min: TIMEOUT_MIN, max: TIMEOUT_MAX, step: 1 }} sx={fieldSx}
          />
          {formError && <Typography role="alert" sx={{ fontSize: 13, color: tokens.tertiaryLight }}>{formError}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={() => { setErrors({}); setFormError(''); save.mutate(); }} disabled={save.isPending || timeoutInvalid || level > MAX_LEVEL}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {save.isPending ? 'Saving...' : editing ? 'Save timeout' : 'Add level'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const CONFIG_FIELDS = [
  { key: 'escalation.exhausted.minutes', label: 'Exhausted-alert wait', unit: 'minutes', min: 1, max: 1440 },
  { key: 'escalation.monitor.interval.seconds', label: 'Escalation check interval', unit: 'seconds', min: 5, max: 3600 },
] as const;

/** The two settings that shape escalation but live in the runtime configuration (CONFIG_MANAGE). */
function RelatedSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const config = useQuery({ queryKey: CONFIG_KEY, queryFn: getAdminConfig });

  const save = useMutation({
    mutationFn: (changes: { key: string; value: string }[]) => updateAdminConfig(changes),
    onSuccess: (updated) => {
      queryClient.setQueryData(CONFIG_KEY, updated);
      void queryClient.invalidateQueries({ queryKey: CONFIG_KEY });
      setDraft({});
      setErrors({});
      toast('Escalation settings saved; active immediately', 'success');
    },
    onError: (e) => {
      setErrors(fieldMap(e));
      reportFailure(toast, e);
    },
  });

  if (config.isLoading) return <LoadingState />;
  if (config.isError) return <ErrorState onRetry={() => void config.refetch()} message={apiErrorMessage(config.error)} />;
  const saved = Object.fromEntries((config.data ?? []).map((c) => [c.key, c.value]));
  const changes = CONFIG_FIELDS.filter((f) => f.key in draft && draft[f.key].trim() !== saved[f.key]).map((f) => ({ key: f.key, value: draft[f.key].trim() }));
  const invalid = (f: (typeof CONFIG_FIELDS)[number]) => {
    const v = draft[f.key];
    if (v === undefined) return undefined;
    const n = Number(v);
    return v.trim() === '' || !Number.isInteger(n) || n < f.min || n > f.max ? `Whole number from ${f.min} to ${f.max}` : undefined;
  };
  const anyInvalid = CONFIG_FIELDS.some((f) => invalid(f));

  return (
    <Paper sx={{ p: 2.5, mt: 3, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
      <Typography sx={{ fontWeight: 700, color: tokens.onSurface }}>Related settings</Typography>
      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
        The one final alert sent when an unacknowledged P1 or P2 stays at level 3, and how often the escalation monitor looks for overdue incidents.
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
        {CONFIG_FIELDS.map((f) => (
          <TextField key={f.key} size="small" type="number" label={f.label} sx={{ flex: 1, ...fieldSx }}
            value={draft[f.key] ?? saved[f.key] ?? ''} onChange={(e) => { setDraft((d) => ({ ...d, [f.key]: e.target.value })); setErrors((x) => ({ ...x, [f.key]: '' })); }}
            error={!!(errors[f.key] || invalid(f))} helperText={errors[f.key] || invalid(f) || `${f.key} (${f.unit})`}
            inputProps={{ min: f.min, max: f.max, step: 1 }} />
        ))}
        <Button variant="contained" disabled={changes.length === 0 || anyInvalid || save.isPending} onClick={() => save.mutate(changes)} sx={{ textTransform: 'none', fontWeight: 700, minWidth: 110 }}>
          {save.isPending ? 'Saving...' : 'Save'}
        </Button>
      </Stack>
    </Paper>
  );
}

export default function EscalationSettings() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<EditState | null>(null);
  const [toDelete, setToDelete] = useState<AdminEscalationPolicy | null>(null);

  const { data: policies = [], isLoading, isError, error, refetch } = useQuery({ queryKey: POLICIES_KEY, queryFn: getAdminEscalationPolicies });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: POLICIES_KEY });
    SIBLING_KEYS.forEach((k) => void queryClient.invalidateQueries({ queryKey: k }));
  };

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminEscalationPolicy(id),
    onSuccess: () => { toast('Escalation level removed', 'success'); setToDelete(null); refreshAll(); },
    onError: (e) => { reportFailure(toast, e); setToDelete(null); },
  });

  const sorted = [...policies].sort((a, b) => a.priority.localeCompare(b.priority) || a.level - b.level);
  const highest = (priority: string) => Math.max(0, ...policies.filter((p) => p.priority === priority).map((p) => p.level));
  const nextLevelFor = (priority: string) => highest(priority) + 1;
  const addPriority = PRIORITIES.find((p) => nextLevelFor(p) <= MAX_LEVEL);

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>Escalation levels</Typography>
          <Typography sx={{ color: tokens.onSurfaceVariant, mt: 0.5, fontSize: 14 }}>
            How long a P1 or P2 incident may stay unacknowledged before it moves up to the next level. Levels are added in order and removed from the top.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void refetch()} sx={{ borderColor: tokens.outlineVariant, color: tokens.onSurfaceVariant, textTransform: 'none', fontWeight: 600 }}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} disabled={!addPriority}
            onClick={() => addPriority && setDialog({ policy: null, priority: addPriority, level: nextLevelFor(addPriority), timeout: '' })}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            Add level
          </Button>
        </Stack>
      </Stack>

      {isLoading ? <LoadingState />
        : isError ? <ErrorState onRetry={() => void refetch()} message={apiErrorMessage(error)} />
        : sorted.length === 0 ? (
          <EmptyState message="No escalation levels are defined, so incidents are never escalated automatically."
            action={addPriority ? <Button variant="contained" onClick={() => setDialog({ policy: null, priority: addPriority, level: 1, timeout: '' })} sx={{ textTransform: 'none' }}>Add level 1</Button> : undefined} />
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer }}>
            <Table>
              <TableHead sx={{ bgcolor: tokens.surfaceContainerLow }}>
                <TableRow>
                  <TableCell sx={headSx}>PRIORITY</TableCell>
                  <TableCell sx={headSx}>LEVEL</TableCell>
                  <TableCell sx={headSx}>ESCALATES TO</TableCell>
                  <TableCell sx={headSx}>WHEN</TableCell>
                  <TableCell sx={headSx} align="right">ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((p) => {
                  const isTop = p.level === highest(p.priority);
                  return (
                    <TableRow key={p.id} hover sx={{ '& td': { borderBottom: `1px solid ${tokens.outlineVariant}` } }}>
                      <TableCell><PriorityBadge priority={p.priority} /></TableCell>
                      <TableCell><Typography sx={{ fontFamily: 'JetBrains Mono, monospace', color: tokens.onSurface }}>{p.level}</Typography></TableCell>
                      <TableCell><Chip label={TARGETS[p.level] ?? `Level ${p.level}`} size="small" sx={{ fontSize: 12, fontWeight: 700, color: tokens.primaryLight, bgcolor: alpha(tokens.primary, 0.2) }} /></TableCell>
                      <TableCell><Typography sx={{ fontSize: 14, color: tokens.onSurface }}>{waitText(p)}</Typography></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Change timeout">
                          <IconButton aria-label={`Edit ${p.priority} level ${p.level}`} onClick={() => setDialog({ policy: p, priority: p.priority, level: p.level, timeout: String(p.timeoutMinutes) })}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isTop ? 'Remove this level' : `Remove level ${highest(p.priority)} first`}>
                          <span>
                            <IconButton aria-label={`Remove ${p.priority} level ${p.level}`} disabled={!isTop} onClick={() => setToDelete(p)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      <RelatedSettings />

      {dialog && (
        <PolicyDialog state={dialog} highestOf={highest} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); refreshAll(); }} />
      )}
      <ConfirmDialog
        open={toDelete !== null} title="Remove escalation level"
        description={toDelete ? `${toDelete.priority} incidents will no longer escalate to the ${TARGETS[toDelete.level] ?? `level ${toDelete.level}`}.` : undefined}
        confirmLabel="Remove" confirmColor="error" isLoading={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)} onClose={() => setToDelete(null)}
      />
    </Box>
  );
}
