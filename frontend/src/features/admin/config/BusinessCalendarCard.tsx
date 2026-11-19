import { useState } from 'react';
import { Autocomplete, Box, Button, Chip, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { tokens } from '../../../theme/theme';
import { BUSINESS_KEYS as K } from './configMeta';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const FULL: Record<string, string> = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday', SUN: 'Sunday' };

const items = (v: string) => v.split(',').map((s) => s.trim()).filter(Boolean);
/** The server accepts MON or MONDAY; reduce to the three-letter form the toggles use. */
const dayCodes = (v: string) => items(v).map((d) => d.slice(0, 3).toUpperCase());

function timeZones(current: string): string[] {
  const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  return list.includes(current) || !current ? list : [current, ...list];
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface },
  '& fieldset': { borderColor: tokens.outlineVariant },
  '& .MuiFormHelperText-root': { fontSize: 12 },
};

interface Props {
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

/** Edits the company business-hours calendar: one daily window, the working days, a time zone and holidays. */
export default function BusinessCalendarCard({ values, errors, onChange }: Props) {
  const [newHoliday, setNewHoliday] = useState('');
  const days = dayCodes(values[K.days] ?? '');
  const holidays = items(values[K.holidays] ?? '').slice().sort();
  const zones = timeZones(values[K.zone] ?? '');
  const open = values[K.open] ?? '';
  const close = values[K.close] ?? '';

  const addHoliday = () => {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    onChange(K.holidays, [...holidays, newHoliday].sort().join(','));
    setNewHoliday('');
  };

  return (
    <Paper sx={{ p: 2.5, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
      <Typography sx={{ fontWeight: 700, color: tokens.onSurface }}>Business-hours calendar</Typography>
      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
        Used by SLA policies of type BUSINESS_HOURS: their clock only runs inside these hours. One daily window applies to every working day.
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
        <Autocomplete
          sx={{ flex: 2 }} size="small" options={zones} value={values[K.zone] || null}
          onChange={(_, v) => onChange(K.zone, v ?? '')}
          renderInput={(p) => <TextField {...p} label="Time zone" error={!!errors[K.zone]} helperText={errors[K.zone] ?? K.zone} sx={fieldSx} />}
        />
        <TextField sx={{ flex: 1, ...fieldSx }} size="small" type="time" label="Opens" value={open} onChange={(e) => onChange(K.open, e.target.value)}
          error={!!errors[K.open]} helperText={errors[K.open] ?? K.open} InputLabelProps={{ shrink: true }} />
        <TextField sx={{ flex: 1, ...fieldSx }} size="small" type="time" label="Closes" value={close} onChange={(e) => onChange(K.close, e.target.value)}
          error={!!errors[K.close]} helperText={errors[K.close] ?? K.close} InputLabelProps={{ shrink: true }} />
      </Stack>

      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 0.5 }}>Working days</Typography>
      <ToggleButtonGroup
        size="small" value={days} aria-label="Working days"
        onChange={(_, v: string[]) => onChange(K.days, DAYS.filter((d) => v.includes(d)).join(','))}
      >
        {DAYS.map((d) => (
          <ToggleButton
            key={d} value={d} aria-label={FULL[d]}
            sx={{ textTransform: 'none', fontSize: 13, px: 2, color: tokens.onSurfaceVariant, '&.Mui-selected': { color: tokens.onSurface, bgcolor: 'rgba(99, 102, 241, 0.25)' } }}
          >
            {d}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {errors[K.days] && <Typography sx={{ fontSize: 12, color: tokens.tertiaryLight, mt: 0.5 }}>{errors[K.days]}</Typography>}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mt: 2 }} aria-label="Weekly hours">
        {DAYS.map((d) => {
          const on = days.includes(d);
          return (
            <Box key={d} sx={{ p: 1, borderRadius: '8px', textAlign: 'center', bgcolor: on ? 'rgba(99, 102, 241, 0.15)' : tokens.surfaceContainerHighest, border: `1px solid ${tokens.outlineVariant}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurface }}>{d}</Typography>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{on ? `${open || '?'} to ${close || '?'}` : 'Closed'}</Typography>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mt: 2, mb: 0.5 }}>Holidays (no SLA time counts on these dates)</Typography>
      <Stack direction="row" spacing={1} alignItems="flex-start" mb={1}>
        <TextField size="small" type="date" label="Add a date" value={newHoliday} onChange={(e) => setNewHoliday(e.target.value)}
          InputLabelProps={{ shrink: true }} sx={fieldSx} />
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addHoliday} disabled={!newHoliday || holidays.includes(newHoliday)} sx={{ textTransform: 'none', mt: '1px' }}>
          Add holiday
        </Button>
      </Stack>
      {holidays.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No holidays set.</Typography>
      ) : (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
          {holidays.map((h) => (
            <Chip key={h} label={h} onDelete={() => onChange(K.holidays, holidays.filter((x) => x !== h).join(','))} sx={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }} />
          ))}
        </Stack>
      )}
      {errors[K.holidays] && <Typography sx={{ fontSize: 12, color: tokens.tertiaryLight, mt: 0.5 }}>{errors[K.holidays]}</Typography>}
    </Paper>
  );
}
