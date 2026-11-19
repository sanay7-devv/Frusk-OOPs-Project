import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Drawer,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  MenuItem,
  Stack,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  Login as LoginIcon,
  Visibility as VisibilityIcon,
  Group as GroupIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Computer as ComputerIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  Build as TechIcon,
  Block as BlockIcon,
  MoreVert as MoreVertIcon,
  Security as SecurityIcon,
  AssignmentInd as AssignmentIndIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

import { useAuth, Workspace } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { login } from '../../api/auth';
import {
  getAdminUsers,
  createAdminUser,
  addAdminUserRole,
  removeAdminUserRole,
  deactivateAdminUser,
  AdminUser,
} from '../../api/admin';
import { listIncidents } from '../../api/incidents';
import type { IncidentDetail, RoleType } from '../../api/types';
import ConfirmDialog from '../../components/ConfirmDialog';

const COLORS = {
  surface: '#090d16',
  surfaceContainerLowest: '#0a0e17',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#141824',
  surfaceContainerHigh: '#1c2234',
  surfaceContainerHighest: '#262d42',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  secondary: '#06b6d4',
  error: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

// Helper to determine department primary color theme
const getDepartmentColor = (dept?: string | null): string => {
  if (!dept) return '#64748b';
  const d = dept.toLowerCase();
  if (d.includes('site') || d.includes('sre') || d.includes('reliability')) return '#f43f5e';
  if (d.includes('platform')) return '#3b82f6';
  if (d.includes('network')) return '#06b6d4';
  if (d.includes('engineering') || d.includes('software')) return '#6366f1';
  if (d.includes('product') || d.includes('design')) return '#a855f7';
  if (d.includes('finance') || d.includes('compliance') || d.includes('operations')) return '#10b981';
  return '#64748b';
};

// Helper to derive workstation hardware metadata dynamically from department & role
const getWorkstation = (u: AdminUser): string => {
  const dept = (u.department || '').toLowerCase();
  if (u.roles.includes('ADMINISTRATOR')) return 'macOS Sequoia 15.3 (Apple Silicon M3 Max - Admin Tier)';
  if (dept.includes('sre') || dept.includes('security') || dept.includes('network')) {
    return 'Ubuntu Linux 24.04 LTS (ThinkPad P16 Gen 2 - SRE Node)';
  }
  if (dept.includes('product') || dept.includes('design')) {
    return 'macOS Sonoma 14.6 (Apple Silicon M2 Pro)';
  }
  if (dept.includes('finance') || dept.includes('compliance')) {
    return 'Windows 11 Enterprise (Dell Precision 5680)';
  }
  return 'macOS Sequoia 15.2 (Apple Silicon M3 - Corporate MDM)';
};

// Helper to derive reporting manager
const getReportingManager = (u: AdminUser): string => {
  if (u.roles.includes('ADMINISTRATOR')) return 'Board of Directors & Executive Staff';
  if (u.roles.includes('TECHNICIAN') && u.technician?.escalationLevel === 1) return 'Director of Global Infrastructure';
  const dept = (u.department || '').toLowerCase();
  if (dept.includes('sre') || dept.includes('security')) return 'Tariq Mansoor (CISO)';
  if (dept.includes('product') || dept.includes('design')) return 'Sneha Rao (Director of Product)';
  if (dept.includes('finance') || dept.includes('operations')) return 'Karen Lin (VP Finance Operations)';
  return 'Rajesh Kulkarni (VP Engineering)';
};

// Helper to derive primary designation / job title
const getDesignation = (u: AdminUser): string => {
  if (u.roles.includes('ADMINISTRATOR')) return 'System Administrator';
  if (u.roles.includes('TECHNICIAN') && u.technician?.escalationLevel === 1) return 'Team Lead & Staff SRE';
  if (u.roles.includes('TECHNICIAN')) return 'IT Operations Technician';
  const dept = (u.department || '').toLowerCase();
  if (dept.includes('product') || dept.includes('design')) return 'Product & Experience Specialist';
  if (dept.includes('finance') || dept.includes('compliance')) return 'Financial Systems Analyst';
  if (dept.includes('engineering')) return 'Enterprise Software Engineer';
  return 'Corporate Staff Member';
};

export default function Users() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Search & Filter State (Only 4 Roles in Filter)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'EMPLOYEE' | 'TECHNICIAN' | 'LEAD' | 'ADMINISTRATOR' | null>(null);
  const [tableTab, setTableTab] = useState<'ALL' | 'ACTIVE_TICKETS' | 'TECHS_LEADS' | 'ACTION_NEEDED'>('ALL');

  // Drawer / Inspection State
  const [inspectUser, setInspectUser] = useState<AdminUser | null>(null);

  // Provision User Modal State
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@123');
  const [department, setDepartment] = useState('Engineering');
  const [location, setLocation] = useState('Bangalore, India');
  const [primaryRole, setPrimaryRole] = useState<'EMPLOYEE' | 'TECHNICIAN' | 'LEAD' | 'ADMINISTRATOR'>('EMPLOYEE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Context Menu for Row Role Actions
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [actionTargetUser, setActionTargetUser] = useState<AdminUser | null>(null);

  // Queries: Users & Live Incidents
  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAdminUsers,
    refetchInterval: 30000,
  });

  const {
    data: incidentPage,
    isLoading: incidentsLoading,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ['admin-incidents-all'],
    queryFn: () => listIncidents({ size: 100 }),
    refetchInterval: 15000,
  });

  const allIncidents: IncidentDetail[] = (incidentPage as any)?.items || (incidentPage as any)?.content || [];

  // Correlate Incidents with Users
  const userIncidentMap = useMemo(() => {
    const map = new Map<number, { all: IncidentDetail[]; active: IncidentDetail[]; highestPriority: 'P1' | 'P2' | 'P3' | 'P4' | null; actionRequired: boolean }>();

    users.forEach((u) => {
      const tickets = allIncidents.filter((inc) => {
        const matchesReporter = inc.reporter?.id === u.id || (inc.reporter?.name && inc.reporter.name.toLowerCase() === u.name.toLowerCase());
        const matchesAssignee = inc.assignee?.id === u.id || (inc.assignee?.name && inc.assignee.name.toLowerCase() === u.name.toLowerCase());
        return matchesReporter || matchesAssignee;
      });

      const active = tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED');

      let highestPriority: 'P1' | 'P2' | 'P3' | 'P4' | null = null;
      if (active.some((t) => t.priority === 'P1')) highestPriority = 'P1';
      else if (active.some((t) => t.priority === 'P2')) highestPriority = 'P2';
      else if (active.some((t) => t.priority === 'P3')) highestPriority = 'P3';
      else if (active.some((t) => t.priority === 'P4')) highestPriority = 'P4';

      const actionRequired = active.some((t) => t.status === 'PENDING_USER_INFO' || t.slaState === 'WARNING' || t.slaState === 'VIOLATED');

      map.set(u.id, { all: tickets, active, highestPriority, actionRequired });
    });

    return map;
  }, [users, allIncidents]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const employeesCount = users.filter((u) => !u.roles.includes('TECHNICIAN') && !u.roles.includes('ADMINISTRATOR')).length;
    const techsCount = users.filter((u) => u.roles.includes('TECHNICIAN') && u.technician?.escalationLevel !== 1).length;
    const leadsCount = users.filter((u) => u.roles.includes('TECHNICIAN') && u.technician?.escalationLevel === 1).length;
    const adminsCount = users.filter((u) => u.roles.includes('ADMINISTRATOR')).length;

    const totalActiveTickets = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;

    let actionNeededCount = 0;
    users.forEach((u) => {
      const info = userIncidentMap.get(u.id);
      if (info?.actionRequired) actionNeededCount++;
    });

    return { totalUsers, employeesCount, techsCount, leadsCount, adminsCount, totalActiveTickets, actionNeededCount };
  }, [users, allIncidents, userIncidentMap]);

  // Filtered Users Roster
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedRole === 'ADMINISTRATOR' && !u.roles.includes('ADMINISTRATOR')) return false;
      if (selectedRole === 'LEAD' && (!u.roles.includes('TECHNICIAN') || u.technician?.escalationLevel !== 1 || u.roles.includes('ADMINISTRATOR'))) return false;
      if (selectedRole === 'TECHNICIAN' && (!u.roles.includes('TECHNICIAN') || u.technician?.escalationLevel === 1 || u.roles.includes('ADMINISTRATOR'))) return false;
      if (selectedRole === 'EMPLOYEE' && (u.roles.includes('TECHNICIAN') || u.roles.includes('ADMINISTRATOR'))) return false;

      const userMeta = userIncidentMap.get(u.id);
      if (tableTab === 'ACTIVE_TICKETS' && (userMeta?.active.length || 0) === 0) return false;
      if (tableTab === 'TECHS_LEADS' && !u.roles.includes('TECHNICIAN')) return false;
      if (tableTab === 'ACTION_NEEDED' && !userMeta?.actionRequired) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const designation = getDesignation(u).toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q) ||
          (u.location || '').toLowerCase().includes(q) ||
          designation.includes(q) ||
          String(u.id).includes(q)
        );
      }

      return true;
    });
  }, [users, selectedRole, tableTab, searchQuery, userIncidentMap]);

  // Delegated Session Broker: Real Authentication Switcher
  const handleLoginAsUser = async (targetUser: AdminUser) => {
    const isTech = targetUser.roles.includes('TECHNICIAN');
    const isAdmin = targetUser.roles.includes('ADMINISTRATOR');
    const isLead = isTech && targetUser.technician?.escalationLevel === 1;

    let targetWorkspace: Workspace = 'employee';
    let targetPath = '/employee/home';

    if (isAdmin) {
      targetWorkspace = 'admin';
      targetPath = '/admin/dashboard';
    } else if (isLead) {
      targetWorkspace = 'lead';
      targetPath = '/lead/team-queue';
    } else if (isTech) {
      targetWorkspace = 'tech';
      targetPath = '/tech/queue';
    }

    try {
      const authRes = await login(targetUser.email, 'Demo@1234');
      signIn(authRes);
      toast(`Authenticated as ${targetUser.name}. Switched directly into their ${targetWorkspace.toUpperCase()} portal.`, 'success');
      navigate(targetPath);
    } catch {
      toast(`Could not authenticate as ${targetUser.email}. Please use their configured credentials.`, 'error');
    }
  };

  // Role Action Handlers
  const handleToggleRole = async (targetUser: AdminUser, roleToToggle: 'TECHNICIAN' | 'ADMINISTRATOR') => {
    try {
      if (targetUser.roles.includes(roleToToggle)) {
        await removeAdminUserRole(targetUser.id, roleToToggle);
        toast(`Revoked ${roleToToggle} role from ${targetUser.name}`, 'info');
      } else {
        await addAdminUserRole(
          targetUser.id,
          roleToToggle,
          roleToToggle === 'TECHNICIAN'
            ? { escalationLevel: 0, experienceLevel: 'MID', maxLoad: 6, availability: 'AVAILABLE' }
            : undefined,
          roleToToggle === 'ADMINISTRATOR' ? { scope: 'SYSTEM_ADMIN' } : undefined
        );
        toast(`Granted ${roleToToggle} clearance to ${targetUser.name}`, 'success');
      }
      refetchUsers();
      if (inspectUser && inspectUser.id === targetUser.id) {
        setInspectUser({
          ...inspectUser,
          roles: targetUser.roles.includes(roleToToggle)
            ? inspectUser.roles.filter((r) => r !== roleToToggle)
            : [...inspectUser.roles, roleToToggle],
        });
      }
    } catch (e: any) {
      toast(e.message || 'Role change failed', 'error');
    }
  };

  const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<AdminUser | null>(null);

  const handleDeactivate = (targetUser: AdminUser) => {
    setConfirmDeactivateUser(targetUser);
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmDeactivateUser) return;
    try {
      await deactivateAdminUser(confirmDeactivateUser.id);
      toast(`Successfully updated status for ${confirmDeactivateUser.name}`, 'info');
      refetchUsers();
      if (inspectUser && inspectUser.id === confirmDeactivateUser.id) {
        setInspectUser({ ...inspectUser, active: !inspectUser.active });
      }
    } catch (e: any) {
      toast(e.message || 'Operation failed', 'error');
    } finally {
      setConfirmDeactivateUser(null);
    }
  };

  // Provision User Submission
  const handleProvisionUser = async () => {
    if (!name.trim() || !email.trim()) {
      toast('Please enter full name and email address', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const rolesToAssign: string[] = ['EMPLOYEE'];
      let technicianPayload: any = undefined;
      let administratorPayload: any = undefined;

      if (primaryRole === 'TECHNICIAN') {
        rolesToAssign.push('TECHNICIAN');
        technicianPayload = { escalationLevel: 0, experienceLevel: 'MID', maxLoad: 6, availability: 'AVAILABLE' };
      } else if (primaryRole === 'LEAD') {
        rolesToAssign.push('TECHNICIAN');
        technicianPayload = { escalationLevel: 1, experienceLevel: 'SENIOR', maxLoad: 8, availability: 'AVAILABLE' };
      } else if (primaryRole === 'ADMINISTRATOR') {
        rolesToAssign.push('ADMINISTRATOR', 'TECHNICIAN');
        technicianPayload = { escalationLevel: 1, experienceLevel: 'SENIOR', maxLoad: 10, availability: 'AVAILABLE' };
        administratorPayload = { scope: 'SYSTEM_ADMIN' };
      }

      await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        password,
        department,
        location,
        roles: rolesToAssign,
        technician: technicianPayload,
        administrator: administratorPayload,
      });

      toast(`Account ${name.trim()} successfully provisioned in enterprise directory!`, 'success');
      setProvisionOpen(false);
      setName('');
      setEmail('');
      refetchUsers();
    } catch (e: any) {
      toast(e.message || 'Failed to provision user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* 1. TOP HEADER & DIRECTORY GOVERNANCE BANNER */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3.5,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: 'rgba(99, 102, 241, 0.15)',
              color: COLORS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <GroupIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, letterSpacing: '-0.01em', fontFamily: 'Sora, sans-serif' }}>
              Enterprise Workforce &amp; User Directory
            </Typography>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Inspect staff accounts, audit active queue metrics, manage security clearances, and assume delegated sessions.
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            onClick={() => {
              refetchUsers();
              refetchIncidents();
              toast('Refreshed directory accounts & workload queues', 'info');
            }}
            startIcon={<RefreshIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 2,
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={() => setProvisionOpen(true)}
            startIcon={<AddIcon />}
            sx={{
              bgcolor: COLORS.primary,
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 2,
              px: 2,
              py: 1,
              textTransform: 'none',
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Provision User
          </Button>
        </Stack>
      </Paper>

      {/* 2. TOP METRIC STREAM */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              Total Directory Accounts
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
              {metrics.totalUsers}
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.primary, mt: 0.5, fontWeight: 600 }}>
              {metrics.employeesCount} Employees • {metrics.techsCount} Techs • {metrics.leadsCount} Leads • {metrics.adminsCount} Admins
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              Active Open Tickets
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
              {metrics.totalActiveTickets}
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
              Across active services &amp; engineering queues
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: metrics.actionNeededCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : `1px solid ${COLORS.border}`,
              bgcolor: metrics.actionNeededCount > 0 ? 'rgba(245, 158, 11, 0.05)' : COLORS.surfaceContainer,
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              Awaiting Action / Critical
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#f59e0b', mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
              {metrics.actionNeededCount}
            </Typography>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
              Accounts with pending user info or SLA risk
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
              Delegated Session Broker
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.success, boxShadow: `0 0 10px ${COLORS.success}` }} />
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                READY
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.8 }}>
              Click &ldquo;Login as User&rdquo; to assume role workspace
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. SEARCH & 4-ROLE FILTER */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5} md={5}>
            <TextField
              fullWidth
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, ID, role..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  borderRadius: 2,
                  '& fieldset': { borderColor: COLORS.border },
                },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={7} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { sm: 'flex-end' } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', mr: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Role:
              </Typography>
              {(
                [
                  { key: 'EMPLOYEE', label: 'Employee' },
                  { key: 'TECHNICIAN', label: 'Technician' },
                  { key: 'LEAD', label: 'Team Lead' },
                  { key: 'ADMINISTRATOR', label: 'Administrator' },
                ] as const
              ).map((rf) => {
                const isSelected = selectedRole === rf.key;
                return (
                  <Chip
                    key={rf.key}
                    label={rf.label}
                    size="small"
                    onClick={() => setSelectedRole(isSelected ? null : rf.key)}
                    sx={{
                      fontWeight: isSelected ? 800 : 500,
                      bgcolor: isSelected ? 'rgba(99, 102, 241, 0.2)' : COLORS.surfaceContainerHighest,
                      color: isSelected ? COLORS.primary : COLORS.onSurfaceVariant,
                      border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.4)' : COLORS.border}`,
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      px: 0.5,
                      '&:hover': { bgcolor: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.1)' },
                    }}
                  />
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. WORKFORCE & USERS DIRECTORY TABLE */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer, overflow: 'hidden' }}>
        {/* Table Filter Action Strip */}
        <Box
          sx={{
            p: 2,
            bgcolor: COLORS.surfaceContainerLow,
            borderBottom: `1px solid ${COLORS.border}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Corporate Workforce &amp; Staff Directory ({filteredUsers.length} Accounts)
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant={tableTab === 'ALL' ? 'contained' : 'outlined'}
              onClick={() => setTableTab('ALL')}
              sx={{
                fontSize: 11.5,
                textTransform: 'none',
                borderRadius: 1.5,
                bgcolor: tableTab === 'ALL' ? COLORS.primary : 'transparent',
                borderColor: COLORS.border,
                color: tableTab === 'ALL' ? '#ffffff' : COLORS.onSurfaceVariant,
              }}
            >
              All ({users.length})
            </Button>
            <Button
              size="small"
              variant={tableTab === 'ACTIVE_TICKETS' ? 'contained' : 'outlined'}
              onClick={() => setTableTab('ACTIVE_TICKETS')}
              sx={{
                fontSize: 11.5,
                textTransform: 'none',
                borderRadius: 1.5,
                bgcolor: tableTab === 'ACTIVE_TICKETS' ? COLORS.primary : 'transparent',
                borderColor: COLORS.border,
                color: tableTab === 'ACTIVE_TICKETS' ? '#ffffff' : COLORS.onSurfaceVariant,
              }}
            >
              With Active Tickets
            </Button>
            <Button
              size="small"
              variant={tableTab === 'TECHS_LEADS' ? 'contained' : 'outlined'}
              onClick={() => setTableTab('TECHS_LEADS')}
              sx={{
                fontSize: 11.5,
                textTransform: 'none',
                borderRadius: 1.5,
                bgcolor: tableTab === 'TECHS_LEADS' ? COLORS.primary : 'transparent',
                borderColor: COLORS.border,
                color: tableTab === 'TECHS_LEADS' ? '#ffffff' : COLORS.onSurfaceVariant,
              }}
            >
              Technicians &amp; Leads ({metrics.techsCount + metrics.leadsCount})
            </Button>
            <Button
              size="small"
              variant={tableTab === 'ACTION_NEEDED' ? 'contained' : 'outlined'}
              onClick={() => setTableTab('ACTION_NEEDED')}
              sx={{
                fontSize: 11.5,
                textTransform: 'none',
                borderRadius: 1.5,
                bgcolor: tableTab === 'ACTION_NEEDED' ? '#f59e0b' : 'transparent',
                color: tableTab === 'ACTION_NEEDED' ? '#000000' : '#f59e0b',
                borderColor: '#f59e0b',
                fontWeight: 700,
              }}
            >
              Action Required ({metrics.actionNeededCount})
            </Button>
          </Box>
        </Box>

        {usersLoading ? (
          <Box p={6} display="flex" justifyContent="center" alignItems="center" gap={2}>
            <CircularProgress size={28} sx={{ color: COLORS.primary }} />
            <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 14 }}>Loading directory accounts...</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: COLORS.surfaceContainerLow, borderBottom: `1px solid ${COLORS.border}` }}>
                  <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    User / Profile
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Department &amp; Location
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Clearance Roles
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Workload / Tickets
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Status
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', textAlign: 'right' }}>
                    Administrative Actions
                  </Box>
                </Box>
              </Box>

              <Box component="tbody">
                {filteredUsers.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={6} sx={{ p: 4, textAlign: 'center', color: COLORS.onSurfaceVariant }}>
                      No staff accounts match your selected search or filter criteria.
                    </Box>
                  </Box>
                ) : (
                  filteredUsers.map((u) => {
                    const deptColor = getDepartmentColor(u.department);
                    const meta = userIncidentMap.get(u.id);
                    const activeCount = meta?.active.length || 0;
                    const highestPriority = meta?.highestPriority || null;
                    const actionNeeded = meta?.actionRequired || false;
                    const designation = getDesignation(u);
                    const isTech = u.roles.includes('TECHNICIAN');
                    const isLead = isTech && u.technician?.escalationLevel === 1;
                    const isAdmin = u.roles.includes('ADMINISTRATOR');

                    return (
                      <Box
                        component="tr"
                        key={u.id}
                        sx={{
                          borderBottom: `1px solid ${COLORS.border}`,
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05)' },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* User Profile */}
                        <Box component="td" sx={{ py: 2, px: 2.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: `${deptColor}30`,
                                fontSize: 14,
                                fontWeight: 700,
                                color: deptColor,
                                border: `1px solid ${deptColor}60`,
                              }}
                            >
                              {u.name
                                .split(' ')
                                .map((n) => n[0])
                                .filter(Boolean)
                                .slice(0, 2)
                                .join('')}
                            </Avatar>
                            <Box>
                              <Typography sx={{ fontSize: 14, fontWeight: 700, color: COLORS.onSurface }}>
                                {u.name}
                              </Typography>
                              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                                {designation}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                                {u.email}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Department & Location */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          <Chip
                            label={u.department || 'General'}
                            size="small"
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: `${deptColor}20`,
                              color: deptColor,
                              border: `1px solid ${deptColor}40`,
                              mb: 0.5,
                            }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: COLORS.onSurfaceVariant }}>
                            <LocationOnIcon sx={{ fontSize: 13 }} />
                            <Typography sx={{ fontSize: 11.5 }}>{u.location || 'Remote'}</Typography>
                          </Box>
                        </Box>

                        {/* Clearance Roles */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {isAdmin && (
                              <Chip
                                label="ADMIN"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.3)' }}
                              />
                            )}
                            {isLead ? (
                              <Chip
                                label="LEAD SRE (L1)"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)' }}
                              />
                            ) : isTech ? (
                              <Chip
                                label="TECH (L0)"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                              />
                            ) : null}
                            <Chip
                              label="EMPLOYEE"
                              size="small"
                              sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant, border: `1px solid ${COLORS.border}` }}
                            />
                          </Stack>
                        </Box>

                        {/* Workload / Active Tickets */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          {activeCount === 0 ? (
                            <Typography sx={{ fontSize: 12, color: COLORS.success, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>
                              ✓ 0 Open Tickets
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${activeCount} Active`}
                                size="small"
                                sx={{
                                  bgcolor: highestPriority === 'P1' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                  color: highestPriority === 'P1' ? '#fb7185' : COLORS.primary,
                                  fontWeight: 700,
                                  fontSize: 11,
                                  border: highestPriority === 'P1' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(99, 102, 241, 0.4)',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              />
                              {highestPriority && (
                                <Chip
                                  label={highestPriority}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    bgcolor: highestPriority === 'P1' ? COLORS.error : highestPriority === 'P2' ? '#ea580c' : COLORS.primary,
                                    color: '#ffffff',
                                    fontFamily: 'JetBrains Mono, monospace',
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          {isTech && u.technician && (
                            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.4, fontFamily: 'JetBrains Mono, monospace' }}>
                              Load: {u.technician.currentLoad ?? u.technician.activeIncidentCount ?? activeCount} / {u.technician.maxLoad ?? u.technician.maxActiveIncidents ?? 6}
                            </Typography>
                          )}
                        </Box>

                        {/* Status */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          {!u.active ? (
                            <Chip label="DEACTIVATED" size="small" sx={{ bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 10 }} />
                          ) : actionNeeded ? (
                            <Chip
                              icon={<WarningIcon sx={{ fontSize: '13px !important', color: '#fbbf24 !important' }} />}
                              label="ACTION NEEDED"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                fontWeight: 800,
                                fontSize: 10,
                                letterSpacing: '0.04em',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#34d399 !important' }} />}
                              label="ACTIVE"
                              size="small"
                              sx={{
                                bgcolor: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                fontWeight: 700,
                                fontSize: 10,
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            />
                          )}
                        </Box>

                        {/* Administrative Actions */}
                        <Box component="td" sx={{ py: 2, px: 2.5, textAlign: 'right' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setInspectUser(u)}
                              startIcon={<VisibilityIcon sx={{ fontSize: 15 }} />}
                              sx={{
                                borderColor: COLORS.border,
                                color: COLORS.onSurfaceVariant,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: 12,
                                borderRadius: 1.5,
                                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)', color: COLORS.onSurface },
                              }}
                            >
                              Inspect User
                            </Button>

                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleLoginAsUser(u)}
                              startIcon={<LoginIcon sx={{ fontSize: 15 }} />}
                              sx={{
                                bgcolor: COLORS.primary,
                                color: '#ffffff',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                borderRadius: 1.5,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#4f46e5' },
                              }}
                            >
                              Login as User
                            </Button>

                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setActionAnchorEl(e.currentTarget);
                                setActionTargetUser(u);
                              }}
                              sx={{ color: COLORS.onSurfaceVariant }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* 5. SLIDE-OUT INSPECT USER DRAWER */}
      <Drawer
        anchor="right"
        open={Boolean(inspectUser)}
        onClose={() => setInspectUser(null)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 560 },
            p: 3,
            bgcolor: COLORS.surfaceContainer,
            color: COLORS.onSurface,
            borderLeft: `1px solid ${COLORS.border}`,
          },
        }}
      >
        {inspectUser && (() => {
          const meta = userIncidentMap.get(inspectUser.id);
          const tickets = meta?.all || [];
          const activeTickets = meta?.active || [];
          const isTech = inspectUser.roles.includes('TECHNICIAN');
          const isAdmin = inspectUser.roles.includes('ADMINISTRATOR');
          const deptColor = getDepartmentColor(inspectUser.department);

          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Drawer Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: `1px solid ${COLORS.border}` }}>
                <Box>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: COLORS.primary, letterSpacing: '0.04em' }}>
                    USER &amp; WORKSPACE INSPECTION // ID #{inspectUser.id}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, mt: 0.2, fontFamily: 'Sora, sans-serif' }}>
                    {inspectUser.name}
                  </Typography>
                </Box>
                <IconButton onClick={() => setInspectUser(null)} size="small" sx={{ color: COLORS.onSurfaceVariant }}>
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Profile Overview Card */}
              <Box sx={{ py: 2.5, overflowY: 'auto', flexGrow: 1 }}>
                <Paper sx={{ p: 2, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}`, borderRadius: 2.5, mb: 2.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        Designation
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.onSurface }}>
                        {getDesignation(inspectUser)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        Department
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.onSurface }}>
                        {inspectUser.department || 'General Staff'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        Workstation Hardware &amp; MDM
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                        {getWorkstation(inspectUser)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        Reporting Manager
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                        {getReportingManager(inspectUser)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Role Clearance & Admin Controls */}
                <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainerLowest }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: COLORS.onSurface, textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.04em', fontFamily: 'Sora, sans-serif' }}>
                    Security Clearance &amp; Role Management
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {inspectUser.roles.map((r) => (
                      <Chip
                        key={r}
                        label={r}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: 10.5,
                          fontFamily: 'JetBrains Mono, monospace',
                          bgcolor: r === 'ADMINISTRATOR' ? 'rgba(244, 63, 94, 0.2)' : r === 'TECHNICIAN' ? 'rgba(99, 102, 241, 0.2)' : COLORS.surfaceContainerHighest,
                          color: r === 'ADMINISTRATOR' ? '#fb7185' : r === 'TECHNICIAN' ? COLORS.primary : COLORS.onSurfaceVariant,
                          border: `1px solid ${r === 'ADMINISTRATOR' ? 'rgba(244, 63, 94, 0.3)' : r === 'TECHNICIAN' ? 'rgba(99, 102, 241, 0.3)' : COLORS.border}`,
                        }}
                      />
                    ))}
                    {inspectUser.technician && (
                      <Chip
                        label={`Escalation Level ${inspectUser.technician.escalationLevel}`}
                        size="small"
                        sx={{ fontSize: 10.5, fontWeight: 600, color: COLORS.secondary, borderColor: 'rgba(6, 182, 212, 0.3)', border: '1px solid' }}
                      />
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant={isTech ? 'contained' : 'outlined'}
                      onClick={() => handleToggleRole(inspectUser, 'TECHNICIAN')}
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        borderRadius: 1.5,
                        bgcolor: isTech ? COLORS.primary : 'transparent',
                        borderColor: COLORS.primary,
                        color: isTech ? '#ffffff' : COLORS.primary,
                      }}
                    >
                      {isTech ? 'Demote Tech' : 'Promote to Tech'}
                    </Button>

                    <Button
                      size="small"
                      variant={isAdmin ? 'contained' : 'outlined'}
                      onClick={() => handleToggleRole(inspectUser, 'ADMINISTRATOR')}
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        borderRadius: 1.5,
                        bgcolor: isAdmin ? COLORS.error : 'transparent',
                        borderColor: COLORS.error,
                        color: isAdmin ? '#ffffff' : COLORS.error,
                      }}
                    >
                      {isAdmin ? 'Demote Admin' : 'Promote to Admin'}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleDeactivate(inspectUser)}
                      sx={{
                        textTransform: 'none',
                        fontSize: 12,
                        borderRadius: 1.5,
                        borderColor: COLORS.border,
                        color: inspectUser.active ? COLORS.onSurfaceVariant : COLORS.success,
                      }}
                    >
                      {inspectUser.active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </Stack>
                </Paper>

                {/* Tickets Associated with User */}
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: COLORS.onSurface, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'Sora, sans-serif' }}>
                      Associated Incidents &amp; Tickets ({tickets.length})
                    </Typography>
                    {activeTickets.length > 0 && (
                      <Chip label={`${activeTickets.length} Active`} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(99, 102, 241, 0.2)', color: COLORS.primary }} />
                    )}
                  </Box>

                  {tickets.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 32, color: COLORS.success, mb: 0.5 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.success }}>
                        Zero Associated Incidents
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                        No reported or assigned issues exist for this user.
                      </Typography>
                    </Paper>
                  ) : (
                    tickets.map((t) => (
                      <Paper
                        key={t.code}
                        sx={{
                          p: 2,
                          mb: 1.5,
                          borderRadius: 2,
                          border: t.priority === 'P1' ? '1px solid rgba(244, 63, 94, 0.4)' : `1px solid ${COLORS.border}`,
                          bgcolor: t.priority === 'P1' ? 'rgba(244, 63, 94, 0.08)' : COLORS.surfaceContainerLowest,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                            {t.code}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              label={t.priority}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 10,
                                fontWeight: 800,
                                bgcolor: t.priority === 'P1' ? COLORS.error : '#ea580c',
                                color: '#ffffff',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            />
                            <Chip
                              label={t.status}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 9.5,
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 700,
                                bgcolor: 'rgba(99, 102, 241, 0.2)',
                                color: COLORS.primary,
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.onSurface, mb: 0.5 }}>
                          {t.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                          Service: <strong style={{ color: COLORS.onSurface }}>{t.service?.name || 'General Platform'}</strong>
                        </Typography>
                        <Box sx={{ mt: 1, p: 0.8, bgcolor: COLORS.surfaceContainerHighest, borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <TimerIcon sx={{ fontSize: 14, color: COLORS.primary }} />
                          <Typography sx={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>
                            SLA State: {t.slaState || 'OK'}
                          </Typography>
                        </Box>
                      </Paper>
                    ))
                  )}
                </Box>
              </Box>

              {/* Impersonate Button in Drawer Footer */}
              <Box sx={{ pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleLoginAsUser(inspectUser)}
                  startIcon={<LoginIcon />}
                  sx={{
                    bgcolor: COLORS.primary,
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13.5,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#4f46e5' },
                  }}
                >
                  Login as {inspectUser.name} &amp; Open Portal
                </Button>
              </Box>
            </Box>
          );
        })()}
      </Drawer>

      {/* 6. CONTEXT MENU FOR ROW ROLE ACTIONS */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={() => {
          setActionAnchorEl(null);
          setActionTargetUser(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        {actionTargetUser && (
          <Box>
            <MenuItem
              onClick={() => {
                handleToggleRole(actionTargetUser, 'TECHNICIAN');
                setActionAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <TechIcon fontSize="small" sx={{ color: COLORS.primary }} />
              </ListItemIcon>
              <ListItemText sx={{ color: COLORS.onSurface }}>
                {actionTargetUser.roles.includes('TECHNICIAN') ? 'Revoke Technician' : 'Promote to Technician'}
              </ListItemText>
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleToggleRole(actionTargetUser, 'ADMINISTRATOR');
                setActionAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <AdminIcon fontSize="small" sx={{ color: COLORS.error }} />
              </ListItemIcon>
              <ListItemText sx={{ color: COLORS.onSurface }}>
                {actionTargetUser.roles.includes('ADMINISTRATOR') ? 'Revoke Admin' : 'Promote to Admin'}
              </ListItemText>
            </MenuItem>

            <Divider sx={{ borderColor: COLORS.border }} />

            <MenuItem
              onClick={() => {
                handleDeactivate(actionTargetUser);
                setActionAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <BlockIcon fontSize="small" sx={{ color: COLORS.onSurfaceVariant }} />
              </ListItemIcon>
              <ListItemText sx={{ color: COLORS.onSurface }}>
                {actionTargetUser.active ? 'Deactivate Account' : 'Reactivate Account'}
              </ListItemText>
            </MenuItem>
          </Box>
        )}
      </Menu>

      {/* 7. PROVISION USER MODAL */}
      <Dialog
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            p: 1,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
            Provision Enterprise Account
          </Typography>
          <IconButton onClick={() => setProvisionOpen(false)} size="small" sx={{ color: COLORS.onSurfaceVariant }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2, borderColor: COLORS.border }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Full Name *"
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Corporate Email *"
              type="email"
              placeholder="e.g. maya.lin@iitsm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
            <TextField
              fullWidth
              size="small"
              label="Temporary Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: COLORS.surfaceContainerLowest,
                      color: COLORS.onSurface,
                      '& fieldset': { borderColor: COLORS.border },
                    },
                    '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location / Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: COLORS.surfaceContainerLowest,
                      color: COLORS.onSurface,
                      '& fieldset': { borderColor: COLORS.border },
                    },
                    '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              select
              fullWidth
              size="small"
              label="Primary Clearance Role"
              value={primaryRole}
              onChange={(e) => setPrimaryRole(e.target.value as any)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="EMPLOYEE">Standard Employee (End-User Portal)</MenuItem>
              <MenuItem value="TECHNICIAN">IT Operations Technician (Workbench &amp; Queue)</MenuItem>
              <MenuItem value="LEAD">Team Lead / Senior SRE (Escalations &amp; Triage)</MenuItem>
              <MenuItem value="ADMINISTRATOR">System Administrator (Full Clearance)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setProvisionOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleProvisionUser}
            disabled={isSubmitting}
            sx={{ bgcolor: COLORS.primary, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Provisioning...' : 'Provision Account'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Deactivate / Reactivate User Dialog */}
      <ConfirmDialog
        open={Boolean(confirmDeactivateUser)}
        onClose={() => setConfirmDeactivateUser(null)}
        onConfirm={handleConfirmDeactivate}
        title={`${confirmDeactivateUser?.active ? 'Deactivate' : 'Reactivate'} Account`}
        description={`Are you sure you want to ${confirmDeactivateUser?.active ? 'deactivate' : 'reactivate'} account for ${confirmDeactivateUser?.name}?`}
        confirmColor={confirmDeactivateUser?.active ? 'error' : 'primary'}
        confirmLabel={confirmDeactivateUser?.active ? 'Deactivate' : 'Reactivate'}
      />
    </Box>
  );
}
