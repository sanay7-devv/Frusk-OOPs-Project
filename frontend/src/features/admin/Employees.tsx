import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Login as LoginIcon,
  Visibility as VisibilityIcon,
  Badge as BadgeIcon,
  Group as GroupIcon,
  PendingActions as PendingActionsIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifiedUserIcon,
  Close as CloseIcon,
  Computer as ComputerIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Timer as TimerIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import type { RoleType } from '../../api/types';

interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: 'Engineering' | 'Product & Design' | 'Security & SRE' | 'Finance & Operations';
  location: string;
  activeTickets: number;
  highestPriority: 'P1' | 'P2' | 'P3' | 'P4' | null;
  actionRequired: boolean;
  status: 'ACTIVE' | 'ACTION_NEEDED';
  lastActive: string;
  workstation: string;
  manager: string;
  tickets: {
    code: string;
    title: string;
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    status: string;
    service: string;
    slaRemaining: string;
  }[];
}

const EMPLOYEE_ROSTER: EmployeeProfile[] = [
  {
    id: 'EMP-1042',
    name: 'Elena Vance',
    email: 'elena.vance@iitsm.local',
    role: 'Staff Cloud Infrastructure Engineer',
    department: 'Engineering',
    location: 'Bangalore, India',
    activeTickets: 2,
    highestPriority: 'P1',
    actionRequired: true,
    status: 'ACTION_NEEDED',
    lastActive: '3m ago',
    workstation: 'macOS Sequoia 15.3 (Apple Silicon M3 Max)',
    manager: 'Rajesh Kulkarni (VP Engineering)',
    tickets: [
      {
        code: 'INC-2026-00108',
        title: 'Okta MFA Duo Token Desync',
        priority: 'P1',
        status: 'IN_PROGRESS',
        service: 'Identity & SSO',
        slaRemaining: '45m left',
      },
      {
        code: 'INC-2026-00088',
        title: 'VPN & SSO Gateway Handshake Timeout on macOS Sequoia 15.3 Build',
        priority: 'P2',
        status: 'PENDING_USER_INFO',
        service: 'Corporate VPN',
        slaRemaining: 'Paused (Technician Marcus waiting for logs)',
      },
    ],
  },
  {
    id: 'EMP-1088',
    name: 'Priya Sharma',
    email: 'priya.sharma@iitsm.local',
    role: 'Lead Product Manager',
    department: 'Product & Design',
    location: 'Mumbai, India',
    activeTickets: 1,
    highestPriority: 'P3',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: '14m ago',
    workstation: 'macOS Sonoma 14.6 (Apple Silicon M2 Pro)',
    manager: 'Sneha Rao (Director of Product)',
    tickets: [
      {
        code: 'INC-2026-00094',
        title: 'Jira Cloud Webhook Delivery Latency in Sprint Board',
        priority: 'P3',
        status: 'IN_PROGRESS',
        service: 'Jira Cloud',
        slaRemaining: '3h 15m left',
      },
    ],
  },
  {
    id: 'EMP-2041',
    name: 'David Kim',
    email: 'david.kim@iitsm.local',
    role: 'Principal Data Engineer',
    department: 'Engineering',
    location: 'Singapore',
    activeTickets: 1,
    highestPriority: 'P2',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: '28m ago',
    workstation: 'Ubuntu Linux 24.04 LTS (ThinkPad P16 Gen 2)',
    manager: 'Alexandre Dubois (Head of Data Platforms)',
    tickets: [
      {
        code: 'INC-2026-00115',
        title: 'Kafka Consumer Group Rebalance Lag on Streaming Telemetry Node',
        priority: 'P2',
        status: 'IN_PROGRESS',
        service: 'Streaming Data Platform',
        slaRemaining: '1h 40m left',
      },
    ],
  },
  {
    id: 'EMP-3019',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@iitsm.local',
    role: 'DevOps Security Specialist',
    department: 'Security & SRE',
    location: 'London, UK',
    activeTickets: 1,
    highestPriority: 'P4',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: '1h ago',
    workstation: 'macOS Sonoma 14.5 (Apple Silicon M3 Pro)',
    manager: 'Tariq Mansoor (CISO)',
    tickets: [
      {
        code: 'INC-2026-00072',
        title: 'GitHub Enterprise SSH Key Provisioning for CI/CD Subnet',
        priority: 'P4',
        status: 'RESOLVED',
        service: 'GitHub Enterprise',
        slaRemaining: 'Met (in 1h 12m)',
      },
    ],
  },
  {
    id: 'EMP-1055',
    name: 'Aisha Patel',
    email: 'aisha.patel@iitsm.local',
    role: 'Frontend Engineering Lead',
    department: 'Engineering',
    location: 'Bangalore, India',
    activeTickets: 1,
    highestPriority: 'P3',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: '45m ago',
    workstation: 'macOS Sequoia 15.2 (Apple Silicon M3)',
    manager: 'Rajesh Kulkarni (VP Engineering)',
    tickets: [
      {
        code: 'INC-2026-00122',
        title: 'Webpack Chunk Preload Regression on Admin Sidecar Modules',
        priority: 'P3',
        status: 'IN_PROGRESS',
        service: 'Web Applications',
        slaRemaining: '4h 10m left',
      },
    ],
  },
  {
    id: 'EMP-4081',
    name: 'Alex Rivera',
    email: 'alex.rivera@iitsm.local',
    role: 'Financial Systems Analyst',
    department: 'Finance & Operations',
    location: 'San Francisco, US',
    activeTickets: 1,
    highestPriority: 'P2',
    actionRequired: true,
    status: 'ACTION_NEEDED',
    lastActive: '2h ago',
    workstation: 'Windows 11 Enterprise (Dell Precision 5680)',
    manager: 'Karen Lin (VP Finance Operations)',
    tickets: [
      {
        code: 'INC-2026-00102',
        title: 'NetSuite ERP OAuth 2.0 Token Sync Error during Payroll Batch',
        priority: 'P2',
        status: 'PENDING_USER_INFO',
        service: 'Corporate ERP Gateway',
        slaRemaining: 'Paused (Awaiting batch error payload)',
      },
    ],
  },
  {
    id: 'EMP-1077',
    name: 'Vikram Reddy',
    email: 'vikram.reddy@iitsm.local',
    role: 'Core SRE Reliability Architect',
    department: 'Security & SRE',
    location: 'Hyderabad, India',
    activeTickets: 0,
    highestPriority: null,
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: 'Just now',
    workstation: 'Arch Linux (Custom Framework Laptop 16)',
    manager: 'Tariq Mansoor (CISO)',
    tickets: [],
  },
  {
    id: 'EMP-2012',
    name: 'Ananya Gupta',
    email: 'ananya.gupta@iitsm.local',
    role: 'Senior Product Experience Designer',
    department: 'Product & Design',
    location: 'Delhi, India',
    activeTickets: 1,
    highestPriority: 'P4',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: '3h ago',
    workstation: 'macOS Sequoia 15.3 (Apple Studio M2 Ultra)',
    manager: 'Sneha Rao (Director of Product)',
    tickets: [
      {
        code: 'INC-2026-00130',
        title: 'Figma Enterprise Organization License Seat Activation',
        priority: 'P4',
        status: 'IN_PROGRESS',
        service: 'Design Cloud',
        slaRemaining: '2h 00m left',
      },
    ],
  },
  {
    id: 'EMP-0001',
    name: 'General Employee',
    email: 'employee@iitsm.local',
    role: 'Corporate Staff Member',
    department: 'Finance & Operations',
    location: 'Global / Remote',
    activeTickets: 1,
    highestPriority: 'P3',
    actionRequired: false,
    status: 'ACTIVE',
    lastActive: 'Yesterday',
    workstation: 'macOS Sonoma 14.5 (Apple Silicon)',
    manager: 'IT Operations Desk',
    tickets: [
      {
        code: 'INC-2026-00099',
        title: 'Annual Security Passkey Re-Enrollment',
        priority: 'P3',
        status: 'IN_PROGRESS',
        service: 'Identity & SSO',
        slaRemaining: '5h 30m left',
      },
    ],
  },
];

