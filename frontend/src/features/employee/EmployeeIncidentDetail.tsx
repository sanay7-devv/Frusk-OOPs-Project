import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Timeline as TimelineIcon,
  Person as PersonIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  InfoOutlined as InfoOutlinedIcon,
  Star as StarIcon,
  Reply as ReplyIcon,
  Verified as VerifiedIcon,
  RestartAlt as RestartAltIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  HelpOutline as HelpIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import type { AxiosError } from 'axios';

import {
  getIncident,
  getComments,
  addComment,
  getHistory,
  provideInfo,
  verifyIncident,
  reopenIncident,
  withdrawIncident,
  submitFeedback,
  updateIncident,
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  getSimilarIncidents,
  getPostIncidentReport,
  downloadPostIncidentReportPdf,
} from '../../api/incidents';
import type {
  IncidentDetail,
  AuditEntry,
  CommentView,
  AttachmentView,
  SimilarIncidentView,
  PostIncidentReport,
} from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import SlaBar from '../../components/SlaBar';
import { ErrorState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { errorMessage } from '../../utils/errors';
import { reasonRule } from '../../utils/validation';
import { tokens, slaStateColor } from '../../theme/theme';

import { alpha } from '@mui/material/styles';
const COLORS = {
  surface: tokens.background,
  surfaceContainerLowest: tokens.surfaceContainerLowest,
  surfaceContainerLow: tokens.surfaceContainerLow,
  surfaceContainer: tokens.surfaceContainer,
  surfaceContainerHigh: tokens.surfaceContainerHigh,
  surfaceContainerHighest: tokens.surfaceContainerHighest,
  onSurface: tokens.onSurface,
  onSurfaceVariant: tokens.onSurfaceVariant,
  border: tokens.outlineVariant,
  primary: tokens.primary,
  secondary: tokens.secondary,
  error: slaStateColor.VIOLATED,
  warning: slaStateColor.AT_RISK,
  success: slaStateColor.MET,
};

const ACTION_LABELS: Record<string, string> = {
  INCIDENT_CREATED: 'Problem reported',
  STATUS_CHANGED: 'Status changed',
  PRIORITY_CHANGED: 'Priority changed',
  ASSIGNED: 'Technician assigned',
  ACKNOWLEDGED: 'Technician accepted the work',
  WORK_STARTED: 'Work started',
  INFO_REQUESTED: 'Question from technician',
  INFO_PROVIDED: 'You replied',
  RESOLVED: 'Marked as fixed',
  VERIFIED: 'Fix confirmed',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  WITHDRAWN: 'Withdrawn',
  COMMENT_ADDED: 'Comment added',
  ATTACHMENT_ADDED: 'File added',
};

export default function EmployeeIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const numId = Number(id);

  // Active tabs
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'attachments' | 'similar'>('comments');
  const [commentText, setCommentText] = useState('');

  // Modals
  const [provideInfoOpen, setProvideInfoOpen] = useState(false);
  const [provideInfoText, setProvideInfoText] = useState('');

  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  // Edit Modal (PUT /incidents/{id} with version)
  const [editOpen, setEditOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');

  // Post Incident Report Modal
  const [pirOpen, setPirOpen] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Queries
  const {
    data: incident,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<IncidentDetail, AxiosError>({
    queryKey: ['incidents', numId],
    queryFn: () => getIncident(numId),
    enabled: !isNaN(numId) && numId > 0,
    retry: (count, err) => err?.response?.status !== 404 && err?.response?.status !== 403 && count < 2,
  });

  const { data: comments = [] } = useQuery<CommentView[]>({
    queryKey: ['incidents', numId, 'comments'],
    queryFn: () => getComments(numId),
    enabled: !isNaN(numId) && numId > 0,
  });

  const { data: history = [] } = useQuery<AuditEntry[]>({
    queryKey: ['incidents', numId, 'history'],
    queryFn: () => getHistory(numId),
    enabled: !isNaN(numId) && numId > 0,
  });

  const { data: attachments = [] } = useQuery<AttachmentView[]>({
    queryKey: ['incidents', numId, 'attachments'],
    queryFn: () => listAttachments(numId),
    enabled: !isNaN(numId) && numId > 0,
  });

  const { data: similarIncidents = [] } = useQuery<SimilarIncidentView[]>({
    queryKey: ['incidents', numId, 'similar'],
    queryFn: () => getSimilarIncidents(numId),
    enabled: !isNaN(numId) && numId > 0 && activeTab === 'similar',
  });

  const { data: pirData, isLoading: pirLoading } = useQuery<PostIncidentReport>({
    queryKey: ['incidents', numId, 'pir'],
    queryFn: () => getPostIncidentReport(numId),
    enabled: !isNaN(numId) && numId > 0 && pirOpen,
  });

  // Mutations
  const commentMutation = useMutation({
    mutationFn: (text: string) => addComment(numId, text, 'PUBLIC'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      setCommentText('');
      toast(incident?.assignee ? 'Sent to the technician.' : 'Update added.', 'success');
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
    },
  });

  const provideInfoMutation = useMutation({
    mutationFn: (message: string) => provideInfo(numId, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      const resumed = data.slaState !== 'PAUSED';
      toast(
        resumed
          ? 'Reply sent to the technician.'
          : 'Reply sent to the technician.',
        'success'
      );
      setProvideInfoOpen(false);
      setProvideInfoText('');
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyIncident(numId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      toast('Thanks for confirming the fix.', 'success');
      setVerifyConfirmOpen(false);
      setFeedbackOpen(true);
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) => submitFeedback(numId, rating, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      toast('Thanks for your feedback.', 'success');
      setFeedbackOpen(false);
      setFeedbackRating(null);
      setFeedbackComment('');
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason: string) => reopenIncident(numId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      toast('Incident reopened.', 'info');
      setReopenOpen(false);
      setReopenReason('');
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (reason: string) => withdrawIncident(numId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      toast('Incident withdrawn.', 'info');
      setWithdrawOpen(false);
      setWithdrawReason('');
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  const editMutation = useMutation({
    mutationFn: () =>
      updateIncident(numId, {
        description: editDescription,
        version: incident?.version,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      toast('Description updated.', 'success');
      setEditOpen(false);
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
      refetch();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(numId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'attachments'] });
      queryClient.invalidateQueries({ queryKey: ['incidents', numId, 'history'] });
      toast('File added.', 'success');
      setSelectedFile(null);
    },
    onError: (err) => {
      toast(errorMessage(err), 'error');
    },
  });

  const handleDownloadAttachment = async (att: AttachmentView) => {
    try {
      const blob = await downloadAttachment(att.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download attachment.', 'error');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadPostIncidentReportPdf(numId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PIR-${incident?.code || numId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast('Failed to download Post-Incident Report PDF.', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  // Handle errors separately (404/403 vs network)
  if (isError) {
    const status = error?.response?.status;
    if (status === 404 || status === 403) {
      return (
        <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: COLORS.onSurface, mb: 1 }}>
            {status === 404 ? 'Incident not found' : 'No access'}
          </Typography>
          <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13, mb: 2 }}>
            {status === 404
              ? 'This incident does not exist, or you do not have access to it.'
              : 'You do not have access to this incident.'}
          </Typography>
          <Button onClick={() => navigate('/employee/incidents')} startIcon={<ArrowBackIcon />} sx={{ color: COLORS.secondary }}>
            Back to my incidents
          </Button>
        </Box>
      );
    }
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
        <ErrorState onRetry={() => refetch()} message="Failed to load incident details. Please check your connection and retry." />
      </Box>
    );
  }

  if (!incident) return null;

  // Strict allowedActions gating per Guide Section 12 (no permission re-implementation)
  const allowed = (incident.allowedActions || []) as string[];
  const canProvideInfo = allowed.includes('PROVIDE_INFO');
  const canVerify = allowed.includes('VERIFY');
  const canGiveFeedback = allowed.includes('GIVE_FEEDBACK');
  const canReopen = allowed.includes('REOPEN');
  const canWithdraw = allowed.includes('WITHDRAW');
  const canComment = allowed.includes('COMMENT');
  const canEdit = allowed.includes('EDIT');
  const isWithdrawn = incident.status === 'CLOSED' && incident.closureReason === 'WITHDRAWN';

  // Find last question asked by technician for highlight
  const lastQuestion = comments
    .slice()
    .reverse()
    .find((c) => c.visibility === 'PUBLIC');

  // Parcel-style progress tracker steps
  const steps = ['Reported', 'Assigned', 'Being worked on', 'Fixed', 'Confirmed'];
  const getActiveStep = () => {
    switch (incident.status) {
      case 'NEW':
      case 'CLASSIFIED':
        return 0;
      case 'ASSIGNED':
      case 'ACKNOWLEDGED':
        return 1;
      case 'IN_PROGRESS':
      case 'PENDING_USER_INFO':
      case 'REOPENED':
        return 2;
      case 'RESOLVED':
        return 3;
      case 'VERIFIED':
      case 'CLOSED':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton aria-label="Back to my incidents"
            onClick={() => navigate('/employee/incidents')}
            sx={{
              bgcolor: COLORS.surfaceContainer,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.onSurface,
              '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800, color: COLORS.secondary }}>
                {incident.code}
              </Typography>
              <PriorityBadge priority={incident.priority} />
              <StatusChip status={incident.status} closureReason={incident.closureReason} />
              {incident.major && (
                <Chip
                  label="MAJOR OUTAGE"
                  size="small"
                  sx={{
                    bgcolor: alpha(tokens.danger, 0.2),
                    color: COLORS.error,
                    border: `1px solid ${alpha(tokens.danger, 0.4)}`,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                />
              )}
              {incident.duplicateOfId && (
                <Chip
                  label={`Duplicate of #${incident.duplicateOfId}`}
                  size="small"
                  onClick={() => navigate(`/employee/incidents/${incident.duplicateOfId}`)}
                  sx={{
                    bgcolor: alpha(tokens.amberLight, 0.15),
                    color: tokens.amberLight,
                    border: `1px solid ${alpha(tokens.amberLight, 0.35)}`,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                />
              )}
            </Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mt: 0.5 }}>
              {incident.title}
            </Typography>
          </Box>
        </Box>

        {/* Dynamic Action Buttons based strictly on allowedActions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {canEdit && (
            <Button
              variant="outlined"
              onClick={() => {
                setEditDescription(incident.description);
                setEditOpen(true);
              }}
              startIcon={<EditIcon />}
              sx={{
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Edit
            </Button>
          )}

          {canProvideInfo && (
            <Button
              variant="contained"
              onClick={() => setProvideInfoOpen(true)}
              startIcon={<ReplyIcon />}
              sx={{
                background: `linear-gradient(135deg, ${tokens.tertiary} 0%, ${tokens.primary} 100%)`,
                color: tokens.white,
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.2,
                boxShadow: `0 0 16px ${alpha(tokens.tertiary, 0.4)}`,
              }}
            >
              Provide Information
            </Button>
          )}

          {canVerify && (
            <Button
              variant="contained"
              onClick={() => setVerifyConfirmOpen(true)}
              disabled={verifyMutation.isPending}
              startIcon={verifyMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <VerifiedIcon />}
              sx={{
                bgcolor: COLORS.success,
                color: tokens.white,
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.2,
                '&:hover': { bgcolor: tokens.successDark },
              }}
            >
              Confirm the fix
            </Button>
          )}

          {canGiveFeedback && !isWithdrawn && (
            <Button
              variant="outlined"
              onClick={() => setFeedbackOpen(true)}
              startIcon={<StarIcon sx={{ color: tokens.amberLight }} />}
              sx={{
                borderColor: alpha(tokens.amberLight, 0.4),
                bgcolor: alpha(tokens.amberLight, 0.1),
                color: tokens.yellowLight,
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: alpha(tokens.amberLight, 0.2), borderColor: tokens.amberLight },
              }}
            >
              Rate the fix
            </Button>
          )}

          {(incident.status === 'CLOSED' || incident.status === 'VERIFIED') && !isWithdrawn && (
            <Button
              variant="outlined"
              onClick={() => setPirOpen(true)}
              startIcon={<PdfIcon sx={{ color: COLORS.secondary }} />}
              sx={{
                borderColor: COLORS.border,
                color: COLORS.secondary,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
              }}
            >
              Incident report
            </Button>
          )}

          {canReopen && (
            <Button
              variant="outlined"
              onClick={() => setReopenOpen(true)}
              startIcon={<RestartAltIcon />}
              sx={{
                borderColor: alpha(tokens.danger, 0.4),
                bgcolor: alpha(tokens.danger, 0.08),
                color: COLORS.error,
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.8,
                '&:hover': { bgcolor: alpha(tokens.danger, 0.15), borderColor: COLORS.error },
              }}
            >
              Reopen
            </Button>
          )}

          {canWithdraw && (
            <Button
              variant="outlined"
              onClick={() => setWithdrawOpen(true)}
              startIcon={<CancelIcon />}
              sx={{
                borderColor: COLORS.border,
                color: COLORS.onSurfaceVariant,
                fontWeight: 600,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.8,
                '&:hover': { borderColor: alpha(tokens.white, 0.25), bgcolor: COLORS.surfaceContainerHigh },
              }}
            >
              Withdraw
            </Button>
          )}
        </Box>
      </Box>

      {/* Parcel-Style Progress Tracker (Guide P3-12) */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {isWithdrawn ? (
          <Typography sx={{ textAlign: 'center', fontWeight: 700, color: COLORS.onSurfaceVariant, fontSize: 14 }}>
            You withdrew this report
          </Typography>
        ) : (
        <Stepper activeStep={getActiveStep()} alternativeLabel>
          {steps.map((label, idx) => (
            <Step key={label} completed={getActiveStep() > idx || (getActiveStep() === idx && ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(incident.status))}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    '&.Mui-active': { color: COLORS.secondary },
                    '&.Mui-completed': { color: COLORS.success },
                  },
                }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                  {label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        )}
      </Paper>

      {/* Action-Required Question Highlight (Shown when pending clarification) */}
      {incident.status === 'PENDING_USER_INFO' && lastQuestion && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 3,
            bgcolor: alpha(tokens.tertiary, 0.08),
            border: `1px solid ${alpha(tokens.tertiary, 0.35)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            <WarningIcon sx={{ color: tokens.tertiary, fontSize: 24, mt: 0.2 }} />
            <Box>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: tokens.tertiary, textTransform: 'none' }}>
                Technician Inquiry (SLA Paused)
              </Typography>
              <Typography sx={{ fontSize: 13.5, color: tokens.white, fontWeight: 600, mt: 0.3 }}>
                "{lastQuestion.body}"
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Asked by {lastQuestion.author?.name || 'Technician'} • {new Date(lastQuestion.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={() => setProvideInfoOpen(true)}
            startIcon={<ReplyIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.tertiary} 0%, ${tokens.primary} 100%)`,
              color: tokens.white,
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: 'none',
              borderRadius: 2,
              px: 2.5,
            }}
          >
            Answer Question
          </Button>
        </Paper>
      )}

      {/* Main Two-Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column (8 cols): Incident Details & Discussion Stream */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Incident Specification Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: COLORS.onSurfaceVariant,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: 'none',
                  mb: 1.5,
                }}
              >
                Description
              </Typography>
              <Typography sx={{ color: COLORS.onSurface, fontSize: 14, lineHeight: 1.6, mb: 3 }}>
                {incident.description}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'none' }}>
                      Service
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.5 }}>
                      {incident.service?.name || 'General Enterprise'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'none' }}>
                      Type of problem
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.5 }}>
                      {incident.category?.name || 'Not sorted yet'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'none' }}>
                      People affected
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                      {incident.affectedUsers ?? 0} {(incident.affectedUsers ?? 0) === 1 ? 'person' : 'people'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Priority Explainer Breakdown */}
              {incident.priorityBreakdown && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <HelpIcon sx={{ fontSize: 16, color: COLORS.secondary }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                      How the priority was set
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                    Impact ({incident.priorityBreakdown.impact}) × Urgency ({incident.priorityBreakdown.urgency}) × Criticality ({incident.priorityBreakdown.criticality}) × Number of people ({incident.priorityBreakdown.usersMultiplier}) = Score {incident.priorityBreakdown.score} ({incident.priorityBreakdown.band})
                    {incident.priorityBreakdown.overrideRule && ` • Rule: ${incident.priorityBreakdown.overrideRule}`}
                  </Typography>
                </Box>
              )}

              {/* Closure Information (when closed/verified) */}
              {(incident.closureReason || incident.closedAt || incident.reopenCount > 0) && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: alpha(tokens.white, 0.03), borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'none', mb: 0.5 }}>
                    Closing details
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                    Reason: <strong>{incident.closureReason || 'N/A'}</strong>
                    {incident.reopenCount > 0 && ` • Reopened ${incident.reopenCount} time(s)`}
                    {incident.closedAt && ` • Closed on: ${new Date(incident.closedAt).toLocaleString()}`}
                  </Typography>
                </Box>
              )}

              {/* Resolution Summary (when resolved) */}
              {incident.resolution && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: alpha(tokens.success, 0.08), borderRadius: 2, border: `1px solid ${alpha(tokens.success, 0.25)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: COLORS.success }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.success, fontFamily: 'JetBrains Mono, monospace' }}>
                      ENGINEERING RESOLUTION LOG
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mb: 0.5 }}>
                    <strong>Cause:</strong> {incident.resolution.rootCause}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                    <strong>Remediation Steps:</strong> {incident.resolution.steps || incident.resolution.notes}
                  </Typography>
                  {incident.resolution.resolvedBy && (
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                      Resolved by: {incident.resolution.resolvedBy.name} • {incident.resolution.timeSpentMinutes} mins spent
                    </Typography>
                  )}
                </Box>
              )}

              {/* Feedback Record */}
              {incident.feedback && (
                <Box sx={{ mt: 2, p: 2, bgcolor: alpha(tokens.amberLight, 0.08), borderRadius: 2, border: `1px solid ${alpha(tokens.amberLight, 0.25)}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <StarIcon sx={{ fontSize: 18, color: tokens.amberLight }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.yellowLight, fontFamily: 'JetBrains Mono, monospace' }}>
                      YOUR FEEDBACK ({incident.feedback.rating}/5)
                    </Typography>
                  </Box>
                  {incident.feedback.comment && (
                    <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                      &ldquo;{incident.feedback.comment}&rdquo;
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>

            {/* Discussion & Audit Trail Stream */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Box sx={{ borderBottom: `1px solid ${COLORS.border}`, mb: 2 }}>
                <Tabs
                  value={activeTab}
                  onChange={(_, val) => setActiveTab(val)}
                  sx={{
                    '& .MuiTab-root': {
                      color: COLORS.onSurfaceVariant,
                      fontSize: 12.5,
                      fontWeight: 700,
                      textTransform: 'none',
                      minHeight: 40,
                      '&.Mui-selected': { color: COLORS.secondary },
                    },
                    '& .MuiTabs-indicator': { bgcolor: COLORS.secondary },
                  }}
                >
                  <Tab icon={<ChatIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Messages (${comments.length})`} value="comments" />
                  <Tab icon={<HistoryIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`History (${history.length})`} value="history" />
                  <Tab icon={<AttachFileIcon sx={{ fontSize: 16 }} />} iconPosition="start" label={`Attachments (${attachments.length})`} value="attachments" />
                  <Tab icon={<TimelineIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Similar reports" value="similar" />
                </Tabs>
              </Box>

              {activeTab === 'comments' && (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    {comments.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                        <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                          No messages yet. Your technician will post updates here.
                        </Typography>
                      </Box>
                    ) : (
                      comments.map((c: CommentView) => (
                        <Box
                          key={c.id}
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: c.author?.id === incident.reporter?.id ? COLORS.surfaceContainerHigh : COLORS.surfaceContainerLow,
                            border: `1px solid ${COLORS.border}`,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
                                {c.author?.name || 'Service Desk Team'}
                              </Typography>
                              <Chip
                                label={c.visibility || 'PUBLIC'}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: 12,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  bgcolor: COLORS.surfaceContainerHighest,
                                  color: COLORS.onSurfaceVariant,
                                }}
                              />
                            </Box>
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                              {new Date(c.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 13, color: COLORS.onSurface, lineHeight: 1.5 }}>
                            {c.body}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>

                  {canComment ? (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Write a message to your technician..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        sx={{
                          bgcolor: COLORS.surfaceContainerLowest,
                          borderRadius: 2,
                          fontSize: 13,
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => {
                          if (commentText.trim()) commentMutation.mutate(commentText);
                        }}
                        disabled={!commentText.trim() || commentMutation.isPending}
                        startIcon={commentMutation.isPending ? <CircularProgress size={16} /> : <SendIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                          color: tokens.white,
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          px: 3,
                          py: 1.2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Send
                      </Button>
                    </Box>
                  ) : (
                    <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                        Commenting is closed for this incident.
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {activeTab === 'history' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {history.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        No audit events recorded.
                      </Typography>
                    </Box>
                  ) : (
                    history.map((h: AuditEntry) => (
                      <Box
                        key={h.id}
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                          bgcolor: COLORS.surfaceContainerLow,
                          border: `1px solid ${COLORS.border}`,
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <TimelineIcon sx={{ fontSize: 18, color: COLORS.secondary, mt: 0.3 }} />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                                {ACTION_LABELS[h.action] || h.action}
                              </Typography>
                              {h.actor && (
                                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                                  by {h.actor.name}
                                </Typography>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                              {new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                            {h.description}
                          </Typography>
                          {(h.previousState || h.newState) && (
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', mt: 0.5 }}>
                              {h.previousState ? `${h.previousState} ➔ ` : ''}{h.newState}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {activeTab === 'attachments' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Upload new attachment */}
                  <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <input
                        type="file"
                        id="employee-file-input"
                        style={{ display: 'none' }}
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <label htmlFor="employee-file-input">
                        <Button
                          variant="outlined"
                          component="span"
                          size="small"
                          startIcon={<AttachFileIcon />}
                          sx={{ borderColor: COLORS.border, color: COLORS.onSurface, textTransform: 'none' }}
                        >
                          Choose File (max 5 MB)
                        </Button>
                      </label>
                      {selectedFile && (
                        <Typography sx={{ fontSize: 12, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                        </Typography>
                      )}
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!selectedFile || uploadMutation.isPending}
                      onClick={() => selectedFile && uploadMutation.mutate(selectedFile)}
                      startIcon={uploadMutation.isPending ? <CircularProgress size={14} /> : <AttachFileIcon />}
                      sx={{
                        background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
                        color: tokens.white,
                        fontWeight: 700,
                        textTransform: 'none',
                      }}
                    >
                      Upload File
                    </Button>
                  </Box>

                  {/* Attachment List */}
                  {attachments.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        No attachments uploaded for this incident.
                      </Typography>
                    </Box>
                  ) : (
                    attachments.map((att: AttachmentView) => (
                      <Box
                        key={att.id}
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                          bgcolor: COLORS.surfaceContainerLow,
                          border: `1px solid ${COLORS.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <AttachFileIcon sx={{ color: COLORS.secondary, fontSize: 20 }} />
                          <Box>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                              {att.filename}
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                              {(att.sizeBytes / 1024).toFixed(1)} KB • {att.uploadedBy?.name || 'User'} • {new Date(att.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                        <Button
                          size="small"
                          onClick={() => handleDownloadAttachment(att)}
                          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
                          sx={{ color: COLORS.secondary, textTransform: 'none', fontSize: 12 }}
                        >
                          Download
                        </Button>
                      </Box>
                    ))
                  )}
                </Box>
              )}

              {activeTab === 'similar' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {similarIncidents.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        No similar active incidents correlated by the AI engine.
                      </Typography>
                    </Box>
                  ) : (
                    similarIncidents.map((s: SimilarIncidentView) => (
                      <Box
                        key={s.incidentId}
                        onClick={() => navigate(`/employee/incidents/${s.incidentId}`)}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: COLORS.surfaceContainerLow,
                          border: `1px solid ${COLORS.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                              {s.code}
                            </Typography>
                            {s.match && (
                              <Chip
                                label={s.match}
                                size="small"
                                sx={{
                                  fontSize: 12,
                                  height: 18,
                                  bgcolor: s.match === 'DUPLICATE' ? alpha(tokens.danger, 0.15) : alpha(tokens.primary, 0.15),
                                  color: s.match === 'DUPLICATE' ? COLORS.error : COLORS.primary,
                                }}
                              />
                            )}
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                              Similarity: {(s.similarity * 100).toFixed(0)}% ({s.source || 'EMBEDDING'})
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: COLORS.onSurface }}>
                            {s.title}
                          </Typography>
                        </Box>
                        <StatusChip status={s.status} />
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>

        {/* Right Column (4 cols): Resolution SLA & Assigned Technician */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* SLA Clock Bento Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'none', fontFamily: 'JetBrains Mono, monospace' }}>
                  Expected fix time
                </Typography>
                <HourglassEmptyIcon sx={{ fontSize: 18, color: COLORS.secondary }} />
              </Box>

              <Box sx={{ mb: 2 }}>
                {incident.status === 'RESOLVED' || incident.status === 'VERIFIED' || incident.status === 'CLOSED' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.success, fontFamily: 'Sora, sans-serif' }}>
                      This problem is fixed
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <SlaCountdown
                      due={incident.resolutionDue || incident.responseDue}
                      createdAt={incident.createdAt}
                      slaState={incident.slaState}
                    />
                    <SlaBar
                      createdAt={incident.createdAt}
                      due={incident.resolutionDue || incident.responseDue}
                      slaState={incident.slaState}
                      height={6}
                    />
                  </Box>
                )}
              </Box>
              {incident.pausedAt && incident.slaState === 'PAUSED' && (
                <Typography sx={{ fontSize: 12, color: COLORS.warning, fontFamily: 'JetBrains Mono, monospace', mb: 1 }}>
                  Paused at: {new Date(incident.pausedAt).toLocaleTimeString()}
                </Typography>
              )}
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 1.5 }}>
                The target time depends on how urgent the problem is.
              </Typography>
            </Paper>

            {/* Assigned Technician Card */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'none', fontFamily: 'JetBrains Mono, monospace', mb: 2 }}>
                Your technician
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    bgcolor: COLORS.surfaceContainerHighest,
                    color: COLORS.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <PersonIcon />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: COLORS.onSurface }}>
                    {incident.assignee?.name || 'Not yet assigned'}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                    {incident.assignee ? 'Assigned Engineering Lead' : 'Awaiting assignment'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: COLORS.border, my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: COLORS.secondary, mt: 0.2 }} />
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 1.5 }}>
                  You can ask questions in the Messages tab.
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>

      {/* DIALOG 1: Provide Information (Resumes SLA) */}
      <Dialog
        open={provideInfoOpen}
        onClose={() => setProvideInfoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>
          Reply to the technician
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          {lastQuestion && (
            <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, mb: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                Question from the technician:
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mt: 0.5 }}>
                "{lastQuestion.body}"
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Your reply goes to the technician and the work continues.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={provideInfoText}
            onChange={(e) => setProvideInfoText(e.target.value)}
            placeholder="Type your reply..."
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setProvideInfoOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!provideInfoText.trim() || provideInfoMutation.isPending}
            onClick={() => provideInfoMutation.mutate(provideInfoText)}
            startIcon={provideInfoMutation.isPending ? <CircularProgress size={16} /> : <SendIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Send reply
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 2: Customer Satisfaction Rating */}
      <Dialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
          Rate the fix
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            How well was your problem fixed?
          </Typography>
          <Rating
            value={feedbackRating}
            emptyLabelText=""
            onChange={(_, val) => setFeedbackRating(val)}
            size="large"
            sx={{
              color: tokens.amberLight,
              mb: 2.5,
              '& .MuiRating-iconEmpty': { color: alpha(tokens.white, 0.2) },
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Anything else you would like to add? (optional)"
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setFeedbackOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!feedbackRating || feedbackMutation.isPending}
            onClick={() => feedbackMutation.mutate({ rating: feedbackRating || 5, comment: feedbackComment.trim() || undefined })}
            startIcon={feedbackMutation.isPending ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            sx={{
              bgcolor: COLORS.success,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: tokens.successDark },
            }}
          >
            Send feedback
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 3: Reopen Incident */}
      <Dialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>
          Reopen this incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Tell us why the problem is not fixed.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Reason for reopening"
            helperText={`${reopenReason.trim().length} / 10 characters minimum`}
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReopenOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!reasonRule.safeParse(reopenReason.trim()).success || reopenMutation.isPending}
            onClick={() => reopenMutation.mutate(reopenReason.trim())}
            startIcon={reopenMutation.isPending ? <CircularProgress size={16} /> : <RestartAltIcon />}
            sx={{
              bgcolor: COLORS.warning,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: tokens.amberDark },
            }}
          >
            Reopen
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 4: Withdraw Incident */}
      <Dialog
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>
          Withdraw this report
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Withdrawing closes this report. Tell us why.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Reason for withdrawing"
            helperText={`${withdrawReason.trim().length} / 10 characters minimum`}
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setWithdrawOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!reasonRule.safeParse(withdrawReason.trim()).success || withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate(withdrawReason.trim())}
            startIcon={withdrawMutation.isPending ? <CircularProgress size={16} /> : <CancelIcon />}
            sx={{
              bgcolor: COLORS.error,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: tokens.redDark },
            }}
          >
            Withdraw report
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 5: Confirm Verify Fix */}
      <Dialog
        open={verifyConfirmOpen}
        onClose={() => setVerifyConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>
          Confirm the fix
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, lineHeight: 1.6 }}>
            Is the problem in <strong style={{ color: COLORS.secondary }}>{incident.code}</strong> fixed?
            After you confirm, you can rate the fix.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setVerifyConfirmOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={verifyMutation.isPending}
            onClick={() => verifyMutation.mutate()}
            sx={{
              bgcolor: COLORS.success,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: tokens.successDark },
            }}
          >
            Yes, it is fixed
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 6: Edit Incident (PUT /incidents/{id}) */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>
          Edit description
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Update what you reported.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={5}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            helperText={`${editDescription.trim().length} / 20 characters minimum`}
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={editDescription.trim().length < 20 || editDescription.trim() === incident.description.trim() || editMutation.isPending}
            onClick={() => editMutation.mutate()}
            startIcon={editMutation.isPending ? <CircularProgress size={16} /> : <EditIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG 7: Post-Incident Report Modal */}
      <Dialog
        open={pirOpen}
        onClose={() => setPirOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
            Incident report for {incident.code}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadPdf}
            startIcon={<PdfIcon />}
            sx={{ borderColor: COLORS.border, color: COLORS.secondary, textTransform: 'none' }}
          >
            Download PDF
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          {pirLoading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} sx={{ color: COLORS.secondary }} />
            </Box>
          ) : pirData ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.onSurface, mb: 0.5 }}>
                  {pirData.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                  Created {new Date(pirData.generatedAt).toLocaleString()} • Took {pirData.totalSeconds ? `${Math.floor(pirData.totalSeconds / 3600)}h ${Math.round((pirData.totalSeconds % 3600) / 60)}m` : 'unknown time'}
                </Typography>
              </Box>

              {pirData.resolution && (
                <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.success, fontFamily: 'JetBrains Mono, monospace', mb: 1 }}>
                    How it was fixed
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mb: 0.5 }}>
                    <strong>Cause:</strong> {pirData.resolution.rootCause}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
                    <strong>What was done:</strong> {pirData.resolution.steps || pirData.resolution.notes}
                  </Typography>
                </Box>
              )}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
              The report is not ready yet.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPirOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
