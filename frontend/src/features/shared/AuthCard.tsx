import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import logoIcon from '../../assets/logo.png';

import { tokens } from '../../theme/theme';
/** Centered card used by the public password screens (same look as Login/Register). */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" px={2} py={4} sx={{ bgcolor: tokens.background }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          width: '100%',
          maxWidth: 480,
          borderRadius: '12px',
          bgcolor: tokens.paper,
          border: `1px solid ${tokens.outlineVariant}`,
          boxShadow: 'none',
        }}
      >
        <Box mb={3}>
          <Stack direction="row" alignItems="center" spacing={1.25} mb={2.5}>
            <Box component="img" src={logoIcon} alt="ReSolv brand mark" sx={{ width: 36, height: 36, objectFit: 'contain' }} />
            <Box>
              <Typography component="div" sx={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 600, color: tokens.white, lineHeight: 1.2 }}>
                ReSolv
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.onSurfaceVariant, fontSize: 12, mt: 0.25 }}>
                Raise it. Track it. Resolve it.
              </Typography>
            </Box>
          </Stack>
          <Typography variant="h5" component="h1" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: tokens.white }}>
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
