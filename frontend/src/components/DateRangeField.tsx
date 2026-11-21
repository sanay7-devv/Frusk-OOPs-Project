import { Box, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import { Close as ClearIcon } from '@mui/icons-material';
import { formatDate, formatDateTime } from '../utils/format';

interface Props {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** `date` for day filters, `datetime` when the time of day matters. */
  mode?: 'date' | 'datetime';
  disabled?: boolean;
  /** Shown as a tooltip on the second field (for example "Records before this time"). */
  toTip?: string;
}

const fieldSx = { width: 190, '& input': { colorScheme: 'dark' } };

/** Two matching date fields (From, To) with the label inside and one clear button. Values are `yyyy-MM-dd` or `yyyy-MM-ddTHH:mm`. */
export default function DateRangeField({ from, to, onChange, mode = 'date', disabled, toTip }: Props) {
  const type = mode === 'date' ? 'date' : 'datetime-local';
  const invalid = !!from && !!to && new Date(to) < new Date(from);
  const fmt = mode === 'date' ? formatDate : formatDateTime;
  return (
    <Box sx={{ display: 'inline-flex', gap: 1, alignItems: 'flex-start' }}>
      <TextField size="small" type={type} label="From" value={from} disabled={disabled} sx={fieldSx}
        onChange={(e) => onChange({ from: e.target.value, to })} InputLabelProps={{ shrink: true }}
        inputProps={{ 'aria-label': from ? `From ${fmt(from)}` : 'From' }} />
      <Tooltip title={toTip ?? ''} placement="top">
        <TextField size="small" type={type} label="To" value={to} disabled={disabled} sx={fieldSx}
          onChange={(e) => onChange({ from, to: e.target.value })} InputLabelProps={{ shrink: true }}
          error={invalid} helperText={invalid ? 'To is before From' : undefined}
          inputProps={{ 'aria-label': to ? `To ${fmt(to)}` : 'To' }}
          InputProps={{
            endAdornment: (from || to) && !disabled ? (
              <InputAdornment position="end" sx={{ mr: 3 }}>
                <IconButton size="small" aria-label="Clear dates" onClick={() => onChange({ from: '', to: '' })}><ClearIcon sx={{ fontSize: 14 }} /></IconButton>
              </InputAdornment>
            ) : undefined,
          }} />
      </Tooltip>
    </Box>
  );
}
