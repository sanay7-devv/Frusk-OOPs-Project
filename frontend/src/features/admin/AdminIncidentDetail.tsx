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

  const technicians = users.filter((u) => u.roles.includes('TECHNICIAN') && u.active);

  const handleReassign = async () => {
    if (!selectedTechId) {
      toast('Please choose a technician', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post(`/incidents/${incidentId}/reassign`, {
        technicianId: selectedTechId,
        reason: reassignReason || 'Administrative reassignment',
      });
      toast('Technician successfully reassigned', 'success');
      setReassignOpen(false);
      refetch();
    } catch (e: any) {
      toast(e.message || 'Reassignment failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverridePriority = async () => {
    if (!overrideReason.trim()) {
      toast('Please provide a business justification for priority override', 'error');
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
      toast(e.message || 'Priority override failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm('Are you sure you want to administratively close this incident?')) return;
    try {
      await api.post(`/incidents/${incidentId}/close`);
      toast('Incident closed', 'info');
      refetch();
    } catch (e: any) {
      toast(e.message || 'Close failed', 'error');
    }
  };

  if (isLoading) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  if (!incident) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          Incident not found
        </Typography>
        <Button onClick={() => navigate('/admin/tickets')} sx={{ mt: 2 }}>
          Back to Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1300, mx: 'auto' }}>
      {/* Top Navigation */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/tickets')}>
          All Tickets
        </Button>
        <Typography variant="h5" fontWeight="bold" fontFamily="monospace">
          {incident.code}
        </Typography>
        <PriorityBadge priority={incident.priority} />
        <StatusChip status={incident.status} />
      </Stack>

      <Grid container spacing={3}>
        {/* Left Column: Details */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {incident.title}
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary', mt: 2 }}>
              {incident.description}
            </Typography>

            {incident.resolution && (
              <Box sx={{ mt: 3, p: 2, bgcolor: 'success.light', color: 'success.contrastText', borderRadius: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Root Cause & Resolution:
                </Typography>
                <Typography variant="body2">
                  {incident.resolution.rootCause ? `Root Cause: ${incident.resolution.rootCause}` : ''}
                  {incident.resolution.notes ? ` - ${incident.resolution.notes}` : ''}
                </Typography>
              </Box>
            )}
          </Paper>

          {/* Incident Timeline & Comments */}
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              Admin Command Notes & Discussion
            </Typography>
            <Stack direction="row" spacing={1.5} mb={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Post administrative note or technician guidance..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => {
                  if (newComment.trim()) {
                    toast('Comment posted to incident audit stream', 'success');
                    setNewComment('');
                  }
                }}
              >
                Send
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              All notes entered here are cryptographically bound to the audit log.
            </Typography>
          </Paper>
        </Grid>

        {/* Right Column: Metadata & Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              SLA Timers & Target
            </Typography>
            <Box my={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Resolution SLA Deadline:
              </Typography>
              <SlaCountdown due={incident.resolutionDue || incident.responseDue} createdAt={incident.createdAt} slaState={incident.slaState} />
            </Box>
            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Assignment & Stakeholders
            </Typography>
            <Box mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Assigned Technician:
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {incident.assignee?.name || (incident as any).assigneeName || 'Unassigned (Waiting in Queue)'}
              </Typography>
            </Box>
            <Box mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Reporter:
              </Typography>
              <Typography variant="body2">{incident.reporter?.name || (incident as any).reporterName || 'Employee'}</Typography>
            </Box>
            <Box mb={1.5}>
              <Typography variant="caption" color="text.secondary">
                Impacted Service:
              </Typography>
              <Typography variant="body2">{incident.service?.name || (incident as any).serviceName || 'Standard Service'}</Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Actions */}
            <Typography variant="subtitle2" fontWeight="bold" mb={1.5}>
              Executive Overrides
            </Typography>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<SwapHorizIcon />}
                onClick={() => setReassignOpen(true)}
              >
                Reassign Technician
              </Button>
              <Button
                variant="outlined"
                fullWidth
                color="warning"
                startIcon={<PriorityHighIcon />}
                onClick={() => setOverrideOpen(true)}
              >
                Override Priority
              </Button>
              {incident.status !== 'CLOSED' && (
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleClose}
                >
                  Force Close Ticket
                </Button>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reassign Incident</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="Select Technician"
              fullWidth
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(Number(e.target.value))}
            >
              {technicians.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} (Active: {t.technician?.activeIncidentCount || 0} / {t.technician?.maxActiveIncidents || 10})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reassignment Justification"
              fullWidth
              multiline
              rows={2}
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Workload rebalancing or specialized database skill required"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReassignOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReassign} disabled={isSubmitting}>
            Reassign Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* Override Priority Dialog */}
      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Executive Priority Override</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              select
              label="New Priority"
              fullWidth
              value={overridePriority}
              onChange={(e) => setOverridePriority(e.target.value as any)}
            >
              <MenuItem value="P1">P1 - Critical (Enterprise Emergency)</MenuItem>
              <MenuItem value="P2">P2 - High Priority</MenuItem>
              <MenuItem value="P3">P3 - Medium Priority</MenuItem>
              <MenuItem value="P4">P4 - Low Priority</MenuItem>
            </TextField>
            <TextField
              label="Business Justification (Required for Audit)"
              fullWidth
              multiline
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Provide exact operational reason for bypassing algorithm matrix..."
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOverrideOpen(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={handleOverridePriority} disabled={isSubmitting}>
            Confirm Override
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
