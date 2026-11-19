import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tokens } from '../theme/theme';
import { createIncident, assignIncident } from '../api/incidents';
import { getCategories, getServices } from '../api/services';
import { listTechnicians } from '../api/technicians';
import { useToast } from './Toast';
import { apiErrorMessage, isDuplicate } from '../utils/errors';
import type { ApiError, IncidentDetail } from '../api/types';
import type { AxiosError } from 'axios';

const LEVELS = [
  { v: 1, label: '1 - Very low' }, { v: 2, label: '2 - Low' }, { v: 3, label: '3 - Medium' }, { v: 4, label: '4 - High' }, { v: 5, label: '5 - Very high' },
];
type Similar = NonNullable<ApiError['similar']>;

export interface IncidentCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the created incident (after the optional assignment). */
  onCreated?: (created: IncidentDetail) => void;
  /** Pre-selects the service when the dialog opens from a filtered list. */
  defaultServiceId?: number;
}

/** The one incident-create dialog (dashboard and incidents list). */
export function IncidentCreateDialog({ open, onClose, onCreated, defaultServiceId }: IncidentCreateDialogProps) {
  const toast = useToast();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceId, setServiceId] = useState<number | ''>(defaultServiceId ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [impact, setImpact] = useState<number | ''>('');
  const [urgency, setUrgency] = useState<number | ''>('');
  const [affectedUsers, setAffectedUsers] = useState('');
  const [technicianId, setTechnicianId] = useState<number | ''>('');
  const [similar, setSimilar] = useState<Similar | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && defaultServiceId) setServiceId(defaultServiceId);
  }, [open, defaultServiceId]);

  const services = useQuery({ queryKey: ['catalog-services'], queryFn: getServices, enabled: open });
  const categories = useQuery({ queryKey: ['catalog-categories'], queryFn: getCategories, enabled: open });
  const technicians = useQuery({ queryKey: ['technicians-list'], queryFn: () => listTechnicians(), enabled: open });

  const users = Number(affectedUsers);
  const valid = title.trim().length >= 5 && description.trim().length >= 20 && serviceId !== '' && impact !== '' && urgency !== ''
    && Number.isInteger(users) && users >= 1 && users <= 1_000_000;

  const submit = useMutation({
    mutationFn: async (confirmNotDuplicate: boolean) => {
      const created = await createIncident({
        title: title.trim(), description: description.trim(), serviceId: Number(serviceId),
        categoryId: categoryId === '' ? null : Number(categoryId), impact: Number(impact), urgency: Number(urgency),
        affectedUsers: users, confirmNotDuplicate,
      });
      let assignError: string | null = null;
      if (technicianId !== '') {
        try { await assignIncident(created.id, Number(technicianId)); } catch (e) { assignError = apiErrorMessage(e); }
      }
      return { created, assignError };
    },
    onSuccess: ({ created, assignError }) => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin-incidents-all'] });
      qc.invalidateQueries({ queryKey: ['admin-incidents-list'] });
      qc.invalidateQueries({ queryKey: ['incidents'] });
      toast(`Incident ${created.code} created. Priority ${created.priority ?? 'pending'}.`, 'success');
      if (assignError) toast(`The incident was created but not assigned: ${assignError}`, 'warning');
      onCreated?.(created);
      reset();
      onClose();
    },
    onError: (e) => {
      if (isDuplicate(e)) {
        setSimilar((e as AxiosError<ApiError>).response?.data?.similar ?? []);
        setError(null);
      } else {
        setError(apiErrorMessage(e));
      }
    },
  });

  function reset() {
    setTitle(''); setDescription(''); setServiceId(''); setCategoryId(''); setImpact(''); setUrgency('');
    setAffectedUsers(''); setTechnicianId(''); setSimilar(null); setError(null);
  }

  const busy = submit.isPending;
  const loadError = services.isError ? apiErrorMessage(services.error) : null;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' } }}>
      <DialogTitle>Declare an incident</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {loadError && <Alert severity="error">{loadError}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          {similar && (
            <Alert severity="warning" action={
              <Button color="inherit" size="small" disabled={busy} onClick={() => submit.mutate(true)}>Create anyway</Button>
            }>
              <Typography sx={{ fontSize: 13, mb: 0.5 }}>Similar open incidents exist. Check them first.</Typography>
              {similar.map((s) => (
                <Typography key={s.id} sx={{ fontSize: 12 }}>
                  <RouterLink to={`/admin/incidents/${s.id}`} target="_blank" style={{ color: 'inherit' }}>{s.code}</RouterLink>
                  {' '}{s.title} ({Math.round(s.similarity * 100)}% similar)
                </Typography>
              ))}
            </Alert>
          )}
          <TextField label="Title" size="small" fullWidth required value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
            helperText="At least 5 characters" />
          <TextField label="Description" size="small" fullWidth required multiline minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={busy}
            helperText={`At least 20 characters (${description.trim().length} so far)`} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select label="Service" size="small" fullWidth required value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))} disabled={busy || services.isLoading}>
                {(services.data ?? []).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Category (optional)" size="small" fullWidth value={categoryId} onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))} disabled={busy || categories.isLoading}>
                <MenuItem value="">None</MenuItem>
                {(categories.data ?? []).map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select label="Impact" size="small" fullWidth required value={impact} onChange={(e) => setImpact(Number(e.target.value))} disabled={busy}>
                {LEVELS.map((l) => <MenuItem key={l.v} value={l.v}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select label="Urgency" size="small" fullWidth required value={urgency} onChange={(e) => setUrgency(Number(e.target.value))} disabled={busy}>
                {LEVELS.map((l) => <MenuItem key={l.v} value={l.v}>{l.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="People affected" type="number" size="small" fullWidth required value={affectedUsers} onChange={(e) => setAffectedUsers(e.target.value)} disabled={busy}
                inputProps={{ min: 1, max: 1000000 }} />
            </Grid>
          </Grid>
          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>The priority is calculated by the system from impact, urgency, service criticality and people affected.</Typography>
          <TextField select label="Assign to (optional)" size="small" fullWidth value={technicianId} onChange={(e) => setTechnicianId(e.target.value === '' ? '' : Number(e.target.value))} disabled={busy || technicians.isLoading}
            helperText={technicians.isError ? apiErrorMessage(technicians.error) : 'Leave empty to let the system pick a technician'}>
            <MenuItem value="">Assign automatically</MenuItem>
            {(technicians.data ?? []).map((t) => (
              <MenuItem key={t.id} value={t.id}>
                <Box component="span">{t.name}</Box>
                <Box component="span" sx={{ ml: 1, fontSize: 12, color: tokens.onSurfaceVariant }}>{t.currentLoad} of {t.maxLoad} load, {t.availability.replace(/_/g, ' ').toLowerCase()}</Box>
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disabled={!valid || busy} onClick={() => { setSimilar(null); setError(null); submit.mutate(false); }}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined} sx={{ textTransform: 'none' }}>
          {busy ? 'Creating' : 'Declare incident'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
