import type { ReactNode } from 'react';
import { Box, Tooltip } from '@mui/material';
import { InfoOutlined as InfoIcon } from '@mui/icons-material';
import { tokens } from '../theme/theme';

interface Props {
  /** The visible label. */
  children: ReactNode;
  /** The detail shown on hover or keyboard focus (range, unit, rule, what a number counts). */
  tip?: ReactNode;
}

/**
 * A label with an optional small muted info icon; the explanation lives in a tooltip instead of a caption line.
 * Without `tip` it renders the label alone.
 */
export default function InfoTip({ children, tip }: Props) {
  if (!tip) return <>{children}</>;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {children}
      <Tooltip title={tip} arrow placement="top">
        <Box component="span" tabIndex={0} role="img" aria-label="More information"
          sx={{ display: 'inline-flex', color: tokens.onSurfaceVariant, opacity: 0.7, cursor: 'help', '&:hover, &:focus-visible': { opacity: 1 } }}>
          <InfoIcon sx={{ fontSize: 12 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
