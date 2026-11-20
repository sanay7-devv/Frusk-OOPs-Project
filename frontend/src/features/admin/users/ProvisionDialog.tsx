import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, MenuItem, Stack, TextField, Typography,
} from '@mui/material';
import { getAdminSkills } from '../../../api/admin';
import { createDirectoryUser, type AdminScope, type DirectoryRole } from '../../../api/adminDirectory';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, errFor, fieldMap, fieldSx, leftoverErrors } from '../adminForm';
import TechnicianFields from './TechnicianFields';
import { emptyTechForm, toTechnicianRequest, validateTech, type TechForm } from './techForm';
import { tone } from '../palette';
import { failureMessage } from '../adminErrors';

const SHOWN = ['name', 'email', 'password', 'department', 'location', 'roles', 'experienceLevel', 'maxLoad', 'availability', 'escalationLevel', 'skills', 'scope', 'administrator'];

export default function ProvisionDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [technician, setTechnician] = useState(false);
  const [administrator, setAdministrator] = useState(false);
  const [scope, setScope] = useState<AdminScope>('SYSTEM_ADMIN');
  const [tech, setTech] = useState<TechForm>(emptyTechForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const skills = useQuery({ queryKey: ['admin-skills'], queryFn: getAdminSkills, enabled: open && technician });

  const reset = () => {
    setName(''); setEmail(''); setPassword(''); setDepartment(''); setLocation('');
    setTechnician(false); setAdministrator(false); setScope('SYSTEM_ADMIN'); setTech(emptyTechForm());
    setErrors({}); setFormError('');
  };

  const create = useMutation({
    mutationFn: () => {
      const roles: DirectoryRole[] = ['EMPLOYEE', ...(technician ? ['TECHNICIAN' as const] : []), ...(administrator ? ['ADMINISTRATOR' as const] : [])];
      return createDirectoryUser({
        name: name.trim(),
        email: email.trim(),
        password,
        department: department.trim() || undefined,
        location: location.trim() || undefined,
        roles,
        technician: technician ? toTechnicianRequest(tech) : undefined,
        administrator: administrator ? { scope } : undefined,
      });
    },
    onSuccess: (u) => {
      toast(`Account created for ${u.name}`, 'success');
      reset();
      onCreated();
    },
    onError: (e) => {
      const map = fieldMap(e);
      setErrors(map);
      setFormError(Object.keys(map).length ? '' : failureMessage(e));
    },
  });

  const submit = () => {
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'At least 2 characters';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) local.email = 'Enter a valid e-mail address';
    if (password.length < 8 || password.length > 72) local.password = '8 to 72 characters';
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) local.password = 'Needs at least one letter and one digit';
    if (technician) Object.assign(local, validateTech(tech));
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length === 0) create.mutate();
  };

  const close = () => { if (!create.isPending) { reset(); onClose(); } };
  const extra = leftoverErrors(errors, SHOWN);

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>Create account</DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {extra.length > 0 && <Alert severity="error">{extra.join('; ')}</Alert>}
          <TextField size="small" label="Full name" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 100 }}
            error={!!errFor(errors, 'name')} helperText={errFor(errors, 'name')} sx={fieldSx} />
          <TextField size="small" label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} inputProps={{ maxLength: 150 }}
            error={!!errFor(errors, 'email')} helperText={errFor(errors, 'email')} sx={fieldSx} />
          <TextField size="small" label="Initial password" type="password" required autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} inputProps={{ maxLength: 72 }}
            error={!!errFor(errors, 'password')}
            helperText={errFor(errors, 'password') ?? '8 to 72 characters with a letter and a digit. Common words ("Welcome1") and parts of the name or e-mail are rejected.'}
            sx={fieldSx} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField fullWidth size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} inputProps={{ maxLength: 80 }}
              error={!!errFor(errors, 'department')} helperText={errFor(errors, 'department')} sx={fieldSx} />
            <TextField fullWidth size="small" label="Location" value={location} onChange={(e) => setLocation(e.target.value)} inputProps={{ maxLength: 80 }}
              error={!!errFor(errors, 'location')} helperText={errFor(errors, 'location')} sx={fieldSx} />
          </Stack>

          <Divider sx={{ borderColor: tokens.outlineVariant }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Roles</Typography>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mt: '-8px !important' }}>
            Every account is an Employee. Add roles as needed.
          </Typography>
          {errFor(errors, 'roles') && <Typography sx={{ fontSize: 12, color: tone.danger }}>{errFor(errors, 'roles')}</Typography>}
          <FormControlLabel control={<Checkbox checked={technician} onChange={(e) => setTechnician(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 14 }}>Technician (handles incidents)</Typography>} />
          {technician && (
            <TechnicianFields value={tech} onChange={setTech} errors={errors} skills={skills.data ?? []}
              skillsError={skills.isError ? apiErrorMessage(skills.error) : undefined} />
          )}
          <FormControlLabel control={<Checkbox checked={administrator} onChange={(e) => setAdministrator(e.target.checked)} />}
            label={<Typography sx={{ fontSize: 14 }}>Administrator</Typography>} />
          {administrator && (
            <TextField select size="small" label="Administrator scope" value={scope} onChange={(e) => setScope(e.target.value as AdminScope)}
              error={!!errFor(errors, 'scope')} helperText={errFor(errors, 'scope') ?? 'IT manager is the top of the escalation ladder'} sx={fieldSx}>
              <MenuItem value="SYSTEM_ADMIN">System administrator</MenuItem>
              <MenuItem value="IT_MANAGER">IT manager</MenuItem>
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} disabled={create.isPending} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={create.isPending} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {create.isPending ? 'Creating…' : 'Create account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
