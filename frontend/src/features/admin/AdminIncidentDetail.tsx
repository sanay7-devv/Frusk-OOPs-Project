import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Stack,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  SwapHoriz as SwapHorizIcon,
  PriorityHigh as PriorityHighIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Upgrade as UpgradeIcon,
  ContentCopy as ContentCopyIcon,
  UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import {
  getIncident,
  getHistory,
  getComments,
  addComment,
  listAttachments,
  uploadAttachment,
  downloadAttachment,
  downloadPostIncidentReportPdf,
  assignIncident,
  closeIncident,
} from '../../api/incidents';
import { reassignIncident } from '../../api/technicians';
import PriorityBadge from '../../components/PriorityBadge';
import PriorityExplainer from '../../components/PriorityExplainer';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { apiErrorMessage } from '../../utils/errors';
import type { AttachmentView, CommentView } from '../../api/types';
import { COLORS, MAX_REASON, MIN_REASON, MONO, dialogPaperSx, fieldSx, fmtDateTime, invalidateIncidentCaches } from '../lead/shared/ui';
import IntelligencePanel, { SlaRiskCard } from '../lead/shared/IntelligencePanel';
import { CandidatePicker } from '../lead/shared/TeamComponents';
import {
  EditIncidentDialog,
  EscalateDialog,
  MarkDuplicateDialog,
  OverridePriorityDialog,
} from '../lead/shared/IncidentActionDialogs';

const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'log'];
const MAX_ATTACH_BYTES = 5 * 1024 * 1024;
const MAX_ATTACH_COUNT = 10;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box mb={1.5}>
      <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: COLORS.onSurface, fontWeight: 600 }}>
        {children}
      </Typography>
    </Box>
  );
}

const actionButtonSx = {
  borderColor: COLORS.border,
  color: COLORS.onSurface,
  textTransform: 'none',
  '&:hover': { borderColor: COLORS.primary, bgcolor: 'rgba(99, 102, 241, 0.08)' },
} as const;

