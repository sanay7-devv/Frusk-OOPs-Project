import { alpha } from '@mui/material';
import { priorityColor, slaStateColor, tokens } from '../../theme/theme';

/** Semantic status colours for admin screens, all taken from theme exports (no hex literals in screens). */
export const tone = {
  danger: priorityColor.P1,
  warning: slaStateColor.WARNING,
  caution: priorityColor.P2,
  success: priorityColor.P4,
  info: priorityColor.P3,
  accent: tokens.primary,
  accentText: tokens.primaryLight,
  onAccent: tokens.onSurface,
} as const;

/** Translucent fill and border for a coloured chip or banner. */
export const tint = (color: string, fill = 0.15) => ({
  bgcolor: alpha(color, fill),
  border: `1px solid ${alpha(color, 0.35)}`,
  color,
});
export { alpha };
