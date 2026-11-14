import { Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useAuth, Workspace } from './AuthContext';
 //navigate  a react router used to redirect teh browser to another page
 //outlet  a react router component that is used to render the child components 

 /** UI-side route guard. The backend enforces authorization for real. */
export default function RequireWorkspace({ workspace }: { workspace?: Workspace }) {
  const { user, loading, workspaces } = useAuth(); //a custom hook that gives acess to the global auth state(login,user,workspaces)

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (!user) return <Navigate to="/login" replace />;
  const allowed = Array.isArray(workspaces) ? workspaces : [];
  if (workspace && !allowed.includes(workspace))
    return <Box p={4}><Typography variant="h5">No access</Typography><Typography>Your account cannot open this area.</Typography></Box>;
  return <Outlet />;

  //this component handles frontend user experience (preventing users from seeing UI they can't use).
  // The Spring Boot backend always independently verifies the JWT token on every API call.
}
