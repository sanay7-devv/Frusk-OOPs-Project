//we are importing all project folders 
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import RequireWorkspace from '../auth/RequireRole';
import { useAuth, HOME } from '../auth/AuthContext';
import AppShell from '../layouts/AppShell';
import Notifications from '../features/shared/Notifications';
import EmployeeHome from '../features/employee/EmployeeHome';
import ReportIncident from '../features/employee/ReportIncident';
import MyIncidents from '../features/employee/MyIncidents';
import EmployeeIncidentDetail from '../features/employee/EmployeeIncidentDetail';
import TechQueue from '../features/technician/TechQueue';
import TechWorkbench from '../features/technician/TechWorkbench';
import TechWorkload from '../features/technician/TechWorkload';
import TeamQueue from '../features/lead/TeamQueue';
import Escalations from '../features/lead/Escalations';
import Dashboard from '../features/admin/Dashboard';
import Tickets from '../features/admin/Tickets';
import AdminIncidentDetail from '../features/admin/AdminIncidentDetail';
import Users from '../features/admin/Users';
import Services from '../features/admin/Services';
import ServiceGraph from '../features/admin/ServiceGraph';
import SlaPolicies from '../features/admin/SlaPolicies';
import Categories from '../features/admin/Categories';
import Config from '../features/admin/Config';
import EscalationSettings from '../features/admin/EscalationSettings';
import AuditLog from '../features/admin/AuditLog';
import Simulator from '../features/admin/Simulator';
import DemoControls from '../features/admin/DemoControls';
import Reports from '../features/admin/Reports';
import Wallboard from '../features/wallboard/Wallboard';
import Register from '../features/shared/Register';
import Login from '../features/shared/Login';
import ProblemsList from '../features/problems/ProblemsList';
import ProblemDetail from '../features/problems/ProblemDetail';
import ForgotPassword from '../features/shared/ForgotPassword';
import ResetPassword from '../features/shared/ResetPassword';
import AccountSecurity from '../features/account/AccountSecurity';
import ServiceStatus from '../features/employee/ServiceStatus';
import NotFound from '../pages/NotFound';

/** Old /admin/tickets URLs keep working: same query string, same id, new path. */
function LegacyTicketsRedirect() {
  const { id } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/admin/incidents${id ? `/${id}` : ''}${search}`} replace />;
}

function RootRedirect() {
  const { user, workspace, workspaces, loading } = useAuth();
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  const targetWs = (workspace && HOME[workspace] ? workspace : workspaces[0] || 'employee');
  return <Navigate to={HOME[targetWs]} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<RequireWorkspace workspace="admin" />}>
        <Route path="/wallboard" element={<Wallboard />} />
      </Route>

      <Route element={<RequireWorkspace />}>
        <Route element={<AppShell />}>
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/account/security" element={<AccountSecurity />} />
          <Route path="*" element={<NotFound embedded />} />

          <Route element={<RequireWorkspace workspace="employee" />}>
            <Route path="/employee/home" element={<EmployeeHome />} />
            <Route path="/employee/report" element={<ReportIncident />} />
            <Route path="/employee/incidents" element={<MyIncidents />} />
            <Route path="/employee/incidents/:id" element={<EmployeeIncidentDetail />} />
            <Route path="/employee/status" element={<ServiceStatus />} />
          </Route>

          <Route element={<RequireWorkspace workspace="tech" />}>
            <Route path="/tech/queue" element={<TechQueue />} />
            <Route path="/tech/incidents/:id" element={<TechWorkbench />} />
            <Route path="/tech/workload" element={<TechWorkload />} />
          </Route>

          <Route element={<RequireWorkspace workspace="lead" />}>
            <Route path="/lead/team-queue" element={<TeamQueue />} />
            <Route path="/lead/escalations" element={<Escalations />} />
            <Route path="/lead/problems" element={<ProblemsList />} />
            <Route path="/lead/problems/:id" element={<ProblemDetail />} />
          </Route>
          {/* these are all file paths which routed leads to that file */}
          <Route element={<RequireWorkspace workspace="admin" />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/incidents" element={<Tickets />} />
            <Route path="/admin/incidents/:id" element={<AdminIncidentDetail />} />
            <Route path="/admin/tickets" element={<LegacyTicketsRedirect />} />
            <Route path="/admin/tickets/:id" element={<LegacyTicketsRedirect />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/employees" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/services" element={<Services />} />
            <Route path="/admin/services/graph" element={<ServiceGraph />} />
            <Route path="/admin/dependency-graph" element={<Navigate to="/admin/services/graph" replace />} />
            <Route path="/admin/sla" element={<SlaPolicies />} />
            <Route path="/admin/sla-policies" element={<Navigate to="/admin/sla" replace />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/config" element={<Config />} />
            <Route path="/admin/escalation" element={<EscalationSettings />} />
            <Route path="/admin/audit" element={<AuditLog />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/simulator" element={<Simulator />} />
            <Route path="/admin/demo" element={<DemoControls />} />
            <Route path="/admin/problems" element={<ProblemsList />} />
            <Route path="/admin/problems/:id" element={<ProblemDetail />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
