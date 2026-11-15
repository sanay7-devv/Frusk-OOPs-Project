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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  Menu,
  Tooltip,
} from '@mui/material';
import {
  HourglassBottom as HourglassBottomIcon,
  TimerOff as TimerOffIcon,
  Speed as SpeedIcon,
  Verified as VerifiedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Rule as RuleIcon,
  PersonAdd as PersonAddIcon,
  CrisisAlert as EmergencyIcon,
  Pause as PauseIcon,
  TransferWithinAStation as TransferWithinAStationIcon,
  PriorityHigh as PriorityHighIcon,
  Upgrade as UpgradeIcon,
  Forum as ForumIcon,
  SupportAgent as SupportAgentIcon,
  PieChart as PieChartIcon,
  AdminPanelSettings as RuleSettingsIcon,
  ManageSearch as ManageSearchIcon,
  Forward as ForwardIcon,
  CellTower as CellTowerIcon,
  ChevronRight as ChevronRightIcon,
  History as HistoryIcon,
  OpenInNew as OpenInNewIcon,
  ChatBubble as ChatBubbleIcon,
  AltRoute as AltRouteIcon,
  Key as KeyIcon,
  VpnLock as VpnLockIcon,
  Analytics as AnalyticsIcon,
  Tune as TuneIcon,
  Close as CloseIcon,
  Insights as InsightsIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';

// Design System Tokens (Reliant Slate)
const COLORS = {
  surface: '#f9f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f5f9',
  surfaceContainer: '#e5eaf4',
  surfaceContainerHigh: '#e5eaf4',
  surfaceContainerHighest: '#d8e3fb',
  onSurface: '#172b4d',
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
  tertiary: '#5c5a52',
};

export default function Escalations() {
  const navigate = useNavigate();
  const toast = useToast();

  // Filter State
  const [activeTab, setActiveTab] = useState<'ALL' | 'BREACH' | 'BLOCKED' | 'OVERRIDDEN' | 'CLEARED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [serviceFilter, setServiceFilter] = useState('ALL');

  // Interactive Incident 1 State
  const [isAck1, setIsAck1] = useState(false);
  const [assignAnchor1, setAssignAnchor1] = useState<null | HTMLElement>(null);
  const [assignedTech1, setAssignedTech1] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(14 * 60 + 12);

  // Modals
  const [isL2ModalOpen, setIsL2ModalOpen] = useState(false);
  const [l2Director, setL2Director] = useState('Dr. Arthur Vance (VP Infrastructure & Reliability)');
  const [l2Notes, setL2Notes] = useState(
    'P1 Auth Loop incident has 14m remaining on ITIL resolution clock. Root cause identified as cross-region Okta SAML assertion deadlock. Requesting executive escalation clearance.'
  );

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(
    'OPERATIONAL NOTICE: Engineering teams are actively mitigating Okta SAML ACS token verification delays on US-West. Estimated recovery within 15 minutes.'
  );

  const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);

  const [guidanceModalIncident, setGuidanceModalIncident] = useState<string | null>(null);
  const [guidanceText, setGuidanceText] = useState('');

  // Live countdown timer for P1 incident
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (secs: number) => {
    if (secs <= 0) return 'BREACHED (0m 00s)';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s remaining`;
  };

  // Handlers
  const handleAcknowledge1 = () => {
    setIsAck1(true);
    toast('Escalation Acknowledged: Shift Lead assumed supervisory command of INC-2026-00108.', 'success');
  };

  const handleForceAssign1 = (techName: string) => {
    setAssignedTech1(techName);
    setAssignAnchor1(null);
    toast(`INC-2026-00108 force-assigned to ${techName}. High-priority notification dispatched.`, 'info');
  };

  const handleRunAudit = () => {
    toast('Auto-Escalation Audit completed: Scanned 48 active tickets across Americas-East. 3 anomalies flagged.', 'info');
  };

  const handleDispatchL2 = () => {
    setIsL2ModalOpen(false);
    toast(`Incident dossier dispatched to ${l2Director}. Direct SMS & PagerDuty page triggered.`, 'warning');
  };

  const handleSendBroadcast = () => {
    setIsBroadcastModalOpen(false);
    toast('Operational incident alert broadcasted to status page and Slack #incident-room.', 'success');
  };

  const handleSaveGuidance = () => {
    if (!guidanceModalIncident) return;
    toast(`Supervisory guidance pinned to ${guidanceModalIncident} investigation timeline.`, 'success');
    setGuidanceModalIncident(null);
    setGuidanceText('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Operational Context & Breadcrumb Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 600,
              color: COLORS.onSurfaceVariant,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              cursor: 'pointer',
              '&:hover': { color: COLORS.primary },
            }}
          >
            Team Lead Portal
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 14, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase' }}>
            Escalations Desk
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 14, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurfaceVariant }}>
            L1-TACTICAL-SUPERVISOR
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: 22, md: 26 },
                  fontWeight: 700,
                  color: COLORS.onSurface,
                  letterSpacing: '-0.02em',
                }}
              >
                Level-1 Escalations Desk &amp; SLA Breach Shield
              </Typography>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                    DEFCON-3 ACTIVE
                  </Box>
                }
                sx={{
                  bgcolor: COLORS.errorContainer,
                  color: COLORS.onErrorContainer,
                  fontWeight: 800,
                  fontSize: 11,
                  height: 24,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, maxWidth: 840 }}>
              Active operational escalations triggered by automated timeout thresholds, technician handoffs, or severe blast radius amplification.
            </Typography>
          </Box>

          {/* Global Tactical Action Bar */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleRunAudit}
              startIcon={<ManageSearchIcon sx={{ fontSize: 18, color: COLORS.primary }} />}
              sx={{
                bgcolor: COLORS.surfaceContainer,
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 1.75,
                py: 0.75,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
              }}
            >
              Run Auto-Escalation Audit
            </Button>

            <Button
              variant="contained"
              size="small"
              onClick={() => setIsL2ModalOpen(true)}
              startIcon={<ForwardIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: COLORS.secondary,
                color: '#ffffff',
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                px: 1.75,
                py: 0.75,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                '&:hover': { bgcolor: '#1a4494' },
              }}
            >
              Escalate Critical to L2 Manager
            </Button>

            <Button
              variant="contained"
              size="small"
              onClick={() => setIsBroadcastModalOpen(true)}
              startIcon={<CellTowerIcon sx={{ fontSize: 18 }} />}
              sx={{
                bgcolor: COLORS.primaryContainer,
                color: '#ffffff',
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
              Broadcast Incident Alert
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Operational KPIs (4 Metric Bento Blocks) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* KPI 1: Active L1 Escalations */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `5px solid ${COLORS.error}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Active L1 Escalations
              </Typography>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                    ATTN REQ
                  </Box>
                }
                sx={{
                  bgcolor: COLORS.errorContainer,
                  color: COLORS.onErrorContainer,
                  fontFamily: 'monospace',
                  fontSize: 10,
                  fontWeight: 800,
                  height: 20,
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1 }}>
              <Typography sx={{ fontSize: 32, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>3</Typography>
              <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>Tickets Pending</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderRadius: 1.5, bgcolor: COLORS.surfaceContainerLow, fontSize: 11.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error }} />
                <span>2 SLA Timeout</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.secondaryContainer }} />
                <span>1 Tech Request</span>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 2: At-Risk SLA Breach */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `5px solid ${COLORS.error}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                At-Risk SLA Breach
              </Typography>
              <TimerOffIcon sx={{ fontSize: 20, color: COLORS.error }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 700, color: COLORS.error, lineHeight: 1 }}>1</Typography>
              <Typography sx={{ fontSize: 12.5, color: COLORS.error, fontWeight: 600 }}>Critical Breaching</Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Box sx={{ flex: 1, height: 7, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: '88%', bgcolor: COLORS.error, borderRadius: 10 }} />
              </Box>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11.5, fontWeight: 700, color: COLORS.error, shrink: 0 }}>
                &lt;15m
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 3: Avg Escalation MTTA */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `5px solid ${COLORS.primary}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Avg Escalation MTTA
              </Typography>
              <SpeedIcon sx={{ fontSize: 20, color: COLORS.primary }} />
            </Box>

            <Box sx={{ my: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>
                2m 45s
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: COLORS.primary, fontWeight: 600 }}>
                <CheckCircleIcon sx={{ fontSize: 15 }} />
                <span>Within SLA Limit</span>
              </Box>
              <span style={{ fontFamily: 'monospace' }}>Target &lt;5m</span>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 4: Shift De-escalation Rate */}
        <Grid item xs={12} sm={6} lg={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              borderLeft: `5px solid ${COLORS.secondary}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                Shift De-escalation Rate
              </Typography>
              <VerifiedIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 30, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1 }}>
                88.5%
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.secondary, fontWeight: 700 }}>↑ +3.2% vs avg</Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
              <span>Handled without L2</span>
              <strong style={{ color: COLORS.onSurface, fontFamily: 'monospace' }}>12/15 total</strong>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Operational Filter Strip & Command Tabs */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: COLORS.surfaceContainerLowest,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', lg: 'center' },
          gap: 2,
        }}
      >
        {/* Filter Tabs */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {[
            { key: 'ALL', label: 'All Active', count: 3, isPrimary: true },
            { key: 'BREACH', label: 'SLA Breach Imminent', count: 1, error: true },
            { key: 'BLOCKED', label: 'Technician Blocked', count: 1 },
            { key: 'OVERRIDDEN', label: 'Priority Overridden', count: 1 },
            { key: 'CLEARED', label: 'De-escalated / Cleared', count: 12 },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Button
                key={tab.key}
                size="small"
                onClick={() => setActiveTab(tab.key as any)}
                sx={{
                  px: 1.5,
                  py: 0.6,
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 600,
                  textTransform: 'none',
                  bgcolor: isActive
                    ? COLORS.primaryContainer
                    : tab.error
                    ? 'rgba(255, 218, 214, 0.4)'
                    : 'transparent',
                  color: isActive ? '#ffffff' : tab.error ? COLORS.onErrorContainer : COLORS.onSurfaceVariant,
                  border: `1px solid ${isActive ? 'transparent' : COLORS.border}`,
                  '&:hover': {
                    bgcolor: isActive ? COLORS.primary : COLORS.surfaceContainer,
                  },
                }}
              >
                <span>{tab.label}</span>
                <Chip
                  size="small"
                  label={tab.count}
                  sx={{
                    ml: 1,
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    bgcolor: isActive ? '#ffffff' : tab.error ? COLORS.errorContainer : COLORS.surfaceContainerHighest,
                    color: isActive ? COLORS.primary : tab.error ? COLORS.onErrorContainer : COLORS.onSurface,
                  }}
                />
              </Button>
            );
          })}
        </Box>

        {/* Dropdowns */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: COLORS.surfaceContainerLow, px: 1.5, py: 0.5, borderRadius: 2 }}>
            <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>Priority:</Typography>
            <Select
              size="small"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              variant="standard"
              disableUnderline
              sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}
            >
              <MenuItem value="ALL">All Criticalities</MenuItem>
              <MenuItem value="P1">P1 - Critical Only</MenuItem>
              <MenuItem value="P2">P2 - High</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: COLORS.surfaceContainerLow, px: 1.5, py: 0.5, borderRadius: 2 }}>
            <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>Service:</Typography>
            <Select
              size="small"
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              variant="standard"
              disableUnderline
              sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}
            >
              <MenuItem value="ALL">All Production Services</MenuItem>
              <MenuItem value="Identity">Identity &amp; SSO</MenuItem>
              <MenuItem value="VPN">Corporate VPN</MenuItem>
              <MenuItem value="Jira">Workplace Tools</MenuItem>
            </Select>
          </Box>
        </Box>
      </Paper>

      {/* Active Escalations Queue Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
        {/* ESCALATION RECORD 1: CRITICAL ATTENTION REQUIRED */}
        {(activeTab === 'ALL' || activeTab === 'BREACH') && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainerLowest,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            }}
          >
            {/* High Severity Banner */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                bgcolor: COLORS.errorContainer,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                <Chip
                  size="small"
                  label="LEVEL 1 ESCALATION: RESPONSE TIMEOUT EXPIRED"
                  sx={{
                    bgcolor: COLORS.error,
                    color: '#ffffff',
                    fontSize: 10.5,
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    height: 22,
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onErrorContainer, display: { xs: 'none', sm: 'block' } }}>
                  Trigger rule: ITIL-SLA-R04 (Automatic Breach Avoidance)
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onErrorContainer }}>
                  Resolution SLA Countdown:
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 1.5,
                    bgcolor: '#ffffff',
                    color: COLORS.error,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: 800,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  <HourglassBottomIcon sx={{ fontSize: 14 }} />
                  <span>{formatCountdown(countdownSeconds)}</span>
                </Box>
              </Box>
            </Box>

            {/* Main Record Body */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 3 }}>
              {/* Left 65%: Incident Overview */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="P1 CRITICAL" sx={{ bgcolor: COLORS.errorContainer, color: COLORS.onErrorContainer, fontWeight: 800, fontSize: 10.5, height: 22 }} />
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                      INC-2026-00108
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12.5, fontWeight: 600, color: COLORS.onSurfaceVariant }}>
                      <KeyIcon sx={{ fontSize: 16, color: COLORS.primary }} />
                      <span>Identity &amp; SSO (Okta Gateway Cluster 02)</span>
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, color: COLORS.onSurface, mb: 1 }}>
                    SSO Login Loop for West Coast Remote Workers &amp; VPN Authentication Failure
                  </Typography>

                  <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 1.5, mb: 2 }}>
                    Automated trigger: Ticket sat in initial queue unacknowledged past the 15-minute Level-0 ITIL response target. Blast radius telemetry detected exponential authentication rejection rate spikes on SAML assertion tokens.
                  </Typography>

                  {/* Metadata Bento Grid */}
                  <Grid container spacing={1.5} sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Escalation Age
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        18m 40s elapsed
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Original Assignee
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.error, mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WarningIcon sx={{ fontSize: 14 }} /> Unassigned (Stall)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Blast Radius Impact
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        86 Users / 4 Branches
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Source Signal
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        Datadog Alert #94821
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Timeline Strip */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: COLORS.onSurfaceVariant, pt: 1, borderTop: `1px solid ${COLORS.surfaceContainer}` }}>
                  <HistoryIcon sx={{ fontSize: 16, color: COLORS.tertiary }} />
                  <span>Triggered 14:12 UTC</span>
                  <span>&rarr;</span>
                  <span>L0 Auto-alert sent to Slack #oncall-identity</span>
                  <span>&rarr;</span>
                  <span style={{ color: COLORS.error, fontWeight: 600 }}>L1 Shift Lead Escalation Dispatched (14:27 UTC)</span>
                </Box>
              </Box>

              {/* Right 35%: Tactical Supervisory Actions */}
              <Box
                sx={{
                  width: { xs: '100%', xl: 320 },
                  shrink: 0,
                  bgcolor: COLORS.surfaceContainer,
                  borderRadius: 2.5,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
                      Supervisor Command
                    </Typography>
                    <Chip size="small" label="Immediate" sx={{ height: 19, fontSize: 10, fontFamily: 'monospace', bgcolor: COLORS.surfaceContainerHighest }} />
                  </Box>

                  {/* Acknowledge Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={isAck1}
                    onClick={handleAcknowledge1}
                    startIcon={isAck1 ? <CheckCircleIcon /> : <RuleIcon />}
                    sx={{
                      py: 1,
                      bgcolor: isAck1 ? COLORS.secondary : COLORS.primaryContainer,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: COLORS.primary },
                    }}
                  >
                    {isAck1 ? 'Acknowledged' : 'Acknowledge Escalation'}
                  </Button>

                  {/* Force Assign Button */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={(e) => setAssignAnchor1(e.currentTarget)}
                    startIcon={<PersonAddIcon sx={{ color: COLORS.primary }} />}
                    endIcon={<ArrowDropDownIcon />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'space-between',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    <span>{assignedTech1 ? `Assigned: ${assignedTech1}` : 'Force Assign Senior Tech'}</span>
                  </Button>

                  <Menu
                    anchorEl={assignAnchor1}
                    open={Boolean(assignAnchor1)}
                    onClose={() => setAssignAnchor1(null)}
                    PaperProps={{ sx: { borderRadius: 2, border: `1px solid ${COLORS.border}` } }}
                  >
                    <MenuItem onClick={() => handleForceAssign1('Marcus Chen (Identity SME)')} sx={{ fontSize: 12.5 }}>
                      Marcus Chen (Tier-2 SRE) — 2 Open Slots
                    </MenuItem>
                    <MenuItem onClick={() => handleForceAssign1('Priya Patel (IAM Architect)')} sx={{ fontSize: 12.5 }}>
                      Priya Patel (IAM Lead) — 0 Open Slots
                    </MenuItem>
                  </Menu>

                  {/* War Room Override */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setIsWarRoomOpen(true)}
                    startIcon={<EmergencyIcon sx={{ color: COLORS.error }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.error,
                      fontWeight: 700,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: COLORS.errorContainer, borderColor: COLORS.error },
                    }}
                  >
                    Open P1 War Room
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
                  <Button
                    size="small"
                    onClick={() => navigate('/tech/incidents/INC-2026-00108')}
                    endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                    sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primary, p: 0, textTransform: 'none' }}
                  >
                    View Audit Trail
                  </Button>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 10.5, color: COLORS.onSurfaceVariant }}>
                    Shift: Americas-East
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* ESCALATION RECORD 2: TECHNICIAN HANDOFF REQUEST */}
        {(activeTab === 'ALL' || activeTab === 'BLOCKED') && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainerLowest,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header Strip */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                bgcolor: COLORS.surfaceContainer,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Chip
                  size="small"
                  label="LEVEL 1 ESCALATION: TECHNICIAN HANDOFF REQUEST"
                  sx={{
                    bgcolor: COLORS.surfaceContainerHighest,
                    color: COLORS.onSurface,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    height: 22,
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurfaceVariant, display: { xs: 'none', sm: 'block' } }}>
                  Initiated by: Marcus Chen (Tier-2 SRE)
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                  SLA Status:
                </Typography>
                <Chip
                  size="small"
                  icon={<PauseIcon sx={{ fontSize: 14 }} />}
                  label="PAUSED (Awaiting User Diagnostic Logs)"
                  sx={{
                    bgcolor: COLORS.surfaceContainerHigh,
                    color: COLORS.onSurface,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    height: 22,
                  }}
                />
              </Box>
            </Box>

            {/* Main Record Body */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 3 }}>
              {/* Left Content */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="P2 HIGH" sx={{ bgcolor: COLORS.surfaceContainerHighest, color: COLORS.secondary, fontWeight: 700, fontSize: 10.5, height: 22 }} />
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                      INC-2026-00088
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12.5, fontWeight: 600, color: COLORS.onSurfaceVariant }}>
                      <VpnLockIcon sx={{ fontSize: 16, color: COLORS.secondary }} />
                      <span>Corporate GlobalProtect VPN (Gateway EMEA-Central)</span>
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, color: COLORS.onSurface, mb: 1.5 }}>
                    VPN Gateway Handshake Error 0x8007274c on macOS Sequoia 15.2 Devices
                  </Typography>

                  {/* Technician Note Quote Box */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: COLORS.surfaceContainerLow,
                      borderRadius: 2,
                      border: `1px solid ${COLORS.border}`,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <ChatBubbleIcon sx={{ fontSize: 15, color: COLORS.primary }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurface }}>
                        Technician Note (Marcus Chen):
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface, fontStyle: 'italic', lineHeight: 1.4 }}>
                      &ldquo;User reports dropped sessions every 90 seconds. Awaiting specialized tcpdump network packet traces. User uncontactable via Teams; need Lead intervention to authorize policy clock freeze or ping department lead.&rdquo;
                    </Typography>
                  </Paper>

                  {/* Metadata Metrics */}
                  <Grid container spacing={1.5} sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Elapsed Handoff Age
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        42m since request
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Current Assignee
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        Marcus Chen (Tier-2 SRE)
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Target Resolution SLA
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary, mt: 0.25 }}>
                        4h 15m remaining
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, pt: 1, borderTop: `1px solid ${COLORS.surfaceContainer}` }}>
                  User: <strong>Jonathan Meyers (Lead Principal Scientist - R&amp;D BioCompute)</strong>
                </Box>
              </Box>

              {/* Right Supervisory Actions */}
              <Box
                sx={{
                  width: { xs: '100%', xl: 320 },
                  shrink: 0,
                  bgcolor: COLORS.surfaceContainer,
                  borderRadius: 2.5,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
                    Resolution Governance
                  </Typography>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toast('SLA Clock freeze authorized for INC-2026-00088 pending user reply.', 'info')}
                    startIcon={<PauseIcon sx={{ color: COLORS.primary }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    Approve SLA Clock Freeze
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toast('INC-2026-00088 reassigned to NetOps Specialist Pool.', 'success')}
                    startIcon={<TransferWithinAStationIcon sx={{ color: COLORS.secondary }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    Reassign to NetOps Specialist
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toast("Ping sent to Jonathan Meyers's Line Manager via Slack.", 'info')}
                    startIcon={<PriorityHighIcon sx={{ color: COLORS.primary }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    Ping Employee&apos;s Line Manager
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>L1 Lead Action Required</Typography>
                  <Button
                    size="small"
                    onClick={() => toast('INC-2026-00088 dismissed back to standard queue.', 'info')}
                    sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primary, p: 0, textTransform: 'none' }}
                  >
                    Dismiss to Queue
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}

        {/* ESCALATION RECORD 3: BLAST RADIUS AMPLIFICATION */}
        {(activeTab === 'ALL' || activeTab === 'OVERRIDDEN') && (
          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainerLowest,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header Strip */}
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                bgcolor: COLORS.surfaceContainerHigh,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Chip
                  size="small"
                  label="LEVEL 1 ESCALATION: BLAST RADIUS AMPLIFICATION"
                  sx={{
                    bgcolor: COLORS.primaryContainer,
                    color: '#ffffff',
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    height: 22,
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurface, display: { xs: 'none', sm: 'block' } }}>
                  Automated Metric: Error cascade downstream &gt;35%
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurface }}>
                  Priority Action:
                </Typography>
                <Chip
                  size="small"
                  label="Candidate for P1 Upgrade"
                  sx={{
                    bgcolor: '#ffffff',
                    color: COLORS.primary,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 800,
                    height: 22,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                />
              </Box>
            </Box>

            {/* Main Record Body */}
            <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 3 }}>
              {/* Left Content */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip size="small" label="P2 HIGH" sx={{ bgcolor: COLORS.surfaceContainerHighest, color: COLORS.secondary, fontWeight: 700, fontSize: 10.5, height: 22 }} />
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                      INC-2026-00094
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: 12.5, fontWeight: 600, color: COLORS.onSurfaceVariant }}>
                      <AltRouteIcon sx={{ fontSize: 16, color: COLORS.tertiary }} />
                      <span>Workplace Tools / Jira Cloud Gateway Integration</span>
                    </Box>
                  </Box>

                  <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, color: COLORS.onSurface, mb: 1 }}>
                    Jira Cloud Webhook Delivery Latency &amp; Webhook Queue Overflow
                  </Typography>

                  <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 1.5, mb: 2 }}>
                    Automated blast radius telemetry alert: Error rate exceeded 35% downstream cascade into GitLab CI/CD deployment pipelines. 41 automated deployments held in queue pending resolution.
                  </Typography>

                  {/* Metadata Grid */}
                  <Grid container spacing={1.5} sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, mb: 1.5 }}>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Escalation Age
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        28m elapsed
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Resolution SLA
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary, mt: 0.25 }}>
                        1h 24m remaining
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurfaceVariant }}>
                        Current Supervisor
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mt: 0.25 }}>
                        Sarah Jenkins (Acting Lead)
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Cascade Vector Strip */}
                  <Box sx={{ p: 1.25, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 12 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: COLORS.onSurface }}>
                      Cascade Vector:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, color: COLORS.onSurfaceVariant }}>
                      <span>Webhook Engine (99.8% lag)</span>
                      <span>&rarr;</span>
                      <span>GitLab Webhooks (38% fail)</span>
                      <span>&rarr;</span>
                      <strong style={{ color: COLORS.error }}>Auto-Deploy Frozen</strong>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: COLORS.onSurfaceVariant, pt: 1, borderTop: `1px solid ${COLORS.surfaceContainer}` }}>
                  <AnalyticsIcon sx={{ fontSize: 16, color: COLORS.tertiary }} />
                  <span>Correlated with Change Advisory Board Release CR-9021</span>
                </Box>
              </Box>

              {/* Right Supervisory Actions */}
              <Box
                sx={{
                  width: { xs: '100%', xl: 320 },
                  shrink: 0,
                  bgcolor: COLORS.surfaceContainer,
                  borderRadius: 2.5,
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: COLORS.onSurfaceVariant }}>
                    Incident Amplification Actions
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => toast('INC-2026-00094 upgraded to P1 Critical. War Room provisions initiated.', 'error')}
                    startIcon={<UpgradeIcon />}
                    sx={{
                      py: 1,
                      bgcolor: COLORS.primary,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: COLORS.primaryContainer },
                    }}
                  >
                    Upgrade to P1 Critical
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => toast('Dedicated Slack bridge #inc-2026-00094 created and invited GitLab SRE team.', 'info')}
                    startIcon={<ForumIcon sx={{ color: COLORS.secondary }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    Spin Up Incident Slack Bridge
                  </Button>

                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setGuidanceModalIncident('INC-2026-00094')}
                    startIcon={<SupportAgentIcon sx={{ color: COLORS.primary }} />}
                    sx={{
                      py: 1,
                      bgcolor: '#ffffff',
                      borderColor: COLORS.border,
                      color: COLORS.onSurface,
                      fontWeight: 600,
                      fontSize: 12.5,
                      textTransform: 'none',
                      borderRadius: 2,
                      justifyContent: 'flex-start',
                      '&:hover': { bgcolor: COLORS.surfaceContainerLow },
                    }}
                  >
                    Add Supervisory Guidance
                  </Button>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>Blast Scope: CI/CD Pipeline</Typography>
                  <Button
                    size="small"
                    onClick={() => navigate('/tech/incidents/INC-2026-00094')}
                    sx={{ fontSize: 11.5, fontWeight: 700, color: COLORS.primary, p: 0, textTransform: 'none' }}
                  >
                    Full Telemetry
                  </Button>
                </Box>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* Supervisory Operational Analytics & Policy Rules Card (Dual Section) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Left Section (7 Cols): Cause Distribution */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
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
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: COLORS.primaryContainer,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <PieChartIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: COLORS.onSurface }}>
                      Escalation Cause Distribution
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                      Aggregated telemetry past 7 operational shifts (Americas-East)
                    </Typography>
                  </Box>
                </Box>
                <Chip size="small" label="n = 43 Total" sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: COLORS.surfaceContainer }} />
              </Box>

              {/* Visual Breakdown Bars */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, my: 2 }}>
                {/* Bar 1: SLA Timeout */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: COLORS.error }} />
                      <span>SLA Response Timeout Expired</span>
                    </Box>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                      42% (18 incidents)
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '42%', bgcolor: COLORS.error, borderRadius: 10 }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
                    Primary driver: Unassigned queue dispatch delays in L0 triage queue
                  </Typography>
                </Box>

                {/* Bar 2: Skill Gap */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: COLORS.primary }} />
                      <span>Technician Skill Gap / Domain Complexity</span>
                    </Box>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                      35% (15 incidents)
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '35%', bgcolor: COLORS.primary, borderRadius: 10 }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
                    Primary driver: IAM Okta gateway and BGP network route failures
                  </Typography>
                </Box>

                {/* Bar 3: Blast Radius */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: COLORS.secondary }} />
                      <span>Blast Radius Telemetry Amplification</span>
                    </Box>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                      23% (10 incidents)
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', height: 8, bgcolor: COLORS.surfaceContainer, borderRadius: 10, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '23%', bgcolor: COLORS.secondary, borderRadius: 10 }} />
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
                    Primary driver: Third-party SaaS webhooks and downstream CI/CD cascades
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Recommendation Footer */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: COLORS.surfaceContainerLow,
                borderRadius: 2,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <InsightsIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                <span>Lead Recommendation: Implement automated pre-routing for Okta cluster tickets.</span>
              </Box>
              <Button
                size="small"
                onClick={() => toast('Configured pre-routing rule for Identity & Okta incidents.', 'success')}
                sx={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: 'none', shrink: 0 }}
              >
                Configure Rule
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Section (5 Cols): Automated Escalation Rule Configuration */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
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
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      bgcolor: COLORS.surfaceContainerHighest,
                      color: COLORS.onSurface,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RuleSettingsIcon sx={{ fontSize: 18 }} />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: COLORS.onSurface }}>
                      Escalation Policy Matrix
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                      Active automation thresholds
                    </Typography>
                  </Box>
                </Box>
                <Chip size="small" label="Active" sx={{ fontFamily: 'monospace', fontSize: 11, bgcolor: COLORS.surfaceContainer, color: COLORS.primary, fontWeight: 700 }} />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1.5 }}>
                {/* Rule 1 */}
                <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, borderLeft: `3px solid ${COLORS.error}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      P1 SLA Timeout Trigger
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.error }}>
                      15 min
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Unacknowledged tickets automatically escalate to Level-1 Lead with audio-visual pager alert.
                  </Typography>
                </Box>

                {/* Rule 2 */}
                <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, borderLeft: `3px solid ${COLORS.secondary}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      P2 SLA Timeout Trigger
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                      30 min
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Unassigned queue stall elevates to Lead workspace for direct manual force-assignment.
                  </Typography>
                </Box>

                {/* Rule 3 */}
                <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, borderLeft: `3px solid ${COLORS.primary}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                      Level-2 Manager Auto-Breach
                    </Typography>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                      &lt;30m to Breach
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Any P1 with unresolved root-cause and under 30m resolution SLA alerts Senior Engineering Director.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurfaceVariant }}>
                Last synced: 2m ago
              </Typography>
              <Button
                size="small"
                startIcon={<TuneIcon sx={{ fontSize: 15 }} />}
                onClick={() => toast('Navigating to administrative Escalation Settings...', 'info')}
                sx={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, textTransform: 'none' }}
              >
                Edit Escalation Policies
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Dialog: Escalate Critical to L2 Manager */}
      <Dialog open={isL2ModalOpen} onClose={() => setIsL2ModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ForwardIcon sx={{ color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Dispatch Incident Dossier to L2 Manager</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsL2ModalOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Elevate critical uncontained incidents directly to engineering directors and executive crisis management.
            </Typography>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Target Engineering Director
              </Typography>
              <Select fullWidth size="small" value={l2Director} onChange={(e) => setL2Director(e.target.value)} sx={{ fontSize: 13 }}>
                <MenuItem value="Dr. Arthur Vance (VP Infrastructure & Reliability)">Dr. Arthur Vance (VP Infrastructure &amp; Reliability)</MenuItem>
                <MenuItem value="Rachel Green (Head of SRE & Operations)">Rachel Green (Head of SRE &amp; Operations)</MenuItem>
                <MenuItem value="Michael Chang (Director of Core Engineering)">Michael Chang (Director of Core Engineering)</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Executive Briefing &amp; Root-Cause Stall
              </Typography>
              <TextField fullWidth multiline rows={4} size="small" value={l2Notes} onChange={(e) => setL2Notes(e.target.value)} sx={{ fontSize: 13 }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsL2ModalOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleDispatchL2} sx={{ textTransform: 'none', bgcolor: COLORS.secondary, fontWeight: 700 }}>
            Dispatch Dossier to L2
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Broadcast Incident Alert */}
      <Dialog open={isBroadcastModalOpen} onClose={() => setIsBroadcastModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CellTowerIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Broadcast Operational Incident Alert</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsBroadcastModalOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Broadcast incident impact status across global corporate channels, status page banner, and customer support desks.
            </Typography>

            <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, mb: 0.5 }}>Active Broadcast Destinations:</Typography>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                • Internal Statuspage.io Banner (Active incident warning)<br />
                • Slack #incidents-sev1 broadcast channel<br />
                • Customer Operations &amp; Support Escalation Deck
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Broadcast Message
              </Typography>
              <TextField fullWidth multiline rows={3} size="small" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} sx={{ fontSize: 13 }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsBroadcastModalOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSendBroadcast} sx={{ textTransform: 'none', bgcolor: COLORS.primary, fontWeight: 700 }}>
            Publish Broadcast
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: War Room Bridge */}
      <Dialog open={isWarRoomOpen} onClose={() => setIsWarRoomOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmergencyIcon sx={{ color: COLORS.error }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Join Level-1 War Room Bridge</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsWarRoomOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ p: 2, bgcolor: '#172b4d', borderRadius: 2, color: '#ffffff', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>
                War Room #09 Bridge Active
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                7 active engineers (Shift Lead Sarah Jenkins, SecOps, DevOps, Payments Lead)
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
              Entering this war room bridge grants live screen control and emergency override permissions for production gateway clusters.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsWarRoomOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Dismiss
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsWarRoomOpen(false);
              toast('Connected to War Room #09 audio/video bridge.', 'success');
            }}
            sx={{ textTransform: 'none', bgcolor: COLORS.error, fontWeight: 700, '&:hover': { bgcolor: '#93000a' } }}
          >
            Connect to Bridge
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Add Supervisory Guidance */}
      <Dialog open={Boolean(guidanceModalIncident)} onClose={() => setGuidanceModalIncident(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SupportAgentIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Add Supervisory Guidance // {guidanceModalIncident}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setGuidanceModalIncident(null)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Pin authoritative instructions, triage boundaries, or escalation directions to the active investigation timeline.
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="e.g. Prioritize draining webhook queue before restarting pods. Verify Redis cache locks..."
              value={guidanceText}
              onChange={(e) => setGuidanceText(e.target.value)}
              sx={{ fontSize: 13 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGuidanceModalIncident(null)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveGuidance} sx={{ textTransform: 'none', bgcolor: COLORS.primary, fontWeight: 700 }}>
            Pin Guidance
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

