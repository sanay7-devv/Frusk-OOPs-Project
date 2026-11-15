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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Menu,
} from '@mui/material';
import {
  HourglassTop as HourglassTopIcon,
  Verified as VerifiedIcon,
  Timer as TimerIcon,
  TaskAlt as TaskAltIcon,
  TrendingUp as TrendingUpIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowForward as ArrowForwardIcon,
  Badge as BadgeIcon,
  Psychology as PsychologyIcon,
  SwapHoriz as SwapHorizIcon,
  RingVolume as RingVolumeIcon,
  StackedBarChart as StackedBarChartIcon,
  MilitaryTech as MilitaryTechIcon,
  VerifiedUser as VerifiedUserIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  UnfoldMore as UnfoldMoreIcon,
  ChevronRight as ChevronRightIcon,
  CrisisAlert as CrisisAlertIcon,
  Schedule as ScheduleIcon,
  PauseCircle as PauseCircleIcon,
  Mail as MailIcon,
  Tune as TuneIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
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
  tertiary: '#5c5a52',
  tertiaryContainer: '#d8e7f2',
};

interface SlaCommitment {
  id: string;
  priority: 'P1' | 'P2' | 'P3';
  title: string;
  service: string;
  target: string;
  remainingText: string;
  remainingPercent: number;
  status: 'IN_PROGRESS' | 'WAIT_USER_INFO';
  isImminent?: boolean;
  isPaused?: boolean;
}

const COMMITMENTS: SlaCommitment[] = [
  {
    id: 'INC-2026-00095',
    priority: 'P1',
    title: 'Payment Gateway 504 Timeout',
    service: 'Core Payments Engine',
    target: 'Resolution',
    remainingText: '08m 14s',
    remainingPercent: 14,
    status: 'IN_PROGRESS',
    isImminent: true,
  },
  {
    id: 'INC-2026-00042',
    priority: 'P1',
    title: 'Kubernetes Cluster Latency',
    service: 'Kube-East-Prod Node 04',
    target: 'Resolution',
    remainingText: '14m 19s',
    remainingPercent: 28,
    status: 'IN_PROGRESS',
    isImminent: true,
  },
  {
    id: 'INC-2026-00108',
    priority: 'P2',
    title: 'SSO Login Redirection Loop',
    service: 'Okta IdP Service',
    target: 'Resolution',
    remainingText: '1h 42m',
    remainingPercent: 65,
    status: 'IN_PROGRESS',
  },
  {
    id: 'INC-2026-00088',
    priority: 'P2',
    title: 'VPN Gateway Handshake Error',
    service: 'GlobalProtect Perimeter',
    target: 'Paused (SLA Stop)',
    remainingText: 'Clock Paused',
    remainingPercent: 45,
    status: 'WAIT_USER_INFO',
    isPaused: true,
  },
  {
    id: 'INC-2026-00094',
    priority: 'P3',
    title: 'Jira Cloud Webhook Latency',
    service: 'Developer Integrations',
    target: 'Resolution',
    remainingText: '3h 15m',
    remainingPercent: 82,
    status: 'IN_PROGRESS',
  },
];

const DAILY_DATA = [
  { date: 'Oct 11', volume: 5, slaRate: 97, height: 80, y: 85 },
  { date: 'Oct 12', volume: 7, slaRate: 98, height: 110, y: 55 },
  { date: 'Oct 13', volume: 4, slaRate: 92, height: 65, y: 100 },
  { date: 'Oct 14', volume: 8, slaRate: 99, height: 125, y: 40 },
  { date: 'Oct 15', volume: 6, slaRate: 96, height: 95, y: 70 },
  { date: 'Oct 16', volume: 5, slaRate: 98, height: 80, y: 85 },
  { date: 'Oct 17', volume: 7, slaRate: 99, height: 110, y: 55 },
  { date: 'Oct 18', volume: 6, slaRate: 100, height: 95, y: 70 },
  { date: 'Oct 19', volume: 8, slaRate: 97, height: 125, y: 40 },
  { date: 'Oct 20', volume: 7, slaRate: 99, height: 110, y: 55 },
  { date: 'Oct 21', volume: 5, slaRate: 96, height: 80, y: 85 },
  { date: 'Oct 22', volume: 6, slaRate: 98, height: 95, y: 70 },
  { date: 'Oct 23', volume: 8, slaRate: 100, height: 125, y: 40 },
  { date: 'Today', volume: 7, slaRate: 99, height: 110, y: 55, isToday: true },
];

