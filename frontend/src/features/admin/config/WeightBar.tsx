import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import { tokens } from '../../../theme/theme';
import { WEIGHT_TOLERANCE } from './configMeta';

const COLORS = [tokens.primary, tokens.secondary, tokens.tertiary, tokens.primaryLight, tokens.secondaryLight];
const round = (n: number) => Math.round(n * 1000) / 1000;

interface Props {
  title: string;
  weights: { key: string; label: string; value: string }[];
}

/** Stacked bar of a weight set; the server requires the weights to add up to 1.0. */
export default function WeightBar({ title, weights }: Props) {
  const nums = weights.map((w) => (w.value.trim() === '' ? NaN : Number(w.value)));
  const valid = nums.every((n) => Number.isFinite(n));
  const sum = valid ? nums.reduce((a, b) => a + b, 0) : NaN;
  const off = !valid || Math.abs(sum - 1) > WEIGHT_TOLERANCE;
  return (
    <Paper sx={{ p: 2, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${off ? tokens.tertiary : tokens.outlineVariant}`, borderRadius: '10px' }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Typography sx={{ fontWeight: 700, fontSize: 14, color: tokens.onSurface }}>{title}</Typography>
        <Typography sx={{ fontSize: 13, color: off ? tokens.tertiaryLight : tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
          {valid ? `total ${round(sum)} of 1.0` : 'total unknown'}
        </Typography>
      </Stack>
      <Box
        role="img"
        aria-label={`${title}: ${weights.map((w, i) => `${w.label} ${nums[i]}`).join(', ')}`}
        sx={{ display: 'flex', height: 14, borderRadius: '7px', overflow: 'hidden', bgcolor: tokens.surfaceContainerHighest }}
      >
        {weights.map((w, i) => (Number.isFinite(nums[i]) && nums[i] > 0 ? (
          <Box key={w.key} sx={{ width: `${(nums[i] / Math.max(sum, 1)) * 100}%`, bgcolor: COLORS[i % COLORS.length] }} />
        ) : null))}
      </Box>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2} mt={1}>
        {weights.map((w, i) => (
          <Stack key={w.key} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: COLORS[i % COLORS.length] }} />
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
              {w.label} {Number.isFinite(nums[i]) ? `${Math.round(nums[i] * 100)}%` : '?'}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {off && (
        <Alert severity="warning" sx={{ mt: 1.5, fontSize: 13 }}>
          {valid
            ? `The weights add up to ${round(sum)}; the server only accepts 1.0 (tolerance ${WEIGHT_TOLERANCE}).`
            : 'Every weight needs a number.'}
        </Alert>
      )}
    </Paper>
  );
}
