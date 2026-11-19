import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';
import type { VerifyView } from '../../api/audit';
import { tokens } from '../../theme/theme';
import { alpha, tone } from './palette';

const shortHash = (h?: string | null) => (h ? `${h.slice(0, 8)}…${h.slice(-4)}` : 'none');

/**
 * The result of a chain check drawn as blocks: every sealed block links to the one before it by hash,
 * and records written after the last seal wait in an open block. Numbers come from GET /audit/verify only.
 */
export default function AuditChainVisual({ verify }: { verify: VerifyView }) {
  const color = verify.intact ? tone.success : tone.danger;
  const block = (title: string, lines: string[], c: string, hint?: string) => (
    <Tooltip title={hint ?? ''} disableHoverListener={!hint}>
      <Box sx={{ minWidth: 150, p: 1.25, borderRadius: 2, border: `1px solid ${alpha(c, 0.5)}`, bgcolor: alpha(c, 0.1) }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: c }}>{title}</Typography>
        {lines.map((l) => (
          <Typography key={l} sx={{ fontSize: 12, color: tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>{l}</Typography>
        ))}
      </Box>
    </Tooltip>
  );
  const arrow = <ArrowIcon sx={{ fontSize: 18, color: tokens.onSurfaceVariant }} aria-hidden />;
  return (
    <Box role="img" aria-label="Audit chain: sealed blocks, then records not sealed yet" sx={{ overflowX: 'auto', pb: 0.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ width: 'max-content' }}>
        {block('Sealed blocks', [`${verify.sealsChecked} seal${verify.sealsChecked === 1 ? '' : 's'} chained`], color)}
        {arrow}
        {block(
          verify.lastSealId != null ? `Last seal #${verify.lastSealId}` : 'No seal yet',
          [`${verify.recordsChecked} records checked`, `hash ${shortHash(verify.lastSealHash)}`], color, verify.lastSealHash ?? undefined,
        )}
        {arrow}
        {block(
          'Not sealed yet',
          [`${verify.unsealedRecords} record${verify.unsealedRecords === 1 ? '' : 's'}`],
          verify.unsealedRecords > 0 ? tone.warning : tokens.onSurfaceVariant,
          'These records are covered by the next seal.',
        )}
      </Stack>
    </Box>
  );
}
