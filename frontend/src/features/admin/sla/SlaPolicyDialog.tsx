import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  createSlaPolicyRecord, updateSlaPolicyRecord, type ServiceRecord, type SlaCalendar, type SlaPolicyInput, type SlaPolicyRecord,
} from '../../../api/adminDirectory';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, errFor, fieldMap, fieldSx, leftoverErrors } from '../adminForm';

export const RESPONSE_MAX = 10080;
export const RESOLUTION_MAX = 43200;
const PRIORITIES = ['P1', 'P2', 'P3', 'P4'] as const;

interface Props {
  open: boolean;
  /** null = create. */
  policy: SlaPolicyRecord | null;
  services: ServiceRecord[];
  onClose: () => void;
  onSaved: () => void;
}

/** Create or edit an SLA policy. Service and priority are fixed after creation (the API rejects changes). */
export default function SlaPolicyDialog({ open, policy, services, onClose, onSaved }: Props) {
  const toast = useToast();
  const editing = policy !== null;
  const [priority, setPriority] = useState<SlaPolicyInput['priority']>('P1');
  const [serviceId, setServiceId] = useState('');
  const [response, setResponse] = useState('');
  const [resolution, setResolution] = useState('');
  const [calendar, setCalendar] = useState<SlaCalendar>('ALWAYS');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPriority(policy?.priority ?? 'P1');
    setServiceId(policy?.serviceId != null ? String(policy.serviceId) : '');
    setResponse(policy ? String(policy.responseMinutes) : '');
    setResolution(policy ? String(policy.resolutionMinutes) : '');
    setCalendar(policy?.calendarType ?? 'ALWAYS');
    setErrors({});
    setFormError('');
  }, [open, policy]);

  const save = useMutation({
    mutationFn: () => {
      const body: SlaPolicyInput = {
        serviceId: serviceId === '' ? null : Number(serviceId),
        priority,
        responseMinutes: Number(response),
        resolutionMinutes: Number(resolution),
        calendarType: calendar,
      };
      return editing ? updateSlaPolicyRecord(policy.id, body) : createSlaPolicyRecord(body);
    },
    onSuccess: () => {
      toast(editing ? 'SLA policy updated' : 'SLA policy created', 'success');
      onSaved();
    },
    onError: (e) => {
      const map = fieldMap(e);
      setErrors(map);
      setFormError(Object.keys(map).length ? '' : apiErrorMessage(e));
    },
  });

  const submit = () => {
    const local: Record<string, string> = {};
    const r = Number(response);
    const s = Number(resolution);
    if (!response || !Number.isInteger(r) || r < 1 || r > RESPONSE_MAX) local.responseMinutes = `Whole minutes from 1 to ${RESPONSE_MAX}`;
    if (!resolution || !Number.isInteger(s) || s < 1 || s > RESOLUTION_MAX) local.resolutionMinutes = `Whole minutes from 1 to ${RESOLUTION_MAX}`;
    else if (!local.responseMinutes && s <= r) local.resolutionMinutes = 'Must be longer than the response time';
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length === 0) save.mutate();
  };

  const extra = leftoverErrors(errors, ['priority', 'serviceId', 'responseMinutes', 'resolutionMinutes', 'calendarType']);

  return (
    <Dialog open={open} onClose={() => !save.isPending && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>{editing ? 'Edit SLA policy' : 'New SLA policy'}</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {extra.length > 0 && <Alert severity="error">{extra.join('; ')}</Alert>}
          <TextField select size="small" label="Priority" value={priority} disabled={editing} onChange={(e) => setPriority(e.target.value as SlaPolicyInput['priority'])}
            error={!!errFor(errors, 'priority')} helperText={errFor(errors, 'priority') ?? (editing ? 'Fixed after creation. Delete and recreate to change it.' : undefined)} sx={fieldSx}>
            {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Service" value={serviceId} disabled={editing} onChange={(e) => setServiceId(e.target.value)}
            SelectProps={{ displayEmpty: true, renderValue: (v) => (v === '' ? 'All services (global default)' : services.find((x) => String(x.id) === v)?.name ?? String(v)) }}
            error={!!errFor(errors, 'serviceId')}
            helperText={errFor(errors, 'serviceId') ?? (editing ? 'Fixed after creation.' : 'A service policy overrides the global default for that priority.')} sx={fieldSx}>
            <MenuItem value="">All services (global default)</MenuItem>
            {services.map((svc) => <MenuItem key={svc.id} value={String(svc.id)}>{svc.name}{svc.active ? '' : ' (retired)'}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth size="small" type="number" label="Response (minutes)" value={response} onChange={(e) => setResponse(e.target.value)}
              inputProps={{ min: 1, max: RESPONSE_MAX }} error={!!errFor(errors, 'responseMinutes')} helperText={errFor(errors, 'responseMinutes') ?? `1 to ${RESPONSE_MAX}`} sx={fieldSx} />
            <TextField fullWidth size="small" type="number" label="Resolution (minutes)" value={resolution} onChange={(e) => setResolution(e.target.value)}
              inputProps={{ min: 1, max: RESOLUTION_MAX }} error={!!errFor(errors, 'resolutionMinutes')} helperText={errFor(errors, 'resolutionMinutes') ?? `1 to ${RESOLUTION_MAX}`} sx={fieldSx} />
          </Stack>
          <TextField select size="small" label="Clock" value={calendar} onChange={(e) => setCalendar(e.target.value as SlaCalendar)}
            error={!!errFor(errors, 'calendarType')} sx={fieldSx}
            helperText={errFor(errors, 'calendarType') ?? 'Business hours use the calendar in Configuration; the clock stops outside it.'}>
            <MenuItem value="ALWAYS">Always (24 hours, 7 days)</MenuItem>
            <MenuItem value="BUSINESS_HOURS">Business hours only</MenuItem>
          </TextField>
          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Only one policy can exist per service and priority.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>{save.isPending ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}
