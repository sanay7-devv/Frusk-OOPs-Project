import { Alert, Box, Button, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { Add as AddIcon, DeleteOutline as RemoveIcon } from '@mui/icons-material';
import type { AdminSkill } from '../../../api/admin';
import { tokens } from '../../../theme/theme';
import { errFor, fieldSx } from '../adminForm';
import {
  AVAILABILITIES, EXPERIENCE_LABELS, MAX_LOAD_MAX, MAX_LOAD_MIN, PROFICIENCY_LABELS, type TechForm,
} from './techForm';

interface Props {
  value: TechForm;
  onChange: (next: TechForm) => void;
  errors: Record<string, string>;
  skills: AdminSkill[];
  skillsError?: string;
}

/** Experience, max load, availability, team-lead switch and skills with proficiency (TechnicianRequest). */
export default function TechnicianFields({ value, onChange, errors, skills, skillsError }: Props) {
  const set = (patch: Partial<TechForm>) => onChange({ ...value, ...patch });
  const setSkill = (i: number, patch: Partial<TechForm['skills'][number]>) =>
    set({ skills: value.skills.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select fullWidth size="small" label="Experience level" value={value.experienceLevel}
          onChange={(e) => set({ experienceLevel: e.target.value })} required
          error={!!errFor(errors, 'experienceLevel')} helperText={errFor(errors, 'experienceLevel') ?? '1 = junior, 5 = expert; used when ranking technicians'}
          sx={fieldSx}>
          {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={String(n)}>{n} · {EXPERIENCE_LABELS[n]}</MenuItem>)}
        </TextField>
        <TextField fullWidth size="small" type="number" label="Max active incidents" value={value.maxLoad} required
          onChange={(e) => set({ maxLoad: e.target.value })} inputProps={{ min: MAX_LOAD_MIN, max: MAX_LOAD_MAX }}
          error={!!errFor(errors, 'maxLoad')} helperText={errFor(errors, 'maxLoad') ?? `${MAX_LOAD_MIN} to ${MAX_LOAD_MAX}`} sx={fieldSx} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }}>
        <TextField select fullWidth size="small" label="Availability" value={value.availability}
          onChange={(e) => set({ availability: e.target.value as TechForm['availability'] })}
          error={!!errFor(errors, 'availability')} helperText={errFor(errors, 'availability')} sx={fieldSx}>
          {AVAILABILITIES.map((a) => <MenuItem key={a} value={a}>{a.replace('_', ' ')}</MenuItem>)}
        </TextField>
        <Box sx={{ width: '100%', pt: 0.5 }}>
          <FormControlLabel
            control={<Switch checked={value.lead} onChange={(e) => set({ lead: e.target.checked })} />}
            label={<Typography sx={{ fontSize: 14, color: tokens.onSurface }}>Team lead (escalation level 1)</Typography>}
          />
          <Typography sx={{ fontSize: 12, color: errFor(errors, 'escalationLevel') ? '#f43f5e' : tokens.onSurfaceVariant, ml: 4 }}>
            {errFor(errors, 'escalationLevel') ?? 'Leads receive level-1 escalations. The API accepts 0 or 1 only.'}
          </Typography>
        </Box>
      </Stack>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.onSurface }}>Skills and proficiency</Typography>
          <Button size="small" startIcon={<AddIcon />} sx={{ textTransform: 'none', fontSize: 13 }}
            disabled={skills.length === 0 || value.skills.length >= skills.length}
            onClick={() => set({ skills: [...value.skills, { skillId: '', proficiency: '3' }] })}>
            Add skill
          </Button>
        </Stack>
        {skillsError && <Alert severity="error" sx={{ mb: 1, fontSize: 13 }}>{skillsError}</Alert>}
        {!skillsError && skills.length === 0 && (
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No skills exist yet. Create them under Categories.</Typography>
        )}
        {value.skills.length === 0 && skills.length > 0 && (
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No skills assigned. Assignment ranks technicians by skill match.</Typography>
        )}
        <Stack spacing={1}>
          {value.skills.map((row, i) => (
            <Stack key={i} direction="row" spacing={1} alignItems="center">
              <TextField select fullWidth size="small" label="Skill" value={row.skillId} onChange={(e) => setSkill(i, { skillId: e.target.value })} sx={fieldSx}>
                {skills.map((s) => (
                  <MenuItem key={s.id} value={String(s.id)}
                    disabled={value.skills.some((o, idx) => idx !== i && o.skillId === String(s.id))}>{s.name}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Proficiency" value={row.proficiency} sx={{ ...fieldSx, minWidth: 150 }}
                onChange={(e) => setSkill(i, { proficiency: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <MenuItem key={n} value={String(n)}>{n} · {PROFICIENCY_LABELS[n]}</MenuItem>)}
              </TextField>
              <Tooltip title="Remove skill">
                <IconButton aria-label="Remove skill" onClick={() => set({ skills: value.skills.filter((_, idx) => idx !== i) })}>
                  <RemoveIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          ))}
        </Stack>
        {errFor(errors, 'skills') && <Typography sx={{ fontSize: 12, color: '#f43f5e', mt: 0.5 }}>{errFor(errors, 'skills')}</Typography>}
      </Box>
    </Stack>
  );
}
