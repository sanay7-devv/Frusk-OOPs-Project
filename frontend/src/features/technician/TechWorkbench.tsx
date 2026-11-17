import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  CircularProgress,
  Alert,
  Divider,
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
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { getIncident, getHistory, getComments, addComment } from '../../api/incidents';
import {
  acknowledgeIncident,
  startIncident,
  requestInfo,
  resolveIncident,
  escalateIncident,
  getSuggestedResolutions,
  getSimilarIncidents,
  summarizeIncident,
  getSlaRisk,
  type SuggestedResolutionView,
  type SimilarIncidentView,
  type SlaRiskView,
  type ThreadSummaryView,
} from '../../api/technicians';

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

export default function TechWorkbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const incidentId = Number(id);

  const [activeTab, setActiveTab] = useState(0);

  // Modals & form state
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [resolveRootCause, setResolveRootCause] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveSteps, setResolveSteps] = useState('');
  const [resolveTimeSpent, setResolveTimeSpent] = useState<number>(30);
  const [resolveReusable, setResolveReusable] = useState(true);

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [requestInfoText, setRequestInfoText] = useState('');

  const [newNoteText, setNewNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'PUBLIC' | 'INTERNAL'>('INTERNAL');

  const [summaryData, setSummaryData] = useState<ThreadSummaryView | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 1. Fetch incident details
  const {
    data: incident,
    isLoading,
    error,
    refetch: refetchIncident,
  } = useQuery({
    queryKey: ['incident-detail', incidentId],
    queryFn: () => getIncident(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 2. Fetch history
  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['incident-history', incidentId],
    queryFn: () => getHistory(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 3. Fetch comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: () => getComments(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 4. Fetch Suggested Resolutions
  const { data: suggestedResolutions = [] } = useQuery({
    queryKey: ['incident-suggested', incidentId],
    queryFn: () => getSuggestedResolutions(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 5. Fetch Similar Incidents
  const { data: similarIncidents = [] } = useQuery({
    queryKey: ['incident-similar', incidentId],
    queryFn: () => getSimilarIncidents(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 6. Fetch SLA Risk
  const { data: slaRisk } = useQuery({
    queryKey: ['incident-sla-risk', incidentId],
    queryFn: () => getSlaRisk(incidentId),
    enabled: !isNaN(incidentId),
  });

  const allowedActions = incident?.allowedActions || [];

  // Actions
  const handleAcknowledge = async () => {
    try {
      await acknowledgeIncident(incidentId);
      toast('Incident acknowledged. Response SLA clock stopped.', 'success');
      refetchIncident();
      refetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to acknowledge', 'error');
    }
  };

  const handleStartWork = async () => {
    try {
      await startIncident(incidentId);
      toast('Work started on incident. Status moved to IN_PROGRESS.', 'success');
      refetchIncident();
      refetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to start work', 'error');
    }
  };

  const handleRequestInfo = async () => {
    if (!requestInfoText.trim() || requestInfoText.trim().length < 10) {
      toast('Message must be at least 10 characters long.', 'warning');
      return;
    }
    try {
      await requestInfo(incidentId, requestInfoText.trim());
      toast('Clarification request sent to reporter. SLA clock is PAUSED.', 'warning');
      setIsRequestInfoOpen(false);
      setRequestInfoText('');
      refetchIncident();
      refetchHistory();
      refetchComments();
    } catch (err: any) {
      toast(err.message || 'Failed to request info', 'error');
    }
  };

  const handleResolveIncident = async () => {
    if (!resolveRootCause.trim() || resolveRootCause.trim().length < 10) {
      toast('Root cause must be at least 10 characters long.', 'warning');
      return;
    }
    if (!resolveNotes.trim() || resolveNotes.trim().length < 10) {
      toast('Resolution notes must be at least 10 characters long.', 'warning');
      return;
    }
    try {
      await resolveIncident(incidentId, {
        rootCause: resolveRootCause.trim(),
        notes: resolveNotes.trim(),
        steps: resolveSteps.trim() || undefined,
        timeSpentMinutes: resolveTimeSpent || 30,
        reusableSolution: resolveReusable,
      });
      toast(`Incident marked as RESOLVED. Concurrency capacity released.`, 'success');
      setIsResolveOpen(false);
      refetchIncident();
      refetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to resolve incident', 'error');
    }
  };

  const handleEscalateIncident = async () => {
    if (!escalateReason.trim() || escalateReason.trim().length < 10) {
      toast('Escalation reason must be at least 10 characters long.', 'warning');
      return;
    }
    try {
      await escalateIncident(incidentId, escalateReason.trim());
      toast('Incident escalation level raised. High-priority alert dispatched.', 'warning');
      setIsEscalateOpen(false);
      setEscalateReason('');
      refetchIncident();
      refetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to escalate', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      await addComment(incidentId, newNoteText.trim(), noteVisibility);
      toast('Investigation note appended to timeline.', 'success');
      setNewNoteText('');
      refetchComments();
      refetchHistory();
    } catch (err: any) {
      toast(err.message || 'Failed to add note', 'error');
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const result = await summarizeIncident(incidentId);
      setSummaryData(result);
      toast('AI thread summary and handover notes generated.', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to generate AI summary', 'error');
    } finally {
      setIsSummarizing(false);
    }
  };

  const applySuggestedResolution = (res: SuggestedResolutionView) => {
    setResolveRootCause(res.rootCause || `Issue caused by duplicate root cause matching ${res.code}`);
    setResolveNotes(res.notes || `Applied proven fix from incident ${res.code}: ${res.title}`);
    setResolveSteps(res.steps || 'Verified configuration rollback and restored service traffic.');
    setResolveReusable(true);
    setIsResolveOpen(true);
    toast(`Pre-filled resolution modal from ${res.code}.`, 'info');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: COLORS.surface, minHeight: '100vh' }}>
        <CircularProgress size={40} sx={{ color: COLORS.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ color: COLORS.onSurface }}>Loading Incident Diagnosis Workbench...</Typography>
      </Box>
    );
  }

  if (error || !incident) {
    return (
      <Box sx={{ p: 4, bgcolor: COLORS.surface, minHeight: '100vh' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load incident: {error ? (error as Error).message : 'Incident not found'}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/tech/queue')} sx={{ color: COLORS.primary }}>
          Back to Queue
        </Button>
      </Box>
    );
  }

  const isCritical = incident.priority === 'P1';
  const isHigh = incident.priority === 'P2';
  const isPaused = incident.status === 'PENDING_USER_INFO' || incident.slaState === 'PAUSED';
  const targetDue = incident.status === 'ASSIGNED' ? incident.responseDue : incident.resolutionDue;
  const slaInfo = isPaused
    ? { text: 'PAUSED', percent: 50, status: 'paused' as const }
    : formatTimeRemaining(targetDue);

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
              {incident.code}
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
                {user?.name || 'Technician'} // Assigned SRE
              </Typography>
              <IconButton size="small" onClick={() => { refetchIncident(); refetchHistory(); refetchComments(); }} sx={{ color: COLORS.onSurfaceVariant, p: 0.2 }}>
                <RefreshIcon sx={{ fontSize: 14 }} />
              </IconButton>
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
            borderLeft: isCritical ? `4px solid ${COLORS.error}` : isHigh ? `4px solid ${COLORS.secondary}` : `1px solid ${COLORS.border}`,
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
                <Chip
                  size="small"
                  label={
                    isCritical ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                        P1 CRITICAL
                      </Box>
                    ) : (
                      `${incident.priority || 'P3'} ${isHigh ? 'HIGH' : 'MEDIUM'}`
                    )
                  }
                  sx={{
                    bgcolor: isCritical ? COLORS.errorContainer : COLORS.surfaceContainerHigh,
                    color: isCritical ? COLORS.error : COLORS.secondary,
                    fontWeight: 800,
                    fontSize: 11,
                    height: 24,
                  }}
                />

                <Chip
                  size="small"
                  label={incident.status.replace(/_/g, ' ')}
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
                  label={incident.service?.name || 'Service'}
                  sx={{
                    bgcolor: COLORS.surfaceContainerLow,
                    color: COLORS.primary,
                    fontWeight: 600,
                    fontSize: 11,
                    height: 24,
                  }}
                />

                {incident.category?.name && (
                  <Chip
                    size="small"
                    label={incident.category.name}
                    sx={{
                      bgcolor: COLORS.surfaceContainerLow,
                      color: COLORS.onSurfaceVariant,
                      fontSize: 11,
                      height: 24,
                    }}
                  />
                )}

                {incident.escalationLevel > 0 && (
                  <Chip
                    size="small"
                    label={`Escalation L${incident.escalationLevel}`}
                    sx={{
                      bgcolor: 'rgba(244, 63, 94, 0.15)',
                      color: COLORS.error,
                      fontWeight: 700,
                      fontSize: 11,
                      height: 24,
                    }}
                  />
                )}

                {incident.major && (
                  <Chip
                    size="small"
                    label="MAJOR INCIDENT"
                    sx={{
                      bgcolor: 'rgba(244, 63, 94, 0.2)',
                      color: '#fb7185',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      fontWeight: 800,
                      fontSize: 10,
                      fontFamily: 'monospace',
                      height: 24,
                    }}
                  />
                )}

                {incident.problemId && (
                  <Chip
                    size="small"
                    label={`Problem #${incident.problemId}`}
                    sx={{
                      bgcolor: 'rgba(99, 102, 241, 0.15)',
                      color: COLORS.primary,
                      border: `1px solid rgba(99, 102, 241, 0.35)`,
                      fontWeight: 700,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      height: 24,
                    }}
                  />
                )}

                {incident.duplicateOfId && (
                  <Chip
                    size="small"
                    label={`Duplicate of #${incident.duplicateOfId}`}
                    sx={{
                      bgcolor: COLORS.surfaceContainerLow,
                      color: COLORS.onSurfaceVariant,
                      fontSize: 11,
                      height: 24,
                    }}
                  />
                )}
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
                {incident.code}: {incident.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <span>Reporter: <strong>{incident.reporter?.name || 'Employee'}</strong></span>
                <span>•</span>
                <span>Assignee: <strong>{incident.assignee?.name || 'Unassigned'}</strong></span>
                <span>•</span>
                <span>Impact: <strong>{incident.affectedUsers || 1} users affected</strong></span>
                {incident.priorityBreakdown && (
                  <>
                    <span>•</span>
                    <span>Calculated Score: <strong>{incident.priorityBreakdown.score} ({incident.priorityBreakdown.band})</strong></span>
                  </>
                )}
              </Box>
            </Box>

            {/* SLA Countdown Timer Box */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor:
                  slaInfo.status === 'critical'
                    ? COLORS.errorContainer
                    : isPaused
                    ? COLORS.surfaceContainerHigh
                    : COLORS.surfaceContainer,
                border: `1px solid ${
                  slaInfo.status === 'critical'
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
                    color: slaInfo.status === 'critical' ? COLORS.error : COLORS.onSurfaceVariant,
                  }}
                >
                  {incident.status === 'ASSIGNED' ? 'Response SLA Clock' : 'Resolution SLA Clock'}
                </Typography>
                {slaInfo.status === 'critical' && (
                  <CrisisAlertIcon sx={{ fontSize: 16, color: COLORS.error, animation: 'pulse 1.5s infinite' }} />
                )}
                {isPaused && (
                  <PauseCircleIcon sx={{ fontSize: 16, color: COLORS.secondary }} />
                )}
              </Box>

              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 22,
                  fontWeight: 800,
                  color: isPaused ? COLORS.secondary : slaInfo.status === 'critical' ? COLORS.error : COLORS.onSurface,
                  lineHeight: 1.1,
                  mb: 0.75,
                }}
              >
                {slaInfo.text}
              </Typography>

              {/* Progress Bar */}
              <Box sx={{ width: '100%', height: 6, bgcolor: 'rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${slaInfo.percent}%`,
                    bgcolor: isPaused ? COLORS.secondary : slaInfo.status === 'critical' ? COLORS.error : COLORS.primary,
                    borderRadius: 10,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, pt: 0.5 }}>
                {isPaused ? 'Clock frozen while awaiting user response' : `SLA State: ${incident.slaState}`}
              </Typography>
            </Box>
          </Box>

          {/* Quick Action Ribbon driven by allowedActions */}
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
            {allowedActions.includes('ACKNOWLEDGE' as any) && (
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

            {allowedActions.includes('START_WORK' as any) && (
              <Button
                variant="contained"
                onClick={handleStartWork}
                startIcon={<PlayArrowIcon />}
                sx={{
                  bgcolor: COLORS.primary,
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  '&:hover': { bgcolor: COLORS.primaryContainer },
                }}
              >
                Start Investigation
              </Button>
            )}

            {allowedActions.includes('REQUEST_INFO' as any) && (
              <Button
                variant="outlined"
                onClick={() => setIsRequestInfoOpen(true)}
                startIcon={<PauseCircleIcon />}
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
                Request Info (Pause SLA)
              </Button>
            )}

            {allowedActions.includes('ESCALATE' as any) && (
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
                Escalate Level
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={handleGenerateSummary}
              disabled={isSummarizing}
              startIcon={<PsychologyIcon sx={{ color: COLORS.secondary }} />}
              sx={{
                borderColor: 'rgba(6, 182, 212, 0.3)',
                color: COLORS.secondary,
                fontWeight: 600,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: COLORS.surfaceContainerLowest,
                '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.1)' },
              }}
            >
              {isSummarizing ? 'Analyzing...' : 'Generate AI Handover'}
            </Button>

            {allowedActions.includes('RESOLVE' as any) && (
              <Box sx={{ ml: 'auto' }}>
                <Button
                  variant="contained"
                  onClick={() => setIsResolveOpen(true)}
                  startIcon={<DoneAllIcon />}
                  sx={{
                    bgcolor: COLORS.success,
                    color: '#ffffff',
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
            )}
          </Box>
        </Paper>
      </Box>

      {/* Main Workspace Split Grid */}
      <Grid container spacing={2.5}>
        {/* Left Column: Diagnostics, AI Solutions & Timeline Tabs */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
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
                <Tab icon={<AutoFixHighIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Suggested Resolutions (${suggestedResolutions.length})`} />
                <Tab icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Timeline & Notes (${history.length + comments.length})`} />
                <Tab icon={<HubIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Similar Incidents (${similarIncidents.length})`} />
              </Tabs>
            </Box>

            {/* TAB 0: Suggested Resolutions & AI Intelligence */}
            {activeTab === 0 && (
              <Box sx={{ p: 2.5 }}>
                {summaryData && (
                  <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.surfaceContainer, border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PsychologyIcon sx={{ color: COLORS.secondary, fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: COLORS.secondary }}>
                        AI Incident Summary &amp; Handover ({summaryData.source})
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mb: 1.5, lineHeight: 1.5 }}>
                      {summaryData.summary}
                    </Typography>
                    {summaryData.handoverNotes && summaryData.handoverNotes.length > 0 && (
                      <Box sx={{ pl: 2 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, mb: 0.5 }}>
                          Handover Checkpoints:
                        </Typography>
                        {summaryData.handoverNotes.map((note, idx) => (
                          <Typography key={idx} sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mb: 0.3 }}>
                            • {note}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </Paper>
                )}

                <Typography sx={{ fontWeight: 800, fontSize: 14, color: COLORS.onSurface, mb: 1 }}>
                  Proven Fixes from Historical Incidents
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mb: 2 }}>
                  These resolution strategies were successfully verified on resolved incidents sharing the same service and failure symptoms.
                </Typography>

                {suggestedResolutions.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
                      No direct historical duplicates found. Proceed with standard troubleshooting or view AI Summary.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {suggestedResolutions.map((res) => (
                      <Paper
                        key={res.fromIncidentId}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: COLORS.surfaceContainer,
                          border: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${Math.round(res.similarity * 100)}% Match`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10.5,
                                fontWeight: 800,
                                bgcolor: 'rgba(16, 185, 129, 0.15)',
                                color: COLORS.success,
                              }}
                            />
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: COLORS.secondary }}>
                              {res.code}
                            </Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: COLORS.onSurface }}>
                              {res.title}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => applySuggestedResolution(res)}
                            sx={{
                              borderColor: COLORS.primary,
                              color: COLORS.primary,
                              textTransform: 'none',
                              fontSize: 11.5,
                              fontWeight: 700,
                            }}
                          >
                            Apply this Fix
                          </Button>
                        </Box>
                        <Box sx={{ bgcolor: COLORS.surfaceContainerLowest, p: 1.5, borderRadius: 1.5, mb: 1 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant }}>
                            Root Cause:
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface, mb: 1 }}>
                            {res.rootCause}
                          </Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant }}>
                            Resolution Steps:
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                            {res.notes || res.steps}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {/* TAB 1: Timeline & Notes */}
            {activeTab === 1 && (
              <Box sx={{ p: 2.5 }}>
                {/* Note Composer */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: COLORS.surfaceContainer, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mb: 1 }}>
                    Append Investigation Note
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Log observation, root cause findings, diagnostic steps, or internal technical update..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    sx={{
                      bgcolor: COLORS.surfaceContainerLowest,
                      borderRadius: 1.5,
                      mb: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>Visibility:</Typography>
                      <Chip
                        label="INTERNAL (Techs & Admins Only)"
                        clickable
                        onClick={() => setNoteVisibility('INTERNAL')}
                        size="small"
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: noteVisibility === 'INTERNAL' ? COLORS.primary : COLORS.surfaceContainerHigh,
                          color: noteVisibility === 'INTERNAL' ? '#ffffff' : COLORS.onSurfaceVariant,
                        }}
                      />
                      <Chip
                        label="PUBLIC (Visible to Reporter)"
                        clickable
                        onClick={() => setNoteVisibility('PUBLIC')}
                        size="small"
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          bgcolor: noteVisibility === 'PUBLIC' ? COLORS.secondary : COLORS.surfaceContainerHigh,
                          color: noteVisibility === 'PUBLIC' ? '#ffffff' : COLORS.onSurfaceVariant,
                        }}
                      />
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleAddNote}
                      disabled={!newNoteText.trim()}
                      startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary }}
                    >
                      Post Note
                    </Button>
                  </Box>
                </Paper>

                {/* Unified Timeline entries */}
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: COLORS.onSurface, mb: 1.5 }}>
                  Audit Trail &amp; Comments
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {history.map((h: any, idx: number) => (
                    <Box
                      key={`hist-${idx}`}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: COLORS.surfaceContainer,
                        borderLeft: `3px solid ${COLORS.primary}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={h.action || 'AUDIT'} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800 }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                            {h.actor?.name || 'System'}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurfaceVariant }}>
                          {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        {h.description || (h.previousState && h.newState ? `${h.previousState} → ${h.newState}` : h.action?.replace(/_/g, ' ') || 'Event recorded')}
                      </Typography>
                    </Box>
                  ))}

                  {comments.map((c: any) => (
                    <Box
                      key={`comm-${c.id}`}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: COLORS.surfaceContainer,
                        borderLeft: `3px solid ${c.visibility === 'INTERNAL' ? COLORS.tertiary : COLORS.secondary}`,
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={c.visibility || 'PUBLIC'}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 800,
                              bgcolor: c.visibility === 'INTERNAL' ? 'rgba(247, 81, 161, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                              color: c.visibility === 'INTERNAL' ? COLORS.tertiary : COLORS.secondary,
                            }}
                          />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                            {c.author?.name || 'User'}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: COLORS.onSurfaceVariant }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface, whiteSpace: 'pre-wrap' }}>
                        {c.body}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* TAB 2: Similar Incidents */}
            {activeTab === 2 && (
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: COLORS.onSurface, mb: 1 }}>
                  Open Incidents on Same Service
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mb: 2 }}>
                  Candidates for correlation or duplicate linking.
                </Typography>

                {similarIncidents.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
                      No active similar incidents detected for this service.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {similarIncidents.map((s: SimilarIncidentView) => (
                      <Paper
                        key={s.incidentId}
                        sx={{
                          p: 1.8,
                          bgcolor: COLORS.surfaceContainer,
                          border: `1px solid ${COLORS.border}`,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              label={`${Math.round(s.similarity * 100)}% SIMILAR`}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 800,
                                bgcolor: 'rgba(99, 102, 241, 0.15)',
                                color: COLORS.primary,
                              }}
                            />
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: COLORS.secondary }}>
                              {s.code}
                            </Typography>
                            <Chip label={s.status} size="small" sx={{ height: 18, fontSize: 10 }} />
                          </Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                            {s.title}
                          </Typography>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => navigate(`/tech/incidents/${s.incidentId}`)}
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                          sx={{ textTransform: 'none', color: COLORS.primary, fontSize: 12, fontWeight: 700 }}
                        >
                          View Ticket
                        </Button>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Telemetry, SLA Risk & Description (30%) */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Description & Incident Details */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: COLORS.onSurface, textTransform: 'uppercase', mb: 1.5 }}>
                Problem Description
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.onSurface, lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: 2 }}>
                {incident.description || 'No detailed description provided.'}
              </Typography>
              <Divider sx={{ borderColor: COLORS.border, my: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.onSurfaceVariant }}>Impact Level:</span>
                  <strong>{incident.impact}/5</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.onSurfaceVariant }}>Urgency Level:</span>
                  <strong>{incident.urgency}/5</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.onSurfaceVariant }}>Service Criticality:</span>
                  <strong>{incident.priorityBreakdown?.criticality || 3}/5</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.onSurfaceVariant }}>Reopen Count:</span>
                  <strong>{incident.reopenCount}</strong>
                </Box>
                {incident.priorityBreakdown?.overrideRule && (
                  <Box sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', p: 1, borderRadius: 1.5, mt: 0.5 }}>
                    <Typography sx={{ fontSize: 11, color: COLORS.primary, fontWeight: 700 }}>
                      Override Rule: {incident.priorityBreakdown.overrideRule}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* SLA Risk Scorecard */}
            {slaRisk && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: COLORS.onSurface, textTransform: 'uppercase' }}>
                    SLA Risk Prediction
                  </Typography>
                  <Chip
                    label={slaRisk.level}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: 10.5,
                      bgcolor: slaRisk.atRisk ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: slaRisk.atRisk ? COLORS.error : COLORS.success,
                    }}
                  />
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>Probability of SLA Breach:</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: slaRisk.atRisk ? COLORS.error : COLORS.onSurface }}>
                      {Math.round(slaRisk.score * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.round(slaRisk.score * 100))}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: COLORS.surfaceContainerHigh,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: slaRisk.atRisk ? COLORS.error : COLORS.secondary,
                      },
                    }}
                  />
                </Box>
                {slaRisk.factors && slaRisk.factors.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {slaRisk.factors.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                        <span>{f.name}:</span>
                        <span style={{ fontWeight: 700, color: COLORS.onSurface }}>{f.detail || `${Math.round(f.contribution * 100)}%`}</span>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* RESOLVE DIALOG */}
      <Dialog
        open={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DoneAllIcon sx={{ color: COLORS.success }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface }}>
              Resolve Incident {incident.code}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsResolveOpen(false)} sx={{ color: COLORS.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Root Cause Analysis (min 10 characters) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={resolveRootCause}
                onChange={(e) => setResolveRootCause(e.target.value)}
                placeholder="Identify underlying cause (deadlock, packet loss, config misconfiguration, etc.)"
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Resolution Actions &amp; Fix Notes (min 10 characters) *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Describe corrective actions taken to resolve the failure..."
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Steps for Long-Term Prevention (optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={resolveSteps}
                onChange={(e) => setResolveSteps(e.target.value)}
                placeholder="Architectural safeguards, monitoring rule additions, etc."
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                type="number"
                size="small"
                label="Time Spent (minutes)"
                value={resolveTimeSpent}
                onChange={(e) => setResolveTimeSpent(Number(e.target.value))}
                sx={{ width: 160, bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={resolveReusable}
                    onChange={(e) => setResolveReusable(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>Mark as Reusable Fix for AI</Typography>}
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
            disabled={resolveRootCause.trim().length < 10 || resolveNotes.trim().length < 10}
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

      {/* ESCALATE DIALOG */}
      <Dialog
        open={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: COLORS.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface }}>Escalate Incident</Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsEscalateOpen(false)} sx={{ color: COLORS.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              Raise the escalation tier of this incident by 1 level. Current level: Level {incident.escalationLevel}.
            </Typography>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: COLORS.onSurface }}>
                Escalation Justification (min 10 characters) *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Explain the technical impediment, blast radius, or skill requirement..."
                sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
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
            disabled={escalateReason.trim().length < 10}
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

      {/* REQUEST INFO DIALOG */}
      <Dialog
        open={isRequestInfoOpen}
        onClose={() => setIsRequestInfoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PauseCircleIcon sx={{ color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface }}>
              Request Information (Pause SLA)
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setIsRequestInfoOpen(false)} sx={{ color: COLORS.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Paper sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 12.5, color: COLORS.secondary, fontWeight: 700 }}>
                Dispatches a notification to {incident.reporter?.name || 'the reporter'} and pauses the SLA clock until info is provided.
              </Typography>
            </Paper>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Specify the logs, reproduction steps, or details required from the reporter (minimum 10 characters)..."
              value={requestInfoText}
              onChange={(e) => setRequestInfoText(e.target.value)}
              sx={{ bgcolor: COLORS.surfaceContainerLowest, borderRadius: 1.5 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsRequestInfoOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRequestInfo}
            disabled={requestInfoText.trim().length < 10}
            sx={{
              textTransform: 'none',
              bgcolor: COLORS.secondary,
              color: '#000000',
              fontWeight: 800,
              '&:hover': { bgcolor: '#22d3ee' },
            }}
          >
            Send Request &amp; Freeze Clock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
