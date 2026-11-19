import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  grantRole, updateDirectoryUser, type AdminScope, type DirectoryUser,
} from '../../../api/adminDirectory';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, errFor, fieldMap, fieldSx, leftoverErrors } from '../adminForm';

/** Edit name, department and location (PUT /admin/users/{id}); the active flag is kept as it is. */
export function EditUserDialog({ user, onClose, onSaved }: { user: DirectoryUser | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setDepartment(user.department ?? '');
    setLocation(user.location ?? '');
    setErrors({});
    setFormError('');
  }, [user]);

  if (!user) return null;

  const save = async () => {
    const local: Record<string, string> = {};
    if (name.trim().length < 2) local.name = 'At least 2 characters';
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      await updateDirectoryUser(user.id, { name: name.trim(), active: user.active, department: department.trim(), location: location.trim() });
      toast(`Saved ${name.trim()}`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      const map = fieldMap(e);
      setErrors(map);
      setFormError(Object.keys(map).length ? '' : apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const extra = leftoverErrors(errors, ['name', 'department', 'location']);
  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
        Edit account
        <Typography component="div" sx={{ fontSize: 13, color: tokens.onSurfaceVariant, fontWeight: 400 }}>{user.email}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {formError && <Alert severity="error">{formError}</Alert>}
          {extra.length > 0 && <Alert severity="error">{extra.join('; ')}</Alert>}
          <TextField size="small" label="Full name" required value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 100 }}
            error={!!errFor(errors, 'name')} helperText={errFor(errors, 'name')} sx={fieldSx} />
          <TextField size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} inputProps={{ maxLength: 80 }}
            error={!!errFor(errors, 'department')} helperText={errFor(errors, 'department')} sx={fieldSx} />
          <TextField size="small" label="Location" value={location} onChange={(e) => setLocation(e.target.value)} inputProps={{ maxLength: 80 }}
            error={!!errFor(errors, 'location')} helperText={errFor(errors, 'location')} sx={fieldSx} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Grant ADMINISTRATOR with a scope (SYSTEM_ADMIN or IT_MANAGER). */
export function GrantAdminDialog({ user, onClose, onSaved }: { user: DirectoryUser | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [scope, setScope] = useState<AdminScope>('SYSTEM_ADMIN');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setScope('SYSTEM_ADMIN'); setError(''); }, [user]);
  if (!user) return null;

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await grantRole(user.id, { roleType: 'ADMINISTRATOR', administrator: { scope } });
      toast(`${user.name} is now an administrator`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="xs" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>Make administrator</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant }}>{user.name} will be able to change configuration, users and policies.</Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField select size="small" label="Scope" value={scope} onChange={(e) => setScope(e.target.value as AdminScope)} sx={fieldSx}
            helperText="IT manager is the top of the escalation ladder (level 3)">
            <MenuItem value="SYSTEM_ADMIN">System administrator</MenuItem>
            <MenuItem value="IT_MANAGER">IT manager</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>{saving ? 'Granting…' : 'Grant role'}</Button>
      </DialogActions>
    </Dialog>
  );
}
