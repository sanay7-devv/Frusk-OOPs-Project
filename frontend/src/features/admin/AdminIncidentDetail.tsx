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
import { tokens } from '../../theme/theme';
import { alpha, tint, tone } from './palette';
import { formatDateTime, humanizeEnum } from '../../utils/format';
import { MAX_REASON, MIN_REASON, MONO, dialogPaperSx, fieldSx, invalidateIncidentCaches } from '../lead/shared/ui';
import IntelligencePanel, { SlaRiskCard } from '../lead/shared/IntelligencePanel';
import { CandidatePicker } from '../lead/shared/TeamComponents';
import {
  EditIncidentDialog,
  EscalateDialog,
  MarkDuplicateDialog,
  OverridePriorityDialog,
} from '../lead/shared/IncidentActionDialogs';
import { reportFailure } from './adminErrors';

const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'gif', 'pdf', 'txt', 'log'];
const MAX_ATTACH_BYTES = 5 * 1024 * 1024;
const MAX_ATTACH_COUNT = 10;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box mb={1.5}>
      <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div" sx={{ color: tokens.onSurface, fontWeight: 600 }}>
        {children}
      </Typography>
    </Box>
  );
}

const actionButtonSx = {
  borderColor: tokens.outlineVariant,
  color: tokens.onSurface,
  textTransform: 'none',
  '&:hover': { borderColor: tokens.primary, bgcolor: alpha(tokens.primary, 0.08) },
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
      toast('Note posted', 'success');
      setNewComment('');
      afterChange();
    },
    onError: (e) => reportFailure(toast, e, afterChange),
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
      reportFailure(toast, e, afterChange);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeIncident(incidentId),
    onSuccess: () => {
      toast('Incident closed', 'info');
      setCloseConfirmOpen(false);
      afterChange();
    },
    onError: (e) => reportFailure(toast, e, afterChange),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(incidentId, file),
    onSuccess: (a) => {
      toast(`Uploaded ${a.filename}`, 'success');
      afterChange();
    },
    onError: (e) => reportFailure(toast, e, afterChange),
  });

  const pdfMutation = useMutation({
    mutationFn: () => downloadPostIncidentReportPdf(incidentId),
    onSuccess: (blob) => {
      saveBlob(blob, `incident-report-${incident?.code ?? incidentId}.pdf`);
      toast('Post-incident report downloaded.', 'success');
    },
    onError: (e) => reportFailure(toast, e, afterChange),
  });

  const downloadMutation = useMutation({
    mutationFn: async (att: AttachmentView) => ({ att, blob: await downloadAttachment(att.id) }),
    onSuccess: ({ att, blob }) => saveBlob(blob, att.filename),
    onError: (e) => reportFailure(toast, e, afterChange),
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
        <Button onClick={() => navigate('/admin/tickets')} sx={{ mt: 2, color: tokens.primary }}>
          Back to incidents
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
        <Button onClick={() => navigate('/admin/tickets')} sx={{ mt: 2, color: tokens.primary }}>
          Back to incidents
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
          sx={{ color: tokens.onSurfaceVariant, '&:hover': { color: tokens.onSurface, bgcolor: alpha(tokens.onSurface, 0.05) } }}
        >
          All incidents
        </Button>
        <Typography component="h1" variant="h5" fontWeight="bold" sx={{ fontFamily: MONO, color: tokens.primary }}>
          {incident.code}
        </Typography>
        <PriorityBadge priority={incident.priority} />
        <StatusChip status={incident.status} />
        {incident.major && (
          <Chip
            label="MAJOR INCIDENT"
            size="small"
            sx={{ bgcolor: alpha(tone.danger, 0.2), color: tone.danger, border: `1px solid ${alpha(tone.danger, 0.4)}`, fontWeight: 800, fontSize: 12, fontFamily: MONO }}
          />
        )}
        {incident.problemId && (
          <Chip
            label={`Problem #${incident.problemId}`}
            size="small"
            sx={{ bgcolor: alpha(tokens.primary, 0.15), color: tokens.primary, border: `1px solid ${alpha(tokens.primary, 0.35)}`, fontWeight: 700, fontSize: 12, fontFamily: MONO }}
          />
        )}
        {incident.duplicateOfId && (
          <Chip
            label={`Duplicate of #${incident.duplicateOfId}`}
            size="small"
            sx={{ bgcolor: tokens.surfaceContainerLowest, color: tokens.onSurfaceVariant, border: `1px solid ${tokens.outlineVariant}`, fontSize: 12 }}
          />
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Details */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              {incident.title}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: tokens.onSurfaceVariant, mt: 2, lineHeight: 1.7 }}>
              {incident.description}
            </Typography>

            {incident.resolution && (
              <Box sx={{ mt: 3, p: 2, ...tint(tone.success, 0.1), borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: MONO }}>
                  Root cause and resolution:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {incident.resolution.rootCause ? `Root cause: ${incident.resolution.rootCause}` : ''}
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
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
              Notes and discussion
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Visibility:</Typography>
              <Chip
                label="Internal (staff only)"
                clickable
                size="small"
                onClick={() => setCommentVisibility('INTERNAL')}
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: commentVisibility === 'INTERNAL' ? tokens.primary : tokens.surfaceContainerHigh,
                  color: commentVisibility === 'INTERNAL' ? tone.onAccent : tokens.onSurfaceVariant,
                }}
              />
              <Chip
                label="Public (reporter can see)"
                clickable
                size="small"
                onClick={() => setCommentVisibility('PUBLIC')}
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: commentVisibility === 'PUBLIC' ? tokens.secondary : tokens.surfaceContainerHigh,
                  color: commentVisibility === 'PUBLIC' ? tone.onAccent : tokens.onSurfaceVariant,
                }}
              />
            </Box>
            <Stack direction="row" spacing={1.5} mb={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Write a note or guidance for the technician"
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
                sx={{ bgcolor: tokens.primary, color: tone.onAccent, fontWeight: 700, '&:hover': { bgcolor: tokens.primaryDark } }}
              >
                Send
              </Button>
            </Stack>
            {commentsError && <ErrorState onRetry={() => refetchComments()} message={apiErrorMessage(commentsErr)} />}
            {comments.length > 0 && (
              <Box sx={{ mt: 2, mb: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {comments.map((c) => (
                  <Box key={c.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.secondary }}>
                        {c.author.name} <Chip size="small" label={c.visibility === 'PUBLIC' ? 'Public' : 'Internal'} sx={{ height: 18, fontSize: 12, ml: 0.5 }} />
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, fontFamily: MONO }}>{formatDateTime(c.createdAt)}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: tokens.onSurface, whiteSpace: 'pre-wrap' }}>{c.body}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>

          {/* Audit history */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
            <Typography variant="h6" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
              Audit history
            </Typography>
            {historyError ? (
              <ErrorState onRetry={() => refetchHistory()} message={apiErrorMessage(historyErr)} />
            ) : history.length === 0 ? (
              <EmptyState message="No audit entries yet." />
            ) : (
              <Stack spacing={1}>
                {history.map((h) => (
                  <Box key={h.id} sx={{ p: 1.25, borderRadius: 2, bgcolor: tokens.surfaceContainerLowest, border: `1px solid ${tokens.outlineVariant}` }}>
                    <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, fontFamily: MONO }}>
                      {formatDateTime(h.timestamp)} | {h.actor?.name ?? 'System'} | {humanizeEnum(h.action)}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: tokens.onSurface }}>{h.description}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Metadata & Controls */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              SLA timers
            </Typography>
            <Field label="Response due">
              {formatDateTime(incident.responseDue)}
              {incident.acknowledgedAt ? ' (acknowledged)' : ' (not acknowledged yet)'}
            </Field>
            <Box my={2}>
              <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }} display="block">
                Resolution due
              </Typography>
              <SlaCountdown due={incident.resolutionDue} createdAt={incident.createdAt} slaState={incident.slaState} />
            </Box>
            {incident.pausedAt && (
              <Alert severity="info" sx={{ fontSize: 12.5, mb: 1.5 }}>
                SLA clock paused since {formatDateTime(incident.pausedAt)} (waiting for the reporter).
              </Alert>
            )}
            {preview && (
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, mb: 1.5 }}>
                <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, display: 'block', mb: 0.5 }}>
                  Next escalation
                </Typography>
                {preview.kind === 'EXHAUSTED' ? (
                  <Typography sx={{ fontSize: 12.5, color: tone.warning }}>Escalation exhausted: the top tier has been notified.</Typography>
                ) : (
                  <>
                    <SlaCountdown due={preview.dueAt} remainingSeconds={preview.secondsRemaining} slaState={incident.slaState} />
                    <Typography sx={{ fontSize: 12.5, color: tokens.onSurface, mt: 0.5 }}>
                      to level {preview.toLevel} ({preview.targetRole}): {preview.recipients.map((r) => r.name).join(', ')}
                    </Typography>
                  </>
                )}
              </Box>
            )}
            <SlaRiskCard incidentId={incident.id} />

            <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              Lifecycle
            </Typography>
            <Field label="Escalation level">{incident.escalationLevel}</Field>
            <Field label="Times reopened">{incident.reopenCount}</Field>
            <Field label="Created">{formatDateTime(incident.createdAt)}</Field>
            <Field label="Acknowledged">{formatDateTime(incident.acknowledgedAt, '—')}</Field>
            <Field label="Resolved">{formatDateTime(incident.resolvedAt, '—')}</Field>
            <Field label="Closed">
              {formatDateTime(incident.closedAt, '—')}
              {incident.closureReason ? ` (${humanizeEnum(incident.closureReason).toLowerCase()})` : ''}
            </Field>
            {incident.feedback && (
              <Field label="Reporter feedback">
                {incident.feedback.rating}/5
                {incident.feedback.comment ? ` - ${incident.feedback.comment}` : ''}
              </Field>
            )}

            <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              People and service
            </Typography>
            <Field label="Assigned technician">{incident.assignee?.name ?? 'Unassigned (waiting in queue)'}</Field>
            <Field label="Reporter">{incident.reporter.name}</Field>
            <Field label="Affected service">{incident.service.name}</Field>
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

            <Divider sx={{ my: 2, borderColor: tokens.outlineVariant }} />

            {/* Actions, all from the server's allowedActions */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: tokens.onSurface }} mb={1.5}>
              Actions
            </Typography>
            <Stack spacing={1}>
              {(canAssign || canReassign) && (
                <Button variant="outlined" fullWidth startIcon={<SwapHorizIcon />} onClick={() => setAssignOpen(true)} sx={actionButtonSx}>
                  {assignMode === 'assign' ? 'Assign technician' : 'Reassign technician'}
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
                  sx={{ borderColor: alpha(tone.warning, 0.3), color: tone.warning, textTransform: 'none', '&:hover': { borderColor: tone.warning, bgcolor: alpha(tone.warning, 0.08) } }}
                >
                  Override priority
                </Button>
              )}
              {allowed.includes('CLOSE') && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => setCloseConfirmOpen(true)}
                  sx={{ borderColor: alpha(tone.danger, 0.3), color: tone.danger, textTransform: 'none', '&:hover': { borderColor: tone.danger, bgcolor: alpha(tone.danger, 0.08) } }}
                >
                  Close incident
                </Button>
              )}
              {!anyAction && (
                <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, fontStyle: 'italic' }}>
                  No actions available in the current status ({humanizeEnum(incident.status).toLowerCase()})
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* Attachments */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
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
            <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, display: 'block', mb: 1 }}>
              png, jpg, gif, pdf, txt or log, up to 5 MB each.
            </Typography>
            {attachError ? (
              <ErrorState onRetry={() => refetchAttach()} message={apiErrorMessage(attachErr)} />
            ) : attachments.length === 0 ? (
              <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant }}>
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
                      bgcolor: tokens.surfaceContainerLowest,
                      border: `1px solid ${tokens.outlineVariant}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: 12.5, color: tokens.onSurface }}>
                        {att.filename}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
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

          {/* Post-incident report PDF */}
          {(incident.status === 'RESOLVED' || incident.status === 'CLOSED' || incident.status === 'VERIFIED' || incident.major) && (
            <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}` }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
                Post-incident report
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.onSurfaceVariant, display: 'block', mb: 1.5 }}>
                Official post-incident report with full audit timeline.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                disabled={pdfMutation.isPending}
                startIcon={pdfMutation.isPending ? <CircularProgress size={14} /> : <DownloadIcon />}
                onClick={() => pdfMutation.mutate()}
                sx={{ borderColor: tokens.secondary, color: tokens.secondary, textTransform: 'none', fontSize: 12.5, fontWeight: 700 }}
              >
                Download PDF report
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Assign / reassign dialog */}
      <Dialog open={assignOpen} onClose={assignMutation.isPending ? undefined : closeAssign} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>
          {assignMode === 'assign' ? 'Assign incident' : 'Reassign incident'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
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
          <Button onClick={closeAssign} disabled={assignMutation.isPending} sx={{ color: tokens.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => selectedTechId && assignMutation.mutate({ mode: assignMode, technicianId: selectedTechId, reason: reassignReason.trim() })}
            disabled={assignMutation.isPending || !assignValid}
            startIcon={assignMutation.isPending ? <CircularProgress size={16} /> : undefined}
            sx={{ bgcolor: tokens.primary, color: tone.onAccent, fontWeight: 700, '&:hover': { bgcolor: tokens.primaryDark } }}
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
        title="Close incident"
        description="Are you sure you want to close this incident? This completes its lifecycle and cannot be undone."
        confirmColor="error"
        confirmLabel="Close incident"
      />
    </Box>
  );
}
