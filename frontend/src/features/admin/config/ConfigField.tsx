import { InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import type { ConfigItem } from '../../../api/admin';
import { tokens } from '../../../theme/theme';
import { isBoolean, metaFor, unitFor } from './configMeta';

const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface, fontFamily: 'JetBrains Mono, monospace', fontSize: 13 },
  '& fieldset': { borderColor: tokens.outlineVariant },
  '& .MuiFormHelperText-root': { fontSize: 12 },
};

interface Props {
  item: ConfigItem;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** One editor for one setting, chosen from the key's kind (number with range, choice, switch, text). */
export default function ConfigField({ item, value, error, onChange }: Props) {
  const meta = metaFor(item.key);
  const unit = unitFor(item.key);
  const label = `Value of ${item.key}`;

  if (isBoolean(meta)) {
    return (
      <Stack direction="row" alignItems="center" spacing={1}>
        <Switch checked={value.trim() === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} inputProps={{ 'aria-label': label }} />
        <Typography sx={{ fontSize: 13, color: tokens.onSurface }}>{value.trim() === 'true' ? 'On' : 'Off'}</Typography>
        {error && <Typography sx={{ fontSize: 12, color: tokens.tertiaryLight }}>{error}</Typography>}
      </Stack>
    );
  }

  if (meta?.kind === 'choice') {
    return (
      <TextField select size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value)} error={!!error} helperText={error}
        inputProps={{ 'aria-label': label }} sx={fieldSx}>
        {!meta.choices.includes(value) && <MenuItem value={value}>{value}</MenuItem>}
        {meta.choices.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
      </TextField>
    );
  }

  if (meta?.kind === 'integer' || meta?.kind === 'decimal') {
    return (
      <TextField
        size="small" fullWidth type="number" value={value} onChange={(e) => onChange(e.target.value)} error={!!error}
        helperText={error ?? `${meta.min} to ${meta.max}`}
        inputProps={{ min: meta.min, max: meta.max, step: meta.kind === 'integer' ? 1 : 0.01, 'aria-label': label }}
        InputProps={unit ? { endAdornment: <InputAdornment position="end"><Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{unit}</Typography></InputAdornment> } : undefined}
        sx={fieldSx}
      />
    );
  }

  return (
    <TextField
      size="small" fullWidth value={value} onChange={(e) => onChange(e.target.value)} error={!!error}
      type={meta?.kind === 'email' ? 'email' : meta?.kind === 'url' || meta?.kind === 'optional_url' ? 'url' : 'text'}
      helperText={error ?? (meta?.kind === 'optional_url' ? 'Empty is allowed' : undefined)}
      inputProps={{ 'aria-label': label, maxLength: meta?.kind === 'text' ? meta.maxLength : 2000 }}
      sx={fieldSx}
    />
  );
}
