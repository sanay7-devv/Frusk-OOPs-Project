import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
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
  MenuItem,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  SwapHoriz as SwapHorizIcon,
  PriorityHigh as PriorityHighIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getIncident } from '../../api/incidents';
import { getAdminUsers } from '../../api/admin';
import { api } from '../../api/client';
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
  success: '#10b981',
  warning: '#f59e0b',
};

export default function AdminIncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const incidentId = Number(id);

  const [reassignOpen, setReassignOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<number>(0);
  const [reassignReason, setReassignReason] = useState('');

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overridePriority, setOverridePriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [overrideReason, setOverrideReason] = useState('');

  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: incident, isLoading, refetch } = useQuery({
    queryKey: ['admin-incident-detail', incidentId],
    queryFn: () => getIncident(incidentId),
    enabled: !isNaN(incidentId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAdminUsers,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['admin-incident-comments', incidentId],
    queryFn: () => api.get<any[]>(`/incidents/${incidentId}/comments`).then((r) => r.data),
    enabled: !!incidentId && !isNaN(incidentId),
  });

  const technicians = users.filter((u) => u.roles.includes('TECHNICIAN') && u.active);

  const [isPostingComment, setIsPostingComment] = useState(false);
  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setIsPostingComment(true);
    try {
      await api.post(`/incidents/${incidentId}/comments`, {
        body: newComment.trim(),
        visibility: 'INTERNAL',
      });
      toast('Comment posted to incident audit stream', 'success');
      setNewComment('');
      refetchComments();
      refetch();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Failed to post comment', 'error');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedTechId) {
      toast('Please choose a technician', 'error');
      return;
    }
    const reason = reassignReason.trim() || 'Administrative reassignment by operator';
    if (reason.length < 10) {
      toast('Reason must be at least 10 characters long', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/incidents/${incidentId}/reassign`, {
        technicianId: selectedTechId,
        reason,
      });
      toast('Technician successfully reassigned', 'success');
      setReassignOpen(false);
      refetch();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Reassignment failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverridePriority = async () => {
    if (overrideReason.trim().length < 10) {
      toast('Please provide a business justification (min 10 characters) for priority override', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/incidents/${incidentId}/override-priority`, {
        priority: overridePriority,
        reason: overrideReason.trim(),
      });
      toast(`Priority successfully changed to ${overridePriority}`, 'success');
      setOverrideOpen(false);
      refetch();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Priority override failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to administratively close this verified incident?')) return;
    try {
      await api.post(`/incidents/${incidentId}/close`);
      toast('Incident closed', 'info');
      refetch();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Close failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" sx={{ color: COLORS.onSurfaceVariant }}>
          Incident not found
        </Typography>
        <Button
          onClick={() => navigate('/admin/tickets')}
          sx={{ mt: 2, color: COLORS.primary }}
        >
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      {/* Top Navigation */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/tickets')}
          sx={{
            color: COLORS.onSurfaceVariant,
            '&:hover': { color: COLORS.onSurface, bgcolor: 'rgba(255, 255, 255, 0.05)' },
          }}
        >
          All Tickets
        </Button>
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.primary }}
        >
          {incident.code}
        </Typography>
        <PriorityBadge priority={incident.priority} />
        <StatusChip status={incident.status} />
        {incident.major && (
          <Chip
            label="MAJOR INCIDENT"
            size="small"
            sx={{
              bgcolor: 'rgba(244, 63, 94, 0.2)',
              color: '#fb7185',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              fontWeight: 800,
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        )}
        {incident.problemId && (
          <Chip
            label={`Problem #${incident.problemId}`}
            size="small"
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.15)',
              color: COLORS.primary,
              border: '1px solid rgba(99, 102, 241, 0.35)',
              fontWeight: 700,
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          />
        )}
        {incident.duplicateOfId && (
          <Chip
            label={`Duplicate of #${incident.duplicateOfId}`}
            size="small"
            sx={{
              bgcolor: COLORS.surfaceContainerLowest,
              color: COLORS.onSurfaceVariant,
              border: `1px solid ${COLORS.border}`,
              fontSize: 11,
            }}
          />
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Details */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainer,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Typography variant="h5" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              {incident.title}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: COLORS.onSurfaceVariant, mt: 2, lineHeight: 1.7 }}>
              {incident.description}
            </Typography>

            {incident.resolution && (
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: 'rgba(16, 185, 129, 0.1)',
                  color: '#34d399',
                  borderRadius: 2,
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Root Cause &amp; Resolution:
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {incident.resolution.rootCause ? `Root Cause: ${incident.resolution.rootCause}` : ''}
                  {incident.resolution.notes ? ` - ${incident.resolution.notes}` : ''}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Incident Timeline & Comments */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainer,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Typography variant="h6" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif', mb: 2 }}>
              Admin Command Notes &amp; Discussion
            </Typography>
            <Stack direction="row" spacing={1.5} mb={2}>
              <TextField
                fullWidth
                size="small"
                placeholder="Post administrative note or technician guidance..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: COLORS.surfaceContainerLowest,
                    color: COLORS.onSurface,
                    borderRadius: 2,
                    '& fieldset': { borderColor: COLORS.border },
                  },
                }}
              />
              <Button
                variant="contained"
                startIcon={isPostingComment ? <CircularProgress size={16} /> : <SendIcon />}
                disabled={isPostingComment || !newComment.trim()}
                onClick={handleSendComment}
                sx={{
                  bgcolor: COLORS.primary,
                  color: '#ffffff',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#4f46e5' },
                }}
              >
                Send
              </Button>
            </Stack>
            {comments.length > 0 && (
              <Box sx={{ mt: 2, mb: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {comments.map((c: any) => (
                  <Box
                    key={c.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: COLORS.surfaceContainerLowest,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                        {c.author?.name || 'Administrator'}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'monospace' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString() : ''}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurface }}>
                      {c.body}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
              All notes entered here are appended to the internal incident audit stream.
            </Typography>
          </Paper>
        </Grid>

        {/* Right Column: Metadata & Controls */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainer,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              SLA Timers &amp; Target
            </Typography>
            <Box my={2}>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }} display="block">
                Resolution SLA Deadline:
              </Typography>
              <SlaCountdown due={incident.resolutionDue || incident.responseDue} createdAt={incident.createdAt} slaState={incident.slaState} />
            </Box>
            <Divider sx={{ my: 2, borderColor: COLORS.border }} />

            <Typography variant="subtitle1" fontWeight="bold" sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }} gutterBottom>
              Assignment &amp; Stakeholders
            </Typography>
            <Box mb={1.5}>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                Assigned Technician:
              </Typography>
              <Typography variant="body2" fontWeight="600" sx={{ color: COLORS.onSurface }}>
                {incident.assignee?.name || (incident as any).assigneeName || 'Unassigned (Waiting in Queue)'}
              </Typography>
            </Box>
            <Box mb={1.5}>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                Reporter:
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurface }}>
                {incident.reporter?.name || (incident as any).reporterName || 'Employee'}
              </Typography>
            </Box>
            <Box mb={1.5}>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                Impacted Service:
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.onSurface }}>
                {incident.service?.name || (incident as any).serviceName || 'Standard Service'}
              </Typography>
            </Box>

            <Divider sx={{ my: 2, borderColor: COLORS.border }} />

            {/* Actions */}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: COLORS.onSurface }} mb={1.5}>
              Executive Actions
            </Typography>
            <Stack spacing={1}>
              {(incident.allowedActions?.includes('REASSIGN') || incident.allowedActions?.includes('ASSIGN')) && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<SwapHorizIcon />}
                  onClick={() => setReassignOpen(true)}
                  sx={{
                    borderColor: COLORS.border,
                    color: COLORS.onSurface,
                    '&:hover': { borderColor: COLORS.primary, bgcolor: 'rgba(99, 102, 241, 0.08)' },
                  }}
                >
                  {incident.allowedActions?.includes('ASSIGN') && !incident.assignee ? 'Assign Technician' : 'Reassign Technician'}
                </Button>
              )}
              {incident.allowedActions?.includes('OVERRIDE_PRIORITY') && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="warning"
                  startIcon={<PriorityHighIcon />}
                  onClick={() => setOverrideOpen(true)}
                  sx={{
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: '#fbbf24',
                    '&:hover': { borderColor: '#f59e0b', bgcolor: 'rgba(245, 158, 11, 0.08)' },
                  }}
                >
                  Override Priority
                </Button>
              )}
              {incident.allowedActions?.includes('CLOSE') && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleClose}
                  sx={{
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                    color: '#fb7185',
                    '&:hover': { borderColor: '#f43f5e', bgcolor: 'rgba(244, 63, 94, 0.08)' },
                  }}
                >
                  Close Incident
                </Button>
              )}
              {!incident.allowedActions?.includes('REASSIGN') &&
                !incident.allowedActions?.includes('ASSIGN') &&
                !incident.allowedActions?.includes('OVERRIDE_PRIORITY') &&
                !incident.allowedActions?.includes('CLOSE') && (
                  <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontStyle: 'italic' }}>
                    No actions available in current status ({incident.status})
                  </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Reassign Dialog */}
      <Dialog
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>Reassign Incident</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Select Technician"
              fullWidth
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(Number(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              {technicians.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} (Load: {t.technician?.currentLoad ?? t.technician?.activeIncidents ?? 0} / {t.technician?.maxLoad ?? 10})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reassignment Justification (min 10 characters)"
              fullWidth
              multiline
              rows={2}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Workload rebalancing or specialized database skill required"
              error={reassignReason.length > 0 && reassignReason.trim().length < 10}
              helperText={
                reassignReason.length > 0 && reassignReason.trim().length < 10
                  ? `Minimum 10 characters required (${reassignReason.trim().length}/10)`
                  : 'Required for audit compliance'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setReassignOpen(false)} sx={{ color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleReassign}
            disabled={isSubmitting || !selectedTechId || (reassignReason.trim().length > 0 && reassignReason.trim().length < 10)}
            sx={{
              bgcolor: COLORS.primary,
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Reassign Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Override Priority Dialog */}
      <Dialog
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontFamily: 'Sora, sans-serif' }}>Executive Priority Override</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="New Priority"
              fullWidth
              value={overridePriority}
              onChange={(e) => setOverridePriority(e.target.value as any)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="P1">P1 - Critical (Enterprise Emergency)</MenuItem>
              <MenuItem value="P2">P2 - High Priority</MenuItem>
              <MenuItem value="P3">P3 - Medium Priority</MenuItem>
              <MenuItem value="P4">P4 - Low Priority</MenuItem>
            </TextField>
            <TextField
              label="Business Justification (min 10 characters)"
              fullWidth
              multiline
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Provide exact operational reason for bypassing algorithm matrix..."
              required
              error={overrideReason.length > 0 && overrideReason.trim().length < 10}
              helperText={
                overrideReason.length > 0 && overrideReason.trim().length < 10
                  ? `Minimum 10 characters required (${overrideReason.trim().length}/10)`
                  : 'Required for audit compliance'
              }
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setOverrideOpen(false)} sx={{ color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleOverridePriority}
            disabled={isSubmitting || overrideReason.trim().length < 10}
            sx={{
              bgcolor: COLORS.warning,
              color: '#000000',
              fontWeight: 700,
              '&:hover': { bgcolor: '#d97706' },
            }}
          >
            Confirm Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
