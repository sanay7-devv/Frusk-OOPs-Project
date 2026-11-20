import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { createAdminCategory, updateAdminCategory, type AdminCategory, type AdminSkill } from '../../../api/admin';
import { useToast } from '../../../components/Toast';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage, fieldErrors } from '../../../utils/errors';
import { failureMessage } from '../adminErrors';

// Limits from CategoryRequest: name 2 to 60 characters, at most 100 required skills.
const NAME_MIN = 2;
const NAME_MAX = 60;
const SKILLS_MAX = 100;

const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface },
  '& fieldset': { borderColor: tokens.outlineVariant },
  '& .MuiFormHelperText-root': { fontSize: 12 },
};

/** Ids of a category and everything below it; a category cannot be moved under itself. */
export function descendantIds(categories: AdminCategory[], id: number): Set<number> {
  const out = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of categories) {
      if (c.parentId != null && out.has(c.parentId) && !out.has(c.id)) { out.add(c.id); grew = true; }
    }
  }
  return out;
}

interface Props {
  /** null creates a new category. */
  category: AdminCategory | null;
  categories: AdminCategory[];
  skills: AdminSkill[];
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryDialog({ category, categories, skills, onClose, onSaved }: Props) {
  const toast = useToast();
  const editing = category !== null;
  const [name, setName] = useState(category?.name ?? '');
  const [parentId, setParentId] = useState<number | ''>(category?.parentId ?? '');
  const [skillIds, setSkillIds] = useState<number[]>(category?.requiredSkillIds ?? []);
  const [active, setActive] = useState(category?.active ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const blocked = editing ? descendantIds(categories, category.id) : new Set<number>();
  const parents = categories.filter((c) => !blocked.has(c.id));
  const trimmed = name.trim();
  const nameProblem = trimmed.length < NAME_MIN || trimmed.length > NAME_MAX ? `${NAME_MIN} to ${NAME_MAX} characters` : undefined;
  const skillsProblem = skillIds.length > SKILLS_MAX ? `At most ${SKILLS_MAX} skills` : undefined;

  const save = useMutation({
    mutationFn: () => {
      const body = { name: trimmed, parentId: parentId === '' ? null : parentId, requiredSkillIds: skillIds, active };
      return editing ? updateAdminCategory(category.id, body) : createAdminCategory(body);
    },
    onSuccess: (saved) => { toast(`Category ${saved.name} ${editing ? 'updated' : 'created'}`, 'success'); onSaved(); },
    onError: (e) => {
      setErrors(Object.fromEntries(fieldErrors(e).map((f) => [f.field, f.message])));
      setFormError(failureMessage(e));
    },
  });

  return (
    <Dialog open onClose={save.isPending ? undefined : onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, color: tokens.onSurface } }}>
      <DialogTitle sx={{ fontWeight: 700, fontFamily: 'Sora, sans-serif' }}>{editing ? `Edit ${category.name}` : 'Add category'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} mt={0.5}>
          <TextField label="Name" required fullWidth autoFocus size="small" value={name} onChange={(e) => { setName(e.target.value); setErrors((x) => ({ ...x, name: '' })); }}
            error={!!errors.name || (name !== '' && !!nameProblem)} helperText={errors.name || (name !== '' ? nameProblem : undefined)}
            inputProps={{ maxLength: NAME_MAX }} sx={fieldSx} />
          <TextField select label="Parent category" fullWidth size="small" value={parentId} onChange={(e) => setParentId(e.target.value === '' ? '' : Number(e.target.value))}
            error={!!errors.parentId} helperText={errors.parentId ?? 'Leave empty for a top-level category'} sx={fieldSx}>
            <MenuItem value=""><em>None (top level)</em></MenuItem>
            {parents.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}{c.active ? '' : ' (inactive)'}</MenuItem>)}
          </TextField>
          <TextField
            select label="Required skills" fullWidth size="small" value={skillIds}
            onChange={(e) => { const v = e.target.value as unknown; setSkillIds(typeof v === 'string' ? v.split(',').map(Number) : (v as number[])); }}
            SelectProps={{
              multiple: true,
              renderValue: (sel) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(sel as number[]).map((id) => <Chip key={id} size="small" label={skills.find((s) => s.id === id)?.name ?? `Skill #${id}`} sx={{ fontSize: 12 }} />)}
                </Box>
              ),
            }}
            error={!!errors.requiredSkillIds || !!skillsProblem}
            helperText={errors.requiredSkillIds || skillsProblem || 'Only technicians holding these skills are eligible for the category'}
            sx={fieldSx}
          >
            {skills.length === 0 && <MenuItem disabled value="">No skills exist yet</MenuItem>}
            {skills.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          {editing && (
            <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 14 }}>{active ? 'Active' : 'Inactive (hidden from new incidents)'}</Typography>} />
          )}
          {formError && <Typography role="alert" sx={{ fontSize: 13, color: tokens.tertiaryLight }}>{formError}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={save.isPending} sx={{ color: tokens.onSurfaceVariant, textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={() => { setErrors({}); setFormError(''); save.mutate(); }} disabled={save.isPending || !!nameProblem || !!skillsProblem}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          {save.isPending ? 'Saving...' : editing ? 'Save category' : 'Create category'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