export default function Employees() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'ACTION_NEEDED' | 'WITH_TICKETS'>('ALL');
  const [inspectEmployee, setInspectEmployee] = useState<EmployeeProfile | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Impersonate / Login as Employee
  const handleLoginAsEmployee = (emp: EmployeeProfile) => {
    localStorage.setItem('admin_impersonator', 'true');
    const employeeAccount = {
      accessToken: `mock-access-token-emp-${emp.id.toLowerCase()}`,
      refreshToken: `mock-refresh-token-emp-${emp.id.toLowerCase()}`,
      expiresInSeconds: 900,
      user: {
        id: 2,
        name: emp.name,
        email: emp.email,
        roles: ['EMPLOYEE'] as RoleType[],
        permissions: ['REPORT_INCIDENT', 'VIEW_OWN'],
        technician: null,
        administrator: null,
      },
    };
    signIn(employeeAccount);
    toast(`Authenticated as ${emp.name}. Switched directly into their Employee Portal.`, 'success');
    navigate('/employee/home');
  };

  const filteredEmployees = EMPLOYEE_ROSTER.filter((emp) => {
    if (selectedDept !== 'ALL' && emp.department !== selectedDept) return false;
    if (selectedStatus === 'ACTION_NEEDED' && !emp.actionRequired) return false;
    if (selectedStatus === 'WITH_TICKETS' && emp.activeTickets === 0) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.id.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalOpenTickets = EMPLOYEE_ROSTER.reduce((sum, e) => sum + e.activeTickets, 0);
  const actionNeededCount = EMPLOYEE_ROSTER.filter((e) => e.actionRequired).length;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* 1. TOP HEADER & TELEMETRY */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#425059' }}>
                SYS.DIRECTORY // REGION_AP_SOUTH_INDIA
              </Typography>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2b5bb5' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#004d99', textTransform: 'uppercase' }}>
                Zero-Trust Identity Broker
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.01em' }}>
              Enterprise Employee Directory &amp; Account Governance
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#64748b' }}>
              Inspect employee workspaces, audit personal queue metrics, and assume delegated sessions.
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          onClick={() => setInviteModalOpen(true)}
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
          Provision Employee
        </Button>
      </Paper>

      {/* 2. TOP METRIC STREAM */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Employees
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.5 }}>
              {EMPLOYEE_ROSTER.length}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#2b5bb5', mt: 0.5, fontWeight: 600 }}>
              100% Zero-Trust provisioned
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Open Tickets
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.5 }}>
              {totalOpenTickets}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
              Across 8 active corporate departments
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: actionNeededCount > 0 ? '2px solid #ed6c02' : '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#ed6c02', textTransform: 'uppercase' }}>
              Awaiting Employee Action
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#ed6c02', mt: 0.5 }}>
              {actionNeededCount}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748b', mt: 0.5 }}>
              Technicians paused awaiting client logs
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
              Click &ldquo;Login as Employee&rdquo; to impersonate
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. SEARCH & DEPARTMENT FILTERS */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, employee ID, role, or location..."
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

          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
              {(['ALL', 'Engineering', 'Product & Design', 'Security & SRE', 'Finance & Operations'] as const).map((dept) => {
                const isSelected = selectedDept === dept;
                return (
                  <Chip
                    key={dept}
                    label={dept === 'ALL' ? 'All Departments' : dept}
                    size="small"
                    onClick={() => setSelectedDept(dept)}
                    sx={{
                      fontWeight: isSelected ? 800 : 500,
                      bgcolor: isSelected ? '#004d99' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: isSelected ? '#00337c' : '#e2e8f0' },
                    }}
                  />
                );
              })}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. EMPLOYEE DIRECTORY TABLE */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#ffffff', overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#111c2d' }}>
            Corporate Staff Directory ({filteredEmployees.length} Accounts)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant={selectedStatus === 'ALL' ? 'contained' : 'outlined'}
              onClick={() => setSelectedStatus('ALL')}
              sx={{ fontSize: 11.5, textTransform: 'none', borderRadius: 1.5, bgcolor: selectedStatus === 'ALL' ? '#004d99' : 'transparent' }}
            >
              All
            </Button>
            <Button
              size="small"
              variant={selectedStatus === 'WITH_TICKETS' ? 'contained' : 'outlined'}
              onClick={() => setSelectedStatus('WITH_TICKETS')}
              sx={{ fontSize: 11.5, textTransform: 'none', borderRadius: 1.5, bgcolor: selectedStatus === 'WITH_TICKETS' ? '#004d99' : 'transparent' }}
            >
              With Active Tickets
            </Button>
            <Button
              size="small"
              variant={selectedStatus === 'ACTION_NEEDED' ? 'contained' : 'outlined'}
              onClick={() => setSelectedStatus('ACTION_NEEDED')}
              sx={{ fontSize: 11.5, textTransform: 'none', borderRadius: 1.5, bgcolor: selectedStatus === 'ACTION_NEEDED' ? '#ed6c02' : 'transparent', color: selectedStatus === 'ACTION_NEEDED' ? '#ffffff' : '#ed6c02', borderColor: '#ed6c02' }}
            >
              Action Required ({actionNeededCount})
            </Button>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Employee
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Department
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Employee ID &amp; Location
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Active Incidents
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Status
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  Last Active
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>
                  Administrative Actions
                </Box>
              </Box>
            </Box>

            <Box component="tbody">
              {filteredEmployees.map((emp) => {
                const deptColor =
                  emp.department === 'Engineering'
                    ? '#004d99'
                    : emp.department === 'Product & Design'
                    ? '#7c3aed'
                    : emp.department === 'Security & SRE'
                    ? '#b91c1c'
                    : '#047857';

                return (
                  <Box
                    component="tr"
                    key={emp.id}
                    sx={{
                      borderBottom: '1px solid #e2e8f0',
                      '&:hover': { bgcolor: '#f8fafc' },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Employee Profile */}
                    <Box component="td" sx={{ py: 2, px: 2.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: deptColor,
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {emp.name.split(' ').map((n) => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#111c2d' }}>
                            {emp.name}
                          </Typography>
                          <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                            {emp.role}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {emp.email}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Department */}
                    <Box component="td" sx={{ py: 2, px: 1.5 }}>
                      <Chip
                        label={emp.department}
                        size="small"
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: `${deptColor}15`,
                          color: deptColor,
                          border: `1px solid ${deptColor}30`,
                        }}
                      />
                    </Box>

                    {/* Employee ID & Location */}
                    <Box component="td" sx={{ py: 2, px: 1.5 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1e293b' }}>
                        {emp.id}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748b' }}>
                        <LocationOnIcon sx={{ fontSize: 13 }} />
                        <Typography sx={{ fontSize: 11.5 }}>{emp.location}</Typography>
                      </Box>
                    </Box>

                    {/* Active Incidents */}
                    <Box component="td" sx={{ py: 2, px: 1.5 }}>
                      {emp.activeTickets === 0 ? (
                        <Typography sx={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                          ✓ 0 Open Tickets
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={`${emp.activeTickets} Active`}
                            size="small"
                            sx={{
                              bgcolor: emp.highestPriority === 'P1' ? '#fee2e2' : '#f0f3ff',
                              color: emp.highestPriority === 'P1' ? '#991b1b' : '#004d99',
                              fontWeight: 700,
                              fontSize: 11,
                              border: emp.highestPriority === 'P1' ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                            }}
                          />
                          {emp.highestPriority && (
                            <Chip
                              label={emp.highestPriority}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 800,
                                bgcolor: emp.highestPriority === 'P1' ? '#991b1b' : '#c65102',
                                color: '#ffffff',
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </Box>

                    {/* Status */}
                    <Box component="td" sx={{ py: 2, px: 1.5 }}>
                      {emp.actionRequired ? (
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

                    {/* Last Active */}
                    <Box component="td" sx={{ py: 2, px: 1.5 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, color: '#64748b' }}>
                        {emp.lastActive}
                      </Typography>
                    </Box>

                    {/* Actions */}
                    <Box component="td" sx={{ py: 2, px: 2.5, textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setInspectEmployee(emp)}
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
                          Inspect Portal
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleLoginAsEmployee(emp)}
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
                          Login as Employee
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 5. SLIDE-OUT INSPECT PORTAL DRAWER */}
      <Drawer
        anchor="right"
        open={Boolean(inspectEmployee)}
        onClose={() => setInspectEmployee(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 540 }, p: 3, bgcolor: '#ffffff' } }}
      >
        {inspectEmployee && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '1px solid #e2e8f0' }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#004d99', letterSpacing: '0.04em' }}>
                  EMPLOYEE PORTAL INSPECTION // {inspectEmployee.id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d', mt: 0.2 }}>
                  {inspectEmployee.name}
                </Typography>
              </Box>
              <IconButton onClick={() => setInspectEmployee(null)} size="small">
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
                      {inspectEmployee.role}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Department
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111c2d' }}>
                      {inspectEmployee.department}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Workstation Hardware &amp; MDM
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#1e293b', fontFamily: 'monospace' }}>
                      {inspectEmployee.workstation}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Reporting Manager
                    </Typography>
                    <Typography sx={{ fontSize: 12.5, color: '#1e293b' }}>
                      {inspectEmployee.manager}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Tickets in Employee Portal */}
              <Box sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#111c2d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Active Incidents in Employee Queue ({inspectEmployee.tickets.length})
                  </Typography>
                </Box>

                {inspectEmployee.tickets.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2 }}>
                    <CheckCircleIcon sx={{ fontSize: 32, color: '#16a34a', mb: 0.5 }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      Zero Active Incidents
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#64748b' }}>
                      All reported issues for this user have been resolved.
                    </Typography>
                  </Paper>
                ) : (
                  inspectEmployee.tickets.map((t) => (
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
                        Service: <strong>{t.service}</strong>
                      </Typography>
                      <Box sx={{ mt: 1, p: 0.8, bgcolor: '#f1f5f9', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <TimerIcon sx={{ fontSize: 14, color: '#004d99' }} />
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: '#1e293b' }}>
                          {t.slaRemaining}
                        </Typography>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </Box>

            {/* Impersonate Button in Drawer */}
            <Box sx={{ pt: 2, borderTop: '1px solid #e2e8f0' }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => handleLoginAsEmployee(inspectEmployee)}
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
                Login as {inspectEmployee.name} &amp; Open Employee Portal
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* 6. PROVISION EMPLOYEE MODAL */}
      <Dialog
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d', fontSize: 16 }}>
            Provision New Employee Account
          </Typography>
          <IconButton onClick={() => setInviteModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <TextField fullWidth size="small" label="Full Name" placeholder="e.g. Maya Lin" sx={{ mb: 2 }} />
          <TextField fullWidth size="small" label="Corporate Email" placeholder="e.g. maya.lin@iitsm.local" sx={{ mb: 2 }} />
          <TextField fullWidth size="small" label="Department" placeholder="e.g. Engineering" sx={{ mb: 2 }} />
          <TextField fullWidth size="small" label="Location / Timezone" placeholder="e.g. Bangalore, India (IST)" />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setInviteModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              toast('Employee provisioned and enrolled into Okta Zero-Trust directory.', 'success');
              setInviteModalOpen(false);
            }}
            sx={{ bgcolor: '#004d99', textTransform: 'none', fontWeight: 700 }}
          >
            Create &amp; Provision
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
