import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Alert,
  Grid,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  HourglassBottom as HourglassBottomIcon,
  TimerOff as TimerOffIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  CrisisAlert as EmergencyIcon,
  PriorityHigh as PriorityHighIcon,
  Upgrade as UpgradeIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  Person as PersonIcon,
  ArrowForward as ArrowForwardIcon,
  AssignmentTurnedIn as AssignIcon,
  NotificationImportant as AlertIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { listIncidents, getIncident, getSlaViolations } from '../../api/incidents';
import { listTechnicians, reassignIncident, type TechnicianView } from '../../api/technicians';
import type { IncidentSummary, IncidentDetail, SlaViolationView } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';

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
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  secondary: '#06b6d4',
  error: '#f43f5e',
  warning: '#f59e0b',
  success: '#10b981',
};

export default function Escalations() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'escalations' | 'violations'>('escalations');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Reassignment dialog
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetTechId, setTargetTechId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');

  // 1. Fetch all open incidents with minEscalationLevel >= 1
  const {
    data: incidentsData,
    isLoading: isIncidentsLoading,
    refetch: refetchIncidents,
    isFetching: isIncidentsFetching,
  } = useQuery({
    queryKey: ['lead-escalated-incidents'],
    queryFn: () => listIncidents({ minEscalationLevel: 1, size: 100 }),
    refetchInterval: 10000,
  });

  const allIncidents: IncidentSummary[] = incidentsData?.items ?? [];
  const escalatedIncidents = allIncidents.filter((i) => !['CLOSED', 'VERIFIED'].includes(i.status));

  // 2. Fetch SLA violations
  const {
    data: violationsData,
    isLoading: isViolationsLoading,
    refetch: refetchViolations,
  } = useQuery({
    queryKey: ['lead-sla-violations'],
    queryFn: () => getSlaViolations({ size: 50 }),
    refetchInterval: 10000,
  });

  const violations: SlaViolationView[] = violationsData?.items ?? [];

  // 3. Fetch technicians for reassignment
  const { data: technicians = [] } = useQuery<TechnicianView[]>({
    queryKey: ['lead-technicians-list'],
    queryFn: () => listTechnicians(),
  });

  // 4. Fetch detail of selected escalated incident
  const { data: incidentDetail, isLoading: isDetailLoading } = useQuery<IncidentDetail>({
    queryKey: ['lead-escalated-detail', selectedIncidentId],
    queryFn: () => getIncident(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // Reassign mutation using real /reassign endpoint with required reason
  const reassignMutation = useMutation({
    mutationFn: ({ incidentId, technicianId, reason }: { incidentId: number; technicianId: number; reason: string }) =>
      reassignIncident(incidentId, technicianId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-escalated-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['lead-team-queue'] });
      queryClient.invalidateQueries({ queryKey: ['lead-escalated-detail', selectedIncidentId] });
      toast('Escalated ticket reassigned to new engineer.', 'success');
      setReassignModalOpen(false);
      setTargetTechId(null);
      setReassignReason('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || err?.message || 'Failed to reassign incident.', 'error');
    },
  });

  const filteredEscalated = escalatedIncidents.filter((inc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.code.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        (inc.service?.name || '').toLowerCase().includes(q) ||
        (inc.assignee?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  useEffect(() => {
    if (filteredEscalated.length > 0) {
      if (!selectedIncidentId || !filteredEscalated.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(filteredEscalated[0].id);
      }
    } else {
      setSelectedIncidentId(null);
    }
  }, [filteredEscalated, selectedIncidentId]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Header Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>
            SUPERVISORY CONSOLE // ESCALATIONS &amp; BREACHES
          </Typography>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.error }} />
          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: COLORS.error }}>
            TIER 1 &amp; 2 SUPERVISION
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              Escalation Command &amp; SLA Violations
            </Typography>
            <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13.5, mt: 0.5 }}>
              Monitor tickets that exceeded response thresholds, reached Level 1+ supervision, or breached contracted SLAs.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              size="small"
              onClick={() => {
                refetchIncidents();
                refetchViolations();
              }}
              disabled={isIncidentsFetching}
              startIcon={isIncidentsFetching ? <CircularProgress size={14} color="inherit" /> : <SyncIcon sx={{ fontSize: 16 }} />}
              sx={{
                bgcolor: COLORS.surfaceContainer,
                color: COLORS.onSurfaceVariant,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                px: 2,
                py: 0.8,
                fontSize: 12.5,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Tabs Switcher */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 0.5,
          borderRadius: 2.5,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
          display: 'inline-flex',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 2,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12.5,
              color: COLORS.onSurfaceVariant,
              '&.Mui-selected': {
                color: '#ffffff',
                bgcolor: COLORS.surfaceContainerHighest,
              },
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab
            value="escalations"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmergencyIcon sx={{ fontSize: 16, color: COLORS.error }} />
                <span>Active Escalations ({escalatedIncidents.length})</span>
              </Box>
            }
          />
          <Tab
            value="violations"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerOffIcon sx={{ fontSize: 16, color: COLORS.warning }} />
                <span>SLA Violations ({violationsData?.totalItems ?? violations.length})</span>
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {activeTab === 'escalations' ? (
        /* ESCALATED TICKETS VIEW */
        <Grid container spacing={3}>
          {/* List of Escalated Tickets (5 cols) */}
          <Grid item xs={12} lg={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search escalated tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                fontSize: 12.5,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
              }}
            />

            {isIncidentsLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={28} sx={{ color: COLORS.primary, mb: 1 }} />
                <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5 }}>
                  Loading escalated incidents...
                </Typography>
              </Box>
            ) : filteredEscalated.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: COLORS.surfaceContainer, borderRadius: 3, border: `1px solid ${COLORS.border}` }}>
                <CheckCircleIcon sx={{ fontSize: 36, color: COLORS.success, mb: 1 }} />
                <Typography variant="h6" sx={{ color: COLORS.onSurface, fontWeight: 700, fontSize: 15 }}>
                  No Active Escalations
                </Typography>
                <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5, mt: 0.5 }}>
                  All open incidents are operating within Level 0 baseline thresholds.
                </Typography>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {filteredEscalated.map((inc) => {
                  const isSelected = inc.id === selectedIncidentId;
                  return (
                    <Paper
                      key={inc.id}
                      elevation={0}
                      onClick={() => setSelectedIncidentId(inc.id)}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        bgcolor: isSelected ? 'rgba(244, 63, 94, 0.12)' : COLORS.surfaceContainer,
                        border: `1px solid ${isSelected ? COLORS.error : COLORS.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: COLORS.error },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: COLORS.secondary }}>
                            {inc.code}
                          </Typography>
                          <PriorityBadge priority={inc.priority} />
                          {inc.major && (
                            <Chip
                              label="MAJOR"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 800,
                                fontFamily: 'JetBrains Mono, monospace',
                                bgcolor: 'rgba(244, 63, 94, 0.25)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.5)',
                              }}
                            />
                          )}
                          <Chip
                            label={`LEVEL ${inc.escalationLevel}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              fontWeight: 800,
                              fontFamily: 'JetBrains Mono, monospace',
                              bgcolor: 'rgba(244, 63, 94, 0.2)',
                              color: COLORS.error,
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                            }}
                          />
                        </Box>
                        <SlaCountdown due={inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
                      </Box>

                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface, mb: 0.75 }}>
                        {inc.title}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant }}>
                          Assigned: {inc.assignee?.name || 'Unassigned (Triage)'}
                        </Typography>
                        <StatusChip status={inc.status} />
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Grid>

          {/* Escalation Inspector Workbench (7 cols) */}
          <Grid item xs={12} lg={7}>
            {selectedIncidentId && incidentDetail ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* Escalation Dossier Card */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: COLORS.surfaceContainer,
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: COLORS.error }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800, color: COLORS.secondary }}>
                        {incidentDetail.code}
                      </Typography>
                      <Chip
                        label={`ESCALATION LEVEL ${incidentDetail.escalationLevel}`}
                        size="small"
                        sx={{
                          bgcolor: COLORS.error,
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 10.5,
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      />
                    </Box>
                    <Button
                      size="small"
                      onClick={() => navigate(`/tech/incidents/${incidentDetail.id}`)}
                      sx={{ color: COLORS.secondary, fontSize: 12, textTransform: 'none' }}
                    >
                      Diagnose in Workbench
                    </Button>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, mb: 1 }}>
                    {incidentDetail.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 1.6, mb: 2 }}>
                    {incidentDetail.description}
                  </Typography>

                  <Divider sx={{ borderColor: COLORS.border, mb: 2 }} />

                  {/* Escalation Preview Details (Contract DEC-31) */}
                  {incidentDetail.escalationPreview ? (
                    <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, mb: 2 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.secondary, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', mb: 1 }}>
                        Next Escalation Target &amp; Countdown
                      </Typography>
                      <Grid container spacing={2}>
                        {incidentDetail.escalationPreview.kind === 'EXHAUSTED' ? (
                          <Grid item xs={12}>
                            <Alert
                              severity="warning"
                              sx={{
                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                color: '#fcd34d',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                fontSize: 12,
                                py: 0.5,
                              }}
                            >
                              Escalation Exhausted: All supervisory tiers notified. Top supervisory tier reached.
                            </Alert>
                          </Grid>
                        ) : (
                          <>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Next Level</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.error, fontFamily: 'JetBrains Mono, monospace' }}>
                                Level {incidentDetail.escalationPreview.toLevel}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Target Role</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                                {incidentDetail.escalationPreview.targetRole}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Time Left</Typography>
                              <Box sx={{ pt: 0.2 }}>
                                <SlaCountdown
                                  due={incidentDetail.escalationPreview.dueAt}
                                  remainingSeconds={incidentDetail.escalationPreview.secondsRemaining}
                                  slaState={incidentDetail.slaState}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Recipients</Typography>
                              <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.onSurface }} noWrap>
                                {incidentDetail.escalationPreview.recipients.map((r) => r.name).join(', ') || 'Leadership'}
                              </Typography>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Box>
                  ) : (
                    <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, mb: 2 }}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                        No subsequent escalation step scheduled. Ticket is at top supervisory tier.
                      </Typography>
                    </Box>
                  )}

                  {/* Supervisory Actions */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="contained"
                      disabled={!incidentDetail.allowedActions?.includes('REASSIGN')}
                      onClick={() => setReassignModalOpen(true)}
                      startIcon={<AssignIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: 12.5,
                        textTransform: 'none',
                        borderRadius: 2,
                        px: 2.5,
                      }}
                    >
                      Reassign to Available Tech
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/tech/incidents/${incidentDetail.id}`)}
                      startIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                      sx={{
                        borderColor: COLORS.border,
                        color: COLORS.onSurface,
                        fontWeight: 600,
                        fontSize: 12.5,
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      Open Tech Workbench
                    </Button>
                  </Box>
                </Paper>
              </Box>
            ) : (
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
                <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>
                  Select an escalated incident to inspect supervisor telemetry and next escalation targets.
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      ) : (
        /* SLA VIOLATIONS VIEW */
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            overflow: 'hidden',
          }}
        >
          {isViolationsLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={32} sx={{ color: COLORS.primary, mb: 1.5 }} />
              <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>
                Loading recorded SLA breaches...
              </Typography>
            </Box>
          ) : violations.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 44, color: COLORS.success, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                Zero SLA Violations Recorded
              </Typography>
              <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mt: 0.5 }}>
                All response and resolution commitments have been fulfilled within contractual windows.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                    <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Ticket Code
                    </TableCell>
                    <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Breach Type
                    </TableCell>
                    <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Overdue Duration
                    </TableCell>
                    <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Technician Assigned
                    </TableCell>
                    <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Timestamp
                    </TableCell>
                    <TableCell align="right" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violations.map((v) => (
                    <TableRow key={v.id} hover sx={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 800, color: COLORS.secondary }}>
                        {v.incidentCode}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={v.type}
                          size="small"
                          sx={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontWeight: 800,
                            fontSize: 10.5,
                            bgcolor: 'rgba(244, 63, 94, 0.15)',
                            color: COLORS.error,
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: COLORS.warning }}>
                        {(() => {
                          const totalMinutes = Math.round(v.overdueSeconds / 60);
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          return h > 0 ? `${h}h ${m}m overdue` : `${m}m overdue`;
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: COLORS.onSurface }}>
                        {v.technician?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(v.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => navigate(`/tech/incidents/${v.incidentId}`)}
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                          sx={{ color: COLORS.secondary, fontSize: 12, fontWeight: 700, textTransform: 'none' }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* REASSIGNMENT DIALOG */}
      <Dialog
        open={reassignModalOpen}
        onClose={() => {
          setReassignModalOpen(false);
          setTargetTechId(null);
          setReassignReason('');
        }}
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
          Reassign Escalated Ticket
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Select an on-duty technician to assume immediate handling of this escalated incident.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {technicians.map((t) => {
              const isSelected = targetTechId === t.id;
              return (
                <Paper
                  key={t.id}
                  elevation={0}
                  onClick={() => setTargetTechId(t.id)}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: isSelected ? 'rgba(99, 102, 241, 0.15)' : COLORS.surfaceContainerLow,
                    border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                      {t.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
                      {t.email}
                    </Typography>
                  </Box>
                  <Chip
                    label={t.availability || 'AVAILABLE'}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: t.availability === 'AWAY' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: t.availability === 'AWAY' ? COLORS.error : COLORS.success,
                    }}
                  />
                </Paper>
              );
            })}
          </Box>
          <TextField
            fullWidth
            size="small"
            label="Reason for reassignment (min 10 characters)"
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            placeholder="e.g. Escalating to specialized Tier-2 technician for diagnosis"
            error={reassignReason.length > 0 && reassignReason.trim().length < 10}
            helperText={
              reassignReason.length > 0 && reassignReason.trim().length < 10
                ? `At least 10 characters required (${reassignReason.trim().length}/10)`
                : 'Reason required for ITIL audit compliance'
            }
            sx={{ mt: 2, bgcolor: COLORS.surfaceContainerLowest, borderRadius: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => {
              setReassignModalOpen(false);
              setTargetTechId(null);
              setReassignReason('');
            }}
            sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!targetTechId || !selectedIncidentId || reassignReason.trim().length < 10 || reassignMutation.isPending}
            onClick={() => {
              if (selectedIncidentId && targetTechId && reassignReason.trim().length >= 10) {
                reassignMutation.mutate({ incidentId: selectedIncidentId, technicianId: targetTechId, reason: reassignReason.trim() });
              }
            }}
            startIcon={reassignMutation.isPending ? <CircularProgress size={16} /> : <AssignIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Confirm Reassignment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
