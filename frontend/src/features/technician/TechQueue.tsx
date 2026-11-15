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
  MenuItem,
  Select,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bolt as BoltIcon,
  Warning as WarningIcon,
  Sync as SyncIcon,
  PauseCircle as PauseCircleIcon,
  Schedule as ScheduleIcon,
  ArrowForward as ArrowForwardIcon,
  EditNote as EditNoteIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  VideoCameraFront as VideoCameraFrontIcon,
  ErrorOutline as ErrorOutlineIcon,
  Dns as DnsIcon,
  Hub as HubIcon,
  Fingerprint as FingerprintIcon,
  People as PeopleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  AutoFixHigh as AutoFixHighIcon,
  Groups as GroupsIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';

export interface TechIncident {
  id: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  service: string;
  serviceTag: string;
  reporter: string;
  reportedTimeAgo: string;
  details: string;
  node: string;
  status: 'NEEDS_ACK' | 'IN_PROGRESS' | 'PENDING_USER_INFO' | 'RESOLVED';
  breachWindow: string;
  breachPercent: number;
  breachStatus: 'critical' | 'warning' | 'safe' | 'paused';
  runbookML?: string;
  warRoom?: string;
  waitingOn?: string;
}

const INITIAL_QUEUE: TechIncident[] = [
  {
    id: 'INC-2026-00095',
    priority: 'P1',
    title: 'Payment Gateway Webhook 504 Timeout',
    service: 'Payment Gateway',
    serviceTag: 'Payment Ingress',
    reporter: 'Alex Rivera (SecOps)',
    reportedTimeAgo: '4m ago',
    details: 'Automated alert: 1,420 checkout failures in 3m',
    node: 'ingress-edge-us-east-04',
    status: 'NEEDS_ACK',
    breachWindow: '08m 14s',
    breachPercent: 18,
    breachStatus: 'critical',
    runbookML: 'Runbook #PAY-99 (Stripe Webhook Deadlock Recovery)',
  },
  {
    id: 'INC-2026-00042',
    priority: 'P1',
    title: 'Production Kubernetes Cluster API Latency & Gateway 504 Timeouts',
    service: 'Kubernetes Cluster',
    serviceTag: 'Core Billing API',
    reporter: 'David Miller (DevOps)',
    reportedTimeAgo: '28m ago',
    details: 'p99 response time degraded to 6,240ms',
    node: 'Cluster: prod-aks-eastus2',
    status: 'IN_PROGRESS',
    breachWindow: '14m 19s',
    breachPercent: 22,
    breachStatus: 'warning',
    warRoom: 'War Room #09 Active (7 participants)',
  },
  {
    id: 'INC-2026-00108',
    priority: 'P2',
    title: 'SSO Login Loop for West Coast Remote Workers',
    service: 'Identity & SSO',
    serviceTag: 'Identity & SSO',
    reporter: 'Marcus Vance',
    reportedTimeAgo: '45m ago',
    details: 'Okta SAML ACS token verification failure (86 affected users)',
    node: 'Okta Enterprise IdP Node 02',
    status: 'IN_PROGRESS',
    breachWindow: '1h 42m',
    breachPercent: 65,
    breachStatus: 'safe',
  },
  {
    id: 'INC-2026-00088',
    priority: 'P2',
    title: 'VPN Gateway Handshake Error 0x8007274c on macOS Sequoia',
    service: 'Corporate VPN',
    serviceTag: 'Corporate VPN',
    reporter: 'Elena Vance',
    reportedTimeAgo: '2h ago',
    details: 'Waiting on client network dump (tcpdump.pcap)',
    node: 'GlobalProtect Perimeter Gateway 01',
    status: 'PENDING_USER_INFO',
    breachWindow: 'PAUSED',
    breachPercent: 45,
    breachStatus: 'paused',
    waitingOn: 'tcpdump diagnostic logs from client',
  },
  {
    id: 'INC-2026-00094',
    priority: 'P3',
    title: 'Jira Cloud Webhook Delivery Latency',
    service: 'Workplace Tools',
    serviceTag: 'Workplace Tools',
    reporter: 'Sarah Jenkins',
    reportedTimeAgo: '1h 10m ago',
    details: 'Retrying queue backlog at rate limit (429 slow down)',
    node: 'Atlassian Event Mesh',
    status: 'IN_PROGRESS',
    breachWindow: '3h 15m',
    breachPercent: 88,
    breachStatus: 'safe',
  },
];

