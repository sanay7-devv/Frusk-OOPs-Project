import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import { assignIncident } from '../../../api/incidents';
import { listTechnicians, reassignIncident } from '../../../api/technicians';
import type { IncidentSummary } from '../../../api/types';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { failureMessage, isConflict } from '../adminErrors';

/** Assign (no assignee yet: POST /assign) or reassign (POST /reassign, reason of 10 to 1000 characters). */
export default function AssignDialog({ incident, onClose }: { incident: IncidentSummary | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [techId, setTechId] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const reassigning = !!incident?.assignee;
  const techs = useQuery({ queryKey: ['technicians-list'], queryFn: () => listTechnicians(), enabled: !!incident });

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
    <Dialog open={!!incident} onClose={save.isPending ? undefined : onClose} fullWidth maxWidth="xs"
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' } }}>
      <DialogTitle>{reassigning ? 'Reassign' : 'Assign'} {incident?.code}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {save.isError && <Alert severity="error">{failureMessage(save.error)}</Alert>}
          {techs.isError && <Alert severity="error">{apiErrorMessage(techs.error)}</Alert>}
          <TextField select size="small" fullWidth label="Technician" value={techId} disabled={save.isPending || techs.isLoading}
            onChange={(e) => setTechId(Number(e.target.value))}>
            {(techs.data ?? []).filter((t) => t.id !== incident?.assignee?.id).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box component="span">{t.name}</Box>
                <Box component="span" sx={{ ml: 1, fontSize: 12, color: tokens.onSurfaceVariant }}>
                  {t.currentLoad} of {t.maxLoad}, {t.availability.replace(/_/g, ' ').toLowerCase()}
                </Box>
              </MenuItem>
            ))}
          </TextField>
          {reassigning && (
            <TextField size="small" fullWidth multiline minRows={2} label="Reason" value={reason} disabled={save.isPending}
              onChange={(e) => setReason(e.target.value)} error={reason.length > 0 && !reasonOk}
              helperText={`At least 10 characters (${reason.trim().length} so far). Currently with ${incident?.assignee?.name}.`} />
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
