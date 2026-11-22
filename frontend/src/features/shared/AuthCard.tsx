import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import logoIcon from '../../assets/logo.png';

import { tokens } from '../../theme/theme';
import { alpha } from '@mui/material/styles';
/** Centered card used by the public password screens (same look as Login/Register). */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" px={2} py={4} sx={{ bgcolor: tokens.background }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4.5 },
          width: '100%',
          maxWidth: 480,
          borderRadius: '16px',
          bgcolor: alpha(tokens.paper, 0.85),
          border: `1px solid ${tokens.outlineVariant}`,
        }}
      >
        <Box textAlign="center" mb={3}>
          <Box component="img" src={logoIcon} alt="ReSolv brand mark" sx={{ width: 48, height: 48, objectFit: 'contain', mb: 1 }} />
          <Typography variant="subtitle1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: tokens.white, lineHeight: 1.3 }}>
            ReSolv
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, fontSize: 12, mt: 0.25, mb: 1.5 }}>
            Raise it. Track it. Resolve it.
          </Typography>
          <Typography variant="h5" component="h1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: tokens.white }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, fontSize: 13, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </Paper>
    </Box>
  );
}
