import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { assignIncident } from '../../../api/incidents';
import { reassignIncident } from '../../../api/technicians';
import { CandidatePicker } from '../../lead/shared/TeamComponents';
import type { IncidentSummary } from '../../../api/types';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { failureMessage, isConflict } from '../adminErrors';

/** Assign (no assignee yet: POST /assign) or reassign (POST /reassign, reason of 10 to 1000 characters). */
export default function AssignDialog({ incident, onClose }: { incident: IncidentSummary | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [techId, setTechId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const reassigning = !!incident?.assignee;

  useEffect(() => {
    setTechId('');
    setReason('');
  }, [incident?.id]);

  const save = useMutation({
    mutationFn: () => (reassigning
      ? reassignIncident(incident!.id, Number(techId), reason.trim())
      : assignIncident(incident!.id, Number(techId))),
    onSuccess: () => {
      toast(`${incident!.code} ${reassigning ? 'reassigned' : 'assigned'}.`, 'success');
      qc.invalidateQueries({ queryKey: ['admin-incidents-list'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      onClose();
    },
    // A version conflict reloads the list so pressing the button again works on fresh data.
    onError: (e) => {
      if (isConflict(e)) {
        qc.invalidateQueries({ queryKey: ['admin-incidents-list'] });
        qc.invalidateQueries({ queryKey: ['incidents'] });
      }
    },
  });

  const reasonOk = !reassigning || (reason.trim().length >= 10 && reason.trim().length <= 1000);
  const valid = techId !== '' && reasonOk;

  return (
    <Dialog open={!!incident} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' } }}>
      <DialogTitle>{reassigning ? 'Reassign' : 'Assign'} {incident?.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1, maxHeight: 460, overflowY: 'auto', pr: 0.5 }}>
          {save.isError && <Alert severity="error">{failureMessage(save.error)}</Alert>}
          {incident && (
            <CandidatePicker incidentId={incident.id} assigneeId={incident.assignee?.id} selectedId={techId === '' ? null : techId} onSelect={setTechId} />
          )}
          {reassigning && (
            <TextField size="small" fullWidth multiline minRows={2} label="Reason" value={reason} disabled={save.isPending}
              onChange={(e) => setReason(e.target.value)} error={reason.length > 0 && !reasonOk}
              helperText={`At least 10 characters (${reason.trim().length} so far)`} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}
          startIcon={save.isPending ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ textTransform: 'none' }}>
          {reassigning ? 'Reassign' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
