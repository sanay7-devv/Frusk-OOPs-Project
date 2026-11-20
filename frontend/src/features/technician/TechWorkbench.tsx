import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { useLiveRefresh } from '../shared/useLiveRefresh';
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
  PauseCircle as PauseCircleIcon,
  PlayArrow as PlayArrowIcon,
  AutoFixHigh as AutoFixHighIcon,
  Timeline as TimelineIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  UploadFile as UploadFileIcon,
  SwapHoriz as SwapHorizIcon,
  ContentCopy as ContentCopyIcon,
  Flag as FlagIcon,
  Link as LinkIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
  Hub as HubIcon,
  DoneAll as DoneAllIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

import { tokens, slaStateColor } from '../../theme/theme';
import { useToast } from '../../components/Toast';
import { apiErrorMessage } from '../../utils/errors';
import PriorityBadge from '../../components/PriorityBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/StateViews';
import { ReassignDialog, AssignDialog, MarkDuplicateDialog, OverridePriorityDialog, LinkProblemDialog } from './WorkbenchDialogs';
import { EditIncidentDialog } from '../lead/shared/IncidentActionDialogs';
import ActionButtons from '../../components/ActionButtons';
import { isStaleDataError, fieldErrorFor } from './apiErrors';
import WhyAssignee from '../lead/shared/WhyAssignee';
import SlaClockPair from '../lead/shared/SlaClockPair';
import SlaCountdown from '../../components/SlaCountdown';
import PriorityExplainer from '../../components/PriorityExplainer';
import { useAuth } from '../../auth/AuthContext';
import { useProblemBasePath } from '../problems/problemAccess';
import {
  getIncident,
  getHistory,
  getComments,
  addComment,
  listAttachments,
  downloadPostIncidentReportPdf,
  getRecommendations,
  uploadAttachment,
  downloadAttachment,
  verifyIncident,
  reopenIncident,
  closeIncident,
} from '../../api/incidents';
import { resolveProblem } from '../../api/problems';
import { getServiceImpact } from '../../api/services';
import type { CommentView, AuditEntry, AttachmentView, RecommendationView, IncidentAction, IncidentDetail } from '../../api/types';
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
import { alpha } from './staffStyle';

// Colours come from the shared theme tokens; status colours from the shared SLA/priority maps.

/** Actions that belong to someone else or to another part of this screen: the note composer (COMMENT) and the reporter's own actions. */
const RIBBON_EXCLUDED: IncidentAction[] = ['COMMENT', 'PROVIDE_INFO', 'GIVE_FEEDBACK', 'WITHDRAW'];
const RIBBON_LABELS: Partial<Record<IncidentAction, string>> = {
  ACKNOWLEDGE: 'Acknowledge incident',
  START_WORK: 'Start investigation',
  REQUEST_INFO: 'Request info (pause SLA)',
  ESCALATE: 'Escalate level',
  OVERRIDE_PRIORITY: 'Priority / what-if',
  VERIFY: 'Verify fix',
  CLOSE: 'Close incident',
  RESOLVE: 'Resolve incident',
  REOPEN: 'Reopen incident',
  EDIT: 'Edit incident',
};
const RIBBON_ICONS: Partial<Record<IncidentAction, ReactNode>> = {
  ACKNOWLEDGE: <CheckCircleIcon />,
  START_WORK: <PlayArrowIcon />,
  REQUEST_INFO: <PauseCircleIcon />,
  ESCALATE: <TrendingUpIcon />,
  ASSIGN: <SwapHorizIcon />,
  REASSIGN: <SwapHorizIcon />,
  OVERRIDE_PRIORITY: <FlagIcon />,
  MARK_DUPLICATE: <ContentCopyIcon />,
  VERIFY: <CheckCircleIcon />,
  CLOSE: <DoneAllIcon />,
  RESOLVE: <DoneAllIcon />,
};

/** One-line description of the calendar the SLA clocks run on. */
function slaCalendarNote(c: IncidentDetail['slaCalendar']): string {
  if (!c) return '';
  if (c.type === 'ALWAYS') return 'SLA calendar: 24/7';
  const days = (c.days ?? '').split(',').filter(Boolean);
  const range = days.length > 1 ? `${days[0]}-${days[days.length - 1]}` : days[0] ?? '';
  return `Business hours: ${[range, c.open && c.close ? `${c.open}-${c.close}` : '', c.zone ?? ''].filter(Boolean).join(' ')}`;
}

