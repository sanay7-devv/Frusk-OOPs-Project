import { useState, useId } from 'react';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  Hub as HubIcon,
  AutoAwesome as AutoAwesomeIcon,
  PendingActions as PendingActionsIcon,
  Speed as SpeedIcon,
  Badge as BadgeIcon,
  Psychology as PsychologyIcon,
  Download as DownloadIcon,
  Balance as BalanceIcon,
  FilterList as FilterListIcon,
  Timer as TimerIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ForwardToInbox as ForwardToInboxIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingUpIcon,
  VerifiedUser as VerifiedUserIcon,
  UnfoldMore as UnfoldMoreIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  CrisisAlert as CrisisAlertIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';

// Design System Tokens (Reliant Slate)
const COLORS = {
  surface: '#f9f9ff',
  surfaceContainerLowest: '#fffcf5',
  surfaceContainerLow: '#eee7d9',
  surfaceContainer: '#e5eaf4',
  surfaceContainerHigh: '#e5eaf4',
  surfaceContainerHighest: '#d8e3fb',
  onSurface: '#20211f',
  onSurfaceVariant: '#5c5a52',
  outlineVariant: '#c2c6d4',
  border: '#cbd5e1',
  primary: '#1653c7',
  primaryContainer: '#1653c7',
  secondary: '#1653c7',
  secondaryContainer: '#759efd',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  success: '#107c41',
};

interface TeamIncident {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  service: string;
  serviceTag: string;
  tier: string;
  summary: string;
  slaType: 'Response' | 'Resolution';
  slaCountdown: string;
  slaCritical?: boolean;
  requiredSkills: string[];
  caller: string;
  reportedTimeAgo: string;
  recommendedAssignee: {
    name: string;
    initials: string;
    role: string;
    matchScore: number;
    activeSlots: number;
    maxSlots: number;
    domainCompetency: string;
    concurrencySafety: string;
    historicMttr: string;
  };
  altCandidates: {
    name: string;
    initials: string;
    role: string;
    load: string;
    matchScore: number;
    nearCap?: boolean;
  }[];
}

