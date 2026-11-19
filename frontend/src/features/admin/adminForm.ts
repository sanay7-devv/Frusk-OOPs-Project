import { fieldErrors } from '../../utils/errors';
import { tokens } from '../../theme/theme';

export const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurface },
  '& fieldset': { borderColor: tokens.outlineVariant },
  '& .MuiFormHelperText-root': { fontSize: 12 },
  '& .MuiInputLabel-root': { fontSize: 14 },
};

export const dialogPaperSx = {
  bgcolor: tokens.surfaceContainerLow,
  border: `1px solid ${tokens.outlineVariant}`,
  borderRadius: '12px',
  color: tokens.onSurface,
};

export const monoLabelSx = {
  fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase' as const,
  fontFamily: 'JetBrains Mono, monospace',
};

export const cardSx = {
  p: 2.5, borderRadius: 3, border: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainer,
};

/** Server field errors as {field: message}. Nested names ("technician.maxLoad") are kept as sent. */
export function fieldMap(e: unknown): Record<string, string> {
  return Object.fromEntries(fieldErrors(e).map((f) => [f.field, f.message]));
}

/** The message for `name`, whether the server sent "name" or "technician.name" / "technician[0].name". */
export function errFor(map: Record<string, string>, name: string): string | undefined {
  if (map[name]) return map[name];
  const hit = Object.keys(map).find((k) => k.endsWith(`.${name}`));
  return hit ? map[hit] : undefined;
}

/** Server messages that do not belong to any of the listed fields. */
export function leftoverErrors(map: Record<string, string>, shown: string[]): string[] {
  return Object.entries(map)
    .filter(([k]) => !shown.some((s) => k === s || k.endsWith(`.${s}`)))
    .map(([k, m]) => `${k}: ${m}`);
}
