import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import {
  getProblem,
  getRootCause,
  removeIncidentFromProblem,
  resolveProblem,
  type CauseView,
  type ProblemView,
} from '../../api/problems';
import type { IncidentSummary } from '../../api/types';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import { tokens } from '../../theme/theme';
import { useProblemAccess } from './problemAccess';
import { fmtDate, MajorChip, ProblemStatusChip } from './ProblemsList';

const cellSx = { color: tokens.onSurface, fontSize: 13, borderColor: tokens.outlineVariant };
const headSx = { color: tokens.onSurfaceVariant, fontSize: 12, fontWeight: 700, borderColor: tokens.outlineVariant };
const paperSx = { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 2 };
const sectionTitle = { fontSize: 14, fontWeight: 700, color: tokens.onSurface, mb: 1.5 };
const labelSx = { fontSize: 12, color: tokens.onSurfaceVariant };

const pathText = (path: { name: string }[]) => path.map((s) => s.name).join(' → ');

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: 14, color: tokens.onSurface, fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}

function RootCausePanel({ problemId }: { problemId: number }) {
  const q = useQuery({ queryKey: ['problems', problemId, 'root-cause'], queryFn: () => getRootCause(problemId) });

  return (
    <Paper sx={{ ...paperSx, p: 2 }}>
      <Typography sx={sectionTitle}>Root cause</Typography>
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />}
      {q.data && (
        <Stack spacing={2}>
          <Box>
            <Typography sx={labelSx}>Probable root cause</Typography>
            {q.data.probable ? (
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#fb7185' }}>{q.data.probable.service.name}</Typography>
            ) : (
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No probable cause found.</Typography>
            )}
            {q.data.explanation && (
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mt: 0.5 }}>{q.data.explanation}</Typography>
            )}
          </Box>

          <Box>
            <Typography sx={{ ...labelSx, mb: 0.75 }}>Affected services</Typography>
            {q.data.affectedServices.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>None</Typography>
            ) : (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {q.data.affectedServices.map((s) => (
                  <Chip key={s.id} size="small" label={s.name} sx={{ fontSize: 12, color: tokens.onSurface, bgcolor: tokens.surfaceContainerHigh }} />
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            <Typography sx={{ ...labelSx, mb: 0.75 }}>Candidates</Typography>
            {q.data.candidates.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>None</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>Service</TableCell>
                      <TableCell sx={headSx}>Affected itself</TableCell>
                      <TableCell sx={headSx} align="right">Max distance</TableCell>
                      <TableCell sx={headSx} align="right">Total distance</TableCell>
                      <TableCell sx={headSx}>Dependency paths</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {q.data.candidates.map((c: CauseView) => {
                      const isProbable = q.data.probable?.service.id === c.service.id;
                      return (
                        <TableRow key={c.service.id}>
                          <TableCell sx={{ ...cellSx, fontWeight: isProbable ? 700 : 400 }}>
                            {c.service.name}
                            {isProbable && <Chip size="small" label="Probable" sx={{ ml: 1, fontSize: 12, color: '#fb7185', bgcolor: 'rgba(244, 63, 94, 0.15)' }} />}
                          </TableCell>
                          <TableCell sx={cellSx}>{c.affected ? 'Yes' : 'No'}</TableCell>
                          <TableCell sx={cellSx} align="right">{c.maxDistance}</TableCell>
                          <TableCell sx={cellSx} align="right">{c.totalDistance}</TableCell>
                          <TableCell sx={{ ...cellSx, fontSize: 12 }}>
                            {c.paths.length === 0
                              ? '-'
                              : c.paths.map((p, i) => <div key={i}>{pathText(p)}</div>)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      )}
    </Paper>
  );
}

const EMPTY_FORM = { rootCause: '', notes: '', steps: '', timeSpentMinutes: '' };

function validate(f: typeof EMPTY_FORM) {
  const e: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
  const rc = f.rootCause.trim();
  const notes = f.notes.trim();
  if (rc.length < 10 || rc.length > 2000) e.rootCause = 'Between 10 and 2000 characters.';
  if (notes.length < 10 || notes.length > 4000) e.notes = 'Between 10 and 4000 characters.';
  if (f.steps.length > 4000) e.steps = 'At most 4000 characters.';
  const mins = Number(f.timeSpentMinutes);
  if (!f.timeSpentMinutes || !Number.isInteger(mins) || mins < 1 || mins > 10080)
    e.timeSpentMinutes = 'Whole minutes between 1 and 10080.';
  return e;
}

function ResolveDialog({ problem, open, onClose }: { problem: ProblemView; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState(false);
  const errors = validate(form);
  const openCount = problem.incidents.filter((i) => !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length;

  const m = useMutation({
    mutationFn: () =>
      resolveProblem(problem.id, {
        rootCause: form.rootCause.trim(),
        notes: form.notes.trim(),
        steps: form.steps.trim() || undefined,
        timeSpentMinutes: Number(form.timeSpentMinutes),
      }),
    onSuccess: (p) => {
      qc.setQueryData(['problems', problem.id], p);
      qc.invalidateQueries({ queryKey: ['problems'] });
      toast('Problem resolved: every open incident in it got the same fix.', 'success');
      setForm(EMPTY_FORM);
      setTouched(false);
      onClose();
    },
  });

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length === 0) m.mutate();
  };
  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }),
    error: touched && !!errors[key],
    helperText: touched ? errors[key] : undefined,
    fullWidth: true,
    size: 'small' as const,
  });

  return (
    <Dialog open={open} onClose={m.isPending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Resolve whole problem</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
          This resolves the {openCount} open incident{openCount === 1 ? '' : 's'} of "{problem.title}" with one fix.
        </Typography>
        <Stack spacing={2}>
          <TextField label="Root cause" required multiline minRows={2} {...field('rootCause')} />
          <TextField label="Resolution notes" required multiline minRows={3} {...field('notes')} />
          <TextField label="Steps (optional)" multiline minRows={2} {...field('steps')} />
          <TextField label="Time spent (minutes)" required type="number" inputProps={{ min: 1, max: 10080 }} {...field('timeSpentMinutes')} />
          {m.isError && <Alert severity="error">{apiErrorMessage(m.error)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={m.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" color="success" onClick={submit} disabled={m.isPending} sx={{ textTransform: 'none' }}>
          {m.isPending ? 'Resolving...' : 'Resolve all'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RemoveDialog({
  problemId,
  incident,
  onClose,
}: {
  problemId: number;
  incident: IncidentSummary | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: (incidentId: number) => removeIncidentFromProblem(problemId, incidentId),
    onSuccess: (p) => {
      qc.setQueryData(['problems', problemId], p);
      qc.invalidateQueries({ queryKey: ['problems'] });
      toast(`${incident?.code} taken out of the problem record.`, 'success');
      onClose();
    },
  });
  return (
    <Dialog open={!!incident} onClose={m.isPending ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove incident from problem</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
          Take {incident?.code} out of this problem record? The incident keeps its status and is handled on its own. This is recorded in the audit log.
        </Typography>
        {m.isError && <Alert severity="error" sx={{ mt: 2 }}>{apiErrorMessage(m.error)}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { m.reset(); onClose(); }} disabled={m.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          disabled={m.isPending || !incident}
          onClick={() => incident && m.mutate(incident.id)}
          sx={{ textTransform: 'none' }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ProblemDetail() {
  const { id } = useParams();
  const problemId = Number(id);
  const { basePath, incidentPath, canManage, canUngroup } = useProblemAccess();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [removing, setRemoving] = useState<IncidentSummary | null>(null);
  const q = useQuery({
    queryKey: ['problems', problemId],
    queryFn: () => getProblem(problemId),
    enabled: Number.isFinite(problemId),
  });

  const back = (
    <Button component={RouterLink} to={basePath} startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: 'none', mb: 2 }}>
      All problems
    </Button>
  );

  if (!Number.isFinite(problemId)) return <Box>{back}<EmptyState message="This problem does not exist." /></Box>;
  if (q.isLoading) return <Box>{back}<LoadingState /></Box>;
  if (q.isError || !q.data)
    return <Box>{back}<ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} /></Box>;

  const p = q.data;
  const isOpen = p.status === 'OPEN';

  return (
    <Box>
      {back}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'flex-start' }} spacing={2} mb={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h5" sx={{ fontWeight: 700, color: tokens.onSurface }}>{p.title}</Typography>
            <ProblemStatusChip status={p.status} />
            {p.lead?.major && <MajorChip />}
          </Stack>
          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.5 }}>Problem #{p.id}</Typography>
        </Box>
        {canManage && isOpen && (
          <Button variant="contained" color="success" onClick={() => setResolveOpen(true)} sx={{ textTransform: 'none', flexShrink: 0 }}>
            Resolve whole problem
          </Button>
        )}
      </Stack>

      <Paper sx={{ ...paperSx, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
          <Fact label="Service" value={p.service?.name ?? '-'} />
          <Fact
            label="Lead incident"
            value={
              p.lead ? (
                <Link component={RouterLink} to={incidentPath(p.lead.id)} sx={{ color: tokens.secondaryLight, fontFamily: 'JetBrains Mono, monospace' }}>
                  {p.lead.code}
                </Link>
              ) : '-'
            }
          />
          <Fact label="Linked incidents" value={p.incidentCount} />
          <Fact label="Joined by one click" value={p.joined} />
          <Fact label="Created" value={fmtDate(p.createdAt)} />
        </Stack>
      </Paper>

      <Paper sx={{ ...paperSx, p: 2, mb: 2 }}>
        <Typography sx={sectionTitle}>Linked incidents</Typography>
        {p.incidents.length === 0 ? (
          <EmptyState message="No incidents are linked to this problem." />
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>Code</TableCell>
                  <TableCell sx={headSx}>Title</TableCell>
                  <TableCell sx={headSx}>Status</TableCell>
                  <TableCell sx={headSx}>Priority</TableCell>
                  <TableCell sx={headSx}>Assignee</TableCell>
                  <TableCell sx={headSx}>Reported</TableCell>
                  {canUngroup && <TableCell sx={headSx} align="right">Action</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {p.incidents.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell sx={cellSx}>
                      <Link component={RouterLink} to={incidentPath(i.id)} sx={{ color: tokens.secondaryLight, fontFamily: 'JetBrains Mono, monospace' }}>
                        {i.code}
                      </Link>
                      {p.lead?.id === i.id && <Chip size="small" label="Lead" sx={{ ml: 1, fontSize: 12 }} />}
                    </TableCell>
                    <TableCell sx={cellSx}>{i.title}</TableCell>
                    <TableCell sx={cellSx}><StatusChip status={i.status} /></TableCell>
                    <TableCell sx={cellSx}><PriorityBadge priority={i.priority} /></TableCell>
                    <TableCell sx={cellSx}>{i.assignee?.name ?? 'Unassigned'}</TableCell>
                    <TableCell sx={cellSx}>{fmtDate(i.createdAt)}</TableCell>
                    {canUngroup && (
                      <TableCell sx={cellSx} align="right">
                        <Button size="small" color="error" onClick={() => setRemoving(i)} sx={{ textTransform: 'none', fontSize: 12 }}>
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <RootCausePanel problemId={p.id} />

      <ResolveDialog problem={p} open={resolveOpen} onClose={() => setResolveOpen(false)} />
      <RemoveDialog problemId={p.id} incident={removing} onClose={() => setRemoving(null)} />
    </Box>
  );
}