export default function TechWorkload() {
  const navigate = useNavigate();
  const toast = useToast();
  const barGradientId = useId();
  const lineGlowId = useId();

  // Switcher & Controls
  const [selectedTechnician, setSelectedTechnician] = useState('Marcus Chen');
  const [technicianAnchor, setTechnicianAnchor] = useState<null | HTMLElement>(null);
  const [timeframe, setTimeframe] = useState<'7D' | '14D' | 'MONTH'>('14D');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('2m ago');

  // Modals
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState('Priya Sharma (Tier-2 SRE EMEA)');
  const [handoverNotes, setHandoverNotes] = useState(
    'Shift summary: 4 active tickets in progress. INC-2026-00095 has 8m SLA window remaining; Stripe webhook deadlock runbook step 1 executed.'
  );

  const [isStandbyOpen, setIsStandbyOpen] = useState(false);

  const [checkReplyModal, setCheckReplyModal] = useState<SlaCommitment | null>(null);

  // Switcher Handlers
  const handleOpenSwitcher = (e: React.MouseEvent<HTMLElement>) => {
    setTechnicianAnchor(e.currentTarget);
  };
  const handleSelectTechnician = (name: string) => {
    setSelectedTechnician(name);
    setTechnicianAnchor(null);
    toast(`Switched view to SRE profile: ${name}`, 'info');
  };

  const handleExport = () => {
    toast(`Workload, capacity and SLA compliance report generated for ${selectedTechnician}.`, 'success');
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastRefreshed('just now');
      toast('Shift metrics and SLA compliance counters synchronized with telemetry backend.', 'success');
    }, 600);
  };

  const handleConfirmHandover = () => {
    setIsHandoverOpen(false);
    toast(`Shift handover successfully queued for ${handoverTarget}. Tickets flagged for transition.`, 'success');
  };

  const handleConfirmStandby = () => {
    setIsStandbyOpen(false);
    toast('Secondary on-call standby engineer alerted via PagerDuty. Acknowledgment pending.', 'warning');
  };

  const handleResumeSla = (id: string) => {
    setCheckReplyModal(null);
    toast(`Customer reply confirmed for ${id}. SLA countdown timer resumed.`, 'success');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Breadcrumb & Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: COLORS.onSurfaceVariant,
              cursor: 'pointer',
              '&:hover': { color: COLORS.primary },
            }}
            onClick={() => navigate('/tech/queue')}
          >
            Technician Portal
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.primary }}>
            Workload &amp; Capacity
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontSize: { xs: 22, md: 28 },
                fontWeight: 700,
                color: COLORS.onSurface,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              Technician Workload, Capacity &amp; SLA Performance
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, maxWidth: 780 }}>
              Real-time concurrency quotas, shift throughput velocity, and ITIL SLA delivery compliance.
            </Typography>
          </Box>

          {/* Header Controls */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            {/* Technician Switcher Pill */}
            <Paper
              elevation={0}
              onClick={handleOpenSwitcher}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                bgcolor: COLORS.surfaceContainerLowest,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: COLORS.primaryContainer,
                  color: '#fffcf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {selectedTechnician
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </Box>
              <Box sx={{ pr: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                  {selectedTechnician}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, lineHeight: 1 }}>
                  Senior SRE / Tier-2
                </Typography>
              </Box>
              <UnfoldMoreIcon sx={{ fontSize: 17, color: COLORS.onSurfaceVariant }} />
            </Paper>

            <Menu
              anchorEl={technicianAnchor}
              open={Boolean(technicianAnchor)}
              onClose={() => setTechnicianAnchor(null)}
              PaperProps={{
                sx: { borderRadius: 2, border: `1px solid ${COLORS.border}`, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
              }}
            >
              {['Marcus Chen', 'David Miller', 'Elena Vance', 'Sarah Jenkins'].map((name) => (
                <MenuItem
                  key={name}
                  selected={selectedTechnician === name}
                  onClick={() => handleSelectTechnician(name)}
                  sx={{ fontSize: 13, fontWeight: selectedTechnician === name ? 700 : 500 }}
                >
                  {name} {name === 'Sarah Jenkins' ? '(Tier-3 Lead)' : '(Tier-2 SRE)'}
                </MenuItem>
              ))}
            </Menu>

            {/* Timeframe Selector Tabs */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 0.5,
                bgcolor: COLORS.surfaceContainer,
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {[
                { key: '7D', label: 'Last 7 Days' },
                { key: '14D', label: 'Last 14 Days' },
                { key: 'MONTH', label: 'Current Month' },
              ].map((tab) => {
                const isActive = timeframe === tab.key;
                return (
                  <Button
                    key={tab.key}
                    size="small"
                    onClick={() => {
                      setTimeframe(tab.key as any);
                      toast(`Timeframe adjusted to ${tab.label}`, 'info');
                    }}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      minWidth: 'auto',
                      borderRadius: 1.5,
                      fontSize: 11.5,
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? COLORS.primary : COLORS.onSurfaceVariant,
                      bgcolor: isActive ? COLORS.surfaceContainerLowest : 'transparent',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: isActive ? COLORS.surfaceContainerLowest : 'rgba(0,0,0,0.03)',
                      },
                    }}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </Paper>

            {/* Export Action */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              startIcon={<DownloadIcon sx={{ fontSize: 16, color: COLORS.primary }} />}
              sx={{
                px: 2,
                py: 0.8,
                bgcolor: COLORS.surfaceContainerLowest,
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': {
                  bgcolor: COLORS.surfaceContainerLow,
                  borderColor: COLORS.outlineVariant,
                },
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Row 1: KPI Metric Cards (4 Grid) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Active Concurrency Slot Load */}
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
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Current Active Load
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                    4
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: COLORS.onSurfaceVariant }}>
                    / 5 Slots
                  </Typography>
                </Box>
              </Box>

              {/* Circular Radial Gauge */}
              <Box sx={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="transform -rotate-90" viewBox="0 0 36 36" style={{ width: 48, height: 48, transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={COLORS.surfaceContainerHigh}
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={COLORS.error}
                    strokeDasharray="80, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <Typography
                  sx={{
                    position: 'absolute',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: COLORS.onSurface,
                  }}
                >
                  80%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
                <Chip
                  size="small"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: COLORS.error,
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                      High Load / Near Cap
                    </Box>
                  }
                  sx={{
                    bgcolor: COLORS.errorContainer,
                    color: COLORS.onErrorContainer,
                    fontSize: 11,
                    fontWeight: 700,
                    height: 22,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Auto-dispatch threshold cap: 5 concurrent tickets
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 2: SLA Met Rate (30 Days) */}
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
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  SLA Met Rate (30 Days)
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                  96.4%
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: COLORS.surfaceContainer,
                  color: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VerifiedIcon sx={{ fontSize: 24 }} />
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: COLORS.primary }}>
                <TrendingUpIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  +1.8% vs team baseline (94.6%)
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                54 of 56 commitments fulfilled within SLA
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 3: MTTR */}
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
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Mean Time to Resolve (MTTR)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                    38<span style={{ fontSize: 18, fontWeight: 400, color: COLORS.onSurfaceVariant }}>m</span> 12
                    <span style={{ fontSize: 18, fontWeight: 400, color: COLORS.onSurfaceVariant }}>s</span>
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: COLORS.surfaceContainer,
                  color: COLORS.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TimerIcon sx={{ fontSize: 24 }} />
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: COLORS.primary }}>
                <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  -12.4m reduction velocity
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Target: &lt; 45m for Tier-2 incidents
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 4: First Contact Resolution */}
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
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 14px rgba(0,0,0,0.08)' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  First Contact Resolution
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                  78.2%
                </Typography>
              </Box>

              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: COLORS.surfaceContainer,
                  color: COLORS.primaryContainer,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TaskAltIcon sx={{ fontSize: 24 }} />
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, color: COLORS.primary }}>
                <TrendingUpIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  +4.1% vs last month
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Resolved without Tier-3 SRE escalation
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Split 7 cols (60%) / 5 cols (40%) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Left Card: Upcoming SLA Commitments */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2.5,
                py: 2,
                bgcolor: COLORS.surfaceContainerLow,
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <HourglassTopIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                <Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.2 }}>
                    Upcoming SLA Commitment Deadlines
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                    5 active tickets prioritized by breach horizon
                  </Typography>
                </Box>
              </Box>

              <Chip
                size="small"
                label="2 Imminent"
                sx={{
                  bgcolor: COLORS.errorContainer,
                  color: COLORS.onErrorContainer,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  height: 22,
                }}
              />
            </Box>

            {/* Table */}
            <Box sx={{ overflowX: 'auto', flex: 1 }}>
              <Box
                component="table"
                sx={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  '& th': {
                    py: 1.2,
                    px: 1.75,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: COLORS.onSurfaceVariant,
                    bgcolor: 'rgba(231, 238, 255, 0.4)',
                    borderBottom: `1px solid ${COLORS.border}`,
                  },
                  '& td': {
                    py: 1.4,
                    px: 1.75,
                    fontSize: 12.5,
                    borderBottom: `1px solid ${COLORS.border}`,
                    color: COLORS.onSurface,
                  },
                  '& tr:hover': {
                    bgcolor: COLORS.surfaceContainerLow,
                  },
                }}
              >
                <thead>
                  <tr>
                    <th>Priority</th>
                    <th>Incident / Title</th>
                    <th>SLA Target</th>
                    <th>Time Remaining</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {COMMITMENTS.map((row) => (
                    <tr key={row.id}>
                      {/* Priority */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {row.priority === 'P1' ? (
                          <Chip
                            size="small"
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box
                                  sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    bgcolor: COLORS.error,
                                    animation: row.isImminent ? 'pulse 1.5s infinite' : 'none',
                                  }}
                                />
                                P1 CRITICAL
                              </Box>
                            }
                            sx={{
                              bgcolor: COLORS.errorContainer,
                              color: COLORS.onErrorContainer,
                              fontSize: 10.5,
                              fontWeight: 700,
                              height: 22,
                            }}
                          />
                        ) : row.priority === 'P2' ? (
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
                      </td>

                      {/* Incident / Title */}
                      <td style={{ minWidth: 200 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              fontWeight: 700,
                              color: COLORS.primary,
                              cursor: 'pointer',
                              '&:hover': { textDecoration: 'underline' },
                            }}
                            onClick={() => navigate(`/tech/incidents/${row.id}`)}
                          >
                            {row.id}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: COLORS.onSurface,
                              maxWidth: 220,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {row.title}
                          </Typography>
                          <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                            {row.service}
                          </Typography>
                        </Box>
                      </td>

                      {/* SLA Target */}
                      <td style={{ whiteSpace: 'nowrap', color: COLORS.onSurfaceVariant, fontSize: 12 }}>
                        {row.target}
                      </td>

                      {/* Time Remaining */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {row.isPaused ? (
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontFamily: 'monospace',
                              fontSize: 11,
                              fontWeight: 700,
                              color: COLORS.tertiary,
                              bgcolor: 'rgba(90, 104, 113, 0.15)',
                              px: 1,
                              py: 0.4,
                              borderRadius: 1,
                            }}
                          >
                            <PauseCircleIcon sx={{ fontSize: 14 }} />
                            <span>Clock Paused</span>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                fontFamily: 'monospace',
                                fontSize: 12,
                                fontWeight: 700,
                                color:
                                  row.remainingPercent <= 20
                                    ? COLORS.error
                                    : row.remainingPercent <= 40
                                    ? COLORS.secondary
                                    : COLORS.primary,
                              }}
                            >
                              {row.remainingPercent <= 20 ? (
                                <CrisisAlertIcon sx={{ fontSize: 14, animation: 'pulse 1.5s infinite' }} />
                              ) : (
                                <ScheduleIcon sx={{ fontSize: 14 }} />
                              )}
                              <span>{row.remainingText}</span>
                            </Box>
                            {/* Visual Progress Track */}
                            <Box
                              sx={{
                                width: 96,
                                height: 5,
                                bgcolor: COLORS.surfaceContainer,
                                borderRadius: 10,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  width: `${row.remainingPercent}%`,
                                  bgcolor:
                                    row.remainingPercent <= 20
                                      ? COLORS.error
                                      : row.remainingPercent <= 40
                                      ? COLORS.secondary
                                      : COLORS.primary,
                                  borderRadius: 10,
                                }}
                              />
                            </Box>
                          </Box>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Chip
                          size="small"
                          label={row.status}
                          sx={{
                            bgcolor:
                              row.status === 'WAIT_USER_INFO'
                                ? COLORS.surfaceContainerHigh
                                : COLORS.surfaceContainer,
                            color:
                              row.status === 'WAIT_USER_INFO'
                                ? COLORS.onSurfaceVariant
                                : COLORS.onSurface,
                            fontFamily: 'monospace',
                            fontSize: 10.5,
                            fontWeight: 600,
                            height: 22,
                          }}
                        />
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {row.isPaused ? (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setCheckReplyModal(row)}
                            endIcon={<MailIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              textTransform: 'none',
                              py: 0.4,
                              px: 1.25,
                              color: COLORS.onSurface,
                              borderColor: COLORS.border,
                              bgcolor: COLORS.surfaceContainer,
                              '&:hover': {
                                bgcolor: COLORS.primary,
                                color: '#fffcf5',
                                borderColor: COLORS.primary,
                              },
                            }}
                          >
                            Check Reply
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => navigate(`/tech/incidents/${row.id}`)}
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                            sx={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              textTransform: 'none',
                              py: 0.4,
                              px: 1.25,
                              bgcolor: row.isImminent ? COLORS.primary : COLORS.surfaceContainerHigh,
                              color: row.isImminent ? '#fffcf5' : COLORS.onSurface,
                              boxShadow: 'none',
                              '&:hover': {
                                bgcolor: row.isImminent ? COLORS.secondary : COLORS.surfaceContainer,
                                color: row.isImminent ? '#fffcf5' : COLORS.primary,
                                boxShadow: 'none',
                              },
                            }}
                          >
                            Workbench
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>

            {/* Table Footer */}
            <Box
              sx={{
                mt: 'auto',
                px: 2.5,
                py: 1.5,
                bgcolor: COLORS.surfaceContainerLowest,
                borderTop: `1px solid ${COLORS.border}`,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: COLORS.primary,
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                  SLA countdown clocks synchronize via real-time WebSocket
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/tech/queue')}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: COLORS.primary,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                View All 5 Active Tickets
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Column: Shift Status & Competency */}
        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, height: '100%' }}>
            {/* Active Shift Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: 2,
                      bgcolor: COLORS.primaryContainer,
                      color: '#fffcf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BadgeIcon sx={{ fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.2 }}>
                      Active Shift Status
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                      Americas East Tier-2
                    </Typography>
                  </Box>
                </Box>

                <Chip
                  size="small"
                  label="08:00 - 18:00 UTC"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: COLORS.surfaceContainer,
                    color: COLORS.primary,
                    height: 22,
                  }}
                />
              </Box>

              {/* Progress & Stats */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.onSurface }}>
                    Shift Time Elapsed: 6.5h / 10h
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                    7 tickets closed today
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: '100%',
                    height: 8,
                    bgcolor: COLORS.surfaceContainer,
                    borderRadius: 10,
                    overflow: 'hidden',
                    mb: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: '65%',
                      bgcolor: COLORS.primary,
                      borderRadius: 10,
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Shift handover scheduled in 3h 30m
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Efficiency Rate: 1.08 / hr
                  </Typography>
                </Box>
              </Box>

              {/* Shift Actions */}
              <Box sx={{ display: 'flex', gap: 1.5, pt: 0.5 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setIsHandoverOpen(true)}
                  startIcon={<SwapHorizIcon sx={{ fontSize: 18, color: COLORS.secondary }} />}
                  sx={{
                    py: 1,
                    bgcolor: COLORS.surfaceContainer,
                    color: COLORS.onSurface,
                    borderRadius: 2,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: COLORS.surfaceContainerHigh,
                      boxShadow: 'none',
                    },
                  }}
                >
                  Request Shift Handover
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setIsStandbyOpen(true)}
                  startIcon={<RingVolumeIcon sx={{ fontSize: 18, color: COLORS.primary }} />}
                  sx={{
                    py: 1,
                    px: 2,
                    bgcolor: COLORS.surfaceContainer,
                    color: COLORS.onSurface,
                    borderRadius: 2,
                    fontSize: 12.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: COLORS.surfaceContainerHigh,
                      boxShadow: 'none',
                    },
                  }}
                >
                  Standby
                </Button>
              </Box>
            </Paper>

            {/* Skill & Domain Competency Card */}
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                flex: 1,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PsychologyIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                  <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface }}>
                    Skill &amp; Domain Competency
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: COLORS.onSurfaceVariant }}>
                  Auto-Dispatch Affinity
                </Typography>
              </Box>

              {/* Skill Bars */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 1 }}>
                {/* Skill 1 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      Kubernetes &amp; Container Mesh
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>18 resolved</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                        98%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '98%', bgcolor: COLORS.primary, borderRadius: 10 }} />
                  </Box>
                </Box>

                {/* Skill 2 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      PostgreSQL &amp; Database Pools
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>14 resolved</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                        94%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '94%', bgcolor: COLORS.primary, borderRadius: 10 }} />
                  </Box>
                </Box>

                {/* Skill 3 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      Networking, VPN &amp; Gateway Routing
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>12 resolved</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                        91%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '91%', bgcolor: COLORS.secondary, borderRadius: 10 }} />
                  </Box>
                </Box>

                {/* Skill 4 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      Identity &amp; Okta SSO
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>9 resolved</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                        85%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ width: '100%', height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '85%', bgcolor: COLORS.secondaryContainer, borderRadius: 10 }} />
                  </Box>
                </Box>
              </Box>

              {/* Subtext */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
                <TuneIcon sx={{ fontSize: 15, color: COLORS.primary }} />
                <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                  Calculated from past 120 resolved incidents via ITIL ML dispatch
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Row 3: 14-Day Daily Incident Resolution & SLA Breach Volume (Full Width) */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: COLORS.surfaceContainerLowest,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {/* Title & Legend */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
            mb: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StackedBarChartIcon sx={{ fontSize: 22, color: COLORS.primary }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: COLORS.onSurface }}>
                14-Day Daily Incident Resolution &amp; SLA Breach Volume
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
              Shift resolution capacity trends vs target delivery SLA percentiles
            </Typography>
          </Box>

          {/* Milestone Note & Legend */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                bgcolor: COLORS.surfaceContainer,
                borderRadius: 10,
                color: COLORS.primary,
                fontSize: 11.5,
                fontWeight: 700,
              }}
            >
              <MilitaryTechIcon sx={{ fontSize: 17 }} />
              <span>Zero P1 breaches recorded during past 9 consecutive shifts</span>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: COLORS.primary }} />
                <span>Resolved Volume</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 14, height: 3, bgcolor: COLORS.secondaryContainer }} />
                <span>SLA Met Rate (%)</span>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 14-Day Visual Chart Container (Inline SVG Dual-Axis Chart) */}
        <Box sx={{ width: '100%', height: 220, pt: 2, pb: 1, position: 'relative' }}>
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 780 180" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id={barGradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#1653c7" />
                <stop offset="100%" stopColor="#1653c7" />
              </linearGradient>
              <linearGradient id={lineGlowId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#759efd" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#759efd" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <line stroke={COLORS.surfaceContainerHigh} strokeDasharray="3,3" strokeWidth="1" x1="0" x2="780" y1="30" y2="30" />
            <line stroke={COLORS.surfaceContainerHigh} strokeDasharray="3,3" strokeWidth="1" x1="0" x2="780" y1="75" y2="75" />
            <line stroke={COLORS.surfaceContainerHigh} strokeDasharray="3,3" strokeWidth="1" x1="0" x2="780" y1="120" y2="120" />
            <line stroke={COLORS.outlineVariant} strokeWidth="1" x1="0" x2="780" y1="165" y2="165" />

            {/* 14 Daily Volume Bars */}
            {DAILY_DATA.map((d, i) => {
              const x = 25 + i * 55;
              return (
                <rect
                  key={d.date}
                  x={x}
                  y={d.y}
                  width="22"
                  height={d.height}
                  rx="3"
                  fill={d.isToday ? COLORS.secondary : `url(#${barGradientId})`}
                  opacity="0.9"
                  style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                >
                  <title>{`${d.date}: ${d.volume} incidents resolved (${d.slaRate}% SLA)`}</title>
                </rect>
              );
            })}

            {/* SLA Compliance Line Trend (Smooth Bezier) */}
            <path
              d="M 36 45 C 91 38, 146 50, 201 35 C 256 42, 311 32, 366 30 C 421 28, 476 35, 531 30 C 586 38, 641 32, 696 25 C 723 25, 740 28, 751 28"
              fill="none"
              stroke="#759efd"
              strokeWidth="2.5"
            />

            {/* Line Points with Data Marks */}
            <circle cx="36" cy="45" r="3" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="91" cy="38" r="3" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="146" cy="50" r="3" fill="#fffcf5" stroke="#ba1a1a" strokeWidth="2" />
            <circle cx="201" cy="35" r="3" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="256" cy="42" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="311" cy="32" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="366" cy="30" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="421" cy="28" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="476" cy="35" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="531" cy="30" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="586" cy="38" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="641" cy="32" fill="#fffcf5" stroke="#1653c7" strokeWidth="2" />
            <circle cx="696" cy="25" r="3.5" fill="#fffcf5" stroke="#1653c7" strokeWidth="2.5" />
            <circle cx="751" cy="28" r="3.5" fill="#1653c7" stroke="#fffcf5" strokeWidth="1.5" />
          </svg>
        </Box>

        {/* Date Labels */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
            textAlign: 'center',
            fontFamily: 'monospace',
            fontSize: 10,
            color: COLORS.onSurfaceVariant,
            pt: 1,
            overflowX: 'auto',
          }}
        >
          {DAILY_DATA.map((d) => (
            <Box key={d.date} sx={{ fontWeight: d.isToday ? 700 : 500, color: d.isToday ? COLORS.primary : 'inherit' }}>
              {d.date}
            </Box>
          ))}
        </Box>

        {/* Footer Metadata Bar */}
        <Box
          sx={{
            pt: 2.5,
            mt: 2,
            borderTop: `1px solid ${COLORS.border}`,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <VerifiedUserIcon sx={{ fontSize: 16, color: COLORS.primary }} />
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
              ITIL 4 Service Management Audit Compliant • Cryptographically timestamped logs
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontFamily: 'monospace', fontSize: 11.5 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: COLORS.onSurfaceVariant }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: COLORS.primary,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span>Data refreshed {lastRefreshed}</span>
            </Box>

            <Button
              size="small"
              onClick={handleSync}
              disabled={isSyncing}
              startIcon={
                <RefreshIcon
                  sx={{
                    fontSize: 14,
                    animation: isSyncing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              }
              sx={{
                fontSize: 11.5,
                fontWeight: 600,
                color: COLORS.primary,
                textTransform: 'none',
                minWidth: 'auto',
                p: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              Sync Now
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Dialog 1: Request Shift Handover */}
      <Dialog
        open={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SwapHorizIcon sx={{ color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Initiate SRE Shift Handover</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsHandoverOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Transfer active incident queue ownership and ongoing war room telemetry to the incoming shift engineer.
            </Typography>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Relieving Engineer
              </Typography>
              <Select
                fullWidth
                size="small"
                value={handoverTarget}
                onChange={(e) => setHandoverTarget(e.target.value)}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="Priya Sharma (Tier-2 SRE EMEA)">Priya Sharma (Tier-2 SRE EMEA - On-Shift Next)</MenuItem>
                <MenuItem value="Liam O'Connor (APAC Lead SRE)">Liam O'Connor (APAC Lead SRE)</MenuItem>
                <MenuItem value="Sarah Jenkins (Tier-3 Escalation Manager)">Sarah Jenkins (Tier-3 Escalation Manager)</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Queue Handover Briefing &amp; Critical Blockers
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                sx={{ fontSize: 13 }}
              />
            </Box>

            <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.onSurface, mb: 0.5 }}>
                Included Handover Assets:
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                • 4 Active In-Progress tickets with live diagnostic logs<br />
                • War Room #09 active call link &amp; Stripe mitigation timeline<br />
                • 1 Paused ticket (INC-2026-00088) awaiting client tcpdump
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsHandoverOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmHandover}
            startIcon={<CheckCircleIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: COLORS.primaryContainer },
            }}
          >
            Confirm Shift Transfer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Standby Engineer Notification */}
      <Dialog
        open={isStandbyOpen}
        onClose={() => setIsStandbyOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RingVolumeIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Dispatch Standby Alert</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsStandbyOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mb: 1.5 }}>
              Current load is at <strong>80% concurrency (4/5 slots)</strong> with 2 imminent P1 SLA commitments.
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mb: 2 }}>
              Triggering this alert will page secondary standby engineer <strong>Liam O&apos;Connor</strong> to assist with queue triage and war room mitigation.
            </Typography>
            <Box sx={{ p: 1.5, bgcolor: COLORS.errorContainer, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.onErrorContainer }}>
                Auto-Dispatch Threshold Advisory:
              </Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.onErrorContainer }}>
                Standby assistance will absorb incoming P1/P2 tickets to preserve compliance.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsStandbyOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmStandby}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.error,
              fontWeight: 700,
              '&:hover': { bgcolor: '#93000a' },
            }}
          >
            Page Standby Engineer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Check Customer Reply (for paused SLA ticket) */}
      <Dialog
        open={Boolean(checkReplyModal)}
        onClose={() => setCheckReplyModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MailIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              User Reply Received // {checkReplyModal?.id}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setCheckReplyModal(null)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {checkReplyModal && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mb: 0.25 }}>
                  {checkReplyModal.title}
                </Typography>
                <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                  Reporter: Elena Vance · GlobalProtect Perimeter Gateway 01
                </Typography>
              </Box>

              <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainer, borderRadius: 2 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.secondary, mb: 0.5 }}>
                  Latest User Message (18m ago):
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                  &ldquo;I have uploaded the requested packet trace (vpn-client-handshake.pcap) from my macOS Sequoia laptop. The handshake drops consistently during TLS session ticket re-negotiation.&rdquo;
                </Typography>
              </Box>

              <Box sx={{ p: 1.5, bgcolor: 'rgba(0, 77, 153, 0.08)', borderRadius: 2, border: `1px solid ${COLORS.primaryContainer}` }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primary, mb: 0.25 }}>
                  Attachment Verified:
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurface }}>
                  vpn-client-handshake.pcap (4.2 MB) — MD5: 9a7b6c3d2e1f...
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCheckReplyModal(null)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => checkReplyModal && handleResumeSla(checkReplyModal.id)}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: COLORS.primaryContainer },
            }}
          >
            Resume SLA Clock &amp; Open Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