export default function TechQueue() {
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState<TechIncident[]>(INITIAL_QUEUE);
  const [isAvailable, setIsAvailable] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'NEEDS_ACK' | 'AT_RISK' | 'IN_PROGRESS' | 'PENDING_INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Interactive Modals
  const [noteModalIncident, setNoteModalIncident] = useState<TechIncident | null>(null);
  const [noteText, setNoteText] = useState('');
  const [requestInfoIncident, setRequestInfoIncident] = useState<TechIncident | null>(null);
  const [requestInfoText, setRequestInfoText] = useState('');
  const [warRoomIncident, setWarRoomIncident] = useState<TechIncident | null>(null);
  const [reassignIncident, setReassignIncident] = useState<TechIncident | null>(null);
  const [reassignTarget, setReassignTarget] = useState('SRE Team Lead (Level 1 Escalation)');

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('tech-queue-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions
  const handleAcknowledge = (id: string) => {
    setQueue((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: 'IN_PROGRESS' as const, breachStatus: 'warning' as const } : inc))
    );
    toast(`Incident ${id} acknowledged. Ownership confirmed under Tier-2 SRE queue.`, 'success');
  };

  const handleSaveNote = () => {
    if (!noteModalIncident) return;
    toast(`Investigation note appended to timeline for ${noteModalIncident.id}.`, 'info');
    setNoteModalIncident(null);
    setNoteText('');
  };

  const handleSendInfoRequest = () => {
    if (!requestInfoIncident) return;
    setQueue((prev) =>
      prev.map((inc) =>
        inc.id === requestInfoIncident.id
          ? { ...inc, status: 'PENDING_USER_INFO' as const, breachStatus: 'paused' as const, breachWindow: 'PAUSED' }
          : inc
      )
    );
    toast(`Information clarification prompt dispatched to ${requestInfoIncident.reporter}. SLA clock paused.`, 'warning');
    setRequestInfoIncident(null);
    setRequestInfoText('');
  };

  const handleReassign = () => {
    if (!reassignIncident) return;
    setQueue((prev) => prev.filter((inc) => inc.id !== reassignIncident.id));
    toast(`Ticket ${reassignIncident.id} transferred to ${reassignTarget}.`, 'info');
    setReassignIncident(null);
  };

  // Filter calculations
  const filteredQueue = queue.filter((inc) => {
    if (filterTab === 'NEEDS_ACK' && inc.status !== 'NEEDS_ACK') return false;
    if (filterTab === 'AT_RISK' && inc.breachPercent > 25) return false;
    if (filterTab === 'IN_PROGRESS' && inc.status !== 'IN_PROGRESS') return false;
    if (filterTab === 'PENDING_INFO' && inc.status !== 'PENDING_USER_INFO') return false;
    if (serviceFilter !== 'ALL' && inc.service !== serviceFilter) return false;
    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.service.toLowerCase().includes(q) ||
        inc.reporter.toLowerCase().includes(q) ||
        inc.node.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const needsAckCount = queue.filter((i) => i.status === 'NEEDS_ACK').length;
  const atRiskCount = queue.filter((i) => i.breachPercent <= 25 && i.status !== 'PENDING_USER_INFO').length;
  const inProgressCount = queue.filter((i) => i.status === 'IN_PROGRESS').length;
  const pendingInfoCount = queue.filter((i) => i.status === 'PENDING_USER_INFO').length;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      <StudioHero workspace="tech" />
      <div id="work-queue" className="studio-section-title">01 / YOUR QUEUE <span>PICK UP THE NEXT FIX</span></div>
      {/* 1. TOP COMMAND BAR */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'flex-start', lg: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#20211f', letterSpacing: '-0.01em' }}>
              Technician Operational Work Queue
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.4,
                borderRadius: 3,
                bgcolor: '#e5eaf4',
                color: '#1653c7',
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: '#1653c7',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              Stream active · 4s refresh
            </Box>
            <Chip
              label="⌘K Filter"
              size="small"
              sx={{
                fontFamily: 'monospace',
                fontSize: 11,
                height: 22,
                bgcolor: '#e5eaf4',
                color: '#5c5a52',
                fontWeight: 700,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: '#5c5a52' }}>
            Live SRE incident triage cockpit · ITIL v4 Incident Management Standard
          </Typography>
        </Box>

        {/* Capacity & Availability Pill Control */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2.5,
            border: '1px solid #cbd5e1',
            bgcolor: '#fffcf5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: isAvailable ? '#1653c7' : '#ba1a1a',
            }}
          />
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#20211f', lineHeight: 1.2 }}>
              Status: {isAvailable ? 'Available' : 'Busy / On-Call Hold'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#5c5a52' }}>
              {isAvailable ? 'Accepting P1/P2 auto-dispatch' : 'Paused auto-assignment'}
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => {
              setIsAvailable(!isAvailable);
              toast(`Technician availability toggled to ${!isAvailable ? 'Available' : 'Busy'}.`, 'info');
            }}
            sx={{
              ml: 1,
              bgcolor: '#eee7d9',
              color: '#20211f',
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              '&:hover': { bgcolor: '#e5eaf4' },
            }}
          >
            {isAvailable ? 'Set Busy' : 'Set Available'}
          </Button>
        </Paper>
      </Box>

      {/* 2. OPERATIONAL HEALTH & WORKLOAD CAPACITY BENTO GRID */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* SRE Workload Capacity Gauge (5 cols) */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid #cbd5e1',
              bgcolor: '#fffcf5',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: '#1653c7',
                    color: '#fffcf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  MC
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: '#20211f' }}>
                      Marcus Chen
                    </Typography>
                    <Chip
                      label="Tier-2 SRE"
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        bgcolor: '#eee7d9',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#ba1a1a', fontWeight: 700, fontSize: 12 }}>
                    <WarningIcon sx={{ fontSize: 15 }} />
                    <span>4 of 5 tickets allocated (80% Capacity - Near Cap)</span>
                  </Box>
                </Box>
              </Box>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#5c5a52', fontWeight: 600 }}>
                Quota: 5 Max
              </Typography>
            </Box>

            {/* Segmented Slots */}
            <Box>
              <Box sx={{ display: 'flex', gap: 0.8, height: 10, mb: 1 }}>
                <Box sx={{ flex: 1, bgcolor: '#1653c7', borderRadius: 1 }} />
                <Box sx={{ flex: 1, bgcolor: '#1653c7', borderRadius: 1 }} />
                <Box sx={{ flex: 1, bgcolor: '#1653c7', borderRadius: 1 }} />
                <Box sx={{ flex: 1, bgcolor: '#ba1a1a', borderRadius: 1, animation: 'pulse 1.2s infinite' }} />
                <Box sx={{ flex: 1, bgcolor: '#d6d0c3', borderRadius: 1 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace', color: '#5c5a52' }}>
                <span>Slot 1 (Active)</span>
                <span>Slot 2 (Active)</span>
                <span>Slot 3 (Active)</span>
                <span style={{ color: '#ba1a1a', fontWeight: 700 }}>Slot 4 (At Risk)</span>
                <span style={{ color: '#6a685f' }}>Slot 5 (Open)</span>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Fast KPI Chips Counter (7 cols) */}
        <Grid item xs={12} lg={7}>
          <Grid container spacing={1.5} sx={{ height: '100%' }}>
            {/* KPI 1: Needs Ack */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#ffdad6',
                  border: '1px solid #ffcdd2',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#ba1a1a', textTransform: 'uppercase' }}>
                    Needs Ack
                  </Typography>
                  <BoltIcon sx={{ fontSize: 18, color: '#ba1a1a' }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#93000a' }}>
                    {needsAckCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ba1a1a' }}>
                    Critical
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#5c5a52' }}>
                  &lt; 10m initial response
                </Typography>
              </Paper>
            </Grid>

            {/* KPI 2: At-Risk SLAs */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#e5eaf4',
                  border: '1px solid #cbd5e1',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#5c5a52', textTransform: 'uppercase' }}>
                    SLA &lt;25%
                  </Typography>
                  <ErrorOutlineIcon sx={{ fontSize: 18, color: '#ba1a1a' }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#ba1a1a' }}>
                    {atRiskCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5c5a52' }}>
                    Tickets
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#ba1a1a', fontWeight: 700 }}>
                  Immediate action
                </Typography>
              </Paper>
            </Grid>

            {/* KPI 3: In Progress */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#fffcf5',
                  border: '1px solid #cbd5e1',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#5c5a52', textTransform: 'uppercase' }}>
                    In Progress
                  </Typography>
                  <SyncIcon sx={{ fontSize: 18, color: '#1653c7' }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#20211f' }}>
                    {inProgressCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5c5a52' }}>
                    Assigned
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#5c5a52' }}>
                  SLA healthy: 1
                </Typography>
              </Paper>
            </Grid>

            {/* KPI 4: Pending Info */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: '#fffcf5',
                  border: '1px solid #cbd5e1',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#5c5a52', textTransform: 'uppercase' }}>
                    Pending Info
                  </Typography>
                  <PauseCircleIcon sx={{ fontSize: 18, color: '#1653c7' }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#20211f' }}>
                    {pendingInfoCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#5c5a52' }}>
                    Paused
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#1653c7', fontWeight: 600 }}>
                  Clock frozen
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 3. FILTER CONTROLS & QUERY MATRIX */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {/* Primary Filter Tabs + Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            borderBottom: '1px solid #d6d0c3',
            pb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: '#eee7d9', p: 0.5, borderRadius: 2 }}>
            {(
              [
                { id: 'ALL', label: 'All Active', count: queue.length, bg: '#1653c7', text: '#fffcf5' },
                { id: 'NEEDS_ACK', label: 'Needs Acknowledgment', count: needsAckCount, bg: '#ba1a1a', text: '#fffcf5' },
                { id: 'AT_RISK', label: 'At-Risk SLAs (<25%)', count: atRiskCount, bg: '#ffdad6', text: '#93000a' },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount, bg: '#e5eaf4', text: '#5c5a52' },
                { id: 'PENDING_INFO', label: 'Pending Info', count: pendingInfoCount, bg: '#e5eaf4', text: '#5c5a52' },
              ] as const
            ).map((tab) => {
              const isSelected = filterTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  size="small"
                  onClick={() => setFilterTab(tab.id)}
                  sx={{
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: 12,
                    color: isSelected ? '#1653c7' : '#5c5a52',
                    bgcolor: isSelected ? '#fffcf5' : 'transparent',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.6,
                    textTransform: 'none',
                    '&:hover': { bgcolor: isSelected ? '#fffcf5' : '#e5eaf4' },
                  }}
                >
                  <span>{tab.label}</span>
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 0.8,
                      py: 0.1,
                      borderRadius: 1,
                      bgcolor: tab.bg,
                      color: tab.text,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {tab.count}
                  </Box>
                </Button>
              );
            })}
          </Box>

          <TextField
            id="tech-queue-search"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket, error code, IP..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#6a685f', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', md: 260 },
              '& .MuiOutlinedInput-root': {
                bgcolor: '#fffcf5',
                borderRadius: 2,
                fontSize: 12.5,
                '& fieldset': { borderColor: '#cbd5e1' },
              },
            }}
          />
        </Box>

        {/* Secondary Filter Dropdowns */}
        <Paper
          elevation={0}
          sx={{
            px: 2,
            py: 1.2,
            borderRadius: 2,
            bgcolor: '#eee7d9',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                Service:
              </Typography>
              <Select
                size="small"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                sx={{
                  bgcolor: '#fffcf5',
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              >
                <MenuItem value="ALL">All Services (Active Scope)</MenuItem>
                <MenuItem value="Payment Gateway">Payment Gateway</MenuItem>
                <MenuItem value="Kubernetes Cluster">Kubernetes Cluster</MenuItem>
                <MenuItem value="Corporate VPN">Corporate VPN</MenuItem>
                <MenuItem value="Identity & SSO">Identity &amp; SSO</MenuItem>
                <MenuItem value="Workplace Tools">Workplace Tools</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                Priority:
              </Typography>
              <Select
                size="small"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                sx={{
                  bgcolor: '#fffcf5',
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              >
                <MenuItem value="ALL">All Priorities</MenuItem>
                <MenuItem value="P1">P1 - Critical</MenuItem>
                <MenuItem value="P2">P2 - High</MenuItem>
                <MenuItem value="P3">P3 - Medium</MenuItem>
                <MenuItem value="P4">P4 - Low</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                Tier Scope:
              </Typography>
              <Chip
                label="Tier-2 SRE Direct"
                size="small"
                sx={{
                  height: 22,
                  bgcolor: '#e5eaf4',
                  color: '#20211f',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
              Sort By:
            </Typography>
            <Chip
              label="SLA Breach Margin (Ascending)"
              size="small"
              sx={{
                bgcolor: '#fffcf5',
                border: '1px solid #cbd5e1',
                color: '#ba1a1a',
                fontWeight: 700,
                fontSize: 11.5,
              }}
            />
          </Box>
        </Paper>
      </Box>

      {/* 4. HIGH-DENSITY INCIDENT QUEUE STREAM */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredQueue.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#fffcf5', borderRadius: 3, border: '1px solid #d6d0c3' }}>
            <CheckCircleIcon sx={{ fontSize: 40, color: '#1653c7', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f' }}>
              Zero Matching Incidents in Queue
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#5c5a52' }}>
              All tickets matching this criteria are acknowledged, healthy, or closed.
            </Typography>
          </Paper>
        ) : (
          filteredQueue.map((inc) => {
            const isCritical = inc.priority === 'P1';
            const isHigh = inc.priority === 'P2';
            const isAtRisk = inc.breachStatus === 'critical' || inc.breachStatus === 'warning';
            const isPaused = inc.status === 'PENDING_USER_INFO';

            return (
              <Paper
                key={inc.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '1px solid #cbd5e1',
                  borderLeft: isCritical ? '5px solid #ba1a1a' : isHigh ? '5px solid #1653c7' : '1px solid #cbd5e1',
                  bgcolor: isPaused ? '#eee7d9' : '#fffcf5',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    borderColor: '#94a3b8',
                  },
                }}
              >
                {/* Upper Metadata & Title */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    alignItems: { xs: 'flex-start', lg: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ maxWidth: 880 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Chip
                        label={
                          isCritical ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#ba1a1a', animation: 'pulse 1s infinite' }} />
                              P1 CRITICAL
                            </Box>
                          ) : (
                            `${inc.priority} ${isHigh ? 'HIGH' : 'MEDIUM'}`
                          )
                        }
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: 10.5,
                          height: 22,
                          bgcolor: isCritical ? '#ffdad6' : '#d9e2ff',
                          color: isCritical ? '#93000a' : '#001945',
                          borderRadius: 1,
                        }}
                      />
                      <Typography
                        onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#1653c7',
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {inc.id}
                      </Typography>
                      <Chip
                        label={inc.serviceTag}
                        size="small"
                        sx={{
                          bgcolor: '#e5eaf4',
                          color: '#5c5a52',
                          fontWeight: 700,
                          fontSize: 10.5,
                          height: 20,
                          textTransform: 'uppercase',
                        }}
                      />
                      <Typography sx={{ fontSize: 12, color: '#5c5a52' }}>
                        Reported by {inc.reporter} · {inc.reportedTimeAgo}
                      </Typography>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f', letterSpacing: '-0.01em', mb: 0.5, fontSize: 17 }}>
                      {inc.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', fontSize: 12, color: '#5c5a52' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isCritical ? '#ba1a1a' : '#5c5a52', fontWeight: isCritical ? 600 : 400 }}>
                        <ErrorOutlineIcon sx={{ fontSize: 15 }} />
                        <span>{inc.details}</span>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DnsIcon sx={{ fontSize: 15, color: '#6a685f' }} />
                        <span>{inc.node}</span>
                      </Box>
                    </Box>
                  </Box>

                  {/* Real-time Countdown & SLA Meter */}
                  <Box sx={{ minWidth: { lg: 220 }, textAlign: { lg: 'right' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: { lg: 'flex-end' } }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: isAtRisk ? '#ba1a1a' : '#5c5a52', textTransform: 'uppercase' }}>
                        {isPaused ? 'SLA Status:' : 'Breach Window:'}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 16,
                          fontWeight: 800,
                          color: isAtRisk ? '#ba1a1a' : isPaused ? '#1653c7' : '#1653c7',
                          animation: inc.breachStatus === 'critical' ? 'pulse 1s infinite' : 'none',
                        }}
                      >
                        {inc.breachWindow}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={inc.breachPercent}
                      sx={{
                        my: 0.8,
                        height: 6,
                        borderRadius: 2,
                        bgcolor: '#d6d0c3',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isAtRisk ? '#ba1a1a' : isPaused ? '#759efd' : '#1653c7',
                        },
                      }}
                    />
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: isAtRisk ? '#ba1a1a' : '#5c5a52', fontWeight: 600 }}>
                      {isPaused ? 'Clock frozen · Awaiting user logs' : `${inc.breachPercent}% time remaining (Ack Target)`}
                    </Typography>
                  </Box>
                </Box>

                {/* Workflow Action Bar */}
                <Box
                  sx={{
                    pt: 1.5,
                    borderTop: '1px solid #d6d0c3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {inc.runbookML && (
                      <Chip
                        icon={<AutoFixHighIcon sx={{ fontSize: '14px !important', color: '#1653c7 !important' }} />}
                        label={`ML Match: ${inc.runbookML}`}
                        size="small"
                        sx={{
                          bgcolor: '#e5eaf4',
                          color: '#1653c7',
                          fontWeight: 700,
                          fontSize: 11,
                          height: 22,
                        }}
                      />
                    )}
                    {inc.warRoom && (
                      <Chip
                        icon={<GroupsIcon sx={{ fontSize: '14px !important', color: '#93000a !important' }} />}
                        label={inc.warRoom}
                        size="small"
                        sx={{
                          bgcolor: '#ffdad6',
                          color: '#93000a',
                          fontWeight: 700,
                          fontSize: 11,
                          height: 22,
                        }}
                      />
                    )}
                    <Typography sx={{ fontSize: 11.5, color: '#64748b' }}>
                      Tier-2 escalation dispatched by PagerDuty
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {inc.status === 'NEEDS_ACK' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAcknowledge(inc.id)}
                        startIcon={<BoltIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: '#ba1a1a',
                          color: '#fffcf5',
                          fontWeight: 800,
                          fontSize: 12.5,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { bgcolor: '#93000a' },
                        }}
                      >
                        Acknowledge Ticket
                      </Button>
                    )}

                    {inc.warRoom && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setWarRoomIncident(inc)}
                        startIcon={<VideoCameraFrontIcon sx={{ fontSize: 16, color: '#ba1a1a' }} />}
                        sx={{
                          borderColor: '#cbd5e1',
                          color: '#20211f',
                          fontWeight: 600,
                          fontSize: 12,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#eee7d9' },
                        }}
                      >
                        Join War Room
                      </Button>
                    )}

                    <Button
                      size="small"
                      onClick={() => setNoteModalIncident(inc)}
                      startIcon={<EditNoteIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        bgcolor: '#eee7d9',
                        color: '#20211f',
                        fontWeight: 600,
                        fontSize: 12,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#e5eaf4' },
                      }}
                    >
                      Log Note
                    </Button>

                    {!isPaused && inc.status !== 'NEEDS_ACK' && (
                      <Button
                        size="small"
                        onClick={() => setRequestInfoIncident(inc)}
                        startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          bgcolor: '#eee7d9',
                          color: '#20211f',
                          fontWeight: 600,
                          fontSize: 12,
                          borderRadius: 1.5,
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#e5eaf4' },
                        }}
                      >
                        Request Info
                      </Button>
                    )}

                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        bgcolor: '#1653c7',
                        color: '#fffcf5',
                        fontWeight: 700,
                        fontSize: 12.5,
                        borderRadius: 1.5,
                        textTransform: 'none',
                        boxShadow: 'none',
                        '&:hover': { bgcolor: '#00337c' },
                      }}
                    >
                      Open Workbench
                    </Button>

                    <Button
                      size="small"
                      onClick={() => setReassignIncident(inc)}
                      sx={{
                        color: '#5c5a52',
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#eee7d9' },
                      }}
                    >
                      Reassign
                    </Button>
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* DIALOG 1: LOG NOTE */}
      <Dialog
        open={Boolean(noteModalIncident)}
        onClose={() => setNoteModalIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {noteModalIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#1653c7' }}>
                  SRE INTERNAL WORKBENCH // {noteModalIncident.id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f', fontSize: 16 }}>
                  Append Investigation Note
                </Typography>
              </Box>
              <IconButton onClick={() => setNoteModalIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Typography sx={{ fontSize: 13, color: '#5c5a52', mb: 1.5 }}>
                {noteModalIncident.title}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log diagnostic findings, root cause analysis hypothesis, or deployment timestamps..."
                sx={{
                  bgcolor: '#f5f0e5',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setNoteModalIncident(null)} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
              >
                Save to Incident Timeline
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 2: REQUEST INFO / PAUSE SLA */}
      <Dialog
        open={Boolean(requestInfoIncident)}
        onClose={() => setRequestInfoIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {requestInfoIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: '#1653c7' }}>
                  CLARIFICATION REQUEST // {requestInfoIncident.id}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f', fontSize: 16 }}>
                  Request Information from Reporter
                </Typography>
              </Box>
              <IconButton onClick={() => setRequestInfoIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Paper sx={{ p: 1.8, bgcolor: '#eee7d9', border: '1px solid #cbd5e1', borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                  Reporter: {requestInfoIncident.reporter}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: '#5c5a52', mt: 0.5 }}>
                  Submitting this request will automatically freeze the SLA countdown clock until the employee provides the requested diagnostics.
                </Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={requestInfoText}
                onChange={(e) => setRequestInfoText(e.target.value)}
                placeholder="Specify the log file, screenshot, or reproduction steps required..."
                sx={{
                  bgcolor: '#f5f0e5',
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setRequestInfoIncident(null)} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendInfoRequest}
                disabled={!requestInfoText.trim()}
                sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
              >
                Send Request &amp; Pause Clock
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 3: WAR ROOM MODAL */}
      <Dialog
        open={Boolean(warRoomIncident)}
        onClose={() => setWarRoomIncident(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {warRoomIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f', fontSize: 16 }}>
                Active Incident War Room
              </Typography>
              <IconButton onClick={() => setWarRoomIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2.5, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#ffdad6',
                  color: '#93000a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 1.5,
                }}
              >
                <VideoCameraFrontIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: '#20211f', mb: 0.5 }}>
                War Room #09 (Bridge Active)
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#5c5a52', mb: 2 }}>
                7 active participants (SRE Lead, Infra On-Call, Database Architect, Product Reliability).
              </Typography>
              <Paper sx={{ p: 1.5, bgcolor: '#eee7d9', borderRadius: 2 }}>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#1653c7' }}>
                  BRIDGE: https://meet.iitsm.internal/war-room-09
                </Typography>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  toast('Bridged into War Room #09 audio & screen share.', 'success');
                  setWarRoomIncident(null);
                }}
                sx={{ bgcolor: '#ba1a1a', textTransform: 'none', fontWeight: 700 }}
              >
                Connect to Bridge
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 4: REASSIGN MODAL */}
      <Dialog
        open={Boolean(reassignIncident)}
        onClose={() => setReassignIncident(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {reassignIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#20211f', fontSize: 16 }}>
                Reassign Incident {reassignIncident.id}
              </Typography>
              <IconButton onClick={() => setReassignIncident(null)} size="small">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2 }}>
              <Typography sx={{ fontSize: 13, color: '#5c5a52', mb: 2 }}>
                Select target technician squad or escalation tier:
              </Typography>
              <Select
                fullWidth
                size="small"
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                sx={{ bgcolor: '#f5f0e5', borderRadius: 2 }}
              >
                <MenuItem value="SRE Team Lead (Level 1 Escalation)">SRE Team Lead (Level 1 Escalation)</MenuItem>
                <MenuItem value="SecOps Tier-2 Incident Squad">SecOps Tier-2 Incident Squad</MenuItem>
                <MenuItem value="Kubernetes Core Platform Fleet">Kubernetes Core Platform Fleet</MenuItem>
                <MenuItem value="Database Reliability Engineering">Database Reliability Engineering</MenuItem>
              </Select>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReassignIncident(null)} sx={{ textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleReassign}
                sx={{ bgcolor: '#1653c7', textTransform: 'none', fontWeight: 700 }}
              >
                Confirm Transfer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

