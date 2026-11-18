import type { ReactNode } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import logoIcon from '../../assets/logo.png';

/** Centered card used by the public password screens (same look as Login/Register). */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" px={2} py={4} sx={{ bgcolor: '#090d16' }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4.5 },
          width: '100%',
          maxWidth: 480,
          borderRadius: '16px',
          bgcolor: 'rgba(20, 24, 36, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box textAlign="center" mb={3}>
          <Box component="img" src={logoIcon} alt="IITSM Logo" sx={{ width: 48, height: 48, objectFit: 'contain', mb: 1 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#ffffff' }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: 13, mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {children}
      </Paper>
    </Box>
  );
}
