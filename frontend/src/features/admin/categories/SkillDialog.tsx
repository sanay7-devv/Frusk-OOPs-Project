import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { createAdminSkill, renameAdminSkill, type AdminSkill } from '../../../api/admin';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage, fieldErrors } from '../../../utils/errors';

// Limits from SkillRequest: name 2 to 60 characters.
const NAME_MIN = 2;
const NAME_MAX = 60;

interface Props {
  /** null creates a new skill. */
  skill: AdminSkill | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function SkillDialog({ skill, onClose, onSaved }: Props) {
  const toast = useToast();
  const editing = skill !== null;
  const [name, setName] = useState(skill?.name ?? '');
  const [serverField, setServerField] = useState('');
  const [formError, setFormError] = useState('');
  const trimmed = name.trim();
  const problem = trimmed.length < NAME_MIN || trimmed.length > NAME_MAX ? `${NAME_MIN} to ${NAME_MAX} characters` : undefined;

  const save = useMutation({
    mutationFn: () => (editing ? renameAdminSkill(skill.id, trimmed) : createAdminSkill({ name: trimmed })),
    onSuccess: (saved) => { toast(`Skill ${saved.name} ${editing ? 'renamed' : 'created'}`, 'success'); onSaved(); },
    onError: (e) => {
      setServerField(fieldErrors(e).find((f) => f.field === 'name')?.message ?? '');
      setFormError(apiErrorMessage(e));
    },
  });

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, color: tokens.onSurface } }}>
      <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>{editing ? `Rename ${skill.name}` : 'Add skill'}</DialogTitle>
      <DialogContent dividers>
        <TextField label="Skill name" placeholder="e.g. Kubernetes" required fullWidth autoFocus size="small" sx={{
          mt: 0.5,
          '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface },
          '& fieldset': { borderColor: tokens.outlineVariant },
          '& .MuiFormHelperText-root': { fontSize: 12 },
        }}
          value={name} onChange={(e) => { setName(e.target.value); setServerField(''); }}
          error={!!serverField || (name !== '' && !!problem)} helperText={serverField || (name !== '' ? problem : undefined)}
          inputProps={{ maxLength: NAME_MAX }} />
        {formError && <Typography role="alert" sx={{ fontSize: 13, color: tokens.tertiaryLight, mt: 1.5 }}>{formError}</Typography>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={() => { setServerField(''); setFormError(''); save.mutate(); }} disabled={save.isPending || !!problem}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {save.isPending ? 'Saving...' : editing ? 'Rename skill' : 'Save skill'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
