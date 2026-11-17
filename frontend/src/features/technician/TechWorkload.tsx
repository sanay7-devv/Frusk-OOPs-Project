import { useState, useId } from 'react';
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
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Menu,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  HourglassTop as HourglassTopIcon,
  Verified as VerifiedIcon,
  Timer as TimerIcon,
  TaskAlt as TaskAltIcon,
  TrendingUp as TrendingUpIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowForward as ArrowForwardIcon,
  Badge as BadgeIcon,
  Psychology as PsychologyIcon,
  SwapHoriz as SwapHorizIcon,
  RingVolume as RingVolumeIcon,
  StackedBarChart as StackedBarChartIcon,
  MilitaryTech as MilitaryTechIcon,
  VerifiedUser as VerifiedUserIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  UnfoldMore as UnfoldMoreIcon,
  ChevronRight as ChevronRightIcon,
  CrisisAlert as CrisisAlertIcon,
  Schedule as ScheduleIcon,
  PauseCircle as PauseCircleIcon,
  Mail as MailIcon,
  Tune as TuneIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  getMyWorkload,
  getMyQueue,
  listTechnicians,
  setMyAvailability,
  type WorkloadView,
  type Deadline,
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
  tertiary: '#94a3b8',
  tertiaryContainer: '#1c2234',
};