const INITIAL_TEAM_QUEUE: TeamIncident[] = [
  {
    id: 'INC-2026-00112',
    priority: 'P1',
    title: 'Stripe Webhook Delivery Failures & 502 Bad Gateway Spike',
    service: 'Billing & Ingress API',
    serviceTag: 'Core Payments Ingress',
    tier: 'Tier-1 Gateway',
    summary:
      'Cluster ingress controllers reporting 40% drops on inbound /v2/payments payloads. Microservices queue backpressure detected.',
    slaType: 'Response',
    slaCountdown: '08m 42s',
    slaCritical: true,
    requiredSkills: ['Node.js', 'Payment Ingress', 'API Gateway'],
    caller: 'Kevin Torres (SecOps)',
    reportedTimeAgo: '6m ago',
    recommendedAssignee: {
      name: 'Marcus Chen',
      initials: 'MC',
      role: 'Tier-2 SRE · Payment Ingress Specialist',
      matchScore: 96,
      activeSlots: 3,
      maxSlots: 5,
      domainCompetency: '98% in Payment Ingress & API Gateways (18 similar incidents resolved)',
      concurrencySafety: 'Well within standard lead threshold (60% load)',
      historicMttr: '24m on Billing 502 outages (-14m vs team average)',
    },
    altCandidates: [
      { name: 'Sarah Lin', initials: 'SL', role: 'Senior DevOps', load: '2/5 (40%)', matchScore: 88 },
      { name: 'Alex Rivera', initials: 'AR', role: 'SecOps', load: '4/5 (80% - Near Cap)', matchScore: 74, nearCap: true },
    ],
  },
  {
    id: 'INC-2026-00110',
    priority: 'P1',
    title: 'Okta SCIM User Provisioning Sync Deadlock on US-West',
    service: 'Core Auth & Identity',
    serviceTag: 'Identity & SSO',
    tier: 'Enterprise IdP',
    summary:
      'Automated directory synchronization thread blocked on table lock in auth metadata store.',
    slaType: 'Response',
    slaCountdown: '15m 18s',
    slaCritical: true,
    requiredSkills: ['Identity & SSO', 'Okta SCIM', 'PostgreSQL'],
    caller: 'Liam Chen (IAM)',
    reportedTimeAgo: '14m ago',
    recommendedAssignee: {
      name: 'Priya Patel',
      initials: 'PP',
      role: 'IAM Lead Specialist',
      matchScore: 94,
      activeSlots: 1,
      maxSlots: 5,
      domainCompetency: '96% in SCIM & Active Directory Provisioning',
      concurrencySafety: 'Low current active concurrency (20% load)',
      historicMttr: '19m on Auth sync locks',
    },
    altCandidates: [
      { name: 'Marcus Chen', initials: 'MC', role: 'Tier-2 SRE', load: '3/5 (60%)', matchScore: 82 },
      { name: 'Sarah Lin', initials: 'SL', role: 'Senior DevOps', load: '2/5 (40%)', matchScore: 78 },
    ],
  },
  {
    id: 'INC-2026-00109',
    priority: 'P2',
    title: 'Calico CNI IP Pool Exhaustion on Prod EKS Cluster #04',
    service: 'Kubernetes Cluster Fleet',
    serviceTag: 'K8s Core Mesh',
    tier: 'Infrastructure',
    summary:
      'Pod scheduling throttled across node group B. Subnet CIDR allocation limit reached.',
    slaType: 'Resolution',
    slaCountdown: '1h 45m',
    requiredSkills: ['Kubernetes Core', 'Container Networking'],
    caller: 'DataDog Telemetry',
    reportedTimeAgo: '22m ago',
    recommendedAssignee: {
      name: 'Sarah Lin',
      initials: 'SL',
      role: 'Senior DevOps / K8s Specialist',
      matchScore: 95,
      activeSlots: 2,
      maxSlots: 5,
      domainCompetency: '99% in Kubernetes Mesh & Calico CNI Pools',
      concurrencySafety: 'Optimal load (40% capacity used)',
      historicMttr: '31m on CNI subnet reclaims',
    },
    altCandidates: [
      { name: 'David Miller', initials: 'DM', role: 'DevOps Engineer', load: '3/5 (60%)', matchScore: 86 },
      { name: 'Marcus Chen', initials: 'MC', role: 'Tier-2 SRE', load: '3/5 (60%)', matchScore: 79 },
    ],
  },
  {
    id: 'INC-2026-00105',
    priority: 'P2',
    title: 'Long-Running Analytical Query Locking Catalog Replica',
    service: 'PostgreSQL Database Cluster',
    serviceTag: 'Database Tier',
    tier: 'Storage Infrastructure',
    summary:
      'Read replication lag exceeding 420 seconds. Master WAL logs accumulating rapidly.',
    slaType: 'Resolution',
    slaCountdown: '2h 10m',
    requiredSkills: ['PostgreSQL', 'Query Optimization'],
    caller: 'Finance Analytics',
    reportedTimeAgo: '35m ago',
    recommendedAssignee: {
      name: 'Elena Vance',
      initials: 'EV',
      role: 'Senior Database Reliability Engineer',
      matchScore: 92,
      activeSlots: 2,
      maxSlots: 5,
      domainCompetency: '95% in PostgreSQL Lock contention & Replication tuning',
      concurrencySafety: 'Healthy queue bandwidth (40% load)',
      historicMttr: '28m on WAL catchup procedures',
    },
    altCandidates: [
      { name: 'Marcus Chen', initials: 'MC', role: 'Tier-2 SRE', load: '3/5 (60%)', matchScore: 84 },
      { name: 'David Miller', initials: 'DM', role: 'DevOps Engineer', load: '3/5 (60%)', matchScore: 71 },
    ],
  },
  {
    id: 'INC-2026-00098',
    priority: 'P3',
    title: 'DNS Resolution Intermittent Drop on macOS Sequoia Clients',
    service: 'Corporate GlobalProtect VPN',
    serviceTag: 'Corporate Network',
    tier: 'Network Edge',
    summary:
      'Internal split tunnel resolving corporate DNS records with timeouts following MDM profile upgrade.',
    slaType: 'Resolution',
    slaCountdown: '3h 30m',
    requiredSkills: ['Network Routing', 'macOS MDM'],
    caller: 'Internal Helpdesk',
    reportedTimeAgo: '48m ago',
    recommendedAssignee: {
      name: 'Alex Rivera',
      initials: 'AR',
      role: 'SecOps Network Specialist',
      matchScore: 89,
      activeSlots: 4,
      maxSlots: 5,
      domainCompetency: '91% in GlobalProtect & Corporate DNS routing',
      concurrencySafety: 'Near capacity (80% load - lead review recommended)',
      historicMttr: '45m on MDM VPN route configurations',
    },
    altCandidates: [
      { name: 'Sarah Lin', initials: 'SL', role: 'Senior DevOps', load: '2/5 (40%)', matchScore: 81 },
      { name: 'David Miller', initials: 'DM', role: 'DevOps Engineer', load: '3/5 (60%)', matchScore: 75 },
    ],
  },
];

