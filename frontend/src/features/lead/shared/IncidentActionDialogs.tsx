import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  addComment,
  getSimilarIncidents,
  markDuplicate,
  overridePriority,
  priorityWhatIf,
  updateIncident,
} from '../../../api/incidents';
import { escalateIncident } from '../../../api/technicians';
import type { IncidentDetail, Priority } from '../../../api/types';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { apiErrorMessage } from '../../../utils/errors';
import { COLORS, MAX_REASON, MIN_REASON, MONO, dialogPaperSx, fieldSx, invalidateIncidentCaches } from './ui';

const PRIORITIES: Priority[] = ['P1', 'P2', 'P3', 'P4'];
const PRIORITY_LABEL: Record<Priority, string> = {
  P1: 'P1 - Critical',
  P2: 'P2 - High',
  P3: 'P3 - Medium',
  P4: 'P4 - Low',
};

/** Override the engine's priority. Shows the live what-if for the current inputs so the override is a visible choice. */
export function OverridePriorityDialog({ open, incident, onClose }: { open: boolean; incident: IncidentDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [priority, setPriority] = useState<Priority | ''>('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setPriority('');
      setReason('');
    }
  }, [open]);

  const whatIf = useQuery({
    queryKey: ['incidents', incident.id, 'what-if', incident.impact, incident.urgency, incident.affectedUsers],
    queryFn: () =>
      priorityWhatIf({
        incidentId: incident.id,
        impact: incident.impact,
        urgency: incident.urgency,
        affectedUsers: incident.affectedUsers,
      }),
    enabled: open,
  });

  const m = useMutation({
    mutationFn: () => overridePriority(incident.id, priority as string, reason.trim()),
    onSuccess: () => {
      toast(`Priority changed to ${priority}.`, 'success');
      invalidateIncidentCaches(qc);
      onClose();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const sameAsCurrent = priority !== '' && priority === incident.priority;
  const reasonLen = reason.trim().length;
  const reasonBad = reason.length > 0 && reasonLen < MIN_REASON;
  const valid = priority !== '' && !sameAsCurrent && reasonLen >= MIN_REASON && reason.length <= MAX_REASON;
  const scenario = whatIf.data?.whatIf ?? whatIf.data?.current;

  return (
    <Dialog open={open} onClose={m.isPending ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Override priority</DialogTitle>
      <DialogContent dividers sx={{ borderColor: COLORS.border }}>
        <Stack spacing={2} mt={1}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO, textTransform: 'uppercase', mb: 0.5 }}>
              What the priority engine says
            </Typography>
            {whatIf.isLoading ? (
              <CircularProgress size={16} />
            ) : whatIf.isError ? (
              <Typography sx={{ fontSize: 12.5, color: COLORS.error }}>{apiErrorMessage(whatIf.error)}</Typography>
            ) : scenario ? (
              <Typography sx={{ fontSize: 13, color: COLORS.onSurface }}>
                Impact {scenario.impact}, urgency {scenario.urgency}, {scenario.affectedUsers} users give score {scenario.score} = {scenario.priority}
                {scenario.overrideRule ? ` (rule: ${scenario.overrideRule})` : ''}. Current priority: {incident.priority ?? 'none'}.
              </Typography>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>No what-if result returned.</Typography>
            )}
          </Box>
          <TextField
            select
            label="New priority"
            fullWidth
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            error={sameAsCurrent}
            helperText={sameAsCurrent ? 'This is already the current priority. Pick a different one.' : 'Choose the priority to force.'}
            sx={fieldSx}
          >
            {PRIORITIES.map((p) => (
              <MenuItem key={p} value={p} disabled={p === incident.priority}>
                {PRIORITY_LABEL[p]}
                {p === incident.priority ? ' (current)' : ''}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={`Business justification (${MIN_REASON} to ${MAX_REASON} characters)`}
            fullWidth
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            inputProps={{ maxLength: MAX_REASON }}
            error={reasonBad}
            helperText={reasonBad ? `At least ${MIN_REASON} characters required (${reasonLen}/${MIN_REASON})` : `${reason.length}/${MAX_REASON}`}
            sx={fieldSx}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={m.isPending} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          disabled={!valid || m.isPending}
          onClick={() => m.mutate()}
          startIcon={m.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Confirm override
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Close this incident as a duplicate of another one, picking from the server's similar-incident matches or typing an id. */
export function MarkDuplicateDialog({ open, incidentId, onClose }: { open: boolean; incidentId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [manualId, setManualId] = useState('');
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setManualId('');
      setPicked(null);
    }
  }, [open]);

  const similar = useQuery({
    queryKey: ['incidents', incidentId, 'similar'],
    queryFn: () => getSimilarIncidents(incidentId),
    enabled: open,
  });

  const manualNum = manualId.trim() === '' ? null : Number(manualId);
  const manualInvalid = manualNum !== null && (!Number.isInteger(manualNum) || manualNum <= 0 || manualNum === incidentId);
  const target = manualNum !== null && !manualInvalid ? manualNum : picked;

  const m = useMutation({
    mutationFn: () => markDuplicate(incidentId, target as number),
    onSuccess: () => {
      toast('Incident marked as a duplicate.', 'success');
      invalidateIncidentCaches(qc);
      onClose();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  return (
    <Dialog open={open} onClose={m.isPending ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Mark as duplicate</DialogTitle>
      <DialogContent dividers sx={{ borderColor: COLORS.border }}>
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          This closes the incident as a duplicate of the one you choose. It cannot be undone from this screen.
        </Alert>
        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO, textTransform: 'uppercase', mb: 1 }}>
          Similar incidents
        </Typography>
        {similar.isLoading ? (
          <CircularProgress size={18} />
        ) : similar.isError ? (
          <Typography sx={{ fontSize: 12.5, color: COLORS.error }}>{apiErrorMessage(similar.error)}</Typography>
        ) : (similar.data ?? []).length === 0 ? (
          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>No similar incidents found. Enter an id below.</Typography>
        ) : (
          <Stack spacing={1}>
            {(similar.data ?? []).map((s) => (
              <Box
                key={s.incidentId}
                onClick={() => {
                  setPicked(s.incidentId);
                  setManualId('');
                }}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  cursor: 'pointer',
                  bgcolor: picked === s.incidentId && !manualId ? 'rgba(99,102,241,0.15)' : COLORS.surfaceContainerLow,
                  border: `1px solid ${picked === s.incidentId && !manualId ? COLORS.primary : COLORS.border}`,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: COLORS.secondary }}>{s.code}</Typography>
                  <Chip size="small" label={`${Math.round(s.similarity * 100)}%`} sx={{ fontSize: 12, height: 20 }} />
                  <Chip size="small" label={s.match} sx={{ fontSize: 12, height: 20 }} />
                </Stack>
                <Typography sx={{ fontSize: 13, color: COLORS.onSurface }}>{s.title}</Typography>
              </Box>
            ))}
          </Stack>
        )}
        <TextField
          label="Or enter the original incident id"
          size="small"
          fullWidth
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          error={manualInvalid}
          helperText={manualInvalid ? 'Enter a positive whole number that is not this incident.' : ' '}
          sx={{ mt: 2, ...fieldSx }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={m.isPending} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={target == null || m.isPending}
          onClick={() => m.mutate()}
          startIcon={m.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Mark duplicate
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Manual escalation: raises the escalation level by one and needs a reason of 10 to 1000 characters. */
export function EscalateDialog({ open, incidentId, onClose }: { open: boolean; incidentId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const m = useMutation({
    mutationFn: (reason: string) => escalateIncident(incidentId, reason),
    onSuccess: () => {
      toast('Escalation level raised.', 'success');
      invalidateIncidentCaches(qc);
      onClose();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  return (
    <ConfirmDialog
      open={open}
      title="Escalate incident"
      description="Raises the escalation level by one and notifies the next tier. The status does not change."
      confirmLabel="Escalate"
      confirmColor="error"
      requireReason
      reasonLabel="Reason for escalation"
      minReasonLength={MIN_REASON}
      maxReasonLength={MAX_REASON}
      isLoading={m.isPending}
      onConfirm={(r) => r && m.mutate(r)}
      onClose={onClose}
    />
  );
}

/** Edit description, impact, urgency and affected users. Sends the version so a concurrent edit is caught. */
export function EditIncidentDialog({ open, incident, onClose }: { open: boolean; incident: IncidentDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState('3');
  const [urgency, setUrgency] = useState('3');
  const [users, setUsers] = useState('1');
  const [conflict, setConflict] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription(incident.description);
      setImpact(String(incident.impact));
      setUrgency(String(incident.urgency));
      setUsers(String(incident.affectedUsers));
      setConflict(false);
    }
  }, [open, incident]);

  const m = useMutation({
    mutationFn: () =>
      updateIncident(incident.id, {
        description: description.trim(),
        impact: Number(impact),
        urgency: Number(urgency),
        affectedUsers: Number(users),
        version: incident.version,
      }),
    onSuccess: () => {
      toast('Incident updated.', 'success');
      invalidateIncidentCaches(qc);
      onClose();
    },
    onError: (e: unknown) => {
      const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'OPTIMISTIC_LOCK_CONFLICT') {
        setConflict(true);
        invalidateIncidentCaches(qc);
      }
      toast(apiErrorMessage(e), 'error');
    },
  });

  const descLen = description.trim().length;
  const descBad = descLen < 20 || description.length > 5000;
  const bad15 = (v: string) => !/^[1-5]$/.test(v);
  const usersNum = Number(users);
  const usersBad = !Number.isInteger(usersNum) || usersNum < 1 || usersNum > 1000000;
  const valid = !descBad && !bad15(impact) && !bad15(urgency) && !usersBad && !conflict;

  return (
    <Dialog open={open} onClose={m.isPending ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit incident</DialogTitle>
      <DialogContent dividers sx={{ borderColor: COLORS.border }}>
        <Stack spacing={2} mt={1}>
          {conflict && (
            <Alert severity="warning" sx={{ fontSize: 12.5 }}>
              Someone else just changed this incident. The latest version has been reloaded; close this dialog and edit again.
            </Alert>
          )}
          <TextField
            label="Description (20 to 5000 characters)"
            multiline
            rows={4}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            error={descBad}
            helperText={descBad ? `Needs 20 to 5000 characters (now ${descLen})` : `${description.length}/5000`}
            sx={fieldSx}
          />
          <Stack direction="row" spacing={2}>
            <TextField label="Impact (1 to 5)" value={impact} onChange={(e) => setImpact(e.target.value)} error={bad15(impact)} fullWidth sx={fieldSx} />
            <TextField label="Urgency (1 to 5)" value={urgency} onChange={(e) => setUrgency(e.target.value)} error={bad15(urgency)} fullWidth sx={fieldSx} />
            <TextField
              label="Affected users"
              value={users}
              onChange={(e) => setUsers(e.target.value)}
              error={usersBad}
              helperText={usersBad ? '1 to 1000000' : ' '}
              fullWidth
              sx={fieldSx}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={m.isPending} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!valid || m.isPending}
          onClick={() => m.mutate()}
          startIcon={m.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Save changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** A short internal note on an incident (POST /incidents/{id}/comments, INTERNAL). */
export function InternalNoteDialog({ open, incidentId, onClose }: { open: boolean; incidentId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState('');
  useEffect(() => {
    if (open) setBody('');
  }, [open]);
  const m = useMutation({
    mutationFn: () => addComment(incidentId, body.trim(), 'INTERNAL'),
    onSuccess: () => {
      toast('Internal note added.', 'success');
      invalidateIncidentCaches(qc);
      onClose();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });
  const tooLong = body.length > 4000;
  return (
    <Dialog open={open} onClose={m.isPending ? undefined : onClose} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add internal note</DialogTitle>
      <DialogContent dividers sx={{ borderColor: COLORS.border }}>
        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          label="Note (visible to staff only, up to 4000 characters)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          error={tooLong}
          helperText={`${body.length}/4000`}
          sx={{ mt: 1, ...fieldSx }}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={m.isPending} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!body.trim() || tooLong || m.isPending}
          onClick={() => m.mutate()}
          startIcon={m.isPending ? <CircularProgress size={16} /> : undefined}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Add note
        </Button>
      </DialogActions>
    </Dialog>
  );
}
