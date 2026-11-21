import { humanizeEnum } from '../../utils/format';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { tokens } from '../../theme/theme';
import { useToast } from '../../components/Toast';
import { apiErrorMessage } from '../../utils/errors';
import PriorityBadge from '../../components/PriorityBadge';
import { addComment, assignIncident, markDuplicate, overridePriority, priorityWhatIf } from '../../api/incidents';
import { overrideAssignNote } from '../lead/shared/ui';
import { isStaleDataError } from './apiErrors';
import { createProblem } from '../../api/problems';
import { escalateIncident, reassignIncident, type SimilarIncidentView } from '../../api/technicians';
import type { IncidentDetail, Priority, RecommendationView, WhatIfView } from '../../api/types';

const paperSx = {
  bgcolor: tokens.surfaceContainer,
  border: `1px solid ${tokens.outlineVariant}`,
  borderRadius: 3,
  p: 1,
} as const;

const fieldSx = { bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 } as const;
const REASON_MIN = 10;
const REASON_MAX = 1000;

function reasonHelp(reason: string) {
  const n = reason.trim().length;
  return n < REASON_MIN ? `At least ${REASON_MIN} characters (${n}/${REASON_MIN})` : `${reason.length}/${REASON_MAX} characters`;
}

interface BaseProps {
  open: boolean;
  incident: IncidentDetail;
  onClose: () => void;
  /** Called after the server accepted the change; the page refreshes its queries. */
  onDone: () => void;
}

/** POST /incidents/{id}/reassign. Candidates come from GET /incidents/{id}/recommendations (eligible and excluded). */
export function ReassignDialog({
  open,
  incident,
  recommendations,
  onClose,
  onDone,
}: BaseProps & { recommendations: RecommendationView | undefined }) {
  const toast = useToast();
  const [technicianId, setTechnicianId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTechnicianId('');
      setReason('');
    }
  }, [open]);

  const candidates = (recommendations?.recommendations ?? []).filter((r) => r.technicianId !== incident.assignee?.id);
  const excluded = recommendations?.excluded ?? [];
  const valid = technicianId !== '' && reason.trim().length >= REASON_MIN && reason.length <= REASON_MAX;

  const submit = async () => {
    setBusy(true);
    try {
      await reassignIncident(incident.id, Number(technicianId), reason.trim());
      toast(`${incident.code} reassigned.`, 'success');
      onDone();
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Reassign {incident.code}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {!recommendations ? (
            <Alert severity="info">Loading eligible technicians…</Alert>
          ) : candidates.length === 0 ? (
            <Alert severity="warning">No other technician is eligible for this incident right now.</Alert>
          ) : (
            <TextField
              select
              fullWidth
              size="small"
              label="New assignee"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              helperText={`Ranked by the ${recommendations.strategy} strategy`}
              sx={fieldSx}
            >
              {candidates.map((r) => (
                <MenuItem key={r.technicianId} value={String(r.technicianId)}>
                  {r.name} · score {r.score} · load {r.currentLoad}/{r.maxLoad}
                </MenuItem>
              ))}
            </TextField>
          )}
          {excluded.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, mb: 0.5 }}>Not eligible</Typography>
              {excluded.map((x) => (
                <Typography key={x.technicianId} sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                  {x.name}: {x.reason}
                </Typography>
              ))}
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: REASON_MAX }}
            error={reason.length > 0 && reason.trim().length < REASON_MIN}
            helperText={reasonHelp(reason)}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : 'Reassign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * POST /incidents/{id}/assign. The list is the engine's ranking (GET /incidents/{id}/recommendations), best first.
 * Picking anyone but the top candidate asks for confirmation with an optional reason; the assign API has no
 * reason field, so the reason is saved as an internal note on the incident.
 */
