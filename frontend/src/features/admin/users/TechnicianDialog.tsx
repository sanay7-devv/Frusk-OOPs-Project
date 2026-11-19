import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { getAdminSkills } from '../../../api/admin';
import {
  grantRole, replaceTechnicianSkills, updateTechnicianProfileExact, type DirectoryUser,
} from '../../../api/adminDirectory';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { dialogPaperSx, fieldMap, leftoverErrors } from '../adminForm';
import TechnicianFields from './TechnicianFields';
import { emptyTechForm, skillRequests, techFormFrom, toTechnicianRequest, validateTech, type TechForm } from './techForm';

interface Props {
  /** The user to grant the Technician role to ("grant") or whose profile is edited ("manage"). */
  user: DirectoryUser | null;
  mode: 'grant' | 'manage';
  onClose: () => void;
  onSaved: () => void;
}

const SHOWN = ['experienceLevel', 'maxLoad', 'availability', 'escalationLevel', 'skills'];

/** Technician profile: experience, max load, availability, team lead and skills with proficiency. */
export default function TechnicianDialog({ user, mode, onClose, onSaved }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<TechForm>(emptyTechForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const skills = useQuery({ queryKey: ['admin-skills'], queryFn: getAdminSkills, enabled: !!user });

  useEffect(() => {
    if (!user) return;
    setForm(mode === 'manage' && user.technician ? techFormFrom(user.technician) : emptyTechForm());
    setErrors({});
    setFormError('');
  }, [user, mode]);

  if (!user) return null;
  const original = mode === 'manage' && user.technician ? techFormFrom(user.technician) : null;

  const save = async () => {
    const local = validateTech(form);
    setErrors(local);
    setFormError('');
    if (Object.keys(local).length) return;
    setSaving(true);
    try {
      if (mode === 'grant') {
        await grantRole(user.id, { roleType: 'TECHNICIAN', technician: toTechnicianRequest(form) });
        toast(`${user.name} is now a technician`, 'success');
      } else {
        const profileChanged = !original || original.experienceLevel !== form.experienceLevel || original.maxLoad !== form.maxLoad
          || original.availability !== form.availability || original.lead !== form.lead;
        const skillsChanged = !original || JSON.stringify(original.skills) !== JSON.stringify(form.skills);
        if (profileChanged) {
          await updateTechnicianProfileExact(user.id, {
            escalationLevel: form.lead ? 1 : 0,
            experienceLevel: Number(form.experienceLevel),
            maxLoad: Number(form.maxLoad),
            availability: form.availability,
          });
        }
        if (skillsChanged) {
          try {
            await replaceTechnicianSkills(user.id, skillRequests(form));
          } catch (e) {
            if (profileChanged) onSaved(); // the profile part is already saved; show it
            throw e;
          }
        }
        toast(profileChanged || skillsChanged ? `Technician profile of ${user.name} saved` : 'Nothing changed', profileChanged || skillsChanged ? 'success' : 'info');
      }
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

  const extra = leftoverErrors(errors, SHOWN);

  return (
    <Dialog open onClose={() => !saving && onClose()} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
      <DialogTitle sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
        {mode === 'grant' ? 'Make technician' : 'Technician profile'}
        <Typography component="div" sx={{ fontSize: 13, color: tokens.onSurfaceVariant, fontWeight: 400 }}>{user.name} · {user.email}</Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
        {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
        {extra.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{extra.join('; ')}</Alert>}
        <TechnicianFields value={form} onChange={setForm} errors={errors} skills={skills.data ?? []}
          skillsError={skills.isError ? apiErrorMessage(skills.error) : undefined} />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving} sx={{ textTransform: 'none', fontWeight: 700 }}>
          {saving ? 'Saving…' : mode === 'grant' ? 'Grant role' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