export default function TechWorkbench() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const problemBase = useProblemBasePath();

  const incidentId = Number(id);

  const [activeTab, setActiveTab] = useState(0);

  // Modals & form state
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [resolveRootCause, setResolveRootCause] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveSteps, setResolveSteps] = useState('');
  const [resolveTimeSpent, setResolveTimeSpent] = useState<string>('');
  const [resolveReusable, setResolveReusable] = useState(true);
  // The server's field errors (ApiError.fieldErrors) from the last failed resolve, shown under the matching fields.
  const [resolveErr, setResolveErr] = useState<unknown>(null);

  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const [isRequestInfoOpen, setIsRequestInfoOpen] = useState(false);
  const [requestInfoText, setRequestInfoText] = useState('');

  const [newNoteText, setNewNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'PUBLIC' | 'INTERNAL'>('INTERNAL');

  const [summaryData, setSummaryData] = useState<ThreadSummaryView | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [dupTargetId, setDupTargetId] = useState<number | null>(null);
  const [isDupOpen, setIsDupOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isProblemOpen, setIsProblemOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'CLOSE' | 'VERIFY' | 'REOPEN' | 'PUBLIC_NOTE' | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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
  const { data: history = [], refetch: refetchHistory, isError: historyError, error: historyErr } = useQuery({
    queryKey: ['incident-history', incidentId],
    queryFn: () => getHistory(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 3. Fetch comments
  const { data: comments = [], refetch: refetchComments, isError: commentsError, error: commentsErr } = useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: () => getComments(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 4. Fetch Suggested Resolutions
  const { data: suggestedResolutions = [], refetch: refetchSuggestions, isError: suggestedError, error: suggestedErr } = useQuery({
    queryKey: ['incident-suggested', incidentId],
    queryFn: () => getSuggestedResolutions(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 5. Fetch Similar Incidents
  const { data: similarIncidents = [], refetch: refetchSimilar, isError: similarError, error: similarErr } = useQuery({
    queryKey: ['incident-similar', incidentId],
    queryFn: () => getSimilarIncidents(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 6. Fetch SLA Risk
  const { data: slaRisk, refetch: refetchSlaRisk, isError: slaRiskError, error: slaRiskErr } = useQuery({
    queryKey: ['incident-sla-risk', incidentId],
    queryFn: () => getSlaRisk(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 7. Fetch Attachments
  const { data: attachments = [], refetch: refetchAttachments, isError: attachmentsError, error: attachmentsErr } = useQuery<AttachmentView[]>({
    queryKey: ['incident-attachments', incidentId],
    queryFn: () => listAttachments(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 8. Fetch Recommendations for Assignee Breakdown
  const { data: recommendations } = useQuery<RecommendationView>({
    queryKey: ['incident-recommendations', incidentId],
    queryFn: () => getRecommendations(incidentId),
    enabled: !isNaN(incidentId),
  });

  // 9. Services that depend on this incident's service (GET /services/{id}/impact)
  const serviceId = incident?.service?.id;
  const { data: impact, isError: impactError, error: impactErr, refetch: refetchImpact } = useQuery({
    queryKey: ['incident-service-impact', serviceId],
    queryFn: () => getServiceImpact(serviceId as number),
    enabled: serviceId != null,
  });

  const reporterContact = incident?.reporterContact ?? null;

  const [resolveWholeProblem, setResolveWholeProblem] = useState(false);
  const allowedActions = incident?.allowedActions || [];

  const handleRefreshAll = () => {
    refetchIncident();
    refetchHistory();
    refetchComments();
    refetchSuggestions();
    refetchSimilar();
    refetchSlaRisk();
    refetchAttachments();
    queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
    queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    queryClient.invalidateQueries({ queryKey: ['incident-recommendations', incidentId] });
    if (serviceId != null) refetchImpact();
  };
  // Live updates: server pushes (STOMP via realtime/useRealtime) reload this incident's data.
  useLiveRefresh(handleRefreshAll, !isNaN(incidentId));

  const isStaffLead = !!user?.permissions?.includes('TEAM_VIEW');
  const canSummarize = isStaffLead || (incident?.assignee != null && incident.assignee.id === user?.id);

  // Actions
  const handleAcknowledge = async () => {
    try {
      await acknowledgeIncident(incidentId);
      toast('Incident acknowledged. Response SLA clock stopped.', 'success');
      handleRefreshAll();
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    }
  };

  const handleStartWork = async () => {
    try {
      await startIncident(incidentId);
      toast('Work started on incident. Status moved to IN_PROGRESS.', 'success');
      handleRefreshAll();
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
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
      handleRefreshAll();
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
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
    const minutes = Number(resolveTimeSpent);
    if (!resolveTimeSpent.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > 10080) {
      toast('Time spent must be a whole number of minutes from 1 to 10080.', 'warning');
      return;
    }
    setResolveErr(null);
    try {
      const updated = await resolveIncident(incidentId, {
        rootCause: resolveRootCause.trim(),
        notes: resolveNotes.trim(),
        steps: resolveSteps.trim() || undefined,
        timeSpentMinutes: minutes,
        reusableSolution: resolveReusable,
      });
      toast(`${incident?.code ?? 'Incident'} is now ${updated.status.replace(/_/g, ' ')}.`, 'success');

      if (resolveWholeProblem && incident?.problemId) {
        try {
          await resolveProblem(incident.problemId, {
            rootCause: resolveRootCause.trim(),
            notes: resolveNotes.trim(),
            steps: resolveSteps.trim() || undefined,
            timeSpentMinutes: minutes,
          });
          toast(`Linked Problem record #${incident.problemId} also resolved.`, 'success');
        } catch (problemErr: any) {
          toast(`Incident resolved, but problem closure returned: ${apiErrorMessage(problemErr)}`, 'warning');
        }
      }

      setIsResolveOpen(false);
      handleRefreshAll();
    } catch (err: any) {
      setResolveErr(err);
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    }
  };

  const handleEscalateIncident = async () => {
    if (!escalateReason.trim() || escalateReason.trim().length < 10) {
      toast('Escalation reason must be at least 10 characters long.', 'warning');
      return;
    }
    if (escalateReason.trim().length > 1000) {
      toast('Escalation reason cannot exceed 1000 characters.', 'warning');
      return;
    }
    try {
      await escalateIncident(incidentId, escalateReason.trim());
      toast('Incident escalation level raised. High-priority alert dispatched.', 'warning');
      setIsEscalateOpen(false);
      setEscalateReason('');
      handleRefreshAll();
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || newNoteText.length > 4000) return;
    try {
      await addComment(incidentId, newNoteText.trim(), noteVisibility);
      toast('Investigation note appended to timeline.', 'success');
      setNewNoteText('');
      refetchComments();
      refetchHistory();
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const result = await summarizeIncident(incidentId);
      setSummaryData(result);
      toast('AI thread summary and handover notes generated.', 'success');
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleConfirmed = async (reason?: string) => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction === 'PUBLIC_NOTE') {
        await handleAddNote();
      } else if (confirmAction === 'REOPEN') {
        await reopenIncident(incidentId, reason ?? '');
        toast(`${incident?.code ?? 'Incident'} reopened.`, 'success');
        handleRefreshAll();
      } else if (confirmAction === 'CLOSE') {
        await closeIncident(incidentId);
        toast(`${incident?.code ?? 'Incident'} closed.`, 'success');
        handleRefreshAll();
      } else {
        await verifyIncident(incidentId);
        toast(`${incident?.code ?? 'Incident'} verified.`, 'success');
        handleRefreshAll();
      }
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    } finally {
      setConfirmBusy(false);
      setConfirmAction(null);
    }
  };

  const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast('That file is larger than 5 MB. Choose a smaller one.', 'warning');
      return;
    }
    setUploading(true);
    try {
      await uploadAttachment(incidentId, file);
      toast(`${file.name} attached.`, 'success');
      refetchAttachments();
      refetchHistory();
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const handleDownload = async (att: AttachmentView) => {
    try {
      const blob = await downloadAttachment(att.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) handleRefreshAll();
    }
  };

  const applySuggestedResolution = (res: SuggestedResolutionView) => {
    setResolveRootCause(res.rootCause ?? '');
    setResolveNotes(res.notes ?? '');
    setResolveSteps(res.steps ?? '');
    setResolveReusable(true);
    setIsResolveOpen(true);
    toast(`Filled the resolve form from ${res.code}. Review it before you resolve.`, 'info');
  };

  /** One place that turns an allowedActions key from the ribbon into what happens next. */
  const onRibbonAction = (a: IncidentAction) => {
    switch (a) {
      case 'ACKNOWLEDGE': return handleAcknowledge();
      case 'START_WORK': return handleStartWork();
      case 'REQUEST_INFO': return setIsRequestInfoOpen(true);
      case 'ESCALATE': return setIsEscalateOpen(true);
      case 'ASSIGN': return setIsAssignOpen(true);
      case 'REASSIGN': return setIsReassignOpen(true);
      case 'OVERRIDE_PRIORITY': return setIsPriorityOpen(true);
      case 'MARK_DUPLICATE': setDupTargetId(null); return setIsDupOpen(true);
      case 'EDIT': return setIsEditOpen(true);
      case 'VERIFY': return setConfirmAction('VERIFY');
      case 'CLOSE': return setConfirmAction('CLOSE');
      case 'REOPEN': return setConfirmAction('REOPEN');
      case 'RESOLVE': return setIsResolveOpen(true);
      default: return undefined;
    }
  };

  const timelineEntries = [
    ...history
      .filter((h) => h.action !== 'COMMENT_ADDED')
      .map((h, idx) => ({
        key: `h-${idx}-${h.timestamp}`,
        type: 'audit' as const,
        timestamp: h.timestamp || '',
        actor: h.actor?.name || 'System',
        badge: h.action || 'AUDIT',
        text: h.description || (h.previousState && h.newState ? `${h.previousState} → ${h.newState}` : h.action?.replace(/_/g, ' ') || 'Event recorded'),
      })),
    ...comments.map((c) => ({
      key: `c-${c.id}`,
      type: 'comment' as const,
      timestamp: c.createdAt || '',
      actor: c.author?.name || 'User',
      badge: c.visibility || 'PUBLIC',
      text: c.body,
      visibility: c.visibility,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatTimelineDate = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return (
      d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    );
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: tokens.background, minHeight: '100vh' }}>
        <CircularProgress size={40} sx={{ color: tokens.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ color: tokens.onSurface }}>Loading Incident Diagnosis Workbench...</Typography>
      </Box>
    );
  }

  if (error || !incident) {
    const status = (error as AxiosError | null)?.response?.status;
    const loadMessage =
      status === 403
        ? 'You do not have access to this incident. Only the assignee, team leads and administrators can open it here.'
        : status === 404 || (!error && !incident)
          ? 'This incident does not exist, or it is not visible to you.'
          : apiErrorMessage(error);
    return (
      <Box sx={{ p: 4, bgcolor: tokens.background, minHeight: '100vh' }}>
        <Alert severity={status === 403 ? 'warning' : 'error'} sx={{ mb: 3 }}>
          {loadMessage}
        </Alert>
        <Button variant="outlined" onClick={() => navigate('/tech/queue')} sx={{ color: tokens.primary }}>
          Back to Queue
        </Button>
      </Box>
    );
  }

  const isCritical = incident.priority === 'P1';
  const isHigh = incident.priority === 'P2';

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: tokens.background, minHeight: '100vh' }}>
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
                color: tokens.onSurfaceVariant,
                textTransform: 'none',
                px: 1,
                py: 0.5,
                borderRadius: 1.5,
                bgcolor: tokens.surfaceContainerLowest,
                border: `1px solid ${tokens.outlineVariant}`,
                '&:hover': { bgcolor: tokens.surfaceContainerLow },
              }}
            >
              Back to Queue
            </Button>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>/</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', color: tokens.primary }}>
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
                border: `1px solid ${tokens.outlineVariant}`,
                bgcolor: tokens.surfaceContainerLowest,
              }}
            >
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tokens.primary, animation: 'pulse 1.5s infinite' }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurface }}>
                {user?.name || 'Technician'}
              </Typography>
              <IconButton aria-label="Refresh incident" size="small" onClick={handleRefreshAll} sx={{ color: tokens.onSurfaceVariant, p: 0.2 }}>
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
            bgcolor: tokens.surfaceContainerLowest,
            borderRadius: 3,
            border: `1px solid ${tokens.outlineVariant}`,
            borderLeft: isCritical ? `4px solid ${slaStateColor.VIOLATED}` : isHigh ? `4px solid ${tokens.secondary}` : `1px solid ${tokens.outlineVariant}`,
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
                <PriorityBadge priority={incident.priority} />

                <Chip
                  size="small"
                  label={incident.status.replace(/_/g, ' ')}
                  sx={{
                    bgcolor: tokens.surfaceContainer,
                    color: tokens.onSurface,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: 12,
                    height: 24,
                  }}
                />

                <Chip
                  size="small"
                  label={incident.service?.name || 'Service'}
                  sx={{
                    bgcolor: tokens.surfaceContainerLow,
                    color: tokens.primary,
                    fontWeight: 600,
                    fontSize: 12,
                    height: 24,
                  }}
                />

                {incident.category?.name && (
                  <Chip
                    size="small"
                    label={incident.category.name}
                    sx={{
                      bgcolor: tokens.surfaceContainerLow,
                      color: tokens.onSurfaceVariant,
                      fontSize: 12,
                      height: 24,
                    }}
                  />
                )}

                {incident.escalationLevel > 0 && (
                  <Chip
                    size="small"
                    label={`Escalation L${incident.escalationLevel}`}
                    sx={{
                      bgcolor: alpha(tokens.danger, 0.15),
                      color: slaStateColor.VIOLATED,
                      fontWeight: 700,
                      fontSize: 12,
                      height: 24,
                    }}
                  />
                )}

                {incident.major && (
                  <Chip
                    size="small"
                    label="MAJOR INCIDENT"
                    sx={{
                      bgcolor: alpha(tokens.danger, 0.2),
                      color: tokens.tertiaryLight,
                      border: `1px solid ${alpha(tokens.danger, 0.4)}`,
                      fontWeight: 800,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      height: 24,
                    }}
                  />
                )}

                {incident.problemId && (
                  <Chip
                    size="small"
                    label={`Problem #${incident.problemId}`}
                    clickable={!!problemBase}
                    onClick={problemBase ? () => navigate(`${problemBase}/${incident.problemId}`) : undefined}
                    sx={{
                      bgcolor: alpha(tokens.primary, 0.15),
                      color: tokens.primary,
                      border: `1px solid ${alpha(tokens.primary, 0.35)}`,
                      fontWeight: 700,
                      fontSize: 12,
                      fontFamily: 'monospace',
                      height: 24,
                    }}
                  />
                )}

                {incident.closureReason && (
                  <Chip
                    size="small"
                    label={`Closed: ${incident.closureReason.replace(/_/g, ' ')}`}
                    sx={{ bgcolor: tokens.surfaceContainerLow, color: tokens.onSurfaceVariant, fontSize: 12, height: 24 }}
                  />
                )}

                {incident.reopenCount > 0 && (
                  <Chip
                    size="small"
                    label={`Reopened ${incident.reopenCount}x`}
                    sx={{ bgcolor: alpha(tokens.danger, 0.15), color: slaStateColor.VIOLATED, fontSize: 12, height: 24 }}
                  />
                )}

                {incident.duplicateOfId && (
                  <Chip
                    size="small"
                    label={`Duplicate of #${incident.duplicateOfId}`}
                    sx={{
                      bgcolor: tokens.surfaceContainerLow,
                      color: tokens.onSurfaceVariant,
                      fontSize: 12,
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
                  color: tokens.onSurface,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {incident.code}: {incident.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: 12, color: tokens.onSurfaceVariant }}>
                <span>Reporter: <strong>{incident.reporter?.name || 'Employee'}</strong></span>
                <span>•</span>
                <span>Assignee: <strong>{incident.assignee?.name || 'Unassigned'}</strong></span>
                <span>•</span>
                <span>Impact: <strong>{incident.affectedUsers} {incident.affectedUsers === 1 ? 'user' : 'users'} affected</strong></span>
                <span>•</span>
                <span>Opened: <strong>{new Date(incident.createdAt).toLocaleString()}</strong></span>
                {incident.acknowledgedAt && (
                  <>
                    <span>•</span>
                    <span>Acknowledged: <strong>{new Date(incident.acknowledgedAt).toLocaleString()}</strong></span>
                  </>
                )}
                {incident.resolvedAt && (
                  <>
                    <span>•</span>
                    <span>Resolved: <strong>{new Date(incident.resolvedAt).toLocaleString()}</strong></span>
                  </>
                )}
                {incident.closedAt && (
                  <>
                    <span>•</span>
                    <span>Closed: <strong>{new Date(incident.closedAt).toLocaleString()}</strong></span>
                  </>
                )}
                {incident.priorityBreakdown && (
                  <>
                    <span>•</span>
                    <span>Priority score: <strong>{incident.priorityBreakdown.score} ({incident.priorityBreakdown.band})</strong></span>
                  </>
                )}
              </Box>
            </Box>

            {/* SLA clocks: colour and state come from the server */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: tokens.surfaceContainer,
                border: `1px solid ${incident.slaState === 'VIOLATED' ? slaStateColor.VIOLATED : tokens.outlineVariant}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.25,
                minWidth: 260,
              }}
            >
              <SlaClockPair incident={incident} />
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{slaCalendarNote(incident.slaCalendar)}</Typography>
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
              borderTop: `1px solid ${tokens.outlineVariant}`,
            }}
          >
            <ActionButtons
              allowed={allowedActions}
              exclude={RIBBON_EXCLUDED}
              onAction={onRibbonAction}
              labels={RIBBON_LABELS}
              icons={RIBBON_ICONS}
            />

            {isStaffLead && !incident.problemId && (
              <Button
                variant="outlined"
                onClick={() => setIsProblemOpen(true)}
                startIcon={<LinkIcon />}
                sx={{ borderColor: tokens.outlineVariant, color: tokens.onSurface, fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: 2, bgcolor: tokens.surfaceContainerLowest, '&:hover': { bgcolor: tokens.surfaceContainerLow } }}
              >
                Open problem
              </Button>
            )}

            {canSummarize && (
              <Button
                variant="outlined"
                onClick={handleGenerateSummary}
                disabled={isSummarizing}
                startIcon={<PsychologyIcon sx={{ color: tokens.secondary }} />}
                sx={{
                  borderColor: alpha(tokens.secondary, 0.3),
                  color: tokens.secondary,
                  fontWeight: 600,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  bgcolor: tokens.surfaceContainerLowest,
                  '&:hover': { bgcolor: alpha(tokens.secondary, 0.1) },
                }}
              >
                {isSummarizing ? 'Analyzing...' : 'Generate AI Handover'}
              </Button>
            )}
          </Box>
        </Paper>
      </Box>

      {/* AI handover summary, shown above both columns */}
      {summaryData && (
        <Paper sx={{ p: 2, mb: 2.5, bgcolor: tokens.surfaceContainer, border: `1px solid ${alpha(tokens.secondary, 0.3)}`, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PsychologyIcon sx={{ color: tokens.secondary, fontSize: 20 }} />
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: tokens.secondary }}>
              AI Incident Summary &amp; Handover ({summaryData.source})
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13, color: tokens.onSurface, mb: 1.5, lineHeight: 1.5 }}>
            {summaryData.summary}
          </Typography>
          {summaryData.handoverNotes && summaryData.handoverNotes.length > 0 && (
            <Box sx={{ pl: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, mb: 0.5 }}>
                Handover Checkpoints:
              </Typography>
              {summaryData.handoverNotes.map((note, idx) => (
                <Typography key={idx} sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 0.3 }}>
                  • {note}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* Main Workspace Split Grid */}
      <Grid container spacing={2.5}>
        {/* Left Column: Diagnostics, AI Solutions & Timeline Tabs */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: tokens.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              overflow: 'hidden',
            }}
          >
            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: `1px solid ${tokens.outlineVariant}`, bgcolor: tokens.surfaceContainerLow, px: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, val) => setActiveTab(val)}
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    minHeight: 48,
                    color: tokens.onSurfaceVariant,
                    '&.Mui-selected': { color: tokens.primary },
                  },
                }}
              >
                <Tab icon={<AutoFixHighIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Suggested Resolutions (${suggestedResolutions.length})`} />
                <Tab icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Timeline & Notes (${timelineEntries.length})`} />
                <Tab icon={<HubIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Similar Incidents (${similarIncidents.length})`} />
              </Tabs>
            </Box>

            {/* TAB 0: Suggested Resolutions & AI Intelligence */}
            {activeTab === 0 && (
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: tokens.onSurface, mb: 1 }}>
                  Proven Fixes from Historical Incidents
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant, mb: 2 }}>
                  These resolution strategies were successfully verified on resolved incidents sharing the same service and failure symptoms.
                </Typography>

                {suggestedError ? (
                  <ErrorState message={`Suggested resolutions did not load: ${apiErrorMessage(suggestedErr)}`} onRetry={() => refetchSuggestions()} />
                ) : suggestedResolutions.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: tokens.surfaceContainer, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
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
                          bgcolor: tokens.surfaceContainer,
                          border: `1px solid ${tokens.outlineVariant}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${Math.round(res.similarity * 100)}% Match`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 12.5,
                                fontWeight: 800,
                                bgcolor: alpha(tokens.success, 0.15),
                                color: slaStateColor.MET,
                              }}
                            />
                            {res.reusable && (
                              <Chip
                                label="Reusable Fix"
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: 12,
                                  fontWeight: 700,
                                  bgcolor: alpha(tokens.primary, 0.15),
                                  color: tokens.primary,
                                }}
                              />
                            )}
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: tokens.secondary }}>
                              {res.code}
                            </Typography>
                            <Typography sx={{ fontWeight: 700, fontSize: 13, color: tokens.onSurface }}>
                              {res.title}
                            </Typography>
                          </Box>
                          {allowedActions.includes('RESOLVE') && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => applySuggestedResolution(res)}
                              sx={{
                                borderColor: tokens.primary,
                                color: tokens.primary,
                                textTransform: 'none',
                                fontSize: 12.5,
                                fontWeight: 700,
                              }}
                            >
                              Apply this Fix
                            </Button>
                          )}
                        </Box>
                        <Box sx={{ bgcolor: tokens.surfaceContainerLowest, p: 1.5, borderRadius: 1.5, mb: 1 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant }}>
                            Root Cause:
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: tokens.onSurface, mb: 1 }}>
                            {res.rootCause}
                          </Typography>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant }}>
                            Resolution Steps:
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
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
                {allowedActions.includes('COMMENT') ? (
                <Paper sx={{ p: 2, mb: 3, bgcolor: tokens.surfaceContainer, borderRadius: 2, border: `1px solid ${tokens.outlineVariant}` }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.onSurface, mb: 1 }}>
                    Append Investigation Note
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="Log observation, root cause findings, diagnostic steps, or internal technical update..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    inputProps={{ maxLength: 4000 }}
                    helperText={`${newNoteText.length}/4000`}
                    sx={{
                      bgcolor: tokens.surfaceContainerLowest,
                      borderRadius: 1.5,
                      mb: 1.5,
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Visibility:</Typography>
                      <Chip
                        label="INTERNAL (Techs & Admins Only)"
                        clickable
                        onClick={() => setNoteVisibility('INTERNAL')}
                        size="small"
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: noteVisibility === 'INTERNAL' ? tokens.primary : tokens.surfaceContainerHigh,
                          color: noteVisibility === 'INTERNAL' ? tokens.onSurface : tokens.onSurfaceVariant,
                        }}
                      />
                      <Chip
                        label="PUBLIC (Visible to Reporter)"
                        clickable
                        onClick={() => setNoteVisibility('PUBLIC')}
                        size="small"
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: noteVisibility === 'PUBLIC' ? tokens.secondary : tokens.surfaceContainerHigh,
                          color: noteVisibility === 'PUBLIC' ? tokens.onSurface : tokens.onSurfaceVariant,
                        }}
                      />
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => (noteVisibility === 'PUBLIC' ? setConfirmAction('PUBLIC_NOTE') : handleAddNote())}
                      disabled={!newNoteText.trim()}
                      startIcon={<SendIcon sx={{ fontSize: 14 }} />}
                      sx={{ textTransform: 'none', fontWeight: 700, bgcolor: tokens.primary }}
                    >
                      Post Note
                    </Button>
                  </Box>
                </Paper>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>Notes are not available on this incident in its current state.</Alert>
                )}

                {historyError && (
                  <Box sx={{ mb: 2 }}>
                    <ErrorState message={`Audit history did not load: ${apiErrorMessage(historyErr)}`} onRetry={() => refetchHistory()} />
                  </Box>
                )}
                {commentsError && (
                  <Box sx={{ mb: 2 }}>
                    <ErrorState message={`Comments did not load: ${apiErrorMessage(commentsErr)}`} onRetry={() => refetchComments()} />
                  </Box>
                )}

                {/* Unified Timeline entries */}
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: tokens.onSurface, mb: 1.5 }}>
                  Unified Audit Trail &amp; Engineering Activity ({timelineEntries.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {timelineEntries.length === 0 ? (
                    <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
                      No events or notes recorded on this incident yet.
                    </Typography>
                  ) : (
                    timelineEntries.map((item) => (
                      <Box
                        key={item.key}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: tokens.surfaceContainer,
                          borderLeft: `3px solid ${
                            item.type === 'comment'
                              ? item.visibility === 'INTERNAL'
                                ? tokens.tertiary
                                : tokens.secondary
                              : tokens.primary
                          }`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={item.badge}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 12,
                                fontWeight: 800,
                                bgcolor:
                                  item.type === 'comment'
                                    ? item.visibility === 'INTERNAL'
                                      ? alpha(tokens.tertiary, 0.15)
                                      : alpha(tokens.secondary, 0.15)
                                    : alpha(tokens.primary, 0.15),
                                color:
                                  item.type === 'comment'
                                    ? item.visibility === 'INTERNAL'
                                      ? tokens.tertiary
                                      : tokens.secondary
                                    : tokens.primary,
                              }}
                            />
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurface }}>
                              {item.actor}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 12, color: tokens.onSurfaceVariant }}>
                            {formatTimelineDate(item.timestamp)}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            color: item.type === 'comment' ? tokens.onSurface : tokens.onSurfaceVariant,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {item.text}
                        </Typography>
                      </Box>
                    ))
                  )}
                </Box>
              </Box>
            )}

            {/* TAB 2: Similar Incidents */}
            {activeTab === 2 && (
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: tokens.onSurface, mb: 1 }}>
                  Historical &amp; Correlated Similar Incidents
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant, mb: 2 }}>
                  Candidates for correlation, knowledge extraction, or duplicate linking across services.
                </Typography>

                {similarError ? (
                  <ErrorState message={`Similar incidents did not load: ${apiErrorMessage(similarErr)}`} onRetry={() => refetchSimilar()} />
                ) : similarIncidents.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: tokens.surfaceContainer, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
                      No similar incidents detected.
                    </Typography>
                  </Paper>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {similarIncidents.map((s: SimilarIncidentView) => (
                      <Paper
                        key={s.incidentId}
                        sx={{
                          p: 1.8,
                          bgcolor: tokens.surfaceContainer,
                          border: `1px solid ${tokens.outlineVariant}`,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                            <Chip
                              label={`${Math.round(s.similarity * 100)}% Match`}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 12,
                                fontWeight: 800,
                                bgcolor: alpha(tokens.primary, 0.15),
                                color: tokens.primary,
                              }}
                            />
                            {s.match && (
                              <Chip
                                label={s.match}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  bgcolor: s.match === 'DUPLICATE' ? alpha(tokens.danger, 0.15) : alpha(tokens.secondary, 0.15),
                                  color: s.match === 'DUPLICATE' ? slaStateColor.VIOLATED : tokens.secondary,
                                }}
                              />
                            )}
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: tokens.secondary }}>
                              {s.code}
                            </Typography>
                            <Chip label={s.status} size="small" sx={{ height: 22, fontSize: 12 }} />
                          </Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: tokens.onSurface }}>
                            {s.title}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {allowedActions.includes('MARK_DUPLICATE') && s.match === 'DUPLICATE' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setDupTargetId(s.incidentId);
                                setIsDupOpen(true);
                              }}
                              sx={{
                                textTransform: 'none',
                                color: slaStateColor.VIOLATED,
                                borderColor: alpha(tokens.danger, 0.4),
                                fontSize: 12.5,
                                fontWeight: 700,
                              }}
                            >
                              Mark as Duplicate
                            </Button>
                          )}
                          <Button
                            size="small"
                            onClick={() => navigate(`/tech/incidents/${s.incidentId}`)}
                            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                            sx={{ textTransform: 'none', color: tokens.primary, fontSize: 12, fontWeight: 700 }}
                          >
                            View Ticket
                          </Button>
                        </Box>
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
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase', mb: 1.5 }}>
                Problem Description
              </Typography>
              <Typography sx={{ fontSize: 13, color: tokens.onSurface, lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: 2 }}>
                {incident.description || 'No detailed description provided.'}
              </Typography>
              <Divider sx={{ borderColor: tokens.outlineVariant, my: 1.5 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: 12 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.onSurfaceVariant }}>Impact Level:</span>
                  <strong>{incident.impact}/5</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.onSurfaceVariant }}>Urgency Level:</span>
                  <strong>{incident.urgency}/5</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.onSurfaceVariant }}>Service Criticality:</span>
                  <strong>{incident.priorityBreakdown ? `${incident.priorityBreakdown.criticality}/5` : 'Not scored'}</strong>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.onSurfaceVariant }}>Reopen Count:</span>
                  <strong>{incident.reopenCount}</strong>
                </Box>
                {incident.priorityBreakdown?.overrideRule && (
                  <Box sx={{ bgcolor: alpha(tokens.primary, 0.1), p: 1, borderRadius: 1.5, mt: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: tokens.primary, fontWeight: 700 }}>
                      Override Rule: {incident.priorityBreakdown.overrideRule}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>

            {/* Reporter: contact comes with the incident for staff (null for non-staff) */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase', mb: 1.5 }}>
                Reporter
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: 12.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tokens.onSurfaceVariant }}>Name:</span>
                  <strong>{incident.reporter?.name ?? 'Unknown'}</strong>
                </Box>
                {reporterContact && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <span style={{ color: tokens.onSurfaceVariant }}>Email:</span>
                      <a href={`mailto:${reporterContact.email}`} style={{ color: tokens.primary, fontWeight: 700 }}>{reporterContact.email}</a>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.onSurfaceVariant }}>Department:</span>
                      <strong>{reporterContact.department ?? 'Not set'}</strong>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: tokens.onSurfaceVariant }}>Location:</span>
                      <strong>{reporterContact.location ?? 'Not set'}</strong>
                    </Box>
                  </>
                )}
              </Box>
              {!reporterContact && (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mt: 1 }}>
                  No contact details are available for this reporter. Use the comment thread to reach them.
                </Typography>
              )}
            </Paper>

            {/* SLA Risk Scorecard */}
            {slaRiskError && (
              <ErrorState message={`SLA risk did not load: ${apiErrorMessage(slaRiskErr)}`} onRetry={() => refetchSlaRisk()} />
            )}
            {slaRisk && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase' }}>
                    SLA Risk Prediction
                  </Typography>
                  <Chip
                    label={slaRisk.level}
                    size="small"
                    sx={{
                      height: 22,
                      fontWeight: 800,
                      fontSize: 12.5,
                      bgcolor: slaRisk.atRisk ? alpha(tokens.danger, 0.15) : alpha(tokens.success, 0.15),
                      color: slaRisk.atRisk ? slaStateColor.VIOLATED : slaStateColor.MET,
                    }}
                  />
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                      Probability of SLA breach (alert at {Math.round(slaRisk.threshold * 100)}%):
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 800, color: slaRisk.atRisk ? slaStateColor.VIOLATED : tokens.onSurface }}>
                      {Math.round(slaRisk.score * 100)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, Math.round(slaRisk.score * 100))}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: tokens.surfaceContainerHigh,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: slaRisk.atRisk ? slaStateColor.VIOLATED : tokens.secondary,
                      },
                    }}
                  />
                </Box>
                {slaRisk.factors && slaRisk.factors.length > 0 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {slaRisk.factors.map((f, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: tokens.onSurfaceVariant }}>
                        <span>{f.name}:</span>
                        <span style={{ fontWeight: 700, color: tokens.onSurface }}>{f.detail || `${Math.round(f.contribution * 100)}%`}</span>
                      </Box>
                    ))}
                  </Box>
                )}
              </Paper>
            )}

            {/* Priority Explainer Panel */}
            <PriorityExplainer
              priority={incident.priority}
              impact={incident.impact}
              urgency={incident.urgency}
              score={incident.priorityBreakdown?.score}
              overrideRule={incident.priorityBreakdown?.overrideRule}
            />

            {/* Attachments Section */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase' }}>
                  Attachments ({attachments.length})
                </Typography>
                {allowedActions.includes('COMMENT') && (
                  <>
                    <input
                      ref={fileInput}
                      type="file"
                      hidden
                      onChange={(e) => handleUpload(e.target.files?.[0])}
                    />
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={uploading}
                      startIcon={uploading ? <CircularProgress size={14} color="inherit" /> : <UploadFileIcon />}
                      onClick={() => fileInput.current?.click()}
                      sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700 }}
                    >
                      Attach file
                    </Button>
                  </>
                )}
              </Box>
              {attachmentsError ? (
                <ErrorState message={`Attachments did not load: ${apiErrorMessage(attachmentsErr)}`} onRetry={() => refetchAttachments()} />
              ) : attachments.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                  No evidence files or logs attached. Files up to 5 MB.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {attachments.map((att) => (
                    <Box key={att.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, p: 1, bgcolor: tokens.surfaceContainerLow, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurface, wordBreak: 'break-all' }}>
                        {att.filename} ({Math.max(1, Math.round(att.sizeBytes / 1024))} KB) · {att.uploadedBy?.name}
                      </Typography>
                      <Button size="small" onClick={() => handleDownload(att)} sx={{ textTransform: 'none', fontSize: 12 }}>
                        Download
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>

            {/* Affected services (dependency graph) */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase', mb: 1 }}>
                Services that depend on {incident.service?.name}
              </Typography>
              {impactError ? (
                <ErrorState message={`Service impact did not load: ${apiErrorMessage(impactErr)}`} onRetry={() => refetchImpact()} />
              ) : !impact ? (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Loading…</Typography>
              ) : impact.affected.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>No other service depends on this one.</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {impact.affected.map((a) => (
                    <Chip
                      key={a.id}
                      size="small"
                      label={`${a.name}${a.distance > 1 ? ` (${a.distance} hops)` : ''}`}
                      sx={{ fontSize: 12, bgcolor: tokens.surfaceContainerLow, color: tokens.onSurface }}
                    />
                  ))}
                </Box>
              )}
            </Paper>

            {/* Post Incident Report (if applicable) */}
            {(incident.status === 'RESOLVED' || incident.status === 'CLOSED' || incident.status === 'VERIFIED' || incident.major) && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: tokens.onSurface, textTransform: 'uppercase', mb: 1 }}>
                  Post-Incident Audit Dossier
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 1.5 }}>
                  Download signed compliance post-incident report PDF.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    try {
                      const blob = await downloadPostIncidentReportPdf(incidentId);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `incident-report-${incident.code}.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                      toast('Post-incident report PDF downloaded.', 'success');
                    } catch (e) {
                      toast(apiErrorMessage(e), 'error');
                    }
                  }}
                  sx={{ borderColor: tokens.secondary, color: tokens.secondary, textTransform: 'none', fontSize: 12, fontWeight: 700 }}
                >
                  Download Post-Incident PDF
                </Button>
              </Paper>
            )}

            {/* Why This Technician: the current assignee's row in the allocation ranking */}
            <WhyAssignee incidentId={incidentId} assignee={incident.assignee} />
          </Box>
        </Grid>
      </Grid>

      <AssignDialog
        open={isAssignOpen}
        incident={incident}
        recommendations={recommendations}
        onClose={() => setIsAssignOpen(false)}
        onDone={handleRefreshAll}
      />
      <EditIncidentDialog open={isEditOpen} incident={incident} onClose={() => setIsEditOpen(false)} />
      <ReassignDialog
        open={isReassignOpen}
        incident={incident}
        recommendations={recommendations}
        onClose={() => setIsReassignOpen(false)}
        onDone={handleRefreshAll}
      />
      <MarkDuplicateDialog
        open={isDupOpen}
        incident={incident}
        similar={similarIncidents}
        initialTargetId={dupTargetId}
        onClose={() => setIsDupOpen(false)}
        onDone={handleRefreshAll}
      />
      <OverridePriorityDialog
        open={isPriorityOpen}
        incident={incident}
        onClose={() => setIsPriorityOpen(false)}
        onDone={handleRefreshAll}
      />
      <LinkProblemDialog
        open={isProblemOpen}
        incident={incident}
        onClose={() => setIsProblemOpen(false)}
        onDone={(problemId) => {
          handleRefreshAll();
          if (problemBase) navigate(`${problemBase}/${problemId}`);
        }}
      />
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction === 'PUBLIC_NOTE'
            ? 'Post a public note?'
            : confirmAction === 'CLOSE'
              ? `Close ${incident.code}?`
              : confirmAction === 'REOPEN'
                ? `Reopen ${incident.code}?`
                : `Verify the fix for ${incident.code}?`
        }
        description={
          confirmAction === 'PUBLIC_NOTE'
            ? `This note is visible to the reporter (${incident.reporter?.name ?? 'the reporter'}) and cannot be made private later.`
            : confirmAction === 'CLOSE'
              ? 'The incident moves to CLOSED. The reporter can still reopen it inside the reopen window.'
              : confirmAction === 'REOPEN'
                ? 'The incident goes back to work and the reason is kept in its history.'
                : 'Confirms that the resolution worked. The incident then moves on towards CLOSED.'
        }
        requireReason={confirmAction === 'REOPEN'}
        confirmLabel={confirmAction === 'PUBLIC_NOTE' ? 'Post publicly' : confirmAction === 'CLOSE' ? 'Close incident' : confirmAction === 'REOPEN' ? 'Reopen' : 'Verify'}
        isLoading={confirmBusy}
        onConfirm={(r) => handleConfirmed(r)}
        onClose={() => setConfirmAction(null)}
      />

      {/* RESOLVE DIALOG */}
      <Dialog
        open={isResolveOpen}
        onClose={() => setIsResolveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DoneAllIcon sx={{ color: slaStateColor.MET }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>
              Resolve Incident {incident.code}
            </Typography>
          </Box>
          <IconButton aria-label="Close resolve dialog" size="small" onClick={() => setIsResolveOpen(false)} sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: tokens.onSurface }}>
                Root Cause Analysis (min 10 characters) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={resolveRootCause}
                onChange={(e) => setResolveRootCause(e.target.value)}
                inputProps={{ maxLength: 2000 }}
                error={!!fieldErrorFor(resolveErr, 'rootCause')}
                helperText={fieldErrorFor(resolveErr, 'rootCause') ?? `${resolveRootCause.length}/2000`}
                placeholder="Identify underlying cause (deadlock, packet loss, config misconfiguration, etc.)"
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: tokens.onSurface }}>
                Resolution Actions &amp; Fix Notes (min 10 characters) *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                inputProps={{ maxLength: 4000 }}
                error={!!fieldErrorFor(resolveErr, 'notes')}
                helperText={fieldErrorFor(resolveErr, 'notes') ?? `${resolveNotes.length}/4000`}
                placeholder="Describe corrective actions taken to resolve the failure..."
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: tokens.onSurface }}>
                Steps for Long-Term Prevention (optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={resolveSteps}
                onChange={(e) => setResolveSteps(e.target.value)}
                inputProps={{ maxLength: 4000 }}
                helperText={`${resolveSteps.length}/4000`}
                placeholder="Architectural safeguards, monitoring rule additions, etc."
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                type="number"
                size="small"
                label="Time Spent (minutes)"
                value={resolveTimeSpent}
                onChange={(e) => setResolveTimeSpent(e.target.value)}
                inputProps={{ min: 1, max: 10080, step: 1 }}
                helperText={fieldErrorFor(resolveErr, 'timeSpentMinutes') ?? '1 to 10080 minutes'}
                error={!!fieldErrorFor(resolveErr, 'timeSpentMinutes') || resolveTimeSpent !== '' && !(Number.isInteger(Number(resolveTimeSpent)) && Number(resolveTimeSpent) >= 1 && Number(resolveTimeSpent) <= 10080)}
                sx={{ width: 200, bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={resolveReusable}
                    onChange={(e) => setResolveReusable(e.target.checked)}
                    color="primary"
                  />
                }
                label={<Typography sx={{ fontSize: 12.5, color: tokens.onSurface }}>Mark as Reusable Fix for AI</Typography>}
              />
            </Box>

            {incident.problemId && (
              <FormControlLabel
                control={
                  <Switch
                    checked={resolveWholeProblem}
                    onChange={(e) => setResolveWholeProblem(e.target.checked)}
                    color="secondary"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12.5, color: tokens.secondary, fontWeight: 700 }}>
                    Resolve linked Problem Record #{incident.problemId} alongside this incident
                  </Typography>
                }
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsResolveOpen(false)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleResolveIncident}
            disabled={resolveRootCause.trim().length < 10 || resolveNotes.trim().length < 10}
            sx={{
              textTransform: 'none',
              bgcolor: slaStateColor.MET,
              fontWeight: 700,
              '&:hover': { bgcolor: tokens.success, filter: 'brightness(0.9)' },
            }}
          >
            Resolve
          </Button>
        </DialogActions>
      </Dialog>

      {/* ESCALATE DIALOG */}
      <Dialog
        open={isEscalateOpen}
        onClose={() => setIsEscalateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUpIcon sx={{ color: tokens.primary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>Escalate Incident</Typography>
          </Box>
          <IconButton aria-label="Close escalate dialog" size="small" onClick={() => setIsEscalateOpen(false)} sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
              Raise the escalation tier of this incident by 1 level. Current level: Level {incident.escalationLevel}.
            </Typography>

            {incident.escalationPreview && (
              <Paper sx={{ p: 1.5, bgcolor: tokens.surfaceContainerLow, borderRadius: 2 }}>
                {incident.escalationPreview.kind === 'EXHAUSTED' ? (
                  <Typography sx={{ fontSize: 12, color: slaStateColor.VIOLATED, fontWeight: 700 }}>
                    Top escalation tier reached (Level {incident.escalationLevel}). No higher supervisory tier available.
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 12, color: tokens.secondary, fontWeight: 700 }}>
                      Target Tier: Level {incident.escalationPreview.toLevel} ({incident.escalationPreview.targetRole || 'Supervisory SRE'})
                    </Typography>
                    {incident.escalationPreview.recipients && incident.escalationPreview.recipients.length > 0 && (
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                        Will notify: {incident.escalationPreview.recipients.join(', ')}
                      </Typography>
                    )}
                  </Box>
                )}
              </Paper>
            )}

            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: tokens.onSurface }}>
                Escalation Justification (min 10, max 1000 characters) *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                size="small"
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Explain the technical impediment, blast radius, or skill requirement..."
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsEscalateOpen(false)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEscalateIncident}
            disabled={
              escalateReason.trim().length < 10 ||
              escalateReason.length > 1000 ||
              incident.escalationPreview?.kind === 'EXHAUSTED'
            }
            sx={{
              textTransform: 'none',
              bgcolor: tokens.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: tokens.primaryDark },
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
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PauseCircleIcon sx={{ color: tokens.secondary }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: tokens.onSurface }}>
              Request Information (Pause SLA)
            </Typography>
          </Box>
          <IconButton aria-label="Close request-info dialog" size="small" onClick={() => setIsRequestInfoOpen(false)} sx={{ color: tokens.onSurfaceVariant }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Paper sx={{ p: 1.5, bgcolor: tokens.surfaceContainerLow, borderRadius: 2 }}>
              <Typography sx={{ fontSize: 12.5, color: tokens.secondary, fontWeight: 700 }}>
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
              inputProps={{ maxLength: 2000 }}
              helperText={`${requestInfoText.length}/2000 (at least 10)`}
              sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 1.5 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsRequestInfoOpen(false)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRequestInfo}
            disabled={requestInfoText.trim().length < 10}
            sx={{
              textTransform: 'none',
              bgcolor: tokens.secondary,
              color: tokens.background,
              fontWeight: 800,
              '&:hover': { bgcolor: tokens.secondaryLight },
            }}
          >
            Send Request &amp; Freeze Clock
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
