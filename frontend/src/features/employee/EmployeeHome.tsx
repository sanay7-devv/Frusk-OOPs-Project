import StudioHero from '../../components/StudioHero';
import { useState, useEffect } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bolt as BoltIcon,
  PendingActions as PendingActionsIcon,
  ErrorOutline as ErrorOutlineIcon,
  TaskAlt as TaskAltIcon,
  TrendingUp as TrendingUpIcon,
  FilterList as FilterListIcon,
  Sync as SyncIcon,
  Lock as LockIcon,
  VpnKey as VpnKeyIcon,
  ViewKanban as ViewKanbanIcon,
  Terminal as TerminalIcon,
  Timer as TimerIcon,
  PauseCircle as PauseCircleIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Password as PasswordIcon,
  Apps as AppsIcon,
  WifiTethering as WifiTetheringIcon,
  Reply as ReplyIcon,
  PriorityHigh as PriorityHighIcon,
  Close as CloseIcon,
  OpenInNew as OpenInNewIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';

interface EmployeeIncident {
  id: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  assignedTo: string;
  service: string;
  serviceIcon: 'lock' | 'vpn' | 'kanban' | 'terminal';
  status: 'IN_PROGRESS' | 'PENDING_USER_INFO' | 'RESOLVED' | 'VERIFIED';
  slaLabel: string;
  slaPercent: number;
  slaState: 'error' | 'paused' | 'normal' | 'met';
  logged: string;
  actionType: 'view' | 'reply' | 'confirm';
}

const INITIAL_INCIDENTS: EmployeeIncident[] = [
  {
    id: 'INC-2026-00108',
    priority: 'P1',
    title: 'Okta MFA Duo Token Desync',
    assignedTo: 'SecOps Core On-Call',
    service: 'Identity & SSO',
    serviceIcon: 'lock',
    status: 'IN_PROGRESS',
    slaLabel: '45m left',
    slaPercent: 78,
    slaState: 'error',
    logged: 'Today 08:42',
    actionType: 'view',
  },
  {
    id: 'INC-2026-00088',
    priority: 'P2',
    title: 'VPN & SSO Gateway Handshake Timeout on macOS Sequoia 15.3 Build',
    assignedTo: 'Technician Marcus Chen',
    service: 'Corporate VPN',
    serviceIcon: 'vpn',
    status: 'PENDING_USER_INFO',
    slaLabel: 'Paused (Awaiting client logs)',
    slaPercent: 40,
    slaState: 'paused',
    logged: 'Yesterday',
    actionType: 'reply',
  },
  {
    id: 'INC-2026-00094',
    priority: 'P3',
    title: 'Jira Cloud Webhook Delivery Latency in Sprint Board',
    assignedTo: 'Workplace Systems Tech',
    service: 'Jira Cloud',
    serviceIcon: 'kanban',
    status: 'IN_PROGRESS',
    slaLabel: '3h 15m left',
    slaPercent: 35,
    slaState: 'normal',
    logged: 'Feb 24',
    actionType: 'view',
  },
  {
    id: 'INC-2026-00072',
    priority: 'P4',
    title: 'GitHub Enterprise SSH Key Provisioning for CI/CD Subnet',
    assignedTo: 'DevOps Platform Team',
    service: 'GitHub Enterprise',
    serviceIcon: 'terminal',
    status: 'RESOLVED',
    slaLabel: 'Met (in 1h 12m)',
    slaPercent: 100,
    slaState: 'met',
    logged: 'Feb 22',
    actionType: 'confirm',
  },
];

