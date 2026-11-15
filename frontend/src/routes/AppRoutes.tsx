import { lazy, Suspense } from 'react';
//we are importing all project folders 
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireWorkspace from '../auth/RequireRole';
import { useAuth, HOME } from '../auth/AuthContext';
import AppShell from '../layouts/AppShell';
const Notifications = lazy(() => import('../features/shared/Notifications'));
const EmployeeHome = lazy(() => import('../features/employee/EmployeeHome'));
const ReportIncident = lazy(() => import('../features/employee/ReportIncident'));
const MyIncidents = lazy(() => import('../features/employee/MyIncidents'));
const EmployeeIncidentDetail = lazy(() => import('../features/employee/EmployeeIncidentDetail'));
const TechQueue = lazy(() => import('../features/technician/TechQueue'));
const TechWorkbench = lazy(() => import('../features/technician/TechWorkbench'));
const TechWorkload = lazy(() => import('../features/technician/TechWorkload'));
const TeamQueue = lazy(() => import('../features/lead/TeamQueue'));
const Escalations = lazy(() => import('../features/lead/Escalations'));
const Dashboard = lazy(() => import('../features/admin/Dashboard'));
const Tickets = lazy(() => import('../features/admin/Tickets'));
const AdminIncidentDetail = lazy(() => import('../features/admin/AdminIncidentDetail'));
const Users = lazy(() => import('../features/admin/Users'));
const Services = lazy(() => import('../features/admin/Services'));
const ServiceGraph = lazy(() => import('../features/admin/ServiceGraph'));
const SlaPolicies = lazy(() => import('../features/admin/SlaPolicies'));
const Categories = lazy(() => import('../features/admin/Categories'));
const Config = lazy(() => import('../features/admin/Config'));
const EscalationSettings = lazy(() => import('../features/admin/EscalationSettings'));
const AuditLog = lazy(() => import('../features/admin/AuditLog'));
const Reports = lazy(() => import('../features/admin/Reports'));
const Register = lazy(() => import('../features/shared/Register'));
import Login from '../features/shared/Login';

function RootRedirect() {
  const { user, workspace, workspaces } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const targetWs = (workspace && HOME[workspace] ? workspace : workspaces[0] || 'employee');
  return <Navigate to={HOME[targetWs]} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">Opening your workspace…</div>}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<RootRedirect />} />

      <Route element={<RequireWorkspace />}>
        <Route element={<AppShell />}>
          <Route path="/notifications" element={<Notifications />} />

          <Route element={<RequireWorkspace workspace="employee" />}>
            <Route path="/employee/home" element={<EmployeeHome />} />
            <Route path="/employee/report" element={<ReportIncident />} />
            <Route path="/employee/incidents" element={<MyIncidents />} />
            <Route path="/employee/incidents/:id" element={<EmployeeIncidentDetail />} />
          </Route>

          <Route element={<RequireWorkspace workspace="tech" />}>
            <Route path="/tech/queue" element={<TechQueue />} />
            <Route path="/tech/incidents/:id" element={<TechWorkbench />} />
            <Route path="/tech/workload" element={<TechWorkload />} />
          </Route>

          <Route element={<RequireWorkspace workspace="lead" />}>
            <Route path="/lead/team-queue" element={<TeamQueue />} />
            <Route path="/lead/escalations" element={<Escalations />} />
          </Route>
          {/* these are all file paths which routed leads to that file */}
          <Route element={<RequireWorkspace workspace="admin" />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/tickets" element={<Tickets />} />
            <Route path="/admin/tickets/:id" element={<AdminIncidentDetail />} />
            <Route path="/admin/incidents" element={<Navigate to="/admin/tickets" replace />} />
            <Route path="/admin/incidents/:id" element={<AdminIncidentDetail />} />
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
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

