import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { CircularProgress, Box, Typography, Button } from '@mui/material';
import { useAuth, Workspace, HOME } from './AuthContext';

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
  if (workspace && !allowed.includes(workspace)) {
    const homeTarget = (allowed[0] && HOME[allowed[0]]) ? HOME[allowed[0]] : '/';
    return (
      <Box
        p={4}
        textAlign="center"
        sx={{
          maxWidth: 480,
          mx: 'auto',
          mt: 8,
          bgcolor: 'rgba(18, 22, 34, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          color: '#dfe2ef',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#f43f5e', fontFamily: 'Sora, sans-serif' }}>
          No Access
        </Typography>
        <Typography sx={{ color: '#94a3b8', mb: 3, fontSize: '0.9rem' }}>
          Your account does not have permission to open the requested workspace.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate(homeTarget)}
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
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
