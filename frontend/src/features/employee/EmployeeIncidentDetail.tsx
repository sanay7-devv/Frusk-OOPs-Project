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
} from '@mui/icons-material';

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
} from '../../api/incidents';
import type { IncidentDetail, AuditEntry } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import { useToast } from '../../components/Toast';

const COLORS = {
  surface: '#090d16',
  surfaceContainerLowest: '#0a0e17',
  surfaceContainerLow: '#121622',
  surfaceContainer: '#141824',
  surfaceContainerHigh: '#1c2234',
  surfaceContainerHighest: '#262d42',
  onSurface: '#f8fafc',
  onSurfaceVariant: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  secondary: '#06b6d4',
  error: '#f43f5e',
  warning: '#f59e0b',
  success: '#10b981',
};

export default function EmployeeIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const numId = Number(id);

  // Local state for modals & forms
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');

  // Action Dialogs
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

  // Queries
  const { data: incident, isLoading } = useQuery<IncidentDetail>({
    queryKey: ['employee-incident', numId],
    queryFn: () => getIncident(numId),
    enabled: !isNaN(numId) && numId > 0,
  });

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ['employee-incident-comments', numId],
    queryFn: () => getComments(numId),
  });

  const { data: history = [] } = useQuery<AuditEntry[]>({
    queryKey: ['employee-incident-history', numId],
    queryFn: () => getHistory(numId),
  });

  // Mutations
  const commentMutation = useMutation({
    mutationFn: (text: string) => addComment(numId, text, 'PUBLIC'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident-comments', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-history', numId] });
      setCommentText('');
      toast('Your update has been sent to the on-call engineer.', 'success');
    },
    onError: () => {
      toast('Failed to post update. Please try again.', 'error');
    },
  });

  const provideInfoMutation = useMutation({
    mutationFn: (message: string) => provideInfo(numId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-comments', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-history', numId] });
      toast('Information provided. The SLA clock has resumed.', 'success');
      setProvideInfoOpen(false);
      setProvideInfoText('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to submit response.', 'error');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyIncident(numId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-history', numId] });
      toast('Fix verified. Thank you for confirming!', 'success');
      setVerifyConfirmOpen(false);
      setFeedbackOpen(true);
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to verify incident.', 'error');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ rating, comment }: { rating: number; comment?: string }) => submitFeedback(numId, rating, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident', numId] });
      toast('Feedback recorded. Thank you for your review!', 'success');
      setFeedbackOpen(false);
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to submit feedback.', 'error');
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (reason: string) => reopenIncident(numId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-history', numId] });
      toast('Incident reopened.', 'info');
      setReopenOpen(false);
      setReopenReason('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to reopen incident.', 'error');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: (reason: string) => withdrawIncident(numId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incident', numId] });
      queryClient.invalidateQueries({ queryKey: ['employee-incident-history', numId] });
      toast('Incident withdrawn.', 'info');
      setWithdrawOpen(false);
      setWithdrawReason('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to withdraw incident.', 'error');
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: COLORS.onSurface, mb: 2 }}>
          Incident Record Not Found
        </Typography>
        <Button
          onClick={() => navigate('/employee/incidents')}
          startIcon={<ArrowBackIcon />}
          sx={{ color: COLORS.secondary }}
        >
          Return to My Incidents
        </Button>
      </Box>
    );
  }

  const allowed = (incident.allowedActions || []) as string[];
  const canProvideInfo = allowed.includes('PROVIDE_INFO');
  const canVerify = allowed.includes('VERIFY');
  const canGiveFeedback = allowed.includes('GIVE_FEEDBACK') || ((incident.status === 'RESOLVED' || incident.status === 'VERIFIED') && !incident.feedback);
  const canReopen = allowed.includes('REOPEN');
  const canWithdraw = allowed.includes('WITHDRAW');
  const canComment = allowed.includes('COMMENT');

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Top Header Bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
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
              <Typography
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 14,
                  fontWeight: 800,
                  color: COLORS.secondary,
                }}
              >
                {incident.code}
              </Typography>
              <PriorityBadge priority={incident.priority} />
              <StatusChip status={incident.status} />
              {incident.major && (
                <Chip
                  label="MAJOR OUTAGE"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(244, 63, 94, 0.2)',
                    color: COLORS.error,
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 800,
                    fontSize: 10,
                  }}
                />
              )}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mt: 0.5 }}>
              {incident.title}
            </Typography>
          </Box>
        </Box>

        {/* Dynamic Action Buttons based on allowedActions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {canProvideInfo && (
            <Button
              variant="contained"
              onClick={() => setProvideInfoOpen(true)}
              startIcon={<ReplyIcon />}
              sx={{
                background: 'linear-gradient(135deg, #f751a1 0%, #6366f1 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.2,
                boxShadow: '0 0 16px rgba(247, 81, 161, 0.4)',
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
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2.2,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Verify Fix
            </Button>
          )}

          {canGiveFeedback && (
            <Button
              variant="outlined"
              onClick={() => setFeedbackOpen(true)}
              startIcon={<StarIcon sx={{ color: '#fbbf24' }} />}
              sx={{
                borderColor: 'rgba(251, 191, 36, 0.4)',
                bgcolor: 'rgba(251, 191, 36, 0.1)',
                color: '#fef08a',
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                '&:hover': { bgcolor: 'rgba(251, 191, 36, 0.2)', borderColor: '#fbbf24' },
              }}
            >
              Rate Resolution
            </Button>
          )}

          {canReopen && (
            <Button
              variant="outlined"
              onClick={() => setReopenOpen(true)}
              startIcon={<RestartAltIcon />}
              sx={{
                borderColor: 'rgba(244, 63, 94, 0.4)',
                bgcolor: 'rgba(244, 63, 94, 0.08)',
                color: COLORS.error,
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: 'none',
                borderRadius: 2,
                px: 1.8,
                '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.15)', borderColor: COLORS.error },
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
                '&:hover': { borderColor: 'rgba(255, 255, 255, 0.25)', bgcolor: COLORS.surfaceContainerHigh },
              }}
            >
              Withdraw
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Two-Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column (8 cols): Incident Details & Discussion / History Stream */}
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
                backdropFilter: 'blur(16px)',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontFamily: 'JetBrains Mono, monospace',
                  color: COLORS.onSurfaceVariant,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  mb: 1.5,
                }}
              >
                Incident Diagnostics &amp; Impact Description
              </Typography>
              <Typography sx={{ color: COLORS.onSurface, fontSize: 14, lineHeight: 1.6, mb: 3 }}>
                {incident.description}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Impacted Service
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.5 }}>
                      {incident.service?.name || 'General Enterprise'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Category Scope
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.5 }}>
                      {incident.category?.name || 'Unclassified Triage'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Estimated Affected Users
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                      {incident.affectedUsers || 1} User(s)
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Resolution Summary (when resolved) */}
              {incident.resolution && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.08)', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 18, color: COLORS.success }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.success, fontFamily: 'JetBrains Mono, monospace' }}>
                      ENGINEERING RESOLUTION LOG
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurface, mb: 0.5 }}>
                    <strong>Root Cause:</strong> {incident.resolution.rootCause}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                    <strong>Remediation Steps:</strong> {incident.resolution.steps || incident.resolution.notes}
                  </Typography>
                  {incident.resolution.resolvedBy && (
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, mt: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                      Resolved by: {incident.resolution.resolvedBy.name} • {incident.resolution.timeSpentMinutes} mins spent
                    </Typography>
                  )}
                </Box>
              )}

              {/* Existing Feedback Display */}
              {incident.feedback && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(251, 191, 36, 0.08)', borderRadius: 2, border: '1px solid rgba(251, 191, 36, 0.25)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <StarIcon sx={{ fontSize: 18, color: '#fbbf24' }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#fef08a', fontFamily: 'JetBrains Mono, monospace' }}>
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
                backdropFilter: 'blur(16px)',
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
                  <Tab
                    icon={<ChatIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                    label={`Communications (${comments.length})`}
                    value="comments"
                  />
                  <Tab
                    icon={<HistoryIcon sx={{ fontSize: 16 }} />}
                    iconPosition="start"
                    label={`Audit Trail (${history.length})`}
                    value="history"
                  />
                </Tabs>
              </Box>

              {activeTab === 'comments' ? (
                <>
                  {/* Message History */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    {comments.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                        <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                          No messages logged yet. The assigned technician will post diagnostic updates here.
                        </Typography>
                      </Box>
                    ) : (
                      comments.map((c: any) => (
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
                                  fontSize: 9.5,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  bgcolor: COLORS.surfaceContainerHighest,
                                  color: COLORS.onSurfaceVariant,
                                }}
                              />
                            </Box>
                            <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
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

                  {/* Input for employee to send clarification / note */}
                  {canComment ? (
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Post a diagnostic note or additional details for the assigned technician..."
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
                          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                          color: '#ffffff',
                          fontWeight: 700,
                          textTransform: 'none',
                          borderRadius: 2,
                          px: 3,
                          py: 1.2,
                          whiteSpace: 'nowrap',
                          '&:hover': { opacity: 0.9 },
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
              ) : (
                /* History Timeline */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {history.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        No audit events recorded.
                      </Typography>
                    </Box>
                  ) : (
                    history.map((h) => (
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
                                {h.action}
                              </Typography>
                              {h.actor && (
                                <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                                  by {h.actor.name}
                                </Typography>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                              {new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                            {h.description}
                          </Typography>
                          {(h.previousState || h.newState) && (
                            <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', mt: 0.5 }}>
                              {h.previousState ? `${h.previousState} ➔ ` : ''}{h.newState}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ))
                  )}
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>

        {/* Right Column (4 cols): Resolution SLA & Assigned Squad */}
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
                backdropFilter: 'blur(16px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                  Target Resolution SLA
                </Typography>
                <HourglassEmptyIcon sx={{ fontSize: 18, color: COLORS.secondary }} />
              </Box>

              <Box sx={{ mb: 2 }}>
                {incident.status === 'RESOLVED' || incident.status === 'VERIFIED' || incident.status === 'CLOSED' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ color: COLORS.success, fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.success, fontFamily: 'Sora, sans-serif' }}>
                      Incident Remediated
                    </Typography>
                  </Box>
                ) : (
                  <SlaCountdown
                    due={incident.resolutionDue || incident.responseDue}
                    createdAt={incident.createdAt}
                    slaState={incident.slaState}
                  />
                )}
              </Box>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant, lineHeight: 1.5 }}>
                SLA commitments are monitored continuously by the ITIL automation engine. Escalations trigger automatically if thresholds are exceeded.
              </Typography>
            </Paper>

            {/* Assigned SRE Team */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
                backdropFilter: 'blur(16px)',
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', mb: 2 }}>
                Assigned Engineering Squad
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
                    {incident.assignee?.name || 'Triage Dispatch Queue'}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                    {incident.assignee ? 'Level 2 Site Reliability Engineer' : 'Auto-dispatching to on-call squad'}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ borderColor: COLORS.border, my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: COLORS.secondary, mt: 0.2 }} />
                <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant, lineHeight: 1.5 }}>
                  Need immediate escalation? High-impact disruptions are automatically connected to the 24/7 ITIL Incident Command War Room.
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
          Provide Requested Information
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            The technician paused the SLA clock awaiting your input. Answering will automatically resume the SLA clock and return the ticket to active engineering work.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={provideInfoText}
            onChange={(e) => setProvideInfoText(e.target.value)}
            placeholder="Type your response, clarification, or requested details..."
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
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Submit &amp; Resume Clock
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
          Rate the Resolution
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            How satisfied are you with the timeliness and quality of this resolution?
          </Typography>
          <Rating
            value={feedbackRating}
            onChange={(_, val) => setFeedbackRating(val)}
            size="large"
            sx={{
              color: '#fbbf24',
              mb: 2.5,
              '& .MuiRating-iconEmpty': { color: 'rgba(255, 255, 255, 0.2)' },
            }}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Optional comments on the engineer's service..."
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
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Submit Feedback
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
          Reopen Incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            If the problem recurred or the fix was incomplete, please explain why the ticket needs to be reopened.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            placeholder="Reason for reopening..."
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
            disabled={reopenReason.trim().length < 10 || reopenMutation.isPending}
            onClick={() => reopenMutation.mutate(reopenReason.trim())}
            startIcon={reopenMutation.isPending ? <CircularProgress size={16} /> : <RestartAltIcon />}
            sx={{
              bgcolor: COLORS.warning,
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            Reopen Ticket {reopenReason.trim().length > 0 && reopenReason.trim().length < 10 ? `(${10 - reopenReason.trim().length} more chars)` : ''}
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
          Withdraw Incident Report
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Are you sure you want to withdraw this incident? The report will be closed as WITHDRAWN.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            placeholder="Reason for withdrawal (min 10 characters)..."
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
            disabled={withdrawReason.trim().length < 10 || withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate(withdrawReason.trim())}
            startIcon={withdrawMutation.isPending ? <CircularProgress size={16} /> : <CancelIcon />}
            sx={{
              bgcolor: COLORS.error,
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            Withdraw Report {withdrawReason.trim().length > 0 && withdrawReason.trim().length < 10 ? `(${10 - withdrawReason.trim().length} more chars)` : ''}
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
          Confirm Incident Resolution
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, lineHeight: 1.6 }}>
            Are you sure the reported issue for <strong style={{ color: COLORS.secondary }}>{incident.code}</strong> is resolved to your satisfaction?
            Once verified, the ticket will transition to Verified and you will be invited to rate the resolution.
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
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Confirm &amp; Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
