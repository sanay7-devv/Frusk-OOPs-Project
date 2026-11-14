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

// Helper to determine department primary color theme
const getDepartmentColor = (dept?: string | null): string => {
  if (!dept) return '#475569';
  const d = dept.toLowerCase();
  if (d.includes('site') || d.includes('sre') || d.includes('reliability')) return '#b91c1c';
  if (d.includes('platform')) return '#2563eb';
  if (d.includes('network')) return '#0284c7';
  if (d.includes('engineering') || d.includes('software')) return '#004d99';
  if (d.includes('product') || d.includes('design')) return '#7c3aed';
  if (d.includes('finance') || d.includes('compliance') || d.includes('operations')) return '#047857';
  return '#475569';
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

  // Filtered Users Roster (Filtering by the 4 standard roles or all)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 4-Role Filter (mutually exclusive primary tiers)
      if (selectedRole === 'ADMINISTRATOR' && !u.roles.includes('ADMINISTRATOR')) return false;
      if (selectedRole === 'LEAD' && (!u.roles.includes('TECHNICIAN') || u.technician?.escalationLevel !== 1 || u.roles.includes('ADMINISTRATOR'))) return false;
      if (selectedRole === 'TECHNICIAN' && (!u.roles.includes('TECHNICIAN') || u.technician?.escalationLevel === 1 || u.roles.includes('ADMINISTRATOR'))) return false;
      if (selectedRole === 'EMPLOYEE' && (u.roles.includes('TECHNICIAN') || u.roles.includes('ADMINISTRATOR'))) return false;

      // Table Tab filter
      const userMeta = userIncidentMap.get(u.id);
      if (tableTab === 'ACTIVE_TICKETS' && (userMeta?.active.length || 0) === 0) return false;
      if (tableTab === 'TECHS_LEADS' && !u.roles.includes('TECHNICIAN')) return false;
      if (tableTab === 'ACTION_NEEDED' && !userMeta?.actionRequired) return false;

      // Search Query
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

  // Delegated Session Broker: Impersonate / Login as User
  const handleLoginAsUser = (targetUser: AdminUser) => {
    localStorage.setItem('admin_impersonator', 'true');

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

    const impersonatedAccount = {
      accessToken: `mock-access-token-${targetUser.roles[0].toLowerCase()}-${targetUser.id}`,
      refreshToken: `mock-refresh-token-${targetUser.roles[0].toLowerCase()}-${targetUser.id}`,
      expiresInSeconds: 900,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        roles: targetUser.roles as RoleType[],
        permissions: isAdmin ? ['ALL'] : isTech ? ['INCIDENT_ASSIGN', 'INCIDENT_RESOLVE'] : ['REPORT_INCIDENT', 'VIEW_OWN'],
        technician: targetUser.technician
          ? {
              escalationLevel: (targetUser.technician.escalationLevel === 1 ? 1 : 0) as 0 | 1,
              availability: targetUser.technician.availability as any,
              maxActiveIncidents: targetUser.technician.maxActiveIncidents || 6,
              activeIncidentCount: targetUser.technician.activeIncidentCount || 0,
            }
          : null,
        administrator: targetUser.administrator ? { scope: 'SYSTEM_ADMIN' } : null,
      },
    };

    signIn(impersonatedAccount);
    toast(`Authenticated as ${targetUser.name}. Switched directly into their ${targetWorkspace.toUpperCase()} portal.`, 'success');
    navigate(targetPath);
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
          roleToToggle === 'TECHNICIAN' ? { escalationLevel: 0, availability: 'AVAILABLE' } : undefined,
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

  const handleDeactivate = async (targetUser: AdminUser) => {
    const actionLabel = targetUser.active ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionLabel} account for ${targetUser.name}?`)) return;
    try {
      await deactivateAdminUser(targetUser.id);
      toast(`Successfully updated status for ${targetUser.name}`, 'info');
      refetchUsers();
      if (inspectUser && inspectUser.id === targetUser.id) {
        setInspectUser({ ...inspectUser, active: !inspectUser.active });
      }
    } catch (e: any) {
      toast(e.message || 'Operation failed', 'error');
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
        technicianPayload = { escalationLevel: 0, availability: 'AVAILABLE', maxActiveIncidents: 6, activeIncidentCount: 0 };
      } else if (primaryRole === 'LEAD') {
        rolesToAssign.push('TECHNICIAN');
        technicianPayload = { escalationLevel: 1, availability: 'AVAILABLE', maxActiveIncidents: 8, activeIncidentCount: 0 };
      } else if (primaryRole === 'ADMINISTRATOR') {
        rolesToAssign.push('ADMINISTRATOR', 'TECHNICIAN');
        technicianPayload = { escalationLevel: 1, availability: 'AVAILABLE', maxActiveIncidents: 10, activeIncidentCount: 0 };
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
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
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
              bgcolor: '#dee8ff',
              color: '#004d99',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GroupIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.01em' }}>
              Enterprise Workforce &amp; User Directory
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>
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
              borderColor: '#cbd5e1',
              color: '#334155',
              '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={() => setProvisionOpen(true)}
            startIcon={<AddIcon />}
            sx={{
              bgcolor: '#004d99',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 2,
              px: 2,
              py: 1,
              textTransform: 'none',
              '&:hover': { bgcolor: '#00337c' },
            }}
          >
            Provision User
          </Button>
        </Stack>
      </Paper>

      {/* 2. TOP METRIC STREAM */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Directory Accounts
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.5 }}>
              {metrics.totalUsers}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#004d99', mt: 0.5, fontWeight: 600 }}>
              {metrics.employeesCount} Employees • {metrics.techsCount} Technicians • {metrics.leadsCount} Team Leads • {metrics.adminsCount} Administrators
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Open Tickets
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.5 }}>
              {metrics.totalActiveTickets}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
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
              border: metrics.actionNeededCount > 0 ? '2px solid #ed6c02' : '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#ed6c02', textTransform: 'uppercase' }}>
              Awaiting Action / Critical
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ed6c02', mt: 0.5 }}>
              {metrics.actionNeededCount}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
              Accounts with pending user info or SLA risk
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Delegated Session Broker
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#16a34a' }} />
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#111c2d' }}>
                READY
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.8 }}>
              Click &ldquo;Login as User&rdquo; to assume role workspace
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. SEARCH & 4-ROLE FILTER */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
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
                    <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: '#f8fafc',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
              }}
            />
          </Grid>

          <Grid item xs={12} sm={7} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { sm: 'flex-end' } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', mr: 0.5 }}>
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
                      bgcolor: isSelected ? '#004d99' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                      borderRadius: 1.5,
                      px: 0.5,
                      '&:hover': { bgcolor: isSelected ? '#00337c' : '#e2e8f0' },
                    }}
                  />
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. WORKFORCE & USERS DIRECTORY TABLE */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflow: 'hidden' }}>
        {/* Table Filter Action Strip */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#111c2d' }}>
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
                bgcolor: tableTab === 'ALL' ? '#004d99' : 'transparent',
                borderColor: '#cbd5e1',
                color: tableTab === 'ALL' ? '#ffffff' : '#475569',
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
                bgcolor: tableTab === 'ACTIVE_TICKETS' ? '#004d99' : 'transparent',
                borderColor: '#cbd5e1',
                color: tableTab === 'ACTIVE_TICKETS' ? '#ffffff' : '#475569',
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
                bgcolor: tableTab === 'TECHS_LEADS' ? '#004d99' : 'transparent',
                borderColor: '#cbd5e1',
                color: tableTab === 'TECHS_LEADS' ? '#ffffff' : '#475569',
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
                bgcolor: tableTab === 'ACTION_NEEDED' ? '#ed6c02' : 'transparent',
                color: tableTab === 'ACTION_NEEDED' ? '#ffffff' : '#ed6c02',
                borderColor: '#ed6c02',
              }}
            >
              Action Required ({metrics.actionNeededCount})
            </Button>
          </Box>
        </Box>

        {usersLoading ? (
          <Box p={6} display="flex" justifyContent="center" alignItems="center" gap={2}>
            <CircularProgress size={28} />
            <Typography sx={{ color: '#64748b', fontSize: 14 }}>Loading directory accounts...</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    User / Profile
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Department &amp; Location
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Clearance Roles
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Workload / Tickets
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                    Status
                  </Box>
                  <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                    Administrative Actions
                  </Box>
                </Box>
              </Box>

              <Box component="tbody">
                {filteredUsers.length === 0 ? (
                  <Box component="tr">
                    <Box component="td" colSpan={6} sx={{ p: 4, textAlign: 'center', color: '#64748b' }}>
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
                          borderBottom: '1px solid #e2e8f0',
                          '&:hover': { bgcolor: '#f8fafc' },
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
                                bgcolor: deptColor,
                                fontSize: 14,
                                fontWeight: 700,
                                color: '#ffffff',
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
                              <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#111c2d' }}>
                                {u.name}
                              </Typography>
                              <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                                {designation}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
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
                              bgcolor: `${deptColor}15`,
                              color: deptColor,
                              border: `1px solid ${deptColor}30`,
                              mb: 0.5,
                            }}
                          />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
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
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
                              />
                            )}
                            {isLead ? (
                              <Chip
                                label="LEAD SRE (L1)"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#f3e8ff', color: '#6b21a8', border: '1px solid #d8b4fe' }}
                              />
                            ) : isTech ? (
                              <Chip
                                label="TECH (L0)"
                                size="small"
                                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                              />
                            ) : null}
                            <Chip
                              label="EMPLOYEE"
                              size="small"
                              sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: '#f1f5f9', color: '#475569' }}
                            />
                          </Stack>
                        </Box>

                        {/* Workload / Active Tickets */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          {activeCount === 0 ? (
                            <Typography sx={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                              ✓ 0 Open Tickets
                            </Typography>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={`${activeCount} Active`}
                                size="small"
                                sx={{
                                  bgcolor: highestPriority === 'P1' ? '#fee2e2' : '#f0f3ff',
                                  color: highestPriority === 'P1' ? '#991b1b' : '#004d99',
                                  fontWeight: 700,
                                  fontSize: 11,
                                  border: highestPriority === 'P1' ? '1px solid #fca5a5' : '1px solid #cbd5e1',
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
                                    bgcolor: highestPriority === 'P1' ? '#991b1b' : highestPriority === 'P2' ? '#c65102' : '#004d99',
                                    color: '#ffffff',
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          {isTech && u.technician && (
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.4 }}>
                              Load: {u.technician.activeIncidentCount || activeCount} / {u.technician.maxActiveIncidents || 6}
                            </Typography>
                          )}
                        </Box>

                        {/* Status */}
                        <Box component="td" sx={{ py: 2, px: 1.5 }}>
                          {!u.active ? (
                            <Chip label="DEACTIVATED" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: 10 }} />
                          ) : actionNeeded ? (
                            <Chip
                              icon={<WarningIcon sx={{ fontSize: '13px !important', color: '#c65102 !important' }} />}
                              label="ACTION NEEDED"
                              size="small"
                              sx={{
                                bgcolor: '#fff3e0',
                                color: '#c65102',
                                fontWeight: 800,
                                fontSize: 10,
                                letterSpacing: '0.04em',
                                border: '1px solid #ffe0b2',
                              }}
                            />
                          ) : (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#16a34a !important' }} />}
                              label="ACTIVE"
                              size="small"
                              sx={{
                                bgcolor: '#dcfce7',
                                color: '#166534',
                                fontWeight: 700,
                                fontSize: 10,
                                border: '1px solid #bbf7d0',
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
                                borderColor: '#cbd5e1',
                                color: '#475569',
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: 12,
                                borderRadius: 1.5,
                                '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8', color: '#004d99' },
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
                                bgcolor: '#004d99',
                                color: '#ffffff',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: 12,
                                borderRadius: 1.5,
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#00337c' },
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
                              sx={{ color: '#64748b' }}
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
        PaperProps={{ sx: { width: { xs: '100%', sm: 560 }, p: 3, bgcolor: '#ffffff' } }}
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '1px solid #e2e8f0' }}>
                <Box>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#004d99', letterSpacing: '0.04em' }}>
                    USER &amp; WORKSPACE INSPECTION // ID #{inspectUser.id}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.2 }}>
                    {inspectUser.name}
                  </Typography>
                </Box>
                <IconButton onClick={() => setInspectUser(null)} size="small">
                  <CloseIcon />
                </IconButton>
              </Box>

              {/* Profile Overview Card */}
              <Box sx={{ py: 2.5, overflowY: 'auto', flexGrow: 1 }}>
                <Paper sx={{ p: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2.5, mb: 2.5 }}>
                  <Grid container spacing={1.5}>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Designation
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111c2d' }}>
                        {getDesignation(inspectUser)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Department
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111c2d' }}>
                        {inspectUser.department || 'General Staff'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Workstation Hardware &amp; MDM
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: '#1e293b', fontFamily: 'monospace' }}>
                        {getWorkstation(inspectUser)}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Reporting Manager
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, color: '#1e293b' }}>
                        {getReportingManager(inspectUser)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Role Clearance & Admin Controls */}
                <Paper sx={{ p: 2, mb: 2.5, borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#111c2d', textTransform: 'uppercase', mb: 1.5, letterSpacing: '0.04em' }}>
                    Security Clearance &amp; Role Management
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {inspectUser.roles.map((r) => (
                      <Chip
                        key={r}
                        label={r}
                        size="small"
                        color={r === 'ADMINISTRATOR' ? 'error' : r === 'TECHNICIAN' ? 'primary' : 'default'}
                        variant="filled"
                        sx={{ fontWeight: 700, fontSize: 10.5 }}
                      />
                    ))}
                    {inspectUser.technician && (
                      <Chip
                        label={`Escalation Level ${inspectUser.technician.escalationLevel}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 10.5, fontWeight: 600 }}
                      />
                    )}
                  </Box>

                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant={isTech ? 'contained' : 'outlined'}
                      color="primary"
                      startIcon={<TechIcon sx={{ fontSize: 16 }} />}
                      onClick={() => handleToggleRole(inspectUser, 'TECHNICIAN')}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}
                    >
                      {isTech ? 'Demote Tech' : 'Promote to Tech'}
                    </Button>

                    <Button
                      size="small"
                      variant={isAdmin ? 'contained' : 'outlined'}
                      color="error"
                      startIcon={<AdminIcon sx={{ fontSize: 16 }} />}
                      onClick={() => handleToggleRole(inspectUser, 'ADMINISTRATOR')}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}
                    >
                      {isAdmin ? 'Demote Admin' : 'Promote to Admin'}
                    </Button>

                    <Button
                      size="small"
                      variant="outlined"
                      color={inspectUser.active ? 'inherit' : 'success'}
                      startIcon={<BlockIcon sx={{ fontSize: 16 }} />}
                      onClick={() => handleDeactivate(inspectUser)}
                      sx={{ textTransform: 'none', fontSize: 12, borderRadius: 1.5 }}
                    >
                      {inspectUser.active ? 'Deactivate' : 'Reactivate'}
                    </Button>
                  </Stack>
                </Paper>

                {/* Tickets Associated with User */}
                <Box sx={{ mb: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111c2d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Associated Incidents &amp; Tickets ({tickets.length})
                    </Typography>
                    {activeTickets.length > 0 && (
                      <Chip label={`${activeTickets.length} Active`} size="small" color="primary" sx={{ height: 20, fontSize: 10, fontWeight: 800 }} />
                    )}
                  </Box>

                  {tickets.length === 0 ? (
                    <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 32, color: '#16a34a', mb: 0.5 }} />
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                        Zero Associated Incidents
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: '#64748b' }}>
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
                          border: t.priority === 'P1' ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                          bgcolor: t.priority === 'P1' ? '#fef2f2' : '#ffffff',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#004d99' }}>
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
                                bgcolor: t.priority === 'P1' ? '#991b1b' : '#c65102',
                                color: '#ffffff',
                              }}
                            />
                            <Chip
                              label={t.status}
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: 9.5,
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                bgcolor: '#dee8ff',
                                color: '#004d99',
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111c2d', mb: 0.5 }}>
                          {t.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                          Service: <strong>{t.service?.name || 'General Platform'}</strong>
                        </Typography>
                        <Box sx={{ mt: 1, p: 0.8, bgcolor: '#f1f5f9', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <TimerIcon sx={{ fontSize: 14, color: '#004d99' }} />
                          <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#1e293b' }}>
                            SLA State: {t.slaState || 'OK'}
                          </Typography>
                        </Box>
                      </Paper>
                    ))
                  )}
                </Box>
              </Box>

              {/* Impersonate Button in Drawer Footer */}
              <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handleLoginAsUser(inspectUser)}
                  startIcon={<LoginIcon />}
                  sx={{
                    bgcolor: '#004d99',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 13.5,
                    py: 1.2,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#00337c' },
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
                <TechIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText>
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
                <AdminIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>
                {actionTargetUser.roles.includes('ADMINISTRATOR') ? 'Revoke Admin' : 'Promote to Admin'}
              </ListItemText>
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={() => {
                handleDeactivate(actionTargetUser);
                setActionAnchorEl(null);
              }}
            >
              <ListItemIcon>
                <BlockIcon fontSize="small" color="inherit" />
              </ListItemIcon>
              <ListItemText>
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
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d', fontSize: 16 }}>
            Provision Enterprise Account
          </Typography>
          <IconButton onClick={() => setProvisionOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              label="Full Name *"
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
            />
            <TextField
              fullWidth
              size="small"
              label="Temporary Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Department"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location / Office"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
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
            >
              <MenuItem value="EMPLOYEE">Standard Employee (End-User Portal)</MenuItem>
              <MenuItem value="TECHNICIAN">IT Operations Technician (Workbench &amp; Queue)</MenuItem>
              <MenuItem value="LEAD">Team Lead / Senior SRE (Escalations &amp; Triage)</MenuItem>
              <MenuItem value="ADMINISTRATOR">System Administrator (Full Clearance)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProvisionOpen(false)} sx={{ textTransform: 'none' }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleProvisionUser}
            disabled={isSubmitting}
            sx={{ bgcolor: '#004d99', textTransform: 'none', fontWeight: 700 }}
          >
            {isSubmitting ? 'Provisioning...' : 'Provision Account'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}