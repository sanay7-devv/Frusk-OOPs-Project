import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  CircularProgress,
  Alert,
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
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  getMyQueue,
  getMyWorkload,
  setMyAvailability,
  acknowledgeIncident,
  startIncident,
  requestInfo,
  reassignIncident as apiReassignIncident,
  listTechnicians,
  type TechnicianView,
} from '../../api/technicians';
import { addComment, getIncident } from '../../api/incidents';
import { useProblemBasePath } from '../problems/problemAccess';
import { apiErrorMessage } from '../../utils/errors';
import type { IncidentSummary, SlaState } from '../../api/types';

// Design System Tokens (Luminary Kinetic Dark)
const COLORS = {
  surface: '#090d16',
  surfaceContainerLowest: '#0a0e17',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#141824',
  surfaceContainerHigh: '#1c2234',
  surfaceContainerHighest: '#262d42',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  outlineVariant: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  primaryContainer: '#4f46e5',
  secondary: '#06b6d4',
  secondaryContainer: 'rgba(6, 182, 212, 0.2)',
  error: '#f43f5e',
  errorContainer: 'rgba(244, 63, 94, 0.15)',
  onErrorContainer: '#ffdad6',
  success: '#10b981',
  successContainer: 'rgba(16, 185, 129, 0.15)',
  tertiary: '#f751a1',
};