function formatDue(dueIso: string): { text: string; percent: number; isImminent: boolean; isPaused: boolean } {
  if (!dueIso) return { text: 'N/A', percent: 100, isImminent: false, isPaused: false };
  const target = new Date(dueIso).getTime();
  const diffMins = Math.round((target - Date.now()) / 60000);
  if (diffMins <= 0) return { text: 'BREACHED', percent: 0, isImminent: true, isPaused: false };
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  const text = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return {
    text,
    percent: Math.min(100, Math.round((diffMins / 240) * 100)),
    isImminent: diffMins < 30,
    isPaused: false,
  };
}

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

  // 2. Fetch queue items to show active tickets
  const { data: queuePage } = useQuery({
    queryKey: ['tech-my-queue'],
    queryFn: () => getMyQueue(0, 50),
  });

  // 3. Fetch technicians list for switcher
  const { data: techList = [] } = useQuery({
    queryKey: ['technicians-list'],
    queryFn: () => listTechnicians(),
  });

  const activeLoad = workload?.load ?? 0;
  const maxQuota = workload?.maxLoad ?? 10;
  const capacityPercent = Math.min(100, Math.round((activeLoad / maxQuota) * 100));
  const deadlines = workload?.upcomingDeadlines || [];
  const currentAvailability = user?.technician?.availability ?? 'AVAILABLE';
  const isAvailable = currentAvailability === 'AVAILABLE';

  const handleToggleAvailability = async () => {
    const next = isAvailable ? 'AWAY' : 'AVAILABLE';
    try {
      await setMyAvailability(next);
      toast(`Availability status changed to ${next}.`, 'info');
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    } catch (err: any) {
      toast(err.message || 'Failed to update availability', 'error');
    }
  };

  const handleExport = () => {
    toast(`Workload report generated for ${user?.name || 'Technician'}.`, 'success');
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', bgcolor: COLORS.surface, minHeight: '100vh' }}>
        <CircularProgress size={40} sx={{ color: COLORS.primary, mb: 2 }} />
        <Typography variant="h6" sx={{ color: COLORS.onSurface }}>Loading Workload &amp; Capacity metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Breadcrumb & Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: COLORS.onSurfaceVariant,
              cursor: 'pointer',
              '&:hover': { color: COLORS.primary },
            }}
            onClick={() => navigate('/tech/queue')}
          >
            Technician Portal
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.primary }}>
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
              variant="h4"
              sx={{
                fontSize: { xs: 22, md: 28 },
                fontWeight: 700,
                color: COLORS.onSurface,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                mb: 0.5,
              }}
            >
              Technician Workload, Capacity &amp; SLA Performance
            </Typography>
            <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, maxWidth: 780 }}>
              Real-time concurrency quotas, shift throughput velocity, and ITIL SLA delivery compliance.
            </Typography>
          </Box>

          {/* Header Controls */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            {/* Technician Profile Pill */}
            <Paper
              elevation={0}
              onClick={(e) => setTechnicianAnchor(e.currentTarget)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                bgcolor: COLORS.surfaceContainerLowest,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                cursor: 'pointer',
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
              }}
            >
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  bgcolor: COLORS.primaryContainer,
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {(user?.name || 'T').substring(0, 2).toUpperCase()}
              </Box>
              <Box sx={{ pr: 0.5 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                  {user?.name || 'Technician 1'}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, lineHeight: 1 }}>
                  {user?.technician?.escalationLevel === 1 ? 'Team Lead (L1)' : 'Technician (L0)'}
                </Typography>
              </Box>
              <UnfoldMoreIcon sx={{ fontSize: 17, color: COLORS.onSurfaceVariant }} />
            </Paper>

            <Menu
              anchorEl={technicianAnchor}
              open={Boolean(technicianAnchor)}
              onClose={() => setTechnicianAnchor(null)}
              PaperProps={{
                sx: { borderRadius: 2, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer },
              }}
            >
              {techList.map((t) => (
                <MenuItem
                  key={t.id}
                  selected={t.email === user?.email}
                  onClick={() => {
                    setTechnicianAnchor(null);
                    toast(`Active profile is ${t.name} (${t.email})`, 'info');
                  }}
                  sx={{ fontSize: 13, color: COLORS.onSurface }}
                >
                  {t.name} (Load: {t.currentLoad}/{t.maxLoad}, {t.availability})
                </MenuItem>
              ))}
            </Menu>

            {/* Availability Pill */}
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.75,
                bgcolor: COLORS.surfaceContainerLowest,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isAvailable ? COLORS.secondary : COLORS.error,
                  boxShadow: isAvailable ? '0 0 8px #06b6d4' : '0 0 8px #f43f5e',
                }}
              />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                {isAvailable ? 'Available' : 'Away'}
              </Typography>
              <Button
                size="small"
                onClick={handleToggleAvailability}
                sx={{
                  fontSize: 11,
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  bgcolor: COLORS.surfaceContainerHigh,
                  color: COLORS.onSurface,
                }}
              >
                {isAvailable ? 'Set Away' : 'Set Available'}
              </Button>
            </Paper>

            <IconButton size="small" onClick={() => refetchWorkload()} sx={{ color: COLORS.onSurfaceVariant }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Export Action */}
            <Button
              variant="outlined"
              size="small"
              onClick={handleExport}
              startIcon={<DownloadIcon sx={{ fontSize: 16, color: COLORS.primary }} />}
              sx={{
                px: 2,
                py: 0.8,
                bgcolor: COLORS.surfaceContainerLowest,
                borderColor: COLORS.border,
                color: COLORS.onSurface,
                borderRadius: 2,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: COLORS.surfaceContainerLow },
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
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Current Weighted Load
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                    {activeLoad}
                  </Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 500, color: COLORS.onSurfaceVariant }}>
                    / {maxQuota} Max
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: COLORS.surfaceContainerLow, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: capacityPercent >= 80 ? COLORS.error : COLORS.primary }}>
                  {capacityPercent}%
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Chip
                size="small"
                label={capacityPercent >= 80 ? 'Near Capacity' : 'Capacity Available'}
                sx={{
                  bgcolor: capacityPercent >= 80 ? COLORS.errorContainer : 'rgba(16, 185, 129, 0.15)',
                  color: capacityPercent >= 80 ? COLORS.error : '#10b981',
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  mb: 0.5,
                }}
              />
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
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
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Active Incidents
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.onSurface, lineHeight: 1.1 }}>
                  {workload?.activeIncidents ?? queuePage?.items?.length ?? 0}
                </Typography>
              </Box>
              <TaskAltIcon sx={{ fontSize: 32, color: COLORS.primary }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>
                Live Queue Tickets
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Assigned in current shift
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
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Resolved This Week
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#10b981', lineHeight: 1.1 }}>
                  {workload?.resolvedThisWeek ?? 0}
                </Typography>
              </Box>
              <VerifiedIcon sx={{ fontSize: 32, color: '#10b981' }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                Completed Resolutions
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Archived and verified tickets
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
              bgcolor: COLORS.surfaceContainerLowest,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: COLORS.onSurfaceVariant,
                    mb: 0.5,
                  }}
                >
                  Upcoming Deadlines
                </Typography>
                <Typography sx={{ fontSize: 28, fontWeight: 700, color: COLORS.secondary, lineHeight: 1.1 }}>
                  {deadlines.length}
                </Typography>
              </Box>
              <TimerIcon sx={{ fontSize: 32, color: COLORS.secondary }} />
            </Box>
            <Box sx={{ pt: 2 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary }}>
                Next Commitments
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                Monitored by backend SLA daemon
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Upcoming SLA Commitments Table */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainerLowest,
          border: `1px solid ${COLORS.border}`,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontSize: 16 }}>
              Upcoming SLA Commitment Deadlines
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
              Real-time delivery clocks prioritized by target breach urgency.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/tech/queue')}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
            sx={{ textTransform: 'none', color: COLORS.primary, borderColor: COLORS.border }}
          >
            Go to Work Queue
          </Button>
        </Box>

        {deadlines.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 36, color: '#10b981', mb: 1 }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: COLORS.onSurface }}>
              No Imminent Deadlines
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
              All assigned incidents have met their SLA windows or are currently in healthy bands.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: COLORS.onSurfaceVariant }}>INCIDENT CODE</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: COLORS.onSurfaceVariant }}>SLA CLOCK TYPE</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: COLORS.onSurfaceVariant }}>SLA STATE</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: COLORS.onSurfaceVariant }}>TIME REMAINING</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, color: COLORS.onSurfaceVariant, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d: Deadline) => {
                  const info = formatDue(d.due);
                  const isBreached = d.slaState === 'VIOLATED' || info.text === 'BREACHED';

                  return (
                    <tr key={`${d.incidentId}-${d.type}`} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: COLORS.secondary }}>
                        <span
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => navigate(`/tech/incidents/${d.incidentId}`)}
                        >
                          {d.code}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 13, color: COLORS.onSurface }}>
                        {d.type === 'RESPONSE' ? 'Initial Response Target' : 'Resolution Target'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Chip
                          label={d.slaState}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 10.5,
                            fontWeight: 800,
                            bgcolor: isBreached
                              ? 'rgba(244, 63, 94, 0.15)'
                              : d.slaState === 'WARNING'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(16, 185, 129, 0.15)',
                            color: isBreached ? COLORS.error : d.slaState === 'WARNING' ? '#f59e0b' : '#10b981',
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700, color: isBreached ? COLORS.error : COLORS.onSurface }}>
                        {info.text}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => navigate(`/tech/incidents/${d.incidentId}`)}
                          sx={{
                            fontSize: 11.5,
                            textTransform: 'none',
                            bgcolor: COLORS.primary,
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
