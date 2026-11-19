import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import {
  createAdminEscalationPolicy, deleteAdminEscalationPolicy, getAdminEscalationPolicies, updateAdminEscalationPolicy, type AdminEscalationPolicy,
} from '../../../api/admin';
import ConfirmDialog from '../../../components/ConfirmDialog';
import PriorityBadge from '../../../components/PriorityBadge';
import { EmptyState, ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, errFor, fieldMap, fieldSx, monoLabelSx } from '../adminForm';

export const ESCALATION_KEY = ['admin-escalation-policies-list'];
/** The escalation screen keeps its own list under this key. */
const SIBLING_KEY = ['admin-escalation-policies'];
// Real levels (TEAM_UPDATES M11): 1 team lead, 2 system administrator, 3 IT manager.
const TARGETS: Record<number, string> = { 1: 'Team lead', 2: 'System administrator', 3: 'IT manager' };
const PRIORITIES = ['P1', 'P2'] as const; // the server only allows escalation levels for P1 and P2
const MAX_LEVEL = 3;
const TIMEOUT_MAX = 1440;

const waitText = (p: AdminEscalationPolicy) =>
  p.level === 1 ? 'Technician has not acknowledged' : `${TARGETS[p.level - 1] ?? `Level ${p.level - 1}`} has not acknowledged`;

type Dlg = { kind: 'add'; priority: (typeof PRIORITIES)[number] } | { kind: 'edit'; policy: AdminEscalationPolicy };

