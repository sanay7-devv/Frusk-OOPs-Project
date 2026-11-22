import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useAuth, Workspace, HOME } from './AuthContext';

import { tokens } from '../theme/theme';
import { alpha } from '@mui/material/styles';
/** UI-side route guard. The backend enforces authorization for real. */
export default function RequireWorkspace({ workspace }: { workspace?: Workspace }) {
  const { user, loading, workspaces } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <Box p={4} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const allowed = Array.isArray(workspaces) ? workspaces : [];
  const isAdmin = user.roles?.includes('ADMINISTRATOR') || allowed.includes('admin');
  if (workspace && !allowed.includes(workspace) && !isAdmin) {
    const homeTarget = (allowed[0] && HOME[allowed[0]]) ? HOME[allowed[0]] : '/';
    return (
      <Box
        p={4}
        textAlign="center"
        sx={{
          maxWidth: 480,
          mx: 'auto',
          mt: 8,
          bgcolor: alpha(tokens.surfaceContainerLow, 0.7),
          border: `1px solid ${tokens.outlineVariant}`,
          borderRadius: '12px',
          color: tokens.onSurface,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: tokens.danger, fontFamily: 'Sora, sans-serif' }}>
          No Access
        </Typography>
        <Typography sx={{ color: tokens.onSurfaceVariant, mb: 3, fontSize: '0.9rem' }}>
          Your account does not have permission to open the requested workspace.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate(homeTarget)}
          sx={{
            background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.primaryStrong} 100%)`,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Return to Dashboard
        </Button>
      </Box>
    );
  }

  return <Outlet />;
}