const SUGGESTED_TOPICS = [
  { label: 'macOS GlobalProtect Setup', article: 'Instructions to configure Palo Alto GlobalProtect with SAML 2.0 MFA tokens on macOS Sequoia and Sonoma.' },
  { label: 'FIDO2 Key Reset', article: 'Guide on self-service PIN unblocking and WebAuthn credential re-registration via corporate Okta portal.' },
  { label: 'Staging AWS Credentials', article: 'Using aws-vault and corporate Okta federated AWS IAM roles for local development clusters.' },
  { label: 'GitHub Copilot Org License', article: 'Requesting employee seat activation under the IITSM Enterprise GitHub Organization.' },
];

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [incidents, setIncidents] = useState<EmployeeIncident[]>(INITIAL_INCIDENTS);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<EmployeeIncident | null>(null);
  const [replyIncident, setReplyIncident] = useState<EmployeeIncident | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [kbModalTopic, setKbModalTopic] = useState<{ label: string; article: string } | null>(null);
  const [selfServiceModal, setSelfServiceModal] = useState<string | null>(null);

  // Filter Menu
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('kb-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast('Employee incident status synchronized with Tier-2 SRE queue.', 'success');
    }, 600);
  };

  const handleSendReply = () => {
    if (!replyIncident) return;
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === replyIncident.id
          ? {
              ...inc,
              status: 'IN_PROGRESS',
              slaState: 'normal',
              slaLabel: 'Resumed (Tier-2 reviewing logs)',
              actionType: 'view',
            }
          : inc
      )
    );
    toast(`Logs and clarification delivered to ${replyIncident.assignedTo}. Ticket returned to queue.`, 'success');
    setReplyIncident(null);
    setReplyMessage('');
  };

  const handleConfirmFixed = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'VERIFIED', actionType: 'view' } : inc))
    );
    toast(`Ticket ${id} verified and sign-off acknowledged. Thanks for confirming!`, 'success');
  };

  // Filter logic
  const filteredIncidents = incidents.filter((inc) => {
    if (filterTab === 'ACTIVE' && (inc.status === 'RESOLVED' || inc.status === 'VERIFIED')) return false;
    if (filterTab === 'PENDING' && inc.status !== 'PENDING_USER_INFO') return false;
    if (filterTab === 'RESOLVED' && inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED') return false;
    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.service.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = incidents.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'PENDING_USER_INFO').length;
  const pendingCount = incidents.filter((i) => i.status === 'PENDING_USER_INFO').length;
  const resolvedCount = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'VERIFIED').length;

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 6 }}>
      <StudioHero workspace="employee" />
      <div className="studio-section-title">01 / YOUR WORKDAY <span>THE NEXT THING TO MOVE FORWARD</span></div>

      {/* 2. OPERATIONAL ALERT BANNER (High Urgency User Blocker) */}
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 3,
          bgcolor: '#e5eaf4',
          border: '1px solid #c2c6d4',
          p: 2.5,
          mb: 3.5,
          boxShadow: '0 2px 8px rgba(0, 77, 153, 0.06)',
        }}
      >
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 6, bgcolor: '#1653c7' }} />
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
            pl: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, maxWidth: 900 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                bgcolor: '#ffffff',
                color: '#1653c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                flexShrink: 0,
                mt: 0.3,
              }}
            >
              <PriorityHighIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                <Chip
                  label="ACTION REQUIRED"
                  size="small"
                  sx={{
                    bgcolor: '#1653c7',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 10.5,
                    height: 20,
                    borderRadius: 1,
                    letterSpacing: '0.04em',
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#172b4d' }}>
                  INC-2026-00088
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#5c5a52' }}>
                  • Support Technician Marcus Chen requested log clarification 25m ago
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#172b4d' }}>
                VPN &amp; SSO Gateway Handshake Timeout on macOS Sequoia 15.3 Build
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, alignSelf: { xs: 'stretch', md: 'center' }, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setSelectedIncident(incidents.find((i) => i.id === 'INC-2026-00088') || incidents[0])}
              sx={{
                bgcolor: '#ffffff',
                borderColor: '#cbd5e1',
                color: '#172b4d',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 2,
                px: 2,
                py: 0.8,
                '&:hover': { bgcolor: '#f5f7fa', borderColor: '#94a3b8' },
              }}
            >
              View Details
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                const target = incidents.find((i) => i.id === 'INC-2026-00088') || incidents[0];
                setReplyIncident(target);
              }}
              startIcon={<ReplyIcon sx={{ fontSize: 17 }} />}
              sx={{
                bgcolor: '#1653c7',
                color: '#ffffff',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 13,
                borderRadius: 2,
                px: 2.2,
                py: 0.8,
                boxShadow: '0 2px 6px rgba(21, 101, 192, 0.25)',
                '&:hover': { bgcolor: '#1653c7' },
              }}
            >
              Respond Now
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* 3. COMMAND BENTO GRID: Action Launchpad & Search */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Quick Search & KB Triage (8 cols) */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                Unified Service Directory
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#172b4d', mb: 2 }}>
                How can Global Engineering Support assist you today?
              </Typography>

              <TextField
                id="kb-search-input"
                fullWidth
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IT knowledge base, infrastructure runbooks, or paste ticket code (e.g. INC-2026)..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#6a685f', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Box sx={{ px: 0.8, py: 0.2, bgcolor: '#e5eaf4', borderRadius: 1, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#5c5a52' }}>
                          Ctrl
                        </Box>
                        <Box sx={{ px: 0.8, py: 0.2, bgcolor: '#e5eaf4', borderRadius: 1, fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: '#5c5a52' }}>
                          K
                        </Box>
                      </Box>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: '#f1f5f9',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'transparent' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                  '&.Mui-focused': { bgcolor: '#ffffff' },
                  mb: 2,
                }}
              />
            </Box>

            {/* Quick Topics Pills */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#6a685f', mr: 0.5 }}>
                Suggested:
              </Typography>
              {SUGGESTED_TOPICS.map((topic) => (
                <Chip
                  key={topic.label}
                  label={topic.label}
                  size="small"
                  onClick={() => setKbModalTopic(topic)}
                  sx={{
                    bgcolor: '#e5eaf4',
                    color: '#172b4d',
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#e5eaf4', color: '#1653c7' },
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Incident Desk CTA Card (4 cols) */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #1653c7 0%, #1653c7 100%)',
              color: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0, 77, 153, 0.25)',
            }}
          >
            {/* Subtle backdrop circle */}
            <Box
              sx={{
                position: 'absolute',
                right: -24,
                bottom: -24,
                width: 140,
                height: 140,
                borderRadius: '50%',
                bgcolor: '#759efd',
                opacity: 0.2,
                pointerEvents: 'none',
              }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Chip
                  icon={<BoltIcon sx={{ fontSize: '15px !important', color: '#ffffff !important' }} />}
                  label="INCIDENT DESK"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.18)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 11,
                    height: 22,
                    borderRadius: 1.5,
                    letterSpacing: '0.04em',
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, color: '#dae5ff', fontWeight: 600 }}>
                  AVG TTR: 48m
                </Typography>
              </Box>

              <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', mb: 0.8, lineHeight: 1.25 }}>
                Experiencing an Interruption?
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#dae5ff', lineHeight: 1.5 }}>
                Dispatch an automated high-priority ticket straight to Tier-2 SRE on-call engineers.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate('/employee/report')}
              startIcon={<BoltIcon sx={{ fontSize: 20 }} />}
              sx={{
                mt: 2.5,
                bgcolor: '#ffffff',
                color: '#1653c7',
                fontWeight: 800,
                fontSize: 13.5,
                borderRadius: 2,
                py: 1.2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                position: 'relative',
                zIndex: 1,
                textTransform: 'none',
                '&:hover': { bgcolor: '#f1f5f9', color: '#00337c' },
              }}
            >
              + Report Issue / Outage
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* 4. KPI / STATUS METRIC STREAM (4 Columns) */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* KPI 1: Active Incidents */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Incidents
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#172b4d', mt: 0.5 }}>
                  {activeCount}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#e5eaf4', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PendingActionsIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 2, borderTop: '1px solid #f1f5f9', mt: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, fontFamily: 'monospace', fontSize: 11, color: '#5c5a52' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1653c7' }} />
                2 in progress
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, fontFamily: 'monospace', fontSize: 11, color: '#5c5a52' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#759efd' }} />
                1 waiting
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 2: Awaiting My Action (Highlighted Attention State) */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '2px solid #1653c7',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(0, 77, 153, 0.08)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#1653c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Awaiting My Action
                  </Typography>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1653c7', animation: 'pulse 1.2s infinite' }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#1653c7', mt: 0.5 }}>
                  {pendingCount}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#d8e3fb', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ErrorOutlineIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ pt: 1.5, borderTop: '1px solid #f1f5f9', mt: 1 }}>
              <Typography sx={{ fontSize: 11.5, color: '#5c5a52' }} noWrap>
                <strong style={{ color: '#172b4d' }}>INC-2026-00088:</strong> Needs client log verification
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 3: Resolved Past 30 Days */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resolved (Past 30d)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#172b4d', mt: 0.5 }}>
                  {resolvedCount + 13}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#e5eaf4', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TaskAltIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pt: 2, borderTop: '1px solid #f1f5f9', mt: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 16, color: '#1653c7' }} />
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#5c5a52', fontWeight: 600 }}>
                100% verified closure
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 4: SLA Fulfillment */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Avg SLA Fulfillment
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#172b4d', mt: 0.5 }}>
                  99.4%
                </Typography>
              </Box>

              {/* Compact SVG Gauge */}
              <Box sx={{ width: 40, height: 40, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5eaf4"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1653c7"
                    strokeWidth="3.5"
                    strokeDasharray="99.4, 100"
                    strokeLinecap="round"
                  />
                </svg>
                <Typography sx={{ position: 'absolute', fontSize: 10, fontWeight: 800, fontFamily: 'monospace', color: '#172b4d' }}>
                  OK
                </Typography>
              </Box>
            </Box>
            <Box sx={{ pt: 2, borderTop: '1px solid #f1f5f9', mt: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#5c5a52' }}>
                +0.8% above quarterly ITIL target
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 5. PRIMARY WORKING AREA: INTERACTIVE INCIDENTS GRID & DIAGNOSTICS */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          overflow: 'hidden',
          mb: 3.5,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Table Header Bar */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#f5f7fa',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 16 }}>
                My Recent Incidents &amp; Requests
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#5c5a52' }}>
                Real-time status synchronizer • ITIL Service Delivery
              </Typography>
            </Box>
            <Chip
              label={`${filteredIncidents.length} Records`}
              size="small"
              sx={{
                bgcolor: '#d8e3fb',
                color: '#1653c7',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 11,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Filter Tabs */}
            <Box sx={{ display: 'flex', bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 2, p: 0.3 }}>
              {(['ALL', 'ACTIVE', 'PENDING', 'RESOLVED'] as const).map((tab) => {
                const count =
                  tab === 'ALL'
                    ? incidents.length
                    : tab === 'ACTIVE'
                    ? activeCount
                    : tab === 'PENDING'
                    ? pendingCount
                    : resolvedCount;
                const isSelected = filterTab === tab;
                return (
                  <Button
                    key={tab}
                    size="small"
                    onClick={() => setFilterTab(tab)}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? 800 : 500,
                      color: isSelected ? '#1653c7' : '#5c5a52',
                      bgcolor: isSelected ? '#e5eaf4' : 'transparent',
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 0.4,
                      textTransform: 'none',
                      minWidth: 'auto',
                      '&:hover': { bgcolor: isSelected ? '#e5eaf4' : '#f1f5f9' },
                    }}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()} ({count})
                  </Button>
                );
              })}
            </Box>

            {/* Filter Dropdown */}
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderColor: '#cbd5e1',
                color: priorityFilter !== 'ALL' ? '#1653c7' : '#5c5a52',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 2,
                textTransform: 'none',
                height: 32,
              }}
            >
              {priorityFilter === 'ALL' ? 'Filter' : `Priority: ${priorityFilter}`}
            </Button>
            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              <MenuItem onClick={() => { setPriorityFilter('ALL'); setFilterAnchor(null); }}>All Priorities</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P1'); setFilterAnchor(null); }}>P1 Critical</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P2'); setFilterAnchor(null); }}>P2 High</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P3'); setFilterAnchor(null); }}>P3 Medium</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P4'); setFilterAnchor(null); }}>P4 Low</MenuItem>
            </Menu>

            {/* Refresh Button */}
            <IconButton
              size="small"
              onClick={handleRefresh}
              title="Refresh Feed"
              sx={{
                border: '1px solid #cbd5e1',
                borderRadius: 2,
                p: 0.8,
                bgcolor: '#ffffff',
                color: '#5c5a52',
                transform: isRefreshing ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.5s ease',
              }}
            >
              <SyncIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Responsive Ledger Table */}
        <Box sx={{ overflowX: 'auto', width: '100%' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Incident Code
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Priority
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 2, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Issue Summary
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Service
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Status
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SLA Countdown
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 1.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Logged
                </Box>
                <Box component="th" sx={{ py: 1.2, px: 2.5, fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                  Action
                </Box>
              </Box>
            </Box>

            <Box component="tbody">
              {filteredIncidents.length === 0 ? (
                <Box component="tr">
                  <Box component="td" colSpan={8} sx={{ py: 4, textAlign: 'center', color: '#64748b' }}>
                    No matching incidents found.
                  </Box>
                </Box>
              ) : (
                filteredIncidents.map((inc) => {
                  const isCritical = inc.priority === 'P1';
                  const isHigh = inc.priority === 'P2';
                  const isActionNeeded = inc.status === 'PENDING_USER_INFO';

                  return (
                    <Box
                      component="tr"
                      key={inc.id}
                      sx={{
                        borderBottom: '1px solid #e2e8f0',
                        bgcolor: isActionNeeded ? '#f1f5f9' : '#ffffff',
                        '&:hover': { bgcolor: isActionNeeded ? '#e5eaf4' : '#f5f7fa' },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Code */}
                      <Box component="td" sx={{ py: 1.8, px: 2.5, whiteSpace: 'nowrap' }}>
                        <Typography
                          onClick={() => setSelectedIncident(inc)}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: '#1653c7',
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {inc.id}
                        </Typography>
                      </Box>

                      {/* Priority */}
                      <Box component="td" sx={{ py: 1.8, px: 1.5, whiteSpace: 'nowrap' }}>
                        <Chip
                          label={
                            isCritical ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ba1a1a', animation: 'pulse 1s infinite' }} />
                                P1 CRITICAL
                              </Box>
                            ) : isHigh ? (
                              'P2 HIGH'
                            ) : inc.priority === 'P3' ? (
                              'P3 MEDIUM'
                            ) : (
                              'P4 LOW'
                            )
                          }
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: 10.5,
                            height: 22,
                            borderRadius: 1,
                            bgcolor:
                              isCritical
                                ? '#ffdad6'
                                : isHigh
                                ? '#fff3e0'
                                : inc.priority === 'P3'
                                ? '#fffde7'
                                : '#e8f5e9',
                            color:
                              isCritical
                                ? '#93000a'
                                : isHigh
                                ? '#c65102'
                                : inc.priority === 'P3'
                                ? '#f57f17'
                                : '#1b5e20',
                            border: `1px solid ${
                              isCritical
                                ? '#ffcdd2'
                                : isHigh
                                ? '#ffe0b2'
                                : inc.priority === 'P3'
                                ? '#fff59d'
                                : '#c8e6c9'
                            }`,
                          }}
                        />
                      </Box>

                      {/* Title & Assignee */}
                      <Box component="td" sx={{ py: 1.8, px: 2, maxWidth: 300 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#172b4d' }} noWrap title={inc.title}>
                          {inc.title}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: isActionNeeded ? '#1653c7' : '#6a685f', fontWeight: isActionNeeded ? 600 : 400 }}>
                          Assigned: {inc.assignedTo}
                        </Typography>
                      </Box>

                      {/* Service */}
                      <Box component="td" sx={{ py: 1.8, px: 1.5, whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          {inc.serviceIcon === 'lock' && <LockIcon sx={{ fontSize: 16, color: '#6a685f' }} />}
                          {inc.serviceIcon === 'vpn' && <VpnKeyIcon sx={{ fontSize: 16, color: '#6a685f' }} />}
                          {inc.serviceIcon === 'kanban' && <ViewKanbanIcon sx={{ fontSize: 16, color: '#6a685f' }} />}
                          {inc.serviceIcon === 'terminal' && <TerminalIcon sx={{ fontSize: 16, color: '#6a685f' }} />}
                          <Typography sx={{ fontSize: 12.5, color: '#172b4d' }}>{inc.service}</Typography>
                        </Box>
                      </Box>

                      {/* Status */}
                      <Box component="td" sx={{ py: 1.8, px: 1.5, whiteSpace: 'nowrap' }}>
                        <Chip
                          label={inc.status}
                          size="small"
                          sx={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: 10,
                            height: 20,
                            borderRadius: 1,
                            bgcolor:
                              inc.status === 'RESOLVED' || inc.status === 'VERIFIED'
                                ? '#e5eaf4'
                                : inc.status === 'PENDING_USER_INFO'
                                ? '#e5eaf4'
                                : '#e5eaf4',
                            color:
                              inc.status === 'RESOLVED' || inc.status === 'VERIFIED'
                                ? '#1653c7'
                                : '#1653c7',
                          }}
                        />
                      </Box>

                      {/* SLA Progress */}
                      <Box component="td" sx={{ py: 1.8, px: 1.5, whiteSpace: 'nowrap', width: 140 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {inc.slaState === 'error' && <TimerIcon sx={{ fontSize: 13, color: '#ba1a1a' }} />}
                            {inc.slaState === 'paused' && <PauseCircleIcon sx={{ fontSize: 13, color: '#6a685f' }} />}
                            {inc.slaState === 'normal' && <ScheduleIcon sx={{ fontSize: 13, color: '#1653c7' }} />}
                            {inc.slaState === 'met' && <CheckCircleIcon sx={{ fontSize: 13, color: '#1653c7' }} />}
                            <Typography
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: 700,
                                color: inc.slaState === 'error' ? '#ba1a1a' : '#172b4d',
                              }}
                            >
                              {inc.slaLabel}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#6a685f' }}>
                            {inc.slaPercent}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={inc.slaPercent}
                          sx={{
                            height: 5,
                            borderRadius: 2,
                            bgcolor: '#e2e8f0',
                            '& .MuiLinearProgress-bar': {
                              bgcolor:
                                inc.slaState === 'error'
                                  ? '#ba1a1a'
                                  : inc.slaState === 'paused'
                                  ? '#5a6871'
                                  : '#1653c7',
                            },
                          }}
                        />
                      </Box>

                      {/* Logged */}
                      <Box component="td" sx={{ py: 1.8, px: 1.5, whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, color: '#6a685f' }}>
                          {inc.logged}
                        </Typography>
                      </Box>

                      {/* Action */}
                      <Box component="td" sx={{ py: 1.8, px: 2.5, whiteSpace: 'nowrap', textAlign: 'right' }}>
                        {inc.actionType === 'reply' ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => setReplyIncident(inc)}
                            sx={{
                              bgcolor: '#1653c7',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'none',
                              borderRadius: 1.5,
                              px: 1.5,
                              py: 0.4,
                              '&:hover': { bgcolor: '#00337c' },
                            }}
                          >
                            Reply Now
                          </Button>
                        ) : inc.actionType === 'confirm' && inc.status === 'RESOLVED' ? (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleConfirmFixed(inc.id)}
                            sx={{
                              bgcolor: '#1653c7',
                              color: '#ffffff',
                              fontSize: 12,
                              fontWeight: 700,
                              textTransform: 'none',
                              borderRadius: 1.5,
                              px: 1.5,
                              py: 0.4,
                              '&:hover': { bgcolor: '#00337c' },
                            }}
                          >
                            Confirm Fixed
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedIncident(inc)}
                            sx={{
                              borderColor: '#e2e8f0',
                              color: '#1653c7',
                              bgcolor: '#f5f7fa',
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'none',
                              borderRadius: 1.5,
                              px: 1.5,
                              py: 0.4,
                              '&:hover': { bgcolor: '#e5eaf4', borderColor: '#cbd5e1' },
                            }}
                          >
                            View Ticket
                          </Button>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>

        {/* Table Footer */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#f5f7fa',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6a685f' }}>
            <InfoIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 12, fontFamily: 'monospace' }}>
              SLAs comply with ITIL 4 Service Level Management Agreements (Bronze / Internal Employee).
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => navigate('/employee/incidents')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
            sx={{
              color: '#1653c7',
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: 'none',
              '&:hover': { textDecoration: 'underline', bgcolor: 'transparent' },
            }}
          >
            View full historical incident ledger
          </Button>
        </Box>
      </Paper>

      {/* 6. AUTOMATED SELF-SERVICE TOOLS STRIP */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 18 }}>
              Automated Self-Service Tools
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#6a685f' }}>
              Instant zero-touch resolutions without manual engineer review
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#6a685f' }}>
            SELF_PROVISION_V2.4
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {/* Tool 1 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              onClick={() => setSelfServiceModal('password')}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1653c7',
                  boxShadow: '0 4px 12px rgba(0, 77, 153, 0.08)',
                  transform: 'translateY(-2px)',
                },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#e5eaf4', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PasswordIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#172b4d', mb: 0.5 }}>
                    Self-Service Password &amp; MFA
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#6a685f', lineHeight: 1.5 }}>
                    Reset domain credentials, recover hardware YubiKeys, or sync Entra ID passkeys.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', color: '#1653c7' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Launch Verification Flow</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </Box>
            </Paper>
          </Grid>

          {/* Tool 2 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              onClick={() => setSelfServiceModal('licenses')}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1653c7',
                  boxShadow: '0 4px 12px rgba(0, 77, 153, 0.08)',
                  transform: 'translateY(-2px)',
                },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#e5eaf4', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AppsIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#172b4d', mb: 0.5 }}>
                    Software License Catalog
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#6a685f', lineHeight: 1.5 }}>
                    Request immediate seat allocations for JetBrains, Figma, Copilot, or Postman Enterprise.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', color: '#1653c7' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Browse 48 Available Apps</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </Box>
            </Paper>
          </Grid>

          {/* Tool 3 */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              onClick={() => setSelfServiceModal('wifi')}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#1653c7',
                  boxShadow: '0 4px 12px rgba(0, 77, 153, 0.08)',
                  transform: 'translateY(-2px)',
                },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: '#e5eaf4', color: '#1653c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <WifiTetheringIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#172b4d', mb: 0.5 }}>
                    Wi-Fi &amp; Device MDM Profiles
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#6a685f', lineHeight: 1.5 }}>
                    Download 802.1X enterprise root certificates and local branch office mesh configs.
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, pt: 1.5, borderTop: '1px solid #f1f5f9', color: '#1653c7' }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Install .mobileconfig</Typography>
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* MODAL 1: TICKET DETAIL VIEW */}
      <Dialog
        open={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {selectedIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                  {selectedIncident.id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 17 }}>
                  {selectedIncident.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6a685f', textTransform: 'uppercase' }}>
                    Service
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#172b4d' }}>
                    {selectedIncident.service}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6a685f', textTransform: 'uppercase' }}>
                    Priority &amp; Status
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={selectedIncident.priority} size="small" sx={{ fontWeight: 800, fontSize: 11 }} />
                    <Chip label={selectedIncident.status} size="small" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6a685f', textTransform: 'uppercase' }}>
                    Assigned Technician
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#172b4d' }}>
                    {selectedIncident.assignedTo}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#6a685f', textTransform: 'uppercase' }}>
                    SLA State
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: selectedIncident.slaState === 'error' ? '#ba1a1a' : '#1653c7' }}>
                    {selectedIncident.slaLabel} ({selectedIncident.slaPercent}% elapsed)
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setSelectedIncident(null)} sx={{ textTransform: 'none' }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  const inc = selectedIncident;
                  setSelectedIncident(null);
                  setReplyIncident(inc);
                }}
                sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
              >
                Send Message / Add Logs
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 2: RESPOND / ADD LOGS */}
      <Dialog
        open={Boolean(replyIncident)}
        onClose={() => setReplyIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {replyIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                  RESPOND TO TECHNICIAN // {replyIncident.id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 16 }}>
                  {replyIncident.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setReplyIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Paper sx={{ p: 1.5, bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                  Technician Request:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#172b4d', mt: 0.3 }}>
                  &ldquo;Please attach terminal output from <code>log show --predicate 'process == \"GlobalProtect\"' --last 10m</code> or verify if DNS resolves internal gateways.&rdquo;
                </Typography>
              </Paper>

              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Paste diagnostics, terminal logs, or describe the latest occurrence..."
                sx={{
                  bgcolor: '#f5f7fa',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReplyIncident(null)} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                sx={{
                  bgcolor: '#1653c7',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#00337c' },
                }}
              >
                Send Clarification to Tech
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 3: KNOWLEDGE BASE QUICK PREVIEW */}
      <Dialog
        open={Boolean(kbModalTopic)}
        onClose={() => setKbModalTopic(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {kbModalTopic && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 17 }}>
                {kbModalTopic.label}
              </Typography>
              <IconButton onClick={() => setKbModalTopic(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Typography sx={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, mb: 2 }}>
                {kbModalTopic.article}
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#f5f7fa', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1653c7', mb: 0.5 }}>
                  Recommended Action:
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#475569' }}>
                  If self-service configuration fails after 2 attempts, use the <strong>+ Report Issue</strong> button to generate an auto-classified ticket with your host profile.
                </Typography>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setKbModalTopic(null)} sx={{ textTransform: 'none' }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setKbModalTopic(null);
                  navigate('/employee/report');
                }}
                sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
              >
                Create Support Ticket
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 4: SELF-SERVICE TOOL POPUP */}
      <Dialog
        open={Boolean(selfServiceModal)}
        onClose={() => setSelfServiceModal(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#172b4d', fontSize: 16 }}>
            {selfServiceModal === 'password' && 'Self-Service Password & MFA'}
            {selfServiceModal === 'licenses' && 'Software License Request'}
            {selfServiceModal === 'wifi' && 'Wi-Fi & MDM Profiles'}
          </Typography>
          <IconButton onClick={() => setSelfServiceModal(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2 }}>
          <Typography sx={{ fontSize: 13, color: '#475569', mb: 2 }}>
            {selfServiceModal === 'password' &&
              'A zero-touch SMS and Authenticator push notification has been queued for your verified device. Follow the link to reset your credentials.'}
            {selfServiceModal === 'licenses' &&
              'Your request for enterprise seat allocation has been registered with automatic IT budget pre-approval.'}
            {selfServiceModal === 'wifi' &&
              'The 802.1X certificate bundle and mobile configuration payload are ready for your registered hardware.'}
          </Typography>
          <Paper sx={{ p: 1.5, bgcolor: '#f1f5f9', borderRadius: 2, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
              STATUS: PROVISION_READY
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={() => {
              toast('Self-service operation triggered successfully.', 'success');
              setSelfServiceModal(null);
            }}
            sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
          >
            Confirm &amp; Proceed
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