export function AssignDialog({
  open,
  incident,
  recommendations,
  onClose,
  onDone,
}: BaseProps & { recommendations: RecommendationView | undefined }) {
  const toast = useToast();
  const [technicianId, setTechnicianId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const ranking = recommendations?.recommendations ?? [];
  useEffect(() => {
    if (open) {
      setTechnicianId('');
      setReason('');
    }
  }, [open]);

  const rank = ranking.findIndex((r) => String(r.technicianId) === technicianId);
  const chosen = rank >= 0 ? ranking[rank] : null;
  const top = ranking[0] ?? null;
  const overridesEngine = chosen != null && rank > 0;
  const valid = chosen != null && reason.length <= REASON_MAX;

  const submit = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      await assignIncident(incident.id, chosen.technicianId);
      toast(`${incident.code} assigned to ${chosen.name}.`, 'success');
      if (overridesEngine && reason.trim()) {
        try {
          await addComment(
            incident.id,
            overrideAssignNote({ name: chosen.name, rank: rank + 1, score: chosen.score, topName: top?.name ?? null, topScore: top?.score ?? null, reason: reason.trim() }),
            'INTERNAL',
          );
        } catch (e) {
          toast(`Assigned, but the override note was not saved: ${apiErrorMessage(e)}`, 'warning');
        }
      }
      onDone();
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Assign {incident.code}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {!recommendations ? (
            <Alert severity="info">Loading eligible technicians…</Alert>
          ) : ranking.length === 0 ? (
            <Alert severity="warning">No technician is eligible for this incident right now.</Alert>
          ) : (
            <TextField
              select
              fullWidth
              size="small"
              label="Technician"
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              helperText={`Ranked by the ${recommendations.strategy} strategy, best match first`}
              sx={fieldSx}
            >
              {ranking.map((r, i) => (
                <MenuItem key={r.technicianId} value={String(r.technicianId)}>
                  {i + 1}. {r.name} · score {r.score} · load {r.currentLoad}/{r.maxLoad}
                </MenuItem>
              ))}
            </TextField>
          )}
          {overridesEngine && chosen && top && (
            <>
              <Alert severity="warning">
                {chosen.name} scored {chosen.score} against {top.score} for {top.name}, the top match. This overrides the engine&apos;s choice.
              </Alert>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                label="Reason (optional, saved as an internal note)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                inputProps={{ maxLength: REASON_MAX }}
                helperText={`${reason.length}/${REASON_MAX}`}
                sx={fieldSx}
              />
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : overridesEngine ? 'Assign anyway' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** POST /incidents/{id}/mark-duplicate. The target is picked from the similar-incidents list. */
export function MarkDuplicateDialog({
  open,
  incident,
  similar,
  initialTargetId,
  onClose,
  onDone,
}: BaseProps & { similar: SimilarIncidentView[]; initialTargetId?: number | null }) {
  const toast = useToast();
  const [targetId, setTargetId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      const firstDuplicate = similar.find((s) => s.match === 'DUPLICATE');
      setTargetId(initialTargetId ? String(initialTargetId) : firstDuplicate ? String(firstDuplicate.incidentId) : '');
    }
  }, [open, similar, initialTargetId]);

  const submit = async () => {
    setBusy(true);
    try {
      await markDuplicate(incident.id, Number(targetId));
      toast(`${incident.code} marked as a duplicate.`, 'success');
      onDone();
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Mark {incident.code} as duplicate</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="warning">This closes {incident.code} as a duplicate of the incident you pick. It cannot be undone from here.</Alert>
          {similar.length === 0 ? (
            <TextField
              fullWidth
              size="small"
              type="number"
              label="Original incident ID"
              helperText="No similar incident was found. Enter the ID of the original."
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              sx={fieldSx}
            />
          ) : (
            <TextField
              select
              fullWidth
              size="small"
              label="Original incident"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              sx={fieldSx}
            >
              {similar.map((s) => (
                <MenuItem key={s.incidentId} value={String(s.incidentId)}>
                  {s.code} · {Math.round(s.similarity * 100)}% · {humanizeEnum(s.match)} · {s.title}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={submit} disabled={targetId === '' || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : 'Mark as duplicate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ScenarioBox({ title, s }: { title: string; s?: WhatIfView['current'] }) {
  if (!s) return null;
  return (
    <Paper elevation={0} sx={{ flex: 1, p: 1.5, bgcolor: tokens.surfaceContainerLow, borderRadius: 2 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, mb: 0.5 }}>{title}</Typography>
      <Box sx={{ mb: 0.5 }}>
        <PriorityBadge priority={s.priority} />
      </Box>
      <Typography sx={{ fontSize: 12, color: tokens.onSurface }}>Score {s.score}</Typography>
      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
        Impact {s.impact}, urgency {s.urgency}, {s.affectedUsers} {s.affectedUsers === 1 ? 'user' : 'users'}
      </Typography>
      {s.overrideRule && <Typography sx={{ fontSize: 12, color: tokens.primaryLight }}>Rule: {s.overrideRule}</Typography>}
    </Paper>
  );
}

/**
 * POST /incidents/{id}/override-priority, with a what-if panel (POST /priority/what-if) that only previews the
 * scoring and changes nothing. Limits follow the contract: impact and urgency 1..5, users 1..1,000,000,
 * reason 10..1000 characters.
 */
export function OverridePriorityDialog({ open, incident, onClose, onDone }: BaseProps) {
  const toast = useToast();
  const [priority, setPriority] = useState<Priority>('P3');
  const [reason, setReason] = useState('');
  const [impact, setImpact] = useState('3');
  const [urgency, setUrgency] = useState('3');
  const [users, setUsers] = useState('1');
  const [whatIf, setWhatIf] = useState<WhatIfView | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setPriority(incident.priority ?? 'P3');
      setReason('');
      setImpact(String(incident.impact));
      setUrgency(String(incident.urgency));
      setUsers(String(Math.max(1, incident.affectedUsers)));
      setWhatIf(null);
    }
  }, [open, incident]);

  const inRange = (v: string, lo: number, hi: number) => v.trim() !== '' && Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi;
  const scenarioValid = inRange(impact, 1, 5) && inRange(urgency, 1, 5) && inRange(users, 1, 1_000_000);
  const valid = reason.trim().length >= REASON_MIN && reason.length <= REASON_MAX;

  const preview = async () => {
    setPreviewing(true);
    try {
      setWhatIf(
        await priorityWhatIf({
          incidentId: incident.id,
          impact: Number(impact),
          urgency: Number(urgency),
          affectedUsers: Number(users),
        }),
      );
    } catch (e) {
      setWhatIf(null);
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setPreviewing(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await overridePriority(incident.id, priority, reason.trim());
      toast(`${incident.code} priority set to ${priority}.`, 'success');
      onDone();
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setBusy(false);
    }
  };

  const numField = (label: string, value: string, set: (v: string) => void, lo: number, hi: number) => (
    <TextField
      type="number"
      size="small"
      label={label}
      value={value}
      onChange={(e) => set(e.target.value)}
      inputProps={{ min: lo, max: hi, step: 1 }}
      error={value !== '' && !inRange(value, lo, hi)}
      helperText={`${lo} to ${hi.toLocaleString()}`}
      sx={{ flex: 1, minWidth: 110, ...fieldSx }}
    />
  );

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Priority for {incident.code}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.onSurface }}>What-if (preview only)</Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {numField('Impact', impact, setImpact, 1, 5)}
            {numField('Urgency', urgency, setUrgency, 1, 5)}
            {numField('Affected users', users, setUsers, 1, 1_000_000)}
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={preview}
            disabled={!scenarioValid || previewing}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
          >
            {previewing ? <CircularProgress size={16} color="inherit" /> : 'Run what-if'}
          </Button>
          {whatIf && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <ScenarioBox title="Current" s={whatIf.current} />
                <ScenarioBox title="With these values" s={whatIf.whatIf} />
              </Box>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 0.75 }}>
                {whatIf.changed ? `Band would change (score ${whatIf.scoreDifference != null && whatIf.scoreDifference > 0 ? '+' : ''}${whatIf.scoreDifference ?? 0}).` : 'The band would stay the same.'}{' '}
                This does not change the incident. Use the override below to do that.
              </Typography>
            </Box>
          )}

          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.onSurface, mt: 1 }}>Override priority</Typography>
          <TextField
            select
            size="small"
            label="New priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            sx={fieldSx}
          >
            {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: REASON_MAX }}
            error={reason.length > 0 && reason.trim().length < REASON_MIN}
            helperText={reasonHelp(reason)}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : 'Override priority'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** POST /problems {title?, incidentIds}: opens a problem record with this incident as its first member. */
export function LinkProblemDialog({
  open,
  incident,
  onClose,
  onDone,
}: Omit<BaseProps, "onDone"> & { onDone: (problemId: number) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setTitle('');
  }, [open]);

  const submit = async () => {
    setBusy(true);
    try {
      const p = await createProblem({ title: title.trim() || undefined, incidentIds: [incident.id] });
      toast(`Problem #${p.id} opened for ${incident.code}.`, 'success');
      onDone(p.id);
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Open a problem for {incident.code}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            Creates a problem record (Major Incident Mode) with this incident as its lead. Other incidents can be linked from the problem screen.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            inputProps={{ maxLength: 200 }}
            helperText={`${title.length}/200. Left empty, the server names it from the incident.`}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : 'Open problem'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** POST /incidents/{id}/escalate: raises the escalation level by one; the reason is mandatory (10 to 1000 characters). */
export function EscalateDialog({ open, incident, onClose, onDone }: BaseProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  const valid = reason.trim().length >= REASON_MIN && reason.trim().length <= REASON_MAX;

  const submit = async () => {
    setBusy(true);
    try {
      await escalateIncident(incident.id, reason.trim());
      toast(`${incident.code} escalated.`, 'success');
      onDone();
      onClose();
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
      if (isStaleDataError(e)) onDone();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth PaperProps={{ sx: paperSx }}>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Escalate {incident.code}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            Raises the escalation tier by one. Current level: {incident.escalationLevel}.
          </Typography>
          {incident.escalationPreview?.kind === 'EXHAUSTED' && (
            <Alert severity="warning">The top escalation tier is already reached.</Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            label="Justification"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            helperText={reasonHelp(reason)}
            sx={fieldSx}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={!valid || busy} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {busy ? <CircularProgress size={18} color="inherit" /> : 'Escalate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
