import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth, HOME } from '../auth/AuthContext';

export default function NotFound() {
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
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#090d16',
        color: '#dfe2ef',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography
        variant="h1"
        sx={{
          fontSize: { xs: '5rem', sm: '7rem' },
          fontWeight: 900,
          fontFamily: 'Sora, sans-serif',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          mb: 2,
        }}
      >
        404
      </Typography>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          fontFamily: 'Sora, sans-serif',
          color: '#ffffff',
          mb: 1.5,
          fontSize: { xs: '1.5rem', sm: '2rem' },
        }}
      >
        Page Not Found
      </Typography>
      <Typography
        sx={{
          color: '#94a3b8',
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          maxWidth: 480,
          mb: 4,
          lineHeight: 1.6,
        }}
      >
        The requested resource or console view could not be located. It may have been moved, decommissioned, or the route was mistyped.
      </Typography>
      <Button
        variant="contained"
        onClick={handleReturn}
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.95rem',
          px: 3.5,
          py: 1.2,
          borderRadius: '10px',
          textTransform: 'none',
          boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
            boxShadow: '0 6px 20px rgba(99, 102, 241, 0.5)',
          },
        }}
      >
        {user ? 'Return to Console' : 'Go to Login'}
      </Button>
    </Box>
  );
}
