import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, FormGroup, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import {
  createServiceRecord, updateServiceRecord, type ServiceInput, type ServiceRecord,
} from '../../../api/adminDirectory';
import { replaceAdminServiceDependencies } from '../../../api/admin';
import { getServiceImpact } from '../../../api/services';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, errFor, fieldMap, fieldSx, leftoverErrors } from '../adminForm';
import { failureMessage } from '../adminErrors';

const CRITICALITY_HELP: Record<number, string> = {
  1: 'Minor convenience service', 2: 'Low', 3: 'Medium', 4: 'High: many people depend on it', 5: 'Core: its outage stops the business',
};

/** Create or edit a service. Fields are exactly those of ServiceRequest. */
export function ServiceFormDialog({ open, service, onClose, onSaved }: { open: boolean; service: ServiceRecord | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const editing = service !== null;
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [criticality, setCriticality] = useState('');
  const [alwaysP1, setAlwaysP1] = useState(false);
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? '');
    setOwner(service?.owner ?? '');
    setDescription(service?.description ?? '');
    setCriticality(service ? String(service.criticality) : '');
    setAlwaysP1(service?.alwaysP1 ?? false);
    setActive(service?.active ?? true);
    setErrors({});
    setFormError('');
  }, [open, service]);

  const save = useMutation({
    mutationFn: () => {
      const body: ServiceInput = {
        name: name.trim(), owner: owner.trim(), description: description.trim(),
        criticality: Number(criticality), alwaysP1, active,
        // Keep the current dependencies; they are edited in their own dialog. A new service starts without any.
        dependencyIds: service?.dependencyIds ?? [],
      };
      return editing ? updateServiceRecord(service.id, body) : createServiceRecord(body);
    },
    onSuccess: () => { toast(editing ? 'Service saved' : 'Service created', 'success'); onSaved(); },
    onError: (e) => {
      const map = fieldMap(e);
      setErrors(map);
      setFormError(Object.keys(map).length ? '' : failureMessage(e));
    },
  });

  const submit = () => {
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'At least 2 characters';
    if (!criticality) local.criticality = 'Pick a criticality from 1 to 5';
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length === 0) save.mutate();
  };
  const extra = leftoverErrors(errors, ['name', 'owner', 'description', 'criticality', 'alwaysP1', 'active']);

  return (
    <Dialog open={open} onClose={() => !save.isPending && onClose()} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>{editing ? 'Edit service' : 'New service'}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {extra.length > 0 && <Alert severity="error">{extra.join('; ')}</Alert>}
          <TextField size="small" label="Name" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }}
            error={!!errFor(errors, 'name')} helperText={errFor(errors, 'name')} sx={fieldSx} />
          <TextField size="small" label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} inputProps={{ maxLength: 80 }}
            error={!!errFor(errors, 'owner')} helperText={errFor(errors, 'owner') ?? 'Team responsible; optional'} sx={fieldSx} />
          <TextField size="small" label="Description" multiline minRows={2} value={description} onChange={(e) => setDescription(e.target.value)} inputProps={{ maxLength: 1000 }}
            error={!!errFor(errors, 'description')} helperText={errFor(errors, 'description') ?? `${description.length}/1000`} sx={fieldSx} />
          <TextField select size="small" label="Criticality" required value={criticality} onChange={(e) => setCriticality(e.target.value)}
            error={!!errFor(errors, 'criticality')}
            helperText={errFor(errors, 'criticality') ?? (criticality ? CRITICALITY_HELP[Number(criticality)] : 'Feeds the priority score of every incident on this service')} sx={fieldSx}>
            {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={String(n)}>{n} · {CRITICALITY_HELP[n].split(':')[0]}</MenuItem>)}
          </TextField>
          <FormControlLabel control={<Switch checked={alwaysP1} onChange={(e) => setAlwaysP1(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 14 }}>Every incident is P1 (overrides the priority score)</Typography>} />
          {editing && (
            <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 14 }}>Active (retired services cannot be chosen for new incidents)</Typography>} />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Replace the direct dependencies of one service. */
export function DependenciesDialog({ service, all, onClose, onSaved }: { service: ServiceRecord | null; all: ServiceRecord[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => { setPicked(new Set(service?.dependencyIds ?? [])); setError(''); }, [service]);

  const save = useMutation({
    mutationFn: () => replaceAdminServiceDependencies(service!.id, [...picked]),
    onSuccess: () => { toast('Dependencies saved', 'success'); onSaved(); },
    onError: (e) => setError(failureMessage(e)),
  });

  if (!service) return null;
  const candidates = all.filter((s) => s.id !== service.id);
  return (
    <Dialog open onClose={() => !save.isPending && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
        Dependencies
        <Typography component="div" sx={{ fontSize: 13, color: tokens.onSurfaceVariant, fontWeight: 400 }}>{service.name} depends on:</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {candidates.length === 0 && <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant }}>There is no other service.</Typography>}
        <FormGroup>
          {candidates.map((s) => (
            <FormControlLabel key={s.id} label={<Typography sx={{ fontSize: 14 }}>{s.name}{s.active ? '' : ' (retired)'}</Typography>}
              control={<Checkbox checked={picked.has(s.id)} onChange={(e) => {
                const next = new Set(picked);
                if (e.target.checked) next.add(s.id); else next.delete(s.id);
                setPicked(next);
              }} />} />
          ))}
        </FormGroup>
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 1 }}>A dependency loop is rejected by the server.</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={() => { setError(''); save.mutate(); }} disabled={save.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Services that would be affected if this one failed (GET /services/{id}/impact). */
export function ImpactDialog({ service, onClose }: { service: ServiceRecord | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ['service-impact', service?.id], queryFn: () => getServiceImpact(service!.id), enabled: !!service });
  if (!service) return null;
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
        Impact of {service.name}
        <Typography component="div" sx={{ fontSize: 13, color: tokens.onSurfaceVariant, fontWeight: 400 }}>Services that depend on it, directly or through others</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        {q.isLoading && <LoadingState />}
        {q.isError && <ErrorState onRetry={() => q.refetch()} message={apiErrorMessage(q.error)} />}
        {q.data && q.data.affected.length === 0 && <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant }}>No other service depends on {service.name}.</Typography>}
        <Stack spacing={1}>
          {q.data?.affected.map((a) => (
            <Stack key={a.id} direction="row" justifyContent="space-between">
              <Typography sx={{ fontSize: 14 }}>{a.name}</Typography>
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>{a.distance === 1 ? 'direct' : `${a.distance} steps away`}</Typography>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}><Button onClick={onClose} sx={{ textTransform: 'none' }}>Close</Button></DialogActions>
    </Dialog>
  );
}
