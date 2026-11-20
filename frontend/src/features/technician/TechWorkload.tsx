import { useState } from 'react';
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Verified as VerifiedIcon,
  Timer as TimerIcon,
  TaskAlt as TaskAltIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  ChevronRight as ChevronRightIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { apiErrorMessage } from '../../utils/errors';
import SlaCountdown from '../../components/SlaCountdown';
import { ErrorState } from '../../components/StateViews';
import { slaStateColor, slaStateLabel, tokens } from '../../theme/theme';
import { me as fetchMe } from '../../api/auth';
import WorkloadInsights from './WorkloadInsights';
import { useAuth } from '../../auth/AuthContext';
import {
  getMyWorkload,
  listTechnicians,
  setMyAvailability,
  type WorkloadView,
  type TechnicianView,
  type Deadline,
} from '../../api/technicians';
import { alpha } from './staffStyle';
import QueueRowActions from './QueueRowActions';
import { useProblemBasePath } from '../problems/problemAccess';
import { useLiveRefresh } from '../shared/useLiveRefresh';
import { acknowledgeIncident, startIncident } from '../../api/technicians';

// Colours come from the shared theme tokens; status colours from the shared SLA map.

export default function TechWorkload() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [technicianAnchor, setTechnicianAnchor] = useState<null | HTMLElement>(null);

  // 1. Fetch real workload from backend
  const {
    data: workload,
    isLoading,
    error,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['tech-my-workload'],
    queryFn: () => getMyWorkload(),
    refetchInterval: 15000,
  });

  // 2. Own profile (availability). GET /technicians is for team leads and administrators only, so a plain
  //    technician never calls it; leads call it to show their own skills.
  const { data: meProfile } = useQuery({ queryKey: ['auth-me'], queryFn: fetchMe, staleTime: 30_000 });
  const canListTechnicians = !!user?.permissions?.includes('TEAM_VIEW');
  const { data: techList = [] } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => listTechnicians(),
    enabled: canListTechnicians,
  });

  const activeLoad = workload?.load ?? 0;
  const maxQuota = workload?.maxLoad ?? 10;
  const capacityPercent = Math.min(100, Math.round((activeLoad / maxQuota) * 100));
  const capacityWarnAt = workload?.capacityWarnPercent ?? Infinity;
  const deadlines = workload?.upcomingDeadlines || [];
  // Newest known value wins: our own PUT response, then the technician list, then the sign-in profile.
  const [availabilityOverride, setAvailabilityOverride] = useState<TechnicianView['availability'] | null>(null);
  const me = techList.find((t) => t.email === user?.email);
  const currentAvailability = availabilityOverride ?? meProfile?.technician?.availability ?? me?.availability ?? user?.technician?.availability ?? null;
  const isAvailable = currentAvailability === 'AVAILABLE';
  const availabilityLabel =
    currentAvailability === 'AVAILABLE' ? 'Available'
    : currentAvailability === 'BUSY' ? 'Busy'
    : currentAvailability === 'AWAY' ? 'Away'
    : currentAvailability === 'OFF_DUTY' ? 'Off duty'
    : 'Unknown';

  // Server pushes (STOMP via realtime/useRealtime) reload the workload at once.
  useLiveRefresh(() => {
    queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  });
  const problemBase = useProblemBasePath();
  const [actionPendingId, setActionPendingId] = useState<number | null>(null);
  const runRowAction = async (id: number, run: (id: number) => Promise<{ code: string }>, doneText: string) => {
    setActionPendingId(id);
    try {
      const res = await run(id);
      toast(`${res.code} ${doneText}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  const handleToggleAvailability = async () => {
    const next = isAvailable ? 'AWAY' : 'AVAILABLE';
    try {
      const updated = await setMyAvailability(next);
      setAvailabilityOverride(updated.availability);
      toast(`Availability set to ${updated.availability.replace('_', ' ').toLowerCase()}.`, 'info');
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['technicians-list'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const handleExport = () => {
    const rows = [
      ['Incident Code', 'Deadline Type', 'SLA State', 'Due Timestamp'],
      ...deadlines.map((d) => [d.code, d.type, d.slaState, d.due]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workload-${user?.name || 'technician'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Workload deadlines report exported to CSV.', 'success');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: tokens.background, minHeight: '100vh' }}>
        <CircularProgress size={40} sx={{ color: tokens.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ color: tokens.onSurface }}>Loading Workload &amp; Capacity metrics...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, bgcolor: tokens.background, minHeight: '100vh', maxWidth: 640, mx: 'auto', mt: 4 }}>
        <ErrorState
          onRetry={() => refetchWorkload()}
          message={`Failed to load workload metrics from server: ${apiErrorMessage(error)}`}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: tokens.background, minHeight: '100vh' }}>
      {/* Breadcrumb & Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: tokens.onSurfaceVariant,
              cursor: 'pointer',
              '&:hover': { color: tokens.primary },
            }}
            onClick={() => navigate('/tech/queue')}
          >
            Technician Portal
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: tokens.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.primary }}>
            Workload &amp; Capacity
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'flex-end' },
            gap: 2,
          }}
        >
          <Box>
            <Typography
              component="h1" variant="h4"
              sx={{
                fontSize: { xs: 22, md: 28 },
                fontWeight: 700,
                color: tokens.onSurface,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              Technician Workload, Capacity &amp; SLA Performance
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: tokens.onSurfaceVariant, maxWidth: 780 }}>
              Real-time concurrency quotas, shift throughput velocity, and ITIL SLA delivery compliance.
            </Typography>
          </Box>

          {/* Header Controls */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            {/* Technician Profile Pill */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                bgcolor: tokens.surfaceContainerLowest,
                border: `1px solid ${tokens.outlineVariant}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: tokens.primaryDark,
                  color: tokens.onSurface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {(user?.name || 'T').substring(0, 2).toUpperCase()}
              </Box>
              <Box sx={{ pr: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.onSurface, lineHeight: 1.1 }}>
                  {user?.name || 'Technician'}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant, lineHeight: 1 }}>
                  {user?.technician?.escalationLevel === 1 ? 'Team Lead (L1)' : 'Technician (L0)'}
                </Typography>
              </Box>
            </Paper>

            {/* Availability Pill */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                bgcolor: tokens.surfaceContainerLowest,
                border: `1px solid ${tokens.outlineVariant}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isAvailable ? tokens.secondary : slaStateColor.VIOLATED,
                  boxShadow: isAvailable ? `0 0 8px ${tokens.secondary}` : `0 0 8px ${tokens.danger}`,
                }}
              />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurface }}>
                {availabilityLabel}
              </Typography>
              <Button
                size="small"
                onClick={handleToggleAvailability}
                sx={{
                  fontSize: 12,
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  bgcolor: tokens.surfaceContainerHigh,
                  color: tokens.onSurface,
                }}
              >
                {isAvailable ? 'Set Away' : 'Set Available'}
              </Button>
            </Paper>

            <IconButton aria-label="Refresh workload" size="small" onClick={() => refetchWorkload()} sx={{ color: tokens.onSurfaceVariant }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Export Action */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              startIcon={<DownloadIcon sx={{ fontSize: 16, color: tokens.primary }} />}
              sx={{
                px: 2,
                py: 0.8,
                bgcolor: tokens.surfaceContainerLowest,
                borderColor: tokens.outlineVariant,
                color: tokens.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: tokens.surfaceContainerLow },
              }}
            >
              Export Report
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load workload metrics from backend: {(error as Error).message}
        </Alert>
      )}

      {/* Row 1: KPI Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Card 1: Active Concurrency Slot Load */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: tokens.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: tokens.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Current Weighted Load
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: tokens.onSurface, lineHeight: 1.1 }}>
                    {activeLoad}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: tokens.onSurfaceVariant }}>
                    / {maxQuota} Max
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: tokens.surfaceContainerLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: capacityPercent >= capacityWarnAt ? slaStateColor.VIOLATED : tokens.primary }}>
                  {capacityPercent}%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Chip
                size="small"
                label={capacityPercent >= capacityWarnAt ? 'Near Capacity' : 'Capacity Available'}
                sx={{
                  bgcolor: capacityPercent >= capacityWarnAt ? alpha(tokens.danger, 0.15) : alpha(tokens.success, 0.15),
                  color: capacityPercent >= capacityWarnAt ? slaStateColor.VIOLATED : tokens.success,
                  fontWeight: 700,
                  fontSize: 12,
                  height: 22,
                  mb: 0.5,
                }}
              />
              <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
                Active ticket allocation cap: {maxQuota} slots
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 2: Active Incidents */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: tokens.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: tokens.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Active Incidents
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: tokens.onSurface, lineHeight: 1.1 }}>
                  {workload?.activeIncidents ?? 0}
                </Typography>
              </Box>
              <TaskAltIcon sx={{ fontSize: 32, color: tokens.primary }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.primary }}>
                Live Queue Tickets
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
                Currently assigned to you
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 3: Resolved This Week */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: tokens.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: tokens.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Resolved This Week
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: tokens.success, lineHeight: 1.1 }}>
                  {workload?.resolvedThisWeek ?? 0}
                </Typography>
              </Box>
              <VerifiedIcon sx={{ fontSize: 32, color: tokens.success }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.success }}>
                Completed Resolutions
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
                Resolved tickets this calendar week
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Card 4: Upcoming Deadlines */}
        <Grid item xs={12} sm={6} xl={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              height: '100%',
              bgcolor: tokens.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: tokens.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Upcoming Deadlines
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: tokens.secondary, lineHeight: 1.1 }}>
                  {deadlines.length}
                </Typography>
              </Box>
              <TimerIcon sx={{ fontSize: 32, color: tokens.secondary }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.secondary }}>
                Next Commitments
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
                Upcoming SLA commitment deadlines
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <WorkloadInsights deadlines={deadlines} skills={canListTechnicians ? (me?.skills ?? []) : null} />

      {/* Row 2: Upcoming SLA Commitments Table */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: tokens.surfaceContainerLowest,
          border: `1px solid ${tokens.outlineVariant}`,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.onSurface, fontSize: 16 }}>
              Upcoming SLA Commitment Deadlines
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
              Real-time delivery clocks prioritized by target breach urgency.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/tech/queue')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ textTransform: 'none', color: tokens.primary, borderColor: tokens.outlineVariant }}
          >
            Go to Work Queue
          </Button>
        </Box>

        {deadlines.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: tokens.surfaceContainer, borderRadius: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 36, color: tokens.success, mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: tokens.onSurface }}>
              No Imminent Deadlines
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant }}>
              None of your assigned incidents has an upcoming deadline.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${tokens.outlineVariant}` }}>
                  <th style={{ padding: '8px 12px', fontSize: 12, color: tokens.onSurfaceVariant }}>INCIDENT CODE</th>
                  <th style={{ padding: '8px 12px', fontSize: 12, color: tokens.onSurfaceVariant }}>SLA CLOCK TYPE</th>
                  <th style={{ padding: '8px 12px', fontSize: 12, color: tokens.onSurfaceVariant }}>SLA STATE</th>
                  <th style={{ padding: '8px 12px', fontSize: 12, color: tokens.onSurfaceVariant }}>TIME REMAINING</th>
                  <th style={{ padding: '8px 12px', fontSize: 12, color: tokens.onSurfaceVariant, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d: Deadline) => {
                  return (
                    <tr key={`${d.incidentId}-${d.type}`} style={{ borderBottom: `1px solid ${tokens.outlineVariant}` }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: tokens.secondary }}>
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/tech/incidents/${d.incidentId}`)}
                        >
                          {d.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: tokens.onSurface }}>
                        {d.type === 'RESPONSE' ? 'Initial Response Target' : 'Resolution Target'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Chip
                          label={slaStateLabel[d.slaState]}
                          size="small"
                          sx={{ height: 22, fontSize: 12, fontWeight: 700, bgcolor: alpha(slaStateColor[d.slaState], 0.15), color: slaStateColor[d.slaState] }}
                        />
                      </td>
                      <td style={{ padding: '12px' }}>
                        <SlaCountdown due={d.due} slaState={d.slaState} />
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {deadlines.findIndex((x: Deadline) => x.incidentId === d.incidentId) === deadlines.indexOf(d) && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.75 }}>
                            <QueueRowActions
                              incident={{ id: d.incidentId, code: d.code }}
                              problemBase={problemBase}
                              pendingId={actionPendingId}
                              actions={['ACKNOWLEDGE', 'START_WORK']}
                              handlers={{
                                onAcknowledge: (i) => runRowAction(i.id, acknowledgeIncident, 'acknowledged. Response timer stopped.'),
                                onStart: (i) => runRowAction(i.id, startIncident, 'is now in progress.'),
                              }}
                            />
                          </Box>
                        )}
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/tech/incidents/${d.incidentId}`)}
                          sx={{
                            fontSize: 12.5,
                            textTransform: 'none',
                            bgcolor: tokens.primary,
                            fontWeight: 700,
                            borderRadius: 1.5,
                          }}
                        >
                          Open Workbench
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