function formatTimeRemaining(targetIso: string | null): { text: string; percent: number; status: 'critical' | 'warning' | 'safe' | 'paused' } {
  if (!targetIso) return { text: 'N/A', percent: 100, status: 'safe' };
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diffMinutes = Math.round((target - now) / 60000);

  if (diffMinutes <= 0) {
    return { text: 'BREACHED', percent: 0, status: 'critical' };
  }
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (diffMinutes < 15) return { text, percent: 15, status: 'critical' };
  if (diffMinutes < 60) return { text, percent: 35, status: 'warning' };
  return { text, percent: Math.min(100, Math.round((diffMinutes / 240) * 100)), status: 'safe' };
}

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMins = Math.max(1, Math.round(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function TechQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<'ALL' | 'NEEDS_ACK' | 'AT_RISK' | 'IN_PROGRESS' | 'PENDING_INFO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Interactive Modals
  const [noteModalIncident, setNoteModalIncident] = useState<IncidentSummary | null>(null);
  const [noteText, setNoteText] = useState('');
  const [requestInfoIncident, setRequestInfoIncident] = useState<IncidentSummary | null>(null);
  const [requestInfoText, setRequestInfoText] = useState('');
  const problemBase = useProblemBasePath();
  // Major incidents: open the problem record (Major Incident Mode) the incident belongs to.
  const openProblem = async (inc: IncidentSummary) => {
    try {
      const detail = await getIncident(inc.id);
      if (detail.problemId) navigate(`${problemBase}/${detail.problemId}`);
      else toast(`${inc.code} is not linked to a problem record.`, 'info');
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    }
  };
  const [reassignIncident, setReassignIncident] = useState<IncidentSummary | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<number | ''>('');
  const [reassignReason, setReassignReason] = useState('');

  // 1. Fetch real technician queue
  const {
    data: queuePage,
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['tech-my-queue'],
    queryFn: () => getMyQueue(0, 100),
    refetchInterval: 10000,
  });

  // 2. Fetch real workload stats
  const {
    data: workload,
    isLoading: isWorkloadLoading,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['tech-my-workload'],
    queryFn: () => getMyWorkload(),
    refetchInterval: 15000,
  });

  // 3. Fetch technicians for reassignment modal
  const { data: techList = [] } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => listTechnicians(),
  });

  const queue = queuePage?.items ?? [];
  const currentAvailability = user?.technician?.availability ?? (workload ? 'AVAILABLE' : 'AVAILABLE');
  const isAvailable = currentAvailability === 'AVAILABLE';

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
  const handleToggleAvailability = async () => {
    const newStatus = isAvailable ? 'AWAY' : 'AVAILABLE';
    try {
      await setMyAvailability(newStatus);
      toast(`Availability set to ${newStatus === 'AVAILABLE' ? 'Available' : 'Busy / Away'}.`, 'info');
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err.message || 'Failed to update availability', 'error');
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeIncident(id);
      toast(`Incident acknowledged. Response timer stopped.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err.message || 'Failed to acknowledge incident', 'error');
    }
  };

  const handleStartWork = async (id: number) => {
    try {
      await startIncident(id);
      toast(`Work started on incident. Status moved to IN_PROGRESS.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err.message || 'Failed to start work', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!noteModalIncident || !noteText.trim()) return;
    try {
      await addComment(noteModalIncident.id, noteText.trim(), 'INTERNAL');
      toast(`Investigation note appended to timeline for ${noteModalIncident.code}.`, 'info');
      setNoteModalIncident(null);
      setNoteText('');
    } catch (err: any) {
      toast(err.message || 'Failed to save note', 'error');
    }
  };

  const handleSendInfoRequest = async () => {
    if (!requestInfoIncident || !requestInfoText.trim()) return;
    try {
      await requestInfo(requestInfoIncident.id, requestInfoText.trim());
      toast(`Information clarification dispatched to reporter. SLA clock paused.`, 'warning');
      setRequestInfoIncident(null);
      setRequestInfoText('');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err.message || 'Failed to request info', 'error');
    }
  };

  const handleReassign = async () => {
    if (!reassignIncident || !reassignTargetId) return;
    if (reassignReason.trim().length < 10) {
      toast('Reason must be at least 10 characters long.', 'warning');
      return;
    }
    try {
      await apiReassignIncident(
        reassignIncident.id,
        Number(reassignTargetId),
        reassignReason.trim()
      );
      toast(`Incident ${reassignIncident.code} reassigned.`, 'info');
      setReassignIncident(null);
      setReassignReason('');
      setReassignTargetId('');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err?.response?.data?.message || err.message || 'Failed to reassign incident', 'error');
    }
  };

  // Unique services in current queue for filter dropdown
  const uniqueServices = Array.from(new Set(queue.map((i) => i.service?.name).filter(Boolean)));

  // Filter calculations
  const filteredQueue = queue.filter((inc) => {
    const isPaused = inc.status === 'PENDING_USER_INFO' || inc.slaState === 'PAUSED';
    const isAtRisk = inc.slaState === 'WARNING' || inc.slaState === 'AT_RISK' || inc.slaState === 'VIOLATED';

    if (filterTab === 'NEEDS_ACK' && inc.status !== 'ASSIGNED') return false;
    if (filterTab === 'AT_RISK' && !isAtRisk) return false;
    if (filterTab === 'IN_PROGRESS' && inc.status !== 'IN_PROGRESS' && inc.status !== 'ACKNOWLEDGED') return false;
    if (filterTab === 'PENDING_INFO' && !isPaused) return false;
    if (serviceFilter !== 'ALL' && inc.service?.name !== serviceFilter) return false;
    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.code.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        (inc.service?.name || '').toLowerCase().includes(q) ||
        (inc.reporter?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const needsAckCount = queue.filter((i) => i.status === 'ASSIGNED').length;
  const atRiskCount = queue.filter((i) => i.slaState === 'WARNING' || i.slaState === 'AT_RISK' || i.slaState === 'VIOLATED').length;
  const inProgressCount = queue.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACKNOWLEDGED').length;
  const pendingInfoCount = queue.filter((i) => i.status === 'PENDING_USER_INFO').length;

  // Workload values from real backend
  const activeLoad = workload?.load ?? queue.length;
  const maxQuota = workload?.maxLoad ?? 10;
  const capacityPercent = Math.min(100, Math.round((activeLoad / maxQuota) * 100));

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
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
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, letterSpacing: '-0.01em', fontFamily: 'Sora, sans-serif' }}>
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
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: COLORS.primary,
                border: '1px solid rgba(99, 102, 241, 0.3)',
                fontSize: 11.5,
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: COLORS.primary,
                  boxShadow: '0 0 8px #6366f1',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              Live backend · 10s sync
            </Box>
            <Chip
              label="⌘K Filter"
              size="small"
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                height: 22,
                bgcolor: COLORS.surfaceContainerHigh,
                color: COLORS.onSurfaceVariant,
                border: `1px solid ${COLORS.border}`,
                fontWeight: 700,
              }}
            />
            <IconButton size="small" onClick={() => { refetchQueue(); refetchWorkload(); }} sx={{ color: COLORS.onSurfaceVariant }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
            Live SRE incident triage cockpit · Logged in as {user?.name || 'Technician'} ({user?.email})
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
            border: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.surfaceContainer,
            backdropFilter: 'blur(16px)',
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: isAvailable ? COLORS.secondary : COLORS.error,
              boxShadow: isAvailable ? '0 0 10px #06b6d4' : '0 0 10px #f43f5e',
            }}
          />
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.2 }}>
              Status: {isAvailable ? 'Available' : 'Away / Paused'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
              {isAvailable ? 'Accepting auto-assignment' : 'Paused auto-assignment'}
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={handleToggleAvailability}
            sx={{
              ml: 1,
              bgcolor: COLORS.surfaceContainerHigh,
              color: COLORS.onSurface,
              border: `1px solid ${COLORS.border}`,
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              '&:hover': { bgcolor: COLORS.surfaceContainerHighest },
            }}
          >
            {isAvailable ? 'Set Away' : 'Set Available'}
          </Button>
        </Paper>
      </Box>

      {queueError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load live queue from backend: {(queueError as Error).message}
        </Alert>
      )}

      {/* 2. OPERATIONAL HEALTH & WORKLOAD CAPACITY BENTO GRID */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* SRE Workload Capacity Gauge (5 cols) */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {(user?.name || 'T').substring(0, 2).toUpperCase()}
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.onSurface }}>
                      {user?.name || 'Technician 1'}
                    </Typography>
                    <Chip
                      label={user?.technician?.escalationLevel === 1 ? 'Team Lead (L1)' : 'Technician (L0)'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        bgcolor: 'rgba(99, 102, 241, 0.15)',
                        color: COLORS.primary,
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: capacityPercent >= 80 ? COLORS.error : COLORS.secondary, fontWeight: 700, fontSize: 12 }}>
                    {capacityPercent >= 80 && <WarningIcon sx={{ fontSize: 15 }} />}
                    <span>{activeLoad} of {maxQuota} weighted load ({capacityPercent}% Capacity)</span>
                  </Box>
                </Box>
              </Box>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: COLORS.onSurfaceVariant, fontWeight: 600 }}>
                Quota: {maxQuota} Max
              </Typography>
            </Box>

            {/* Segmented Slots */}
            <Box>
              <LinearProgress
                variant="determinate"
                value={capacityPercent}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: COLORS.surfaceContainerHighest,
                  mb: 1,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: capacityPercent >= 80 ? COLORS.error : COLORS.primary,
                    borderRadius: 1,
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>
                <span>Active tickets: {queue.length}</span>
                <span>Resolved this week: {workload?.resolvedThisWeek ?? 0}</span>
                <span style={{ color: capacityPercent >= 80 ? COLORS.error : '#64748b' }}>
                  {capacityPercent >= 80 ? 'Near Capacity' : 'Available Capacity'}
                </span>
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
                  bgcolor: COLORS.surfaceContainer,
                  border: needsAckCount > 0 ? '1px solid rgba(244, 63, 94, 0.3)' : `1px solid ${COLORS.border}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: needsAckCount > 0 ? COLORS.error : COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Needs Ack
                  </Typography>
                  <BoltIcon sx={{ fontSize: 18, color: needsAckCount > 0 ? COLORS.error : COLORS.onSurfaceVariant }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: needsAckCount > 0 ? COLORS.error : COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {needsAckCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: needsAckCount > 0 ? COLORS.error : COLORS.onSurfaceVariant }}>
                    {needsAckCount > 0 ? 'Acknowledge' : 'Clear'}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>
                  Assigned to you
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
                  bgcolor: COLORS.surfaceContainer,
                  border: atRiskCount > 0 ? '1px solid rgba(244, 63, 94, 0.3)' : `1px solid ${COLORS.border}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: atRiskCount > 0 ? COLORS.error : COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    At-Risk SLA
                  </Typography>
                  <ErrorOutlineIcon sx={{ fontSize: 18, color: atRiskCount > 0 ? COLORS.error : COLORS.onSurfaceVariant }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: atRiskCount > 0 ? COLORS.error : COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {atRiskCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Tickets
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: atRiskCount > 0 ? COLORS.error : COLORS.onSurfaceVariant, fontWeight: 700 }}>
                  {atRiskCount > 0 ? 'Action required' : 'All targets healthy'}
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
                  bgcolor: COLORS.surfaceContainer,
                  border: `1px solid ${COLORS.border}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    In Progress
                  </Typography>
                  <SyncIcon sx={{ fontSize: 18, color: COLORS.primary }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {inProgressCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Active
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>
                  Under investigation
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
                  bgcolor: COLORS.surfaceContainer,
                  border: `1px solid ${COLORS.border}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Pending Info
                  </Typography>
                  <PauseCircleIcon sx={{ fontSize: 18, color: COLORS.secondary }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {pendingInfoCount}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                    Paused
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.secondary, fontWeight: 600 }}>
                  SLA clock frozen
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
            borderBottom: `1px solid ${COLORS.border}`,
            pb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: COLORS.surfaceContainerLow, p: 0.5, borderRadius: 2, border: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
            {(
              [
                { id: 'ALL', label: 'All Active', count: queue.length, bg: COLORS.primary, text: '#ffffff' },
                { id: 'NEEDS_ACK', label: 'Needs Acknowledgment', count: needsAckCount, bg: COLORS.error, text: '#ffffff' },
                { id: 'AT_RISK', label: 'At-Risk SLAs', count: atRiskCount, bg: 'rgba(244, 63, 94, 0.2)', text: COLORS.error },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount, bg: 'rgba(99, 102, 241, 0.2)', text: COLORS.primary },
                { id: 'PENDING_INFO', label: 'Pending Info (Paused)', count: pendingInfoCount, bg: 'rgba(6, 182, 212, 0.2)', text: COLORS.secondary },
              ] as const
            ).map((tab) => {
              const isSelected = filterTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  size="small"
                  onClick={() => setFilterTab(tab.id)}
                  sx={{
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.6,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: isSelected ? tab.bg : 'transparent',
                    color: isSelected ? tab.text : COLORS.onSurfaceVariant,
                    '&:hover': { bgcolor: isSelected ? tab.bg : COLORS.surfaceContainerHigh },
                  }}
                >
                  {tab.label} ({tab.count})
                </Button>
              );
            })}
          </Box>

          {/* Quick Search Input */}
          <TextField
            id="tech-queue-search"
            size="small"
            placeholder="Search code, title, service, reporter... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: COLORS.onSurfaceVariant }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 320 },
              bgcolor: COLORS.surfaceContainerLow,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </Box>

        {/* Secondary Filter Line */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Service:
              </Typography>
              <Select
                size="small"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                sx={{
                  bgcolor: COLORS.surfaceContainerLow,
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  color: COLORS.onSurface,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                }}
              >
                <MenuItem value="ALL">All Services</MenuItem>
                {uniqueServices.map((svc) => (
                  <MenuItem key={svc} value={svc}>{svc}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Priority:
              </Typography>
              <Select
                size="small"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                sx={{
                  bgcolor: COLORS.surfaceContainerLow,
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  color: COLORS.onSurface,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                }}
              >
                <MenuItem value="ALL">All Priorities</MenuItem>
                <MenuItem value="P1">P1 - Critical</MenuItem>
                <MenuItem value="P2">P2 - High</MenuItem>
                <MenuItem value="P3">P3 - Medium</MenuItem>
                <MenuItem value="P4">P4 - Low</MenuItem>
              </Select>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* 4. HIGH-DENSITY INCIDENT QUEUE STREAM */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isQueueLoading ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
            <CircularProgress size={36} sx={{ color: COLORS.primary, mb: 2 }} />
            <Typography variant="h6" sx={{ color: COLORS.onSurface }}>Loading live queue from backend...</Typography>
          </Paper>
        ) : filteredQueue.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
            <CheckCircleIcon sx={{ fontSize: 40, color: COLORS.secondary, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              Zero Matching Incidents in Queue
            </Typography>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              All tickets matching this criteria are acknowledged, healthy, or closed.
            </Typography>
          </Paper>
        ) : (
          filteredQueue.map((inc) => {
            const isCritical = inc.priority === 'P1';
            const isHigh = inc.priority === 'P2';
            const isPaused = inc.status === 'PENDING_USER_INFO' || inc.slaState === 'PAUSED';
            const targetDue = inc.status === 'ASSIGNED' ? inc.responseDue : inc.resolutionDue;
            const slaInfo = isPaused
              ? { text: 'PAUSED', percent: 50, status: 'paused' as const }
              : formatTimeRemaining(targetDue);

            return (
              <Paper
                key={inc.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                  borderLeft: isCritical ? `4px solid ${COLORS.error}` : isHigh ? `4px solid ${COLORS.secondary}` : `1px solid ${COLORS.border}`,
                  bgcolor: isPaused ? COLORS.surfaceContainerLow : COLORS.surfaceContainer,
                  backdropFilter: 'blur(16px)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: 'rgba(99, 102, 241, 0.4)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
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
                              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error, boxShadow: '0 0 6px #f43f5e', animation: 'pulse 1s infinite' }} />
                              P1 CRITICAL
                            </Box>
                          ) : (
                            `${inc.priority || 'P3'} ${isHigh ? 'HIGH' : 'MEDIUM'}`
                          )
                        }
                        size="small"
                        sx={{
                          fontWeight: 800,
                          fontSize: 10.5,
                          height: 22,
                          bgcolor: isCritical ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                          color: isCritical ? COLORS.error : COLORS.primary,
                          border: `1px solid ${isCritical ? 'rgba(244, 63, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                          borderRadius: 1,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                      <Typography
                        onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 13,
                          fontWeight: 800,
                          color: COLORS.secondary,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {inc.code}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant }}>
                        {inc.service?.name || 'General Service'}
                      </Typography>
                      {inc.category?.name && (
                        <>
                          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                            {inc.category.name}
                          </Typography>
                        </>
                      )}
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>•</Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
                        {timeAgo(inc.createdAt)}
                      </Typography>
                      {inc.escalationLevel > 0 && (
                        <Chip
                          label={`Escalation Level ${inc.escalationLevel}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10,
                            fontWeight: 700,
                            bgcolor: 'rgba(244, 63, 94, 0.15)',
                            color: COLORS.error,
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="h6"
                      onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                      sx={{
                        fontWeight: 700,
                        color: COLORS.onSurface,
                        fontSize: 16,
                        fontFamily: 'Sora, sans-serif',
                        cursor: 'pointer',
                        '&:hover': { color: COLORS.primary },
                        mb: 0.5,
                      }}
                    >
                      {inc.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                        Reporter: <strong>{inc.reporter?.name || 'Employee'}</strong>
                      </Typography>
                      <Chip
                        label={inc.status.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10,
                          fontWeight: 700,
                          bgcolor: inc.status === 'ASSIGNED' ? 'rgba(244, 63, 94, 0.15)' : inc.status === 'IN_PROGRESS' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                          color: inc.status === 'ASSIGNED' ? COLORS.error : inc.status === 'IN_PROGRESS' ? COLORS.primary : COLORS.secondary,
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* SLA Countdown Meter Component */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: COLORS.surfaceContainerLowest,
                      border: `1px solid ${COLORS.border}`,
                      minWidth: 220,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        {isPaused ? (
                          <PauseCircleIcon sx={{ fontSize: 14, color: COLORS.secondary }} />
                        ) : (
                          <ScheduleIcon sx={{ fontSize: 14, color: slaInfo.status === 'critical' ? COLORS.error : COLORS.onSurfaceVariant }} />
                        )}
                        <Typography sx={{ fontSize: 11, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: isPaused ? COLORS.secondary : slaInfo.status === 'critical' ? COLORS.error : COLORS.onSurface }}>
                          {isPaused ? 'SLA CLOCK PAUSED' : `SLA: ${slaInfo.text}`}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>
                        {inc.status === 'ASSIGNED' ? 'Response target' : 'Resolution target'}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={slaInfo.percent}
                      sx={{
                        height: 6,
                        borderRadius: 1,
                        bgcolor: COLORS.surfaceContainerHigh,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isPaused ? COLORS.secondary : slaInfo.status === 'critical' ? COLORS.error : COLORS.primary,
                        },
                      }}
                    />
                  </Paper>
                </Box>

                {/* Bottom Quick-Action Toolbar */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    pt: 1.5,
                    borderTop: `1px solid ${COLORS.border}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {inc.status === 'ASSIGNED' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAcknowledge(inc.id)}
                        startIcon={<BoltIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: COLORS.error,
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 12,
                          textTransform: 'none',
                          px: 2,
                          py: 0.6,
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: '#e11d48' },
                        }}
                      >
                        Acknowledge Ticket
                      </Button>
                    )}

                    {inc.status === 'ACKNOWLEDGED' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleStartWork(inc.id)}
                        startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          bgcolor: COLORS.primary,
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 12,
                          textTransform: 'none',
                          px: 2,
                          py: 0.6,
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: COLORS.primaryContainer },
                        }}
                      >
                        Start Investigation
                      </Button>
                    )}

                    <Button
                      size="small"
                      onClick={() => setNoteModalIncident(inc)}
                      startIcon={<EditNoteIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.onSurface,
                        bgcolor: COLORS.surfaceContainerLow,
                        border: `1px solid ${COLORS.border}`,
                        textTransform: 'none',
                        px: 1.5,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                      }}
                    >
                      Append Note
                    </Button>

                    <Button
                      size="small"
                      onClick={() => setRequestInfoIncident(inc)}
                      startIcon={<ChatIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.onSurface,
                        bgcolor: COLORS.surfaceContainerLow,
                        border: `1px solid ${COLORS.border}`,
                        textTransform: 'none',
                        px: 1.5,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                      }}
                    >
                      Request Info
                    </Button>

                    {inc.major && problemBase && (
                      <Button
                        size="small"
                        onClick={() => openProblem(inc)}
                        startIcon={<HubIcon sx={{ fontSize: 15 }} />}
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: COLORS.error,
                          bgcolor: 'rgba(244, 63, 94, 0.1)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          textTransform: 'none',
                          px: 1.5,
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.2)' },
                        }}
                      >
                        Open problem
                      </Button>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      onClick={() => setReassignIncident(inc)}
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: COLORS.onSurfaceVariant,
                        textTransform: 'none',
                      }}
                    >
                      Reassign
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                      endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                      sx={{
                        borderColor: COLORS.primary,
                        color: COLORS.primary,
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: 'none',
                        px: 1.8,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.1)' },
                      }}
                    >
                      Diagnose in Workbench
                    </Button>
                  </Box>
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* DIALOG 1: APPEND NOTE */}
      <Dialog
        open={Boolean(noteModalIncident)}
        onClose={() => setNoteModalIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        {noteModalIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: COLORS.secondary }}>
                  SRE INTERNAL WORKBENCH // {noteModalIncident.code}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                  Append Investigation Note
                </Typography>
              </Box>
              <IconButton onClick={() => setNoteModalIncident(null)} size="small" sx={{ color: COLORS.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: COLORS.border }}>
              <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 1.5 }}>
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
                  bgcolor: COLORS.surfaceContainerLowest,
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setNoteModalIncident(null)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', textTransform: 'none', fontWeight: 700 }}
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
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        {requestInfoIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: COLORS.secondary }}>
                  CLARIFICATION REQUEST // {requestInfoIncident.code}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                  Request Information from Reporter
                </Typography>
              </Box>
              <IconButton onClick={() => setRequestInfoIncident(null)} size="small" sx={{ color: COLORS.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: COLORS.border }}>
              <Paper sx={{ p: 1.8, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                  Reporter: {requestInfoIncident.reporter?.name || 'Employee'}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
                  Submitting this request will automatically freeze the SLA countdown clock until the employee provides the requested diagnostics.
                </Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={requestInfoText}
                onChange={(e) => setRequestInfoText(e.target.value)}
                placeholder="Specify the log file, screenshot, or reproduction steps required (minimum 10 characters)..."
                sx={{
                  bgcolor: COLORS.surfaceContainerLowest,
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setRequestInfoIncident(null)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendInfoRequest}
                disabled={requestInfoText.trim().length < 10}
                sx={{ background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)', textTransform: 'none', fontWeight: 700 }}
              >
                Send Request & Pause Clock
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
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        {reassignIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                Reassign Incident {reassignIncident.code}
              </Typography>
              <IconButton onClick={() => setReassignIncident(null)} size="small" sx={{ color: COLORS.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: COLORS.border }}>
              <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
                Select target technician (required):
              </Typography>
              <Select
                fullWidth
                size="small"
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value as number)}
                displayEmpty
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 2, color: COLORS.onSurface, mb: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border } }}
              >
                <MenuItem value="" disabled>-- Select a technician --</MenuItem>
                {techList.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name} ({t.availability}, load: {t.currentLoad}/{t.maxLoad})
                  </MenuItem>
                ))}
              </Select>
              <TextField
                fullWidth
                size="small"
                label="Reason for reassignment (min 10 characters)"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Skill specialization, workload rebalancing, etc."
                error={reassignReason.length > 0 && reassignReason.trim().length < 10}
                helperText={
                  reassignReason.length > 0 && reassignReason.trim().length < 10
                    ? `At least 10 characters required (${reassignReason.trim().length}/10)`
                    : 'Required by ITIL audit policy'
                }
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReassignIncident(null)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleReassign}
                disabled={!reassignTargetId || reassignReason.trim().length < 10}
                sx={{ background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', textTransform: 'none', fontWeight: 700 }}
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