export default function TeamQueue() {
  const navigate = useNavigate();
  const toast = useToast();

  const [queue, setQueue] = useState<TeamIncident[]>(INITIAL_TEAM_QUEUE);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-2026-00112');
  const [filterTab, setFilterTab] = useState<'ALL' | 'P1' | 'P2' | 'SKILLS' | 'AUTO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [isRebalancingOpen, setIsRebalancingOpen] = useState(false);
  const [manualDelegatePool, setManualDelegatePool] = useState('');
  const [notifySlack, setNotifySlack] = useState(true);
  const [attachRunbook, setAttachRunbook] = useState(true);

  const selectedIncident = queue.find((inc) => inc.id === selectedIncidentId) || queue[0];

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
  };

  const handleAssignIncident = (incidentId: string, assigneeName: string) => {
    toast(`Ticket ${incidentId} dispatched to ${assigneeName}. Quota reserved & Slack alert triggered.`, 'success');
  };

  const handleAutoAssignAll = () => {
    setIsAutoAssigning(true);
    setTimeout(() => {
      setIsAutoAssigning(false);
      toast('All 6 eligible unassigned tickets successfully auto-dispatched via ITIL ML scoring!', 'success');
    }, 1200);
  };

  const handleExportCSV = () => {
    toast('Team queue roster exported to team-triage-roster.csv', 'info');
  };

  const handleRebalance = () => {
    setIsRebalancingOpen(false);
    toast('Workload rebalancing completed. Concurrency leveled across 6 on-duty engineers.', 'success');
  };

  const filteredQueue = queue.filter((inc) => {
    if (filterTab === 'P1' && inc.priority !== 'P1') return false;
    if (filterTab === 'P2' && inc.priority !== 'P2') return false;
    if (filterTab === 'SKILLS' && inc.requiredSkills.length === 0) return false;
    if (filterTab === 'AUTO' && inc.recommendedAssignee.matchScore < 90) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        inc.id.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        inc.service.toLowerCase().includes(q) ||
        inc.caller.toLowerCase().includes(q) ||
        inc.requiredSkills.some((s) => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Breadcrumb & Control Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: COLORS.onSurfaceVariant,
              cursor: 'pointer',
              '&:hover': { color: COLORS.primary },
            }}
          >
            Team Lead Portal
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>Team Queue</Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: COLORS.onSurfaceVariant }} />
          <Chip
            size="small"
            label="POD-AMER-L1"
            sx={{
              fontFamily: 'monospace',
              fontSize: 11,
              bgcolor: COLORS.surfaceContainerHighest,
              color: COLORS.onSurfaceVariant,
              height: 20,
              fontWeight: 700,
            }}
          />
        </Box>

        {/* Title and Global Dispatch Actions */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', lg: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: 22, md: 26 },
                  fontWeight: 700,
                  color: COLORS.onSurface,
                  letterSpacing: '-0.02em',
                }}
              >
                Team Triage &amp; Intelligent Allocation Queue
              </Typography>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.secondary, animation: 'pulse 1.5s infinite' }} />
                    LIVE SYNC 3s
                  </Box>
                }
                sx={{
                  bgcolor: '#d9e2ff',
                  color: '#001945',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, maxWidth: 840 }}>
              Real-time unassigned and incoming team tickets. Algorithmic skill matching, concurrency quota balancing, and 1-click dispatch.
            </Typography>
          </Box>

          {/* Action Cluster */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleExportCSV}
              startIcon={<DownloadIcon sx={{ fontSize: 17, color: COLORS.onSurfaceVariant }} />}
              sx={{
                bgcolor: COLORS.surfaceContainerLow,
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 1.75,
                py: 0.75,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: COLORS.surfaceContainer },
              }}
            >
              Export (CSV)
            </Button>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setIsRebalancingOpen(true)}
              startIcon={<BalanceIcon sx={{ fontSize: 17, color: COLORS.secondary }} />}
              sx={{
                bgcolor: COLORS.surfaceContainerLow,
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 1.75,
                py: 0.75,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: COLORS.surfaceContainer },
              }}
            >
              Rebalance Shift Workload
            </Button>

            <Button
              variant="contained"
              size="small"
              disabled={isAutoAssigning}
              onClick={handleAutoAssignAll}
              startIcon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: COLORS.primaryContainer,
                color: '#fffcf5',
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 700,
                textTransform: 'none',
                px: 2,
                py: 0.8,
                boxShadow: '0 2px 6px rgba(21, 101, 192, 0.25)',
                '&:hover': { bgcolor: COLORS.primary },
              }}
            >
              {isAutoAssigning ? 'Dispatching (6)...' : 'Auto-Assign All Eligible (6)'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Metric Summary Banner (4 Bento Cards) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Metric 1: Unassigned Team Queue */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Unassigned Team Queue
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: COLORS.errorContainer, color: COLORS.onErrorContainer, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PendingActionsIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1.5 }}>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>8</Typography>
              <Typography sx={{ fontSize: 12.5, color: COLORS.error, fontWeight: 600 }}>6 immediate triage</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.onSurfaceVariant }}>
              <span>2 On Hold / Pre-flight</span>
              <strong style={{ color: COLORS.onSurface }}>Max SLA: 8m</strong>
            </Box>
          </Paper>
        </Grid>

        {/* Metric 2: Avg Triage Latency (MTTA) */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Avg Triage Latency (MTTA)
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: COLORS.surfaceContainer, color: COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SpeedIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1.5 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>4m 18s</Typography>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, color: COLORS.primary, fontSize: 12, fontWeight: 700 }}>
                <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                <span>1.8m vs target</span>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.onSurfaceVariant }}>
              <span>Shift SLA: 6m 00s</span>
              <strong style={{ color: COLORS.primary }}>98.2% in SLA</strong>
            </Box>
          </Paper>
        </Grid>

        {/* Metric 3: Active Shift Engineers */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Active Shift Engineers
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: COLORS.surfaceContainer, color: COLORS.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BadgeIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1.5 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>6 Online</Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontWeight: 500 }}>Americas-East</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.onSurfaceVariant }}>
              <span style={{ color: COLORS.primary, fontWeight: 600 }}>4 Available (Free)</span>
              <span style={{ color: COLORS.error, fontWeight: 600 }}>2 Near Cap (&gt;80%)</span>
            </Box>
          </Paper>
        </Grid>

        {/* Metric 4: Composite Match Accuracy */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Composite Match Accuracy
              </Typography>
              <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#d6e3ff', color: '#001b3d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PsychologyIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1.5 }}>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: COLORS.primary, lineHeight: 1 }}>94.8%</Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>Acceptance Rate</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, fontFamily: 'monospace', color: COLORS.onSurfaceVariant }}>
              <span>ITIL v4 Dispatch</span>
              <strong style={{ color: COLORS.primary }}>1-Click High Conf.</strong>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Split Workspace Layout (60% Left / 40% Right) */}
      <Grid container spacing={2.5} alignItems="flex-start">
        {/* LEFT PANEL (60% ~ 7 cols): Unassigned & Incoming Incidents Table */}
        <Grid item xs={12} lg={7}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Filter, Search and Urgency Toolbar */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, alignItems: 'center', mb: 1.5 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Filter tickets by title, error code, CI, or caller..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterListIcon sx={{ fontSize: 18, color: COLORS.onSurfaceVariant }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Chip size="small" label="⌘K" sx={{ height: 20, fontSize: 10, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ bgcolor: COLORS.surfaceContainerLow, borderRadius: 2 }}
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, shrink: 0 }}>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>Sort:</Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowUpwardIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: COLORS.onSurface,
                      bgcolor: COLORS.surfaceContainerLow,
                      textTransform: 'none',
                      borderRadius: 1.5,
                      px: 1.25,
                    }}
                  >
                    SLA Urgency
                  </Button>
                </Box>
              </Box>

              {/* Filter Quick Tabs */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {[
                  { key: 'ALL', label: 'All Unassigned (8)' },
                  { key: 'P1', label: 'P1 Critical (2)', color: COLORS.errorContainer, textColor: COLORS.onErrorContainer },
                  { key: 'P2', label: 'P2 High (3)' },
                  { key: 'SKILLS', label: 'Domain Skill Required (4)' },
                  { key: 'AUTO', label: 'Auto-Triaged (5)' },
                ].map((tab) => {
                  const isActive = filterTab === tab.key;
                  return (
                    <Chip
                      key={tab.key}
                      size="small"
                      clickable
                      onClick={() => setFilterTab(tab.key as any)}
                      label={tab.label}
                      sx={{
                        fontSize: 11.5,
                        fontWeight: isActive ? 700 : 500,
                        bgcolor: isActive ? COLORS.primaryContainer : tab.color || COLORS.surfaceContainer,
                        color: isActive ? '#fffcf5' : tab.textColor || COLORS.onSurface,
                        height: 24,
                        '&:hover': {
                          bgcolor: isActive ? COLORS.primary : COLORS.surfaceContainerHigh,
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>

            {/* Ticket Queue Cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {filteredQueue.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                return (
                  <Paper
                    key={inc.id}
                    elevation={0}
                    onClick={() => handleSelectIncident(inc.id)}
                    sx={{
                      p: 2,
                      bgcolor: COLORS.surfaceContainerLowest,
                      borderRadius: 3,
                      border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                      boxShadow: isSelected ? '0 4px 16px rgba(0, 77, 153, 0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    {/* Left Accent Strip */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 5,
                        borderTopLeftRadius: 12,
                        borderBottomLeftRadius: 12,
                        bgcolor: inc.priority === 'P1' ? COLORS.error : inc.priority === 'P2' ? COLORS.secondaryContainer : COLORS.outlineVariant,
                      }}
                    />

                    {/* Top Row: Badges & SLA Countdown */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1, pl: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        {inc.priority === 'P1' ? (
                          <Chip
                            size="small"
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                                P1 CRITICAL
                              </Box>
                            }
                            sx={{
                              bgcolor: COLORS.errorContainer,
                              color: COLORS.onErrorContainer,
                              fontSize: 10.5,
                              fontWeight: 800,
                              height: 22,
                            }}
                          />
                        ) : inc.priority === 'P2' ? (
                          <Chip
                            size="small"
                            label="P2 HIGH"
                            sx={{
                              bgcolor: COLORS.surfaceContainerHigh,
                              color: COLORS.secondary,
                              fontSize: 10.5,
                              fontWeight: 700,
                              height: 22,
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="P3 MEDIUM"
                            sx={{
                              bgcolor: COLORS.surfaceContainer,
                              color: COLORS.onSurfaceVariant,
                              fontSize: 10.5,
                              fontWeight: 700,
                              height: 22,
                            }}
                          />
                        )}

                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                          {inc.id}
                        </Typography>

                        <Chip
                          size="small"
                          label={inc.service}
                          sx={{
                            bgcolor: COLORS.surfaceContainer,
                            color: COLORS.onSurfaceVariant,
                            fontSize: 11,
                            height: 22,
                          }}
                        />

                        <Chip
                          size="small"
                          label={inc.tier}
                          sx={{
                            bgcolor: COLORS.surfaceContainerHighest,
                            color: COLORS.onSurfaceVariant,
                            fontFamily: 'monospace',
                            fontSize: 10,
                            height: 20,
                          }}
                        />
                      </Box>

                      {/* SLA Countdown Badge */}
                      <Box sx={{ textAlign: 'right', shrink: 0 }}>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontFamily: 'monospace',
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: inc.slaCritical ? COLORS.error : COLORS.primary,
                            bgcolor: inc.slaCritical ? 'rgba(255, 218, 214, 0.6)' : COLORS.surfaceContainer,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                          }}
                        >
                          {inc.slaCritical ? <TimerIcon sx={{ fontSize: 14 }} /> : <ScheduleIcon sx={{ fontSize: 14 }} />}
                          <span>{inc.slaCountdown}</span>
                        </Box>
                        <Typography sx={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', mt: 0.25 }}>
                          {inc.slaType} SLA
                        </Typography>
                      </Box>
                    </Box>

                    {/* Title & Context */}
                    <Box sx={{ pl: 1, mb: 1.5 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.3, mb: 0.5 }}>
                        {inc.title}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 1.4 }}>
                        {inc.summary}
                      </Typography>
                    </Box>

                    {/* Metadata & Tags */}
                    <Box
                      sx={{
                        pl: 1,
                        pt: 1,
                        borderTop: `1px solid ${COLORS.surfaceContainer}`,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                      }}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
                        <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>Required:</Typography>
                        {inc.requiredSkills.map((sk) => (
                          <Chip
                            key={sk}
                            size="small"
                            label={sk}
                            sx={{
                              height: 19,
                              fontSize: 10.5,
                              fontFamily: 'monospace',
                              bgcolor: COLORS.surfaceContainer,
                              color: COLORS.onSurface,
                            }}
                          />
                        ))}
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14 }} />
                          <span>{inc.caller}</span>
                        </Box>
                        <span>•</span>
                        <span style={{ fontFamily: 'monospace' }}>{inc.reportedTimeAgo}</span>
                        {isSelected && (
                          <Chip
                            size="small"
                            label="SELECTED FOR ALLOCATION"
                            sx={{
                              bgcolor: '#d6e3ff',
                              color: '#001b3d',
                              fontWeight: 700,
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        </Grid>

        {/* RIGHT PANEL (40% ~ 5 cols): AI Assignment Match Inspector */}
        <Grid item xs={12} lg={5} sx={{ position: { lg: 'sticky' }, top: { lg: 84 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {/* Header Ribbon */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                    <Box
                      sx={{
                        width: 26,
                        height: 26,
                        borderRadius: 1.5,
                        bgcolor: COLORS.primaryContainer,
                        color: '#fffcf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PsychologyIcon sx={{ fontSize: 17 }} />
                    </Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: COLORS.onSurface }}>
                      AI Assignment Match Inspector
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                    For <strong style={{ color: COLORS.onSurface }}>{selectedIncident.id}</strong> · {selectedIncident.service}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label="AUTO-SCORED"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 10.5,
                    fontWeight: 700,
                    bgcolor: COLORS.surfaceContainer,
                    color: COLORS.primary,
                    height: 22,
                  }}
                />
              </Box>

              {/* Optimization Explanation Box */}
              <Box
                sx={{
                  p: 1.25,
                  bgcolor: COLORS.surfaceContainerLow,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: 12,
                  color: COLORS.onSurface,
                }}
              >
                <HubIcon sx={{ fontSize: 18, color: COLORS.primary, shrink: 0 }} />
                <span>
                  <strong>ITIL v4 Multi-Criteria Optimization active:</strong> Balancing real-time skill score, shift concurrency quotas, and historical MTTR.
                </span>
              </Box>

              {/* CANDIDATE #1 (RANK 1 - TOP MATCH) */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(222, 232, 255, 0.45)',
                  border: `1px solid ${COLORS.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ position: 'relative' }}>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          bgcolor: COLORS.primary,
                          color: '#fffcf5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {selectedIncident.recommendedAssignee.initials}
                      </Box>
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: COLORS.secondary,
                          border: '2px solid #fffcf5',
                        }}
                        title="Online & Available"
                      />
                    </Box>

                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface }}>
                          {selectedIncident.recommendedAssignee.name}
                        </Typography>
                        <Chip
                          size="small"
                          label="RANK 1"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            bgcolor: '#d6e3ff',
                            color: '#001b3d',
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                        {selectedIncident.recommendedAssignee.role}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Match Score Pill */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 0.5,
                      px: 1.25,
                      py: 0.5,
                      bgcolor: '#fffcf5',
                      borderRadius: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: COLORS.primary, lineHeight: 1 }}>
                      {selectedIncident.recommendedAssignee.matchScore}%
                    </Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>
                      Match
                    </Typography>
                  </Box>
                </Box>

                {/* Capacity Bar */}
                <Box sx={{ p: 1.25, bgcolor: 'rgba(255,255,255,0.85)', borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, mb: 0.75 }}>
                    <span style={{ textTransform: 'uppercase', color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 10.5 }}>
                      Shift Ticket Concurrency
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: COLORS.onSurface }}>
                      {selectedIncident.recommendedAssignee.activeSlots} / {selectedIncident.recommendedAssignee.maxSlots} Active (
                      {selectedIncident.recommendedAssignee.maxSlots - selectedIncident.recommendedAssignee.activeSlots} Slots Free)
                    </span>
                  </Box>
                  <Box sx={{ width: '100%', height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        height: '100%',
                        width: `${(selectedIncident.recommendedAssignee.activeSlots / selectedIncident.recommendedAssignee.maxSlots) * 100}%`,
                        bgcolor: COLORS.primary,
                        borderRadius: 10,
                      }}
                    />
                  </Box>
                </Box>

                {/* AI Rationale Bullets */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: 12 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <VerifiedIcon sx={{ fontSize: 16, color: COLORS.primary, mt: 0.25, shrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurface, lineHeight: 1.3 }}>
                      <strong>Domain Competency:</strong> {selectedIncident.recommendedAssignee.domainCompetency}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: COLORS.primary, mt: 0.25, shrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurface, lineHeight: 1.3 }}>
                      <strong>Concurrency Safety:</strong> {selectedIncident.recommendedAssignee.concurrencySafety}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: COLORS.primary, mt: 0.25, shrink: 0 }} />
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurface, lineHeight: 1.3 }}>
                      <strong>Historic MTTR:</strong> {selectedIncident.recommendedAssignee.historicMttr}
                    </Typography>
                  </Box>
                </Box>

                {/* Assign CTA Button */}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleAssignIncident(selectedIncident.id, selectedIncident.recommendedAssignee.name)}
                  startIcon={<ForwardToInboxIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    py: 1,
                    bgcolor: COLORS.primary,
                    color: '#fffcf5',
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'none',
                    borderRadius: 2,
                    boxShadow: '0 2px 6px rgba(0, 77, 153, 0.25)',
                    '&:hover': { bgcolor: COLORS.primaryContainer },
                  }}
                >
                  Assign to {selectedIncident.recommendedAssignee.name} (Recommended)
                </Button>
              </Paper>

              {/* Alternative Shift Candidates */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
                    Alternative Shift Candidates
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 10.5, color: COLORS.onSurfaceVariant }}>
                    Ranked by score
                  </Typography>
                </Box>

                {selectedIncident.altCandidates.map((cand) => (
                  <Box
                    key={cand.name}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: COLORS.surfaceContainerLow,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      '&:hover': { bgcolor: COLORS.surfaceContainer },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          bgcolor: cand.nearCap ? COLORS.errorContainer : '#d9e2ff',
                          color: cand.nearCap ? COLORS.onErrorContainer : '#001945',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          shrink: 0,
                        }}
                      >
                        {cand.initials}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cand.name}
                          </Typography>
                          <Chip
                            size="small"
                            label={`${cand.matchScore}% Match`}
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontFamily: 'monospace',
                              bgcolor: cand.nearCap ? COLORS.errorContainer : COLORS.surfaceContainer,
                              color: cand.nearCap ? COLORS.onErrorContainer : COLORS.onSurfaceVariant,
                            }}
                          />
                        </Box>
                        <Typography sx={{ fontSize: 11, color: cand.nearCap ? COLORS.error : COLORS.onSurfaceVariant, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cand.role} · Load: {cand.load}
                        </Typography>
                      </Box>
                    </Box>

                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleAssignIncident(selectedIncident.id, cand.name)}
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 1.5,
                        py: 0.4,
                        bgcolor: '#fffcf5',
                        borderColor: cand.nearCap ? COLORS.error : COLORS.border,
                        color: cand.nearCap ? COLORS.error : COLORS.onSurface,
                        '&:hover': {
                          bgcolor: cand.nearCap ? COLORS.error : COLORS.primary,
                          color: '#fffcf5',
                          borderColor: cand.nearCap ? COLORS.error : COLORS.primary,
                        },
                      }}
                    >
                      {cand.nearCap ? 'Force Cap' : 'Assign'}
                    </Button>
                  </Box>
                ))}
              </Box>

              {/* Manual Override Delegation Dropdown */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
                  Manual Override Delegation
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  displayEmpty
                  value={manualDelegatePool}
                  onChange={(e) => setManualDelegatePool(e.target.value)}
                  sx={{ fontSize: 12.5, bgcolor: COLORS.surfaceContainerLow }}
                >
                  <MenuItem value="">
                    <em>Select an unlisted engineer / escalation pool...</em>
                  </MenuItem>
                  <MenuItem value="tier3">Tier-3 Platform Systems (On-Call Pager)</MenuItem>
                  <MenuItem value="secops">Security Operations Escalation Rota</MenuItem>
                  <MenuItem value="dba">Database Administration Core Team</MenuItem>
                </Select>

                {/* Checkboxes */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                  <FormControlLabel
                    control={<Checkbox size="small" checked={notifySlack} onChange={(e) => setNotifySlack(e.target.checked)} sx={{ color: COLORS.primary }} />}
                    label={
                      <Typography sx={{ fontSize: 11.5, color: COLORS.onSurface }}>
                        Notify assignee via high-priority Slack webhook &amp; SMS pager
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    control={<Checkbox size="small" checked={attachRunbook} onChange={(e) => setAttachRunbook(e.target.checked)} sx={{ color: COLORS.primary }} />}
                    label={
                      <Typography sx={{ fontSize: 11.5, color: COLORS.onSurface }}>
                        Attach incident runbook <strong style={{ color: COLORS.primary }}>#RB-PAY-502</strong> automatically
                      </Typography>
                    }
                  />
                </Box>
              </Box>
            </Paper>

            {/* Quick Shift Summary Banner at bottom of panel */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: COLORS.surfaceContainerLow,
                border: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerifiedUserIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
                <Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                    Auto-Dispatch Governor Active
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Preventing assignments beyond 5 concurrent tickets
                  </Typography>
                </Box>
              </Box>
              <Chip
                size="small"
                label="100% ENFORCED"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  fontWeight: 800,
                  bgcolor: '#fffcf5',
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Dialog: Rebalance Workload */}
      <Dialog open={isRebalancingOpen} onClose={() => setIsRebalancingOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BalanceIcon sx={{ color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Rebalance Shift Workload</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsRebalancingOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              The governor will analyze all 6 active shift engineers, calculate concurrent ticket burdens, and redistribute low-urgency P3 tickets from overloaded technicians (&gt;80%) to free slots.
            </Typography>
            <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1 }}>Simulated Transfer Actions:</Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurface }}>
                • Transfer INC-2026-00098 from <strong>Alex Rivera (80%)</strong> &rarr; <strong>Sarah Lin (40%)</strong><br />
                • Equalize Marcus Chen at 3/5 slots (60%)<br />
                • Average team load decreases from 64% &rarr; 52%
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsRebalancingOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRebalance} sx={{ textTransform: 'none', bgcolor: COLORS.primary, fontWeight: 700 }}>
            Execute Rebalancing
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