function TimeoutDialog({ dlg, nextLevel, onClose, onSaved }: { dlg: Dlg; nextLevel: number; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const edit = dlg.kind === 'edit';
  const priority = edit ? dlg.policy.priority : dlg.priority;
  const level = edit ? dlg.policy.level : nextLevel;
  const [timeout, setTimeoutValue] = useState(edit ? String(dlg.policy.timeoutMinutes) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const body = { priority, level, timeoutMinutes: Number(timeout) };
      return edit ? updateAdminEscalationPolicy(dlg.policy.id, body) : createAdminEscalationPolicy(body);
    },
    onSuccess: () => { toast(`${priority} level ${level} ${edit ? 'updated' : 'added'}`, 'success'); onSaved(); },
    onError: (e) => {
      const map = fieldMap(e);
      setErrors(map);
      setFormError(Object.keys(map).length ? '' : apiErrorMessage(e));
    },
  });

  const n = Number(timeout);
  const invalid = !timeout || !Number.isInteger(n) || n < 1 || n > TIMEOUT_MAX;
  return (
    <Dialog open onClose={() => !save.isPending && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{edit ? 'Edit' : 'Add'} {priority} level {level}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            After the wait below, {priority} incidents move to the {TARGETS[level]}.
          </Typography>
          {formError && <Alert severity="error">{formError}</Alert>}
          <TextField autoFocus size="small" type="number" label="Minutes to wait" value={timeout} onChange={(e) => setTimeoutValue(e.target.value)}
            inputProps={{ min: 1, max: TIMEOUT_MAX }}
            error={!!errFor(errors, 'timeoutMinutes') || (!!timeout && invalid)}
            helperText={errFor(errors, 'timeoutMinutes') ?? (timeout && invalid ? `Whole minutes from 1 to ${TIMEOUT_MAX}` : level === 1 ? 'How long the technician has to acknowledge' : `How long the ${TARGETS[level - 1]} has to acknowledge`)}
            sx={fieldSx} />
          {errFor(errors, 'level') && <Alert severity="error">{errFor(errors, 'level')}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" disabled={save.isPending || invalid} onClick={() => { setErrors({}); setFormError(''); save.mutate(); }} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** The escalation ladder for P1 and P2: edit a wait, add the next level, remove the highest level only. */
export default function EscalationLadder() {
  const toast = useToast();
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [del, setDel] = useState<AdminEscalationPolicy | null>(null);
  const list = useQuery({ queryKey: ESCALATION_KEY, queryFn: getAdminEscalationPolicies });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ESCALATION_KEY });
    qc.invalidateQueries({ queryKey: SIBLING_KEY });
  };
  const remove = useMutation({
    mutationFn: (p: AdminEscalationPolicy) => deleteAdminEscalationPolicy(p.id),
    onSuccess: (_d, p) => { toast(`${p.priority} level ${p.level} removed`, 'success'); refresh(); setDel(null); },
    onError: (e) => { toast(apiErrorMessage(e), 'error'); setDel(null); },
  });

  const all = list.data ?? [];
  const forPriority = (p: string) => all.filter((x) => x.priority === p).sort((a, b) => a.level - b.level);
  const other = all.filter((x) => !(PRIORITIES as readonly string[]).includes(x.priority));
  const nextOf = (p: string) => forPriority(p).length + 1;

  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
        If nobody acknowledges a P1 or P2 incident in time, it moves up the ladder: level 1 team lead, level 2 system administrator, level 3 IT manager.
        Levels are added in order and only the highest level can be removed. P3 and P4 never escalate.
      </Typography>
      {list.isLoading && <LoadingState />}
      {list.isError && <ErrorState onRetry={() => list.refetch()} message={apiErrorMessage(list.error)} />}
      {other.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>The server holds escalation levels for {[...new Set(other.map((o) => o.priority))].join(', ')}, which are ignored; only P1 and P2 escalate.</Alert>}
      {list.data && PRIORITIES.map((p) => {
        const rows = forPriority(p);
        const highest = rows[rows.length - 1];
        return (
          <Paper key={p} elevation={0} sx={{ mb: 2.5, border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer, borderRadius: 3 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center"><PriorityBadge priority={p} /><Typography sx={{ fontWeight: 700 }}>Escalation ladder</Typography></Stack>
              <Button size="small" startIcon={<AddIcon />} disabled={nextOf(p) > MAX_LEVEL} onClick={() => setDlg({ kind: 'add', priority: p })} sx={{ textTransform: 'none' }}>
                {nextOf(p) > MAX_LEVEL ? 'All 3 levels set' : `Add level ${nextOf(p)}`}
              </Button>
            </Stack>
            {rows.length === 0 ? (
              <Box sx={{ px: 2, pb: 2 }}><EmptyState message={`No escalation levels for ${p}: these incidents never escalate automatically.`} /></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow>
                    {['Level', 'Moves to', 'When', 'Wait', ''].map((h) => <TableCell key={h} sx={{ ...monoLabelSx, borderColor: tokens.outlineVariant }}>{h}</TableCell>)}
                  </TableRow></TableHead>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell sx={{ borderColor: tokens.outlineVariant }}>{r.level}</TableCell>
                        <TableCell sx={{ borderColor: tokens.outlineVariant }}>{TARGETS[r.level] ?? `Level ${r.level}`}</TableCell>
                        <TableCell sx={{ borderColor: tokens.outlineVariant, color: tokens.onSurfaceVariant }}>{waitText(r)}</TableCell>
                        <TableCell sx={{ borderColor: tokens.outlineVariant }}>{r.timeoutMinutes} min</TableCell>
                        <TableCell align="right" sx={{ borderColor: tokens.outlineVariant }}>
                          <Tooltip title="Edit wait"><IconButton aria-label={`Edit ${p} level ${r.level}`} onClick={() => setDlg({ kind: 'edit', policy: r })}><EditIcon fontSize="small" /></IconButton></Tooltip>
                          {r.id === highest.id && (
                            <Tooltip title="Remove the highest level"><IconButton aria-label={`Remove ${p} level ${r.level}`} onClick={() => setDel(r)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        );
      })}
      {dlg && <TimeoutDialog dlg={dlg} nextLevel={dlg.kind === 'add' ? nextOf(dlg.priority) : dlg.policy.level} onClose={() => setDlg(null)} onSaved={() => { setDlg(null); refresh(); }} />}
      <ConfirmDialog open={!!del} title={del ? `Remove ${del.priority} level ${del.level}?` : ''} confirmLabel="Remove" confirmColor="error" isLoading={remove.isPending}
        description="Incidents of this priority stop escalating past the previous level."
        onConfirm={() => del && remove.mutate(del)} onClose={() => setDel(null)} />
    </Box>
  );
}