export default function AdminIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const incidentId = Number(id);
  const validId = Number.isInteger(incidentId) && incidentId > 0;

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentVisibility, setCommentVisibility] = useState<'INTERNAL' | 'PUBLIC'>('INTERNAL');

  const { data: incident, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-incident-detail', incidentId],
    queryFn: () => getIncident(incidentId),
    enabled: validId,
  });

  const { data: comments = [], isError: commentsError, error: commentsErr, refetch: refetchComments } = useQuery<CommentView[]>({
    queryKey: ['admin-incident-comments', incidentId],
    queryFn: () => getComments(incidentId),
    enabled: validId,
  });

  const { data: history = [], isError: historyError, error: historyErr, refetch: refetchHistory } = useQuery({
    queryKey: ['admin-incident-history', incidentId],
    queryFn: () => getHistory(incidentId),
    enabled: validId,
  });

  const { data: attachments = [], isError: attachError, error: attachErr, refetch: refetchAttach } = useQuery<AttachmentView[]>({
    queryKey: ['admin-incident-attachments', incidentId],
    queryFn: () => listAttachments(incidentId),
    enabled: validId,
  });

  const afterChange = () => invalidateIncidentCaches(queryClient);

  const commentMutation = useMutation({
    mutationFn: () => addComment(incidentId, newComment.trim(), commentVisibility),
    onSuccess: () => {
      toast('Comment posted to incident stream', 'success');
      setNewComment('');
      afterChange();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const closeAssign = () => {
    setAssignOpen(false);
    setSelectedTechId(null);
    setReassignReason('');
  };

  // Assign (from CLASSIFIED) or reassign (an already assigned incident); each has its own endpoint and rules.
  const assignMutation = useMutation({
    mutationFn: ({ mode, technicianId, reason }: { mode: 'assign' | 'reassign'; technicianId: number; reason: string }) =>
      mode === 'assign' ? assignIncident(incidentId, technicianId) : reassignIncident(incidentId, technicianId, reason),
    onSuccess: (_r, v) => {
      toast(v.mode === 'assign' ? 'Technician assigned' : 'Technician successfully reassigned', 'success');
      closeAssign();
      afterChange();
    },
    onError: (e) => {
      if ((e as { response?: { status?: number } })?.response?.status === 409) afterChange();
      toast(apiErrorMessage(e), 'error');
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeIncident(incidentId),
    onSuccess: () => {
      toast('Incident closed', 'info');
      setCloseConfirmOpen(false);
      afterChange();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(incidentId, file),
    onSuccess: (a) => {
      toast(`Uploaded ${a.filename}`, 'success');
      afterChange();
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const pdfMutation = useMutation({
    mutationFn: () => downloadPostIncidentReportPdf(incidentId),
    onSuccess: (blob) => {
      saveBlob(blob, `incident-report-${incident?.code ?? incidentId}.pdf`);
      toast('Post-incident report PDF downloaded.', 'success');
    },
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  const downloadMutation = useMutation({
    mutationFn: async (att: AttachmentView) => ({ att, blob: await downloadAttachment(att.id) }),
    onSuccess: ({ att, blob }) => saveBlob(blob, att.filename),
    onError: (e) => toast(apiErrorMessage(e), 'error'),
  });

  function saveBlob(blob: Blob, name: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const onFilePicked = (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXT.includes(ext)) {
      toast(`Allowed file types: ${ALLOWED_EXT.join(', ')}.`, 'error');
      return;
    }
    if (file.size > MAX_ATTACH_BYTES) {
      toast('A file can be at most 5 MB.', 'error');
      return;
    }
    if (attachments.length >= MAX_ATTACH_COUNT) {
      toast(`An incident can have at most ${MAX_ATTACH_COUNT} attachments.`, 'error');
      return;
    }
    uploadMutation.mutate(file);
  };

  if (!validId) {
    return (
      <Box p={4} textAlign="center">
        <EmptyState message="That is not a valid incident id." />
        <Button onClick={() => navigate('/admin/tickets')} sx={{ mt: 2, color: COLORS.primary }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box p={4}>
        <LoadingState />
      </Box>
    );
  }

  if (error || !incident) {
    return (
      <Box p={4}>
        {error ? <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} /> : <EmptyState message="Incident not found" />}
        <Button onClick={() => navigate('/admin/tickets')} sx={{ mt: 2, color: COLORS.primary }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  const allowed = incident.allowedActions ?? [];
  const canAssign = allowed.includes('ASSIGN');
  const canReassign = allowed.includes('REASSIGN');
  const assignMode: 'assign' | 'reassign' = canAssign && !incident.assignee ? 'assign' : 'reassign';
  const reasonLen = reassignReason.trim().length;
  const reasonBad = reassignReason.length > 0 && reasonLen < MIN_REASON;
  const assignValid = !!selectedTechId && (assignMode === 'assign' || (reasonLen >= MIN_REASON && reassignReason.length <= MAX_REASON));
  const anyAction = [
    canAssign,
    canReassign,
    allowed.includes('OVERRIDE_PRIORITY'),
    allowed.includes('EDIT'),
    allowed.includes('ESCALATE'),
    allowed.includes('MARK_DUPLICATE'),
    allowed.includes('CLOSE'),
  ].some(Boolean);
  const preview = incident.escalationPreview;

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      {/* Top Navigation */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3} flexWrap="wrap" useFlexGap>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/tickets')}
          sx={{ color: COLORS.onSurfaceVariant, '&:hover': { color: COLORS.onSurface, bgcolor: 'rgba(255, 255, 255, 0.05)' } }}
        >
          All Tickets
        </Button>
        <Typography variant="h5" fontWeight="bold" sx={{ fontFamily: MONO, color: COLORS.primary }}>
          {incident.code}
        </Typography>
        <PriorityBadge priority={incident.priority} />
        <StatusChip status={incident.status} />
        {incident.major && (
          <Chip
            label="MAJOR INCIDENT"
            size="small"
            sx={{ bgcolor: 'rgba(244, 63, 94, 0.2)', color: '#fb7185', border: '1px solid rgba(244, 63, 94, 0.4)', fontWeight: 800, fontSize: 12, fontFamily: MONO }}
          />
        )}
        {incident.problemId && (
          <Chip
            label={`Problem #${incident.problemId}`}
            size="small"
            sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', color: COLORS.primary, border: '1px solid rgba(99, 102, 241, 0.35)', fontWeight: 700, fontSize: 12, fontFamily: MONO }}
          />
        )}
        {incident.duplicateOfId && (
          <Chip
            label={`Duplicate of #${incident.duplicateOfId}`}
            size="small"
            sx={{ bgcolor: COLORS.surfaceContainerLowest, color: COLORS.onSurfaceVariant, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
          />
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Details */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              {incident.title}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: COLORS.onSurfaceVariant, mt: 2, lineHeight: 1.7 }}>
              {incident.description}
            </Typography>

            {incident.resolution && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: 2, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: MONO }}>
                  Root Cause &amp; Resolution:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {incident.resolution.rootCause ? `Root Cause: ${incident.resolution.rootCause}` : ''}
                  {incident.resolution.notes ? ` - ${incident.resolution.notes}` : ''}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Intelligence tools */}
          <Box sx={{ mb: 3 }}>
            <IntelligencePanel incidentId={incident.id} showSlaRisk={false} onOpenIncident={(other) => navigate(`/admin/tickets/${other}`)} />
          </Box>

          {/* Discussion */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
              Admin Command Notes &amp; Discussion
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>Visibility:</Typography>
              <Chip
                label="INTERNAL (Ops Only)"
                clickable
                size="small"
                onClick={() => setCommentVisibility('INTERNAL')}
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: commentVisibility === 'INTERNAL' ? COLORS.primary : COLORS.surfaceContainerHigh,
                  color: commentVisibility === 'INTERNAL' ? '#ffffff' : COLORS.onSurfaceVariant,
                }}
              />
              <Chip
                label="PUBLIC (Reporter Visible)"
                clickable
                size="small"
                onClick={() => setCommentVisibility('PUBLIC')}
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: commentVisibility === 'PUBLIC' ? COLORS.secondary : COLORS.surfaceContainerHigh,
                  color: commentVisibility === 'PUBLIC' ? '#ffffff' : COLORS.onSurfaceVariant,
                }}
              />
            </Box>
            <Stack direction="row" spacing={1.5} mb={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Post administrative note or technician guidance..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                error={newComment.length > 4000}
                helperText={newComment.length > 3500 ? `${newComment.length}/4000` : undefined}
                sx={fieldSx}
              />
              <Button
                variant="contained"
                startIcon={commentMutation.isPending ? <CircularProgress size={16} /> : <SendIcon />}
                disabled={commentMutation.isPending || !newComment.trim() || newComment.length > 4000}
                onClick={() => commentMutation.mutate()}
                sx={{ bgcolor: COLORS.primary, color: '#ffffff', fontWeight: 700, '&:hover': { bgcolor: '#4f46e5' } }}
              >
                Send
              </Button>
            </Stack>
            {commentsError && <ErrorState onRetry={() => refetchComments()} message={apiErrorMessage(commentsErr)} />}
            {comments.length > 0 && (
              <Box sx={{ mt: 2, mb: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {comments.map((c) => (
                  <Box key={c.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                        {c.author.name} <Chip size="small" label={c.visibility} sx={{ height: 18, fontSize: 12, ml: 0.5 }} />
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>{fmtDateTime(c.createdAt)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurface, whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Audit history */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
              Audit history
            </Typography>
            {historyError ? (
              <ErrorState onRetry={() => refetchHistory()} message={apiErrorMessage(historyErr)} />
            ) : history.length === 0 ? (
              <EmptyState message="No audit entries yet." />
            ) : (
              <Stack spacing={1}>
                {history.map((h) => (
                  <Box key={h.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: COLORS.surfaceContainerLowest, border: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
                      {fmtDateTime(h.timestamp)} | {h.actor?.name ?? 'System'} | {h.action}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurface }}>{h.description}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Metadata & Controls */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              SLA Timers &amp; Target
            </Typography>
            <Field label="Response due">
              {fmtDateTime(incident.responseDue)}
              {incident.acknowledgedAt ? ' (acknowledged)' : ' (not acknowledged yet)'}
            </Field>
            <Box my={2}>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }} display="block">
                Resolution due
              </Typography>
              <SlaCountdown due={incident.resolutionDue} createdAt={incident.createdAt} slaState={incident.slaState} />
            </Box>
            {incident.pausedAt && (
              <Alert severity="info" sx={{ fontSize: 12.5, mb: 1.5 }}>
                SLA clock paused since {fmtDateTime(incident.pausedAt)} (waiting for the reporter).
              </Alert>
            )}
            {preview && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mb: 0.5 }}>
                  Next escalation
                </Typography>
                {preview.kind === 'EXHAUSTED' ? (
                  <Typography sx={{ fontSize: 12.5, color: COLORS.warning }}>Escalation exhausted: the top tier has been notified.</Typography>
                ) : (
                  <>
                    <SlaCountdown due={preview.dueAt} remainingSeconds={preview.secondsRemaining} slaState={incident.slaState} />
                    <Typography sx={{ fontSize: 12.5, color: COLORS.onSurface, mt: 0.5 }}>
                      to level {preview.toLevel} ({preview.targetRole}): {preview.recipients.map((r) => r.name).join(', ')}
                    </Typography>
                  </>
                )}
              </Box>
            )}
            <SlaRiskCard incidentId={incident.id} />

            <Divider sx={{ my: 2, borderColor: COLORS.border }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              Lifecycle
            </Typography>
            <Field label="Escalation level">{incident.escalationLevel}</Field>
            <Field label="Times reopened">{incident.reopenCount}</Field>
            <Field label="Created">{fmtDateTime(incident.createdAt)}</Field>
            <Field label="Acknowledged">{fmtDateTime(incident.acknowledgedAt)}</Field>
            <Field label="Resolved">{fmtDateTime(incident.resolvedAt)}</Field>
            <Field label="Closed">
              {fmtDateTime(incident.closedAt)}
              {incident.closureReason ? ` (${incident.closureReason})` : ''}
            </Field>
            {incident.feedback && (
              <Field label="Reporter feedback">
                {incident.feedback.rating}/5
                {incident.feedback.comment ? ` - ${incident.feedback.comment}` : ''}
              </Field>
            )}

            <Divider sx={{ my: 2, borderColor: COLORS.border }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              Assignment &amp; Stakeholders
            </Typography>
            <Field label="Assigned Technician">{incident.assignee?.name ?? 'Unassigned (waiting in queue)'}</Field>
            <Field label="Reporter">{incident.reporter.name}</Field>
            <Field label="Impacted Service">{incident.service.name}</Field>
            <Field label="Category">{incident.category?.name ?? 'None yet (needs triage)'}</Field>

            <Box sx={{ my: 2 }}>
              <PriorityExplainer
                priority={incident.priority}
                impact={incident.impact}
                urgency={incident.urgency}
                score={incident.priorityBreakdown?.score}
                overrideRule={incident.priorityBreakdown?.overrideRule}
              />
            </Box>

            <Divider sx={{ my: 2, borderColor: COLORS.border }} />

            {/* Actions, all from the server's allowedActions */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: COLORS.onSurface }} mb={1.5}>
              Executive Actions
            </Typography>
            <Stack spacing={1}>
              {(canAssign || canReassign) && (
                <Button variant="outlined" fullWidth startIcon={<SwapHorizIcon />} onClick={() => setAssignOpen(true)} sx={actionButtonSx}>
                  {assignMode === 'assign' ? 'Assign Technician' : 'Reassign Technician'}
                </Button>
              )}
              {allowed.includes('EDIT') && (
                <Button variant="outlined" fullWidth startIcon={<EditIcon />} onClick={() => setEditOpen(true)} sx={actionButtonSx}>
                  Edit incident
                </Button>
              )}
              {allowed.includes('ESCALATE') && (
                <Button variant="outlined" fullWidth startIcon={<UpgradeIcon />} onClick={() => setEscalateOpen(true)} sx={actionButtonSx}>
                  Escalate
                </Button>
              )}
              {allowed.includes('MARK_DUPLICATE') && (
                <Button variant="outlined" fullWidth startIcon={<ContentCopyIcon />} onClick={() => setDuplicateOpen(true)} sx={actionButtonSx}>
                  Mark duplicate
                </Button>
              )}
              {allowed.includes('OVERRIDE_PRIORITY') && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="warning"
                  startIcon={<PriorityHighIcon />}
                  onClick={() => setOverrideOpen(true)}
                  sx={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24', textTransform: 'none', '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.08)' } }}
                >
                  Override Priority
                </Button>
              )}
              {allowed.includes('CLOSE') && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => setCloseConfirmOpen(true)}
                  sx={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fb7185', textTransform: 'none', '&:hover': { borderColor: '#f43f5e', bgcolor: 'rgba(244, 63, 94, 0.08)' } }}
                >
                  Close Incident
                </Button>
              )}
              {!anyAction && (
                <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontStyle: 'italic' }}>
                  No actions available in current status ({incident.status})
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Attachments */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                Attachments ({attachments.length}/{MAX_ATTACH_COUNT})
              </Typography>
              <Button
                size="small"
                startIcon={uploadMutation.isPending ? <CircularProgress size={14} /> : <UploadFileIcon />}
                disabled={uploadMutation.isPending || attachments.length >= MAX_ATTACH_COUNT}
                onClick={() => fileInput.current?.click()}
                sx={{ textTransform: 'none', fontSize: 12.5 }}
              >
                Upload
              </Button>
              <input
                ref={fileInput}
                type="file"
                hidden
                accept={ALLOWED_EXT.map((e) => `.${e}`).join(',')}
                onChange={(e) => onFilePicked(e.target.files?.[0])}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mb: 1 }}>
              png, jpg, gif, pdf, txt or log, up to 5 MB each.
            </Typography>
            {attachError ? (
              <ErrorState onRetry={() => refetchAttach()} message={apiErrorMessage(attachErr)} />
            ) : attachments.length === 0 ? (
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                No attachments uploaded.
              </Typography>
            ) : (
              <Stack spacing={1} mt={1}>
                {attachments.map((att) => (
                  <Box
                    key={att.id}
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: COLORS.surfaceContainerLowest,
                      border: `1px solid ${COLORS.border}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12.5, color: COLORS.onSurface }}>
                        {att.filename}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                        {Math.max(1, Math.round(att.sizeBytes / 1024))} KB | {att.uploadedBy.name}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      disabled={downloadMutation.isPending && downloadMutation.variables?.id === att.id}
                      onClick={() => downloadMutation.mutate(att)}
                      sx={{ textTransform: 'none', fontSize: 12.5 }}
                    >
                      Download
                    </Button>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>

          {/* Post-Incident Report PDF */}
          {(incident.status === 'RESOLVED' || incident.status === 'CLOSED' || incident.status === 'VERIFIED' || incident.major) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
                Compliance PDF Dossier
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mb: 1.5 }}>
                Official post-incident report with full audit timeline.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                disabled={pdfMutation.isPending}
                startIcon={pdfMutation.isPending ? <CircularProgress size={14} /> : <DownloadIcon />}
                onClick={() => pdfMutation.mutate()}
                sx={{ borderColor: COLORS.secondary, color: COLORS.secondary, textTransform: 'none', fontSize: 12.5, fontWeight: 700 }}
              >
                Download PDF Report
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Assign / reassign dialog */}
      <Dialog open={assignOpen} onClose={assignMutation.isPending ? undefined : closeAssign} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>
          {assignMode === 'assign' ? 'Assign Incident' : 'Reassign Incident'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Candidates are ranked by the assignment engine. Anyone away, off duty or excluded by the rules cannot be selected.
          </Typography>
          <CandidatePicker incidentId={incident.id} assigneeId={incident.assignee?.id} selectedId={selectedTechId} onSelect={setSelectedTechId} />
          {assignMode === 'reassign' && (
            <TextField
              label={`Reassignment justification (${MIN_REASON} to ${MAX_REASON} characters)`}
              fullWidth
              multiline
              rows={2}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              inputProps={{ maxLength: MAX_REASON }}
              placeholder="e.g. Workload rebalancing or specialized database skill required"
              error={reasonBad}
              helperText={reasonBad ? `Minimum ${MIN_REASON} characters required (${reasonLen}/${MIN_REASON})` : 'Required for audit compliance'}
              sx={{ mt: 2, ...fieldSx }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeAssign} disabled={assignMutation.isPending} sx={{ color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => selectedTechId && assignMutation.mutate({ mode: assignMode, technicianId: selectedTechId, reason: reassignReason.trim() })}
            disabled={assignMutation.isPending || !assignValid}
            startIcon={assignMutation.isPending ? <CircularProgress size={16} /> : undefined}
            sx={{ bgcolor: COLORS.primary, color: '#ffffff', fontWeight: 700, '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {assignMode === 'assign' ? 'Assign now' : 'Reassign now'}
          </Button>
        </DialogActions>
      </Dialog>

      <OverridePriorityDialog open={overrideOpen} incident={incident} onClose={() => setOverrideOpen(false)} />
      <EditIncidentDialog open={editOpen} incident={incident} onClose={() => setEditOpen(false)} />
      <EscalateDialog open={escalateOpen} incidentId={incident.id} onClose={() => setEscalateOpen(false)} />
      <MarkDuplicateDialog open={duplicateOpen} incidentId={incident.id} onClose={() => setDuplicateOpen(false)} />

      <ConfirmDialog
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => closeMutation.mutate()}
        isLoading={closeMutation.isPending}
        title="Close Verified Incident"
        description="Are you sure you want to administratively close this incident? This action completes the ITIL lifecycle."
        confirmColor="error"
        confirmLabel="Close Incident"
      />
    </Box>
  );
}
