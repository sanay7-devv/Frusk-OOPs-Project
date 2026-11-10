import { Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAuth, Workspace } from './AuthContext';

/** UI-side route guard. The backend enforces authorization for real. */
export default function RequireWorkspace({ workspace }: { workspace?: Workspace }) {
  const { user, loading, workspaces } = useAuth();
  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(workspaces) ? workspaces : [];
  if (workspace && !allowed.includes(workspace))
    return <Box p={4}><Typography variant="h5">No access</Typography><Typography>Your account cannot open this area.</Typography></Box>;
  return <Outlet />;
}
