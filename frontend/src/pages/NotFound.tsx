import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth, HOME } from '../auth/AuthContext';
import { tokens } from '../theme/theme';

export default function NotFound({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { user, workspace, workspaces } = useAuth();

  const handleReturn = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    const targetWs = (workspace && HOME[workspace] ? workspace : workspaces[0] || 'employee');
    navigate(HOME[targetWs] || '/');
  };

  return (
    <Box
      sx={{
        minHeight: embedded ? '70vh' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: embedded ? 'transparent' : tokens.background,
        color: tokens.onSurface,
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '5rem', sm: '7rem' },
          fontWeight: 500,
          fontFamily: 'Sora, sans-serif',
          color: tokens.primaryLight,
          lineHeight: 1,
          mb: 2,
        }}
      >
        404
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 600,
          fontFamily: 'Sora, sans-serif',
          color: tokens.white,
          mb: 1.5,
          fontSize: { xs: '1.5rem', sm: '2rem' },
        }}
      >
        Page Not Found
      </Typography>
      <Typography
        sx={{
          color: tokens.onSurfaceVariant,
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          maxWidth: 480,
          mb: 4,
          lineHeight: 1.6,
        }}
      >
        We could not find this page. It may have been moved or removed, or the address may be mistyped.
      </Typography>
      <Button
        variant="contained"
        onClick={handleReturn}
        sx={{
          backgroundColor: tokens.primary,
          color: tokens.white,
          fontWeight: 600,
          fontSize: '0.95rem',
          px: 3.5,
          py: 1.2,
          borderRadius: '10px',
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: tokens.primaryStrong,
          },
        }}
      >
        {user ? 'Back to my home page' : 'Go to sign in'}
      </Button>
    </Box>
  );
}
