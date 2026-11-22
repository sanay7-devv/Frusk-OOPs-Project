import { Box, Tooltip } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import type { ReactNode } from 'react';

/** A label with a small muted info icon; the explanation shows on hover or keyboard focus. Same props as the shared InfoTip. */
export default function InfoTip({ label, tip }: { label: ReactNode; tip: string }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      {label}
      <Tooltip title={tip} arrow>
        <Box component="span" tabIndex={0} aria-label={tip} sx={{ display: 'inline-flex', opacity: 0.6, '&:hover, &:focus-visible': { opacity: 1 }, outline: 'none' }}>
          <InfoOutlinedIcon sx={{ fontSize: 12 }} />
        </Box>
      </Tooltip>
    </Box>
  );
}
