import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  LinearProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CrisisAlert as CrisisAlertIcon,
  Schedule as ScheduleIcon,
  PauseCircle as PauseCircleIcon,
  PlayArrow as PlayArrowIcon,
  Terminal as TerminalIcon,
  AutoFixHigh as AutoFixHighIcon,
  Timeline as TimelineIcon,
  Dns as DnsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Send as SendIcon,
  VideoCameraFront as VideoCameraFrontIcon,
  People as PeopleIcon,
  Bolt as BoltIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Security as SecurityIcon,
  Hub as HubIcon,
  DoneAll as DoneAllIcon,
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
  successContainer: '#d1e7dd',
  tertiary: '#5c5a52',
};

interface IncidentData {
  id: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  service: string;
  serviceTag: string;
  reporter: string;
  reportedTimeAgo: string;
  details: string;
  node: string;
  status: 'NEEDS_ACK' | 'IN_PROGRESS' | 'WAIT_USER_INFO' | 'RESOLVED';
  breachWindow: string;
  breachPercent: number;
  breachStatus: 'critical' | 'warning' | 'safe' | 'paused';
  runbookML?: string;
  warRoom?: string;
  affectedUsers?: string;
  financialImpact?: string;
}

const MOCK_INCIDENTS: Record<string, IncidentData> = {
  'INC-2026-00095': {
    id: 'INC-2026-00095',
    priority: 'P1',
    title: 'Payment Gateway Webhook 504 Timeout',
    service: 'Payment Gateway',
    serviceTag: 'Core Payments Ingress',
    reporter: 'Alex Rivera (SecOps)',
    reportedTimeAgo: '4m ago',
    details: 'Automated alert: 1,420 checkout failures in 3m across Stripe ingress routes.',
    node: 'ingress-edge-us-east-04',
    status: 'NEEDS_ACK',
    breachWindow: '08m 14s',
    breachPercent: 18,
    breachStatus: 'critical',
    runbookML: 'Runbook #PAY-99 (Stripe Webhook Deadlock Recovery)',
    warRoom: 'War Room #09 Active (7 participants)',
    affectedUsers: '1,420 customers',
    financialImpact: '$42,600 pending transactions',
  },
  'INC-2026-00042': {
    id: 'INC-2026-00042',
    priority: 'P1',
    title: 'Production Kubernetes Cluster API Latency & Gateway 504 Timeouts',
    service: 'Kubernetes Cluster',
    serviceTag: 'Core Billing API',
    reporter: 'David Miller (DevOps)',
    reportedTimeAgo: '28m ago',
    details: 'p99 response time degraded to 6,240ms on prod-aks-eastus2 node pool.',
    node: 'Cluster: prod-aks-eastus2',
    status: 'IN_PROGRESS',
    breachWindow: '14m 19s',
    breachPercent: 28,
    breachStatus: 'warning',
    warRoom: 'War Room #09 Active (7 participants)',
    affectedUsers: '4,800 active sessions',
    financialImpact: '$18,400 pending checkout orders',
  },
  'INC-2026-00108': {
    id: 'INC-2026-00108',
    priority: 'P2',
    title: 'SSO Login Loop for West Coast Remote Workers',
    service: 'Identity & SSO',
    serviceTag: 'Okta Enterprise IdP',
    reporter: 'Marcus Vance',
    reportedTimeAgo: '45m ago',
    details: 'Okta SAML ACS token verification failure on region redirect.',
    node: 'Okta Enterprise IdP Node 02',
    status: 'IN_PROGRESS',
    breachWindow: '1h 42m',
    breachPercent: 65,
    breachStatus: 'safe',
    affectedUsers: '86 corporate users',
    financialImpact: 'Internal productivity impact',
  },
  'INC-2026-00088': {
    id: 'INC-2026-00088',
    priority: 'P2',
    title: 'VPN Gateway Handshake Error 0x8007274c on macOS Sequoia',
    service: 'Corporate VPN',
    serviceTag: 'GlobalProtect Perimeter',
    reporter: 'Elena Vance',
    reportedTimeAgo: '2h ago',
    details: 'Handshake drops during TLS session ticket re-negotiation. Client packet dump provided.',
    node: 'GlobalProtect Perimeter Gateway 01',
    status: 'WAIT_USER_INFO',
    breachWindow: 'PAUSED',
    breachPercent: 45,
    breachStatus: 'paused',
    affectedUsers: '12 remote engineers',
    financialImpact: 'Engineering velocity impact',
  },
  'INC-2026-00094': {
    id: 'INC-2026-00094',
    priority: 'P3',
    title: 'Jira Cloud Webhook Delivery Latency',
    service: 'Workplace Tools',
    serviceTag: 'Developer Integrations',
    reporter: 'Sarah Jenkins',
    reportedTimeAgo: '1h 10m ago',
    details: 'Retrying queue backlog at rate limit (HTTP 429 slow down from Atlassian API).',
    node: 'Atlassian Event Mesh',
    status: 'IN_PROGRESS',
    breachWindow: '3h 15m',
    breachPercent: 82,
    breachStatus: 'safe',
    affectedUsers: '34 engineers',
    financialImpact: 'Non-blocking backlog',
  },
};

interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  source: string;
  message: string;
}

const INITIAL_LOGS: LogEntry[] = [
  { timestamp: '14:22:01.104', level: 'ERROR', source: 'ingress-edge-04', message: 'HTTP 504 Gateway Timeout upstream=stripe-webhook-svc:8080 latency=15002ms' },
  { timestamp: '14:22:02.418', level: 'ERROR', source: 'stripe-webhook-svc', message: 'ConnectionPoolTimeoutException: Timeout waiting for connection from pool [max: 200, pending: 84]' },
  { timestamp: '14:22:03.011', level: 'WARN', source: 'k8s-kubelet', message: 'Readiness probe failed: HTTP probe failed with statuscode: 503' },
  { timestamp: '14:22:04.550', level: 'INFO', source: 'envoy-proxy', message: 'Circuit breaker tripped for cluster stripe_webhook_egress' },
  { timestamp: '14:22:05.892', level: 'DEBUG', source: 'redis-lock-mgr', message: 'Acquiring lock lock:stripe:webhook:event_9921 expired after 30000ms' },
  { timestamp: '14:22:06.120', level: 'ERROR', source: 'ingress-edge-04', message: 'Dropping ingress frame: socket backlog buffer full (1,024 packets queued)' },
];

export default function TechWorkbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const incidentId = id || 'INC-2026-00095';
  const initialIncident = MOCK_INCIDENTS[incidentId] || {
    id: incidentId,
    priority: 'P1',
    title: `Incident ${incidentId} - System Diagnostics Cockpit`,
    service: 'Core Platform Engine',
    serviceTag: 'Core Services',
    reporter: 'Marcus Chen (Senior SRE)',
    reportedTimeAgo: 'Just now',
    details: 'Investigating degraded responsiveness on production services.',
    node: 'prod-edge-node-01',
    status: 'IN_PROGRESS',
    breachWindow: '25m 00s',
    breachPercent: 40,
    breachStatus: 'warning',
    runbookML: 'Runbook #GEN-01 (General Service Restart & Health Verification)',
    affectedUsers: '250 users',
    financialImpact: 'Under evaluation',
  };

  const [incident, setIncident] = useState<IncidentData>(initialIncident);
  const [activeTab, setActiveTab] = useState(0);

  // Diagnostics Terminal
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [isLiveStreaming, setIsLiveStreaming] = useState(true);

  // Runbook Automation Steps
  const [runbookSteps, setRunbookSteps] = useState([
    {
      id: 1,
      title: 'Drain unresponsive pods on ingress node',
      command: 'kubectl drain ingress-edge-04 --ignore-daemonsets --delete-emptydir-data',
      status: 'COMPLETED',
      output: 'node/ingress-edge-us-east-04 cordoned, 3 pods evicted successfully.',
    },
    {
      id: 2,
      title: 'Flush Redis webhook deadlocks & stale lock keys',
      command: 'redis-cli -h cache.prod DEL lock:stripe:webhook:*',
      status: 'IDLE',
      output: '',
    },
    {
      id: 3,
      title: 'Trigger automated TCP health check probe',
      command: 'curl -s -o /dev/null -w "%{http_code}" https://api.internal/webhook/healthz',
      status: 'IDLE',
      output: '',
    },
    {
      id: 4,
      title: 'Reset circuit breaker & restore auto-scaling pool',
      command: 'kubectl scale deployment/stripe-webhook-svc --replicas=8',
      status: 'IDLE',
      output: '',
    },
  ]);

  // Timeline / Notes
  const [timelineNotes, setTimelineNotes] = useState([
    {
      id: 'note-1',
      author: 'System Telemetry',
      time: '4m ago',
      type: 'ALERT',
      content: 'Prometheus alert FIRING: P1 Payment Ingress HTTP 504 threshold exceeded (> 5% in 3m).',
    },
    {
      id: 'note-2',
      author: 'Marcus Chen (Senior SRE)',
      time: '2m ago',
      type: 'ACTION',
      content: 'Acknowledged incident. Identified connection pool exhaustion on stripe-webhook-svc. Initiated Runbook #PAY-99.',
    },
  ]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isInternalOnly, setIsInternalOnly] = useState(true);

  // Modals
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [resolveCategory, setResolveCategory] = useState('Configuration / Pool Overflow');
  const [resolveSummary, setResolveSummary] = useState(
    'Connection pool exhaustion cleared by evicting wedged ingress pods and flushing stale redis distributed mutex locks. Upstream p99 response time returned to 42ms.'
  );

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateLead, setEscalateLead] = useState('Sarah Jenkins (Tier-3 Lead)');
  const [escalateReason, setEscalateReason] = useState('Persistent kernel socket buffer drop on ingress network interface.');

  const [isWarRoomOpen, setIsWarRoomOpen] = useState(false);

  // Auto log stream simulation
  useEffect(() => {
    if (!isLiveStreaming) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const messages = [
        { level: 'INFO' as const, msg: `Health probe probe_id=${Math.floor(Math.random() * 9000 + 1000)} pinged 200 OK (18ms)` },
        { level: 'DEBUG' as const, msg: `Active goroutines: 382, GC pause: 0.8ms, Memory RSS: 412MB` },
        { level: 'WARN' as const, msg: `Slow query log: SELECT * FROM payment_intents WHERE status = 'PENDING' (240ms)` },
      ];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setLogs((prev) => [
        ...prev.slice(-30),
        { timestamp: timeStr, level: randomMsg.level, source: incident.node, message: randomMsg.msg },
      ]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isLiveStreaming, incident.node]);

  // Handlers
  const handleAcknowledge = () => {
    setIncident((prev) => ({ ...prev, status: 'IN_PROGRESS', breachStatus: 'warning' }));
    toast(`Incident ${incident.id} acknowledged. Ownership confirmed under Tier-2 SRE queue.`, 'success');
  };

  const handleExecuteRunbookStep = (stepId: number) => {
    setRunbookSteps((prev) =>
      prev.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: 'RUNNING',
            }
          : step
      )
    );

    setTimeout(() => {
      setRunbookSteps((prev) =>
        prev.map((step) =>
          step.id === stepId
            ? {
                ...step,
                status: 'COMPLETED',
                output:
                  stepId === 2
                    ? '14 keys removed. Redis distributed lock state restored to zero mutexes.'
                    : stepId === 3
                    ? 'HTTP 200 OK returned in 34ms. Health check passed.'
                    : 'Replicas successfully updated to 8. All pods ready in 12s.',
              }
            : step
        )
      );
      toast(`Runbook Step ${stepId} executed successfully.`, 'success');
    }, 1200);
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      author: 'Marcus Chen (Senior SRE)',
      time: 'Just now',
      type: isInternalOnly ? 'INTERNAL_NOTE' : 'PUBLIC_UPDATE',
      content: newNoteText.trim(),
    };
    setTimelineNotes((prev) => [newNote, ...prev]);
    setNewNoteText('');
    toast('Investigation note appended to timeline.', 'success');
  };

  const handleResolveIncident = () => {
    setIncident((prev) => ({ ...prev, status: 'RESOLVED', breachStatus: 'safe', breachWindow: 'FULFILLED' }));
    setIsResolveOpen(false);
    toast(`Incident ${incident.id} marked as RESOLVED. Root cause audit logged.`, 'success');
  };

  const handleEscalateIncident = () => {
    setIsEscalateOpen(false);
    toast(`Incident ${incident.id} escalated to ${escalateLead}. High-priority notification dispatched.`, 'warning');
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'ALL') return true;
    return log.level === logFilter;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Header / Breadcrumb */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              onClick={() => navigate('/tech/queue')}
              startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: COLORS.onSurfaceVariant,
                textTransform: 'none',
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: COLORS.surfaceContainerLowest,
                border: `1px solid ${COLORS.border}`,
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
              }}
            >
              Back to Queue
            </Button>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>/</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
              {incident.id}
            </Typography>
          </Box>

          {/* Node Status Pill */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surfaceContainerLowest,
              }}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: COLORS.primary, animation: 'pulse 1.5s infinite' }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurface }}>
                Tech Node // Online
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 10.5, color: COLORS.onSurfaceVariant }}>
                (12ms)
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Incident Title & SLA Cockpit Banner */}
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
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', lg: 'center' },
              gap: 2,
            }}
          >
            {/* Title & Info */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 0.75 }}>
                {incident.priority === 'P1' ? (
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
                      fontWeight: 800,
                      fontSize: 11,
                      height: 24,
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label={`${incident.priority} HIGH`}
                    sx={{
                      bgcolor: COLORS.surfaceContainerHigh,
                      color: COLORS.secondary,
                      fontWeight: 800,
                      fontSize: 11,
                      height: 24,
                    }}
                  />
                )}

                <Chip
                  size="small"
                  label={incident.status}
                  sx={{
                    bgcolor: COLORS.surfaceContainer,
                    color: COLORS.onSurface,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 11,
                    height: 24,
                  }}
                />

                <Chip
                  size="small"
                  label={incident.serviceTag}
                  sx={{
                    bgcolor: COLORS.surfaceContainerLow,
                    color: COLORS.primary,
                    fontWeight: 600,
                    fontSize: 11,
                    height: 24,
                  }}
                />
              </Box>

              <Typography
                variant="h5"
                sx={{
                  fontSize: { xs: 18, md: 22 },
                  fontWeight: 700,
                  color: COLORS.onSurface,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {incident.id}: {incident.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <span>Reporter: <strong>{incident.reporter}</strong> ({incident.reportedTimeAgo})</span>
                <span>•</span>
                <span>Node: <strong>{incident.node}</strong></span>
                <span>•</span>
                <span>Impact: <strong>{incident.affectedUsers || 'Enterprise Users'}</strong></span>
              </Box>
            </Box>

            {/* SLA Countdown Timer Box */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor:
                  incident.breachStatus === 'critical'
                    ? COLORS.errorContainer
                    : incident.breachStatus === 'paused'
                    ? COLORS.surfaceContainerHigh
                    : COLORS.surfaceContainer,
                border: `1px solid ${
                  incident.breachStatus === 'critical'
                    ? '#ff8a80'
                    : COLORS.border
                }`,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 220,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: incident.breachStatus === 'critical' ? COLORS.onErrorContainer : COLORS.onSurfaceVariant,
                  }}
                >
                  Resolution SLA Clock
                </Typography>
                {incident.breachStatus === 'critical' && (
                  <CrisisAlertIcon sx={{ fontSize: 16, color: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                )}
                {incident.breachStatus === 'paused' && (
                  <PauseCircleIcon sx={{ fontSize: 16, color: COLORS.tertiary }} />
                )}
              </Box>

              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 800,
                  color: incident.breachStatus === 'critical' ? COLORS.onErrorContainer : COLORS.onSurface,
                  lineHeight: 1.1,
                  mb: 0.75,
                }}
              >
                {incident.breachWindow}
              </Typography>

              {/* Progress Bar */}
              <Box sx={{ width: '100%', height: 6, bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${incident.breachPercent}%`,
                    bgcolor:
                      incident.breachStatus === 'critical'
                        ? COLORS.error
                        : incident.breachStatus === 'warning'
                        ? COLORS.secondary
                        : COLORS.primary,
                    borderRadius: 10,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, pt: 0.5 }}>
                Target: &lt; 45m for Tier-2 SRE
              </Typography>
            </Box>
          </Box>

          {/* Quick Action Ribbon */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1.25,
              mt: 2,
              pt: 2,
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            {incident.status === 'NEEDS_ACK' && (
              <Button
                variant="contained"
                onClick={handleAcknowledge}
                startIcon={<CheckCircleIcon />}
                sx={{
                  bgcolor: COLORS.primary,
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: COLORS.primaryContainer },
                }}
              >
                Acknowledge Incident
              </Button>
            )}

            {incident.priority === 'P1' && (
              <Button
                variant="contained"
                onClick={() => setIsWarRoomOpen(true)}
                startIcon={<VideoCameraFrontIcon sx={{ color: '#fffcf5' }} />}
                sx={{
                  bgcolor: '#b71c1c',
                  color: '#fffcf5',
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#8b0000' },
                }}
              >
                War Room #09 Bridge (7 joined)
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={() => setIsEscalateOpen(true)}
              startIcon={<TrendingUpIcon />}
              sx={{
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                fontWeight: 600,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: COLORS.surfaceContainerLowest,
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
              }}
            >
              Escalate to Tier-3
            </Button>

            <Button
              variant="outlined"
              onClick={() => {
                setIncident((prev) => ({
                  ...prev,
                  status: prev.status === 'WAIT_USER_INFO' ? 'IN_PROGRESS' : 'WAIT_USER_INFO',
                  breachStatus: prev.status === 'WAIT_USER_INFO' ? 'warning' : 'paused',
                  breachWindow: prev.status === 'WAIT_USER_INFO' ? '12m 40s' : 'PAUSED',
                }));
                toast(
                  incident.status === 'WAIT_USER_INFO'
                    ? 'Customer clarification received. SLA clock resumed.'
                    : 'Dispatched clarification request to reporter. SLA clock paused.',
                  'info'
                );
              }}
              startIcon={incident.status === 'WAIT_USER_INFO' ? <PlayArrowIcon /> : <PauseCircleIcon />}
              sx={{
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                fontWeight: 600,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: COLORS.surfaceContainerLowest,
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
              }}
            >
              {incident.status === 'WAIT_USER_INFO' ? 'Resume SLA Clock' : 'Request Info / Pause Clock'}
            </Button>

            <Box sx={{ ml: 'auto' }}>
              <Button
                variant="contained"
                onClick={() => setIsResolveOpen(true)}
                startIcon={<DoneAllIcon />}
                sx={{
                  bgcolor: COLORS.success,
                  color: '#fffcf5',
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: '#0b6623' },
                }}
              >
                Resolve Incident
              </Button>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Main Workspace Split Grid */}
      <Grid container spacing={2.5}>
        {/* Left Column: Diagnostics, Runbook & Timeline Tabs (70%) */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainerLow, px: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    minHeight: 48,
                    color: COLORS.onSurfaceVariant,
                    '&.Mui-selected': { color: COLORS.primary },
                  },
                }}
              >
                <Tab icon={<TerminalIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Live Diagnostic Logs" />
                <Tab
                  icon={<AutoFixHighIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <span>Runbook Automation</span>
                      <Chip size="small" label="94% ML Match" sx={{ height: 18, fontSize: 10, bgcolor: COLORS.surfaceContainerHigh, color: COLORS.primary, fontWeight: 700 }} />
                    </Box>
                  }
                />
                <Tab icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Timeline & Investigation Notes" />
              </Tabs>
            </Box>

            {/* Tab 0: Live Diagnostic Logs Console */}
            {activeTab === 0 && (
              <Box sx={{ p: 2.5 }}>
                {/* Console Bar */}
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant }}>
                      Filter Level:
                    </Typography>
                    {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
                      <Chip
                        key={lvl}
                        size="small"
                        clickable
                        onClick={() => setLogFilter(lvl)}
                        label={lvl}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: logFilter === lvl ? COLORS.primary : COLORS.surfaceContainer,
                          color: logFilter === lvl ? '#fffcf5' : COLORS.onSurface,
                          height: 22,
                        }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                      startIcon={isLiveStreaming ? <PauseCircleIcon sx={{ fontSize: 15 }} /> : <PlayArrowIcon sx={{ fontSize: 15 }} />}
                      sx={{ fontSize: 11.5, textTransform: 'none', color: COLORS.onSurfaceVariant }}
                    >
                      {isLiveStreaming ? 'Pause Stream' : 'Resume Stream'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(logs, null, 2));
                        toast('Diagnostic logs copied to clipboard.', 'info');
                      }}
                      startIcon={<ContentCopyIcon sx={{ fontSize: 15 }} />}
                      sx={{ fontSize: 11.5, textTransform: 'none', color: COLORS.onSurfaceVariant }}
                    >
                      Copy Logs
                    </Button>
                  </Box>
                </Box>

                {/* Dark Terminal Window */}
                <Box
                  sx={{
                    bgcolor: '#20211f',
                    color: '#f5f0e5',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    p: 2,
                    borderRadius: 2.5,
                    height: 380,
                    overflowY: 'auto',
                    border: '1px solid #1e293b',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1.5, mb: 1.5, borderBottom: '1px solid #334155' }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ef4444' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#f59e0b' }} />
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#10b981' }} />
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', ml: 1 }}>
                      node-stream: {incident.node} // tail -f /var/log/ingress/error.log
                    </Typography>
                  </Box>

                  {filteredLogs.map((log, idx) => (
                    <Box key={idx} sx={{ py: 0.35, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <span style={{ color: '#64748b' }}>{log.timestamp}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            log.level === 'ERROR'
                              ? '#f87171'
                              : log.level === 'WARN'
                              ? '#fbbf24'
                              : log.level === 'INFO'
                              ? '#60a5fa'
                              : '#94a3b8',
                        }}
                      >
                        [{log.level}]
                      </span>
                      <span style={{ color: '#38bdf8' }}>[{log.source}]</span>
                      <span style={{ color: '#d6d0c3', flex: 1, wordBreak: 'break-all' }}>{log.message}</span>
                    </Box>
                  ))}
                </Box>

                {/* Run Probe Button */}
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      const now = new Date();
                      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
                      setLogs((prev) => [
                        ...prev,
                        {
                          timestamp: timeStr,
                          level: 'INFO',
                          source: 'synthetic-probe',
                          message: 'TCP SYN probe to payment gateway upstream completed in 42ms. HTTP status 200 OK.',
                        },
                      ]);
                      toast('Manual synthetic probe executed.', 'success');
                    }}
                    sx={{
                      bgcolor: COLORS.primary,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'none',
                      borderRadius: 2,
                      '&:hover': { bgcolor: COLORS.primaryContainer },
                    }}
                  >
                    Run Synthetic Probe
                  </Button>
                </Box>
              </Box>
            )}

            {/* Tab 1: Machine Learning Runbook Automation */}
            {activeTab === 1 && (
              <Box sx={{ p: 2.5 }}>
                <Box
                  sx={{
                    p: 2,
                    mb: 2.5,
                    bgcolor: COLORS.surfaceContainerLow,
                    borderRadius: 2.5,
                    border: `1px solid ${COLORS.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <AutoFixHighIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                      <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface }}>
                        {incident.runbookML || 'Runbook #PAY-99 (Stripe Webhook Deadlock Recovery)'}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                      Matched with 94% historical confidence from 48 previous incidents in this category.
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label="Automated ITIL SRE Workflow"
                    sx={{ bgcolor: COLORS.primary, color: '#fffcf5', fontWeight: 700, fontSize: 11 }}
                  />
                </Box>

                {/* Steps List */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {runbookSteps.map((step) => (
                    <Paper
                      key={step.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: `1px solid ${COLORS.border}`,
                        bgcolor: step.status === 'COMPLETED' ? 'rgba(16, 124, 65, 0.04)' : COLORS.surfaceContainerLowest,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              bgcolor: step.status === 'COMPLETED' ? COLORS.success : COLORS.surfaceContainer,
                              color: step.status === 'COMPLETED' ? '#fffcf5' : COLORS.onSurface,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {step.status === 'COMPLETED' ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : step.id}
                          </Box>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface }}>
                            Step {step.id}: {step.title}
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          variant={step.status === 'COMPLETED' ? 'outlined' : 'contained'}
                          disabled={step.status === 'RUNNING'}
                          onClick={() => handleExecuteRunbookStep(step.id)}
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 1.5,
                            bgcolor: step.status === 'COMPLETED' ? 'transparent' : COLORS.primary,
                            color: step.status === 'COMPLETED' ? COLORS.success : '#fffcf5',
                            borderColor: step.status === 'COMPLETED' ? COLORS.success : 'transparent',
                            '&:hover': {
                              bgcolor: step.status === 'COMPLETED' ? 'rgba(16, 124, 65, 0.08)' : COLORS.primaryContainer,
                            },
                          }}
                        >
                          {step.status === 'COMPLETED' ? 'Re-run Step' : step.status === 'RUNNING' ? 'Executing...' : 'Execute Step'}
                        </Button>
                      </Box>

                      {/* Command Box */}
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: '#1e293b',
                          color: '#38bdf8',
                          fontFamily: 'monospace',
                          fontSize: 11.5,
                          mb: step.output ? 1 : 0,
                        }}
                      >
                        $ {step.command}
                      </Box>

                      {/* Output */}
                      {step.output && (
                        <Box sx={{ p: 1, bgcolor: COLORS.surfaceContainerLow, borderRadius: 1.5, fontSize: 11.5, color: COLORS.onSurface }}>
                          <strong>Output:</strong> {step.output}
                        </Box>
                      )}
                    </Paper>
                  ))}
                </Box>
              </Box>
            )}

            {/* Tab 2: Timeline & Notes */}
            {activeTab === 2 && (
              <Box sx={{ p: 2.5 }}>
                {/* Note Input */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 3,
                    bgcolor: COLORS.surfaceContainerLow,
                    borderRadius: 2.5,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mb: 1 }}>
                    Append Investigation Note / Public Dispatch
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Enter diagnostic observations, triage actions, or stakeholder updates..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    sx={{ bgcolor: '#fffcf5', borderRadius: 1.5, mb: 1.5, fontSize: 13 }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isInternalOnly}
                          onChange={(e) => setIsInternalOnly(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.onSurfaceVariant }}>
                          {isInternalOnly ? 'Internal SRE Only (Restricted)' : 'Public Customer Update'}
                        </Typography>
                      }
                    />
                    <Button
                      variant="contained"
                      onClick={handleAddNote}
                      startIcon={<SendIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        bgcolor: COLORS.primary,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2,
                        '&:hover': { bgcolor: COLORS.primaryContainer },
                      }}
                    >
                      Post Note
                    </Button>
                  </Box>
                </Paper>

                {/* Timeline Items */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {timelineNotes.map((note) => (
                    <Box
                      key={note.id}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: COLORS.surfaceContainerLowest,
                        border: `1px solid ${COLORS.border}`,
                        borderLeft: `4px solid ${
                          note.type === 'ALERT'
                            ? COLORS.error
                            : note.type === 'INTERNAL_NOTE'
                            ? COLORS.secondary
                            : COLORS.primary
                        }`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                          {note.author}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            size="small"
                            label={note.type}
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 700,
                              bgcolor: COLORS.surfaceContainer,
                              color: COLORS.onSurfaceVariant,
                            }}
                          />
                          <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                            {note.time}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 13, color: COLORS.onSurface, lineHeight: 1.4 }}>
                        {note.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Rail: Infrastructure Telemetry & Incident Context (30%) */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Telemetry Card */}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DnsIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface }}>
                  Node Telemetry &amp; System Health
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {/* Metric 1 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 12 }}>
                    <span style={{ color: COLORS.onSurfaceVariant }}>CPU Utilization</span>
                    <strong style={{ color: COLORS.error }}>88% (Spike)</strong>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={88}
                    sx={{ height: 6, borderRadius: 5, bgcolor: COLORS.surfaceContainer, '& .MuiLinearProgress-bar': { bgcolor: COLORS.error } }}
                  />
                </Box>

                {/* Metric 2 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 12 }}>
                    <span style={{ color: COLORS.onSurfaceVariant }}>Memory Allocation</span>
                    <strong style={{ color: COLORS.error }}>92% (High Pressure)</strong>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={92}
                    sx={{ height: 6, borderRadius: 5, bgcolor: COLORS.surfaceContainer, '& .MuiLinearProgress-bar': { bgcolor: COLORS.error } }}
                  />
                </Box>

                {/* Metric 3 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 12 }}>
                    <span style={{ color: COLORS.onSurfaceVariant }}>Ingress Network I/O</span>
                    <strong style={{ color: COLORS.primary }}>1.4 GB/s</strong>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={70}
                    sx={{ height: 6, borderRadius: 5, bgcolor: COLORS.surfaceContainer, '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary } }}
                  />
                </Box>

                {/* Metric 4 */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 12 }}>
                    <span style={{ color: COLORS.onSurfaceVariant }}>HTTP 504 Error Rate</span>
                    <strong style={{ color: COLORS.error }}>18.4% of Ingress</strong>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={45}
                    sx={{ height: 6, borderRadius: 5, bgcolor: COLORS.surfaceContainer, '& .MuiLinearProgress-bar': { bgcolor: COLORS.error } }}
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.onSurfaceVariant }}>
                Infrastructure Node: <strong>{incident.node}</strong> • Region: us-east-2
              </Box>
            </Paper>

            {/* Impact & Topology Card */}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <HubIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
                <Typography sx={{ fontSize: 14.5, fontWeight: 700, color: COLORS.onSurface }}>
                  Service Dependencies &amp; Blast Radius
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mb: 0.25 }}>
                    Upstream Service
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                    Stripe Webhook Gateway &rarr; API Ingress Edge
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, bgcolor: COLORS.errorContainer, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onErrorContainer, mb: 0.25 }}>
                    Degraded Core Component
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onErrorContainer }}>
                    `stripe-webhook-svc` (8 pods, 4 pending socket restarts)
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mb: 0.25 }}>
                    Downstream Impact
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                    PostgreSQL Billing DB • Kafka `payment-events` topic
                  </Typography>
                </Box>
              </Box>

              {incident.financialImpact && (
                <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(21, 101, 192, 0.08)', borderRadius: 2, border: `1px solid ${COLORS.primaryContainer}` }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, textTransform: 'uppercase', mb: 0.25 }}>
                    Estimated Financial Exposure:
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                    {incident.financialImpact}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* Resolution Dialog */}
      <Dialog
        open={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DoneAllIcon sx={{ color: COLORS.success }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Resolve &amp; Close Incident</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsResolveOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Complete the ITIL Incident Closure classification to archive this incident and release concurrency capacity.
            </Typography>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Root Cause Categorization
              </Typography>
              <Select
                fullWidth
                size="small"
                value={resolveCategory}
                onChange={(e) => setResolveCategory(e.target.value)}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="Configuration / Pool Overflow">Configuration / Connection Pool Overflow</MenuItem>
                <MenuItem value="Software Bug / Deadlock">Software Bug / Mutex Deadlock</MenuItem>
                <MenuItem value="Third-Party Provider Outage">Third-Party Provider Outage (Stripe)</MenuItem>
                <MenuItem value="Hardware / Network Degradation">Hardware / Network Degradation</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Resolution Summary &amp; Prevention Actions
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                size="small"
                value={resolveSummary}
                onChange={(e) => setResolveSummary(e.target.value)}
                sx={{ fontSize: 13 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsResolveOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResolveIncident}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.success,
              fontWeight: 700,
              '&:hover': { bgcolor: '#0b6623' },
            }}
          >
            Confirm Resolution &amp; Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Escalation Dialog */}
      <Dialog
        open={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Escalate Incident</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsEscalateOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Escalate this incident to Tier-3 SRE management or specialized infrastructure engineering.
            </Typography>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Escalation Target
              </Typography>
              <Select
                fullWidth
                size="small"
                value={escalateLead}
                onChange={(e) => setEscalateLead(e.target.value)}
                sx={{ fontSize: 13 }}
              >
                <MenuItem value="Sarah Jenkins (Tier-3 Lead)">Sarah Jenkins (Tier-3 Lead)</MenuItem>
                <MenuItem value="Core Platform SRE Escalation Pool">Core Platform SRE Escalation Pool</MenuItem>
                <MenuItem value="Database Engineering Specialists">Database Engineering Specialists</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Escalation Justification
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                sx={{ fontSize: 13 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsEscalateOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEscalateIncident}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: COLORS.primaryContainer },
            }}
          >
            Confirm Escalation
          </Button>
        </DialogActions>
      </Dialog>

      {/* War Room Bridge Dialog */}
      <Dialog
        open={isWarRoomOpen}
        onClose={() => setIsWarRoomOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideoCameraFrontIcon sx={{ color: '#b71c1c' }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>War Room #09 Audio/Video Bridge</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsWarRoomOpen(false)}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ p: 2, bgcolor: '#20211f', borderRadius: 2, color: '#fffcf5', textAlign: 'center' }}>
              <VideoCameraFrontIcon sx={{ fontSize: 48, color: '#f87171', mb: 1 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>
                Connected to Active Incident Bridge
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                7 active participants (SecOps, DevOps, Payments Engineering Lead)
              </Typography>
            </Box>

            <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface, mb: 0.5 }}>
                Current Bridge Scribes &amp; Leads:
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                • Incident Commander: David Miller<br />
                • Technical Scribe: Alex Rivera<br />
                • Ingress Lead: Marcus Chen
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsWarRoomOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Minimize Bridge
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setIsWarRoomOpen(false);
              toast('Audio/video session opened in dedicated monitor window.', 'info');
            }}
            sx={{
              textTransform: 'none',
              bgcolor: '#b71c1c',
              fontWeight: 700,
              '&:hover': { bgcolor: '#8b0000' },
            }}
          >
            Open Standalone Window
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

