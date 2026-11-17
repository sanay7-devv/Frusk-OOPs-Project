import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  InputAdornment,
  LinearProgress,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Hub as HubIcon,
  AutoAwesome as AutoAwesomeIcon,
  PendingActions as PendingActionsIcon,
  Speed as SpeedIcon,
  Psychology as PsychologyIcon,
  FilterList as FilterListIcon,
  Timer as TimerIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  VerifiedUser as VerifiedUserIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  Block as BlockIcon,
  AssignmentTurnedIn as AssignIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { listIncidents, getIncident, getRecommendations, assignIncident } from '../../api/incidents';
import type { IncidentSummary, IncidentDetail, RecommendationView, RecommendedTechnician } from '../../api/types';
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

export default function TeamQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch unassigned incidents (CLASSIFIED status only)
  const {
    data: queueData,
    isLoading: isQueueLoading,
    refetch: refetchQueue,
    isFetching,
  } = useQuery({
    queryKey: ['lead-team-queue'],
    queryFn: () => listIncidents({ status: ['CLASSIFIED'], size: 50 }),
  });

  const incidents: IncidentSummary[] = (queueData as any)?.items || (queueData as any)?.content || [];

  // Auto-select first incident when queue loads
  useEffect(() => {
    if (incidents.length > 0) {
      if (!selectedIncidentId || !incidents.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(incidents[0].id);
      }
    } else {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId]);

  // 2. Fetch selected incident details
  const { data: incidentDetail, isLoading: isDetailLoading } = useQuery<IncidentDetail>({
    queryKey: ['lead-incident-detail', selectedIncidentId],
    queryFn: () => getIncident(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // 3. Fetch explainable recommendations for selected incident
  const { data: recommendationsView, isLoading: isRecsLoading } = useQuery<RecommendationView>({
    queryKey: ['lead-recommendations', selectedIncidentId],
    queryFn: () => getRecommendations(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // 4. Assignment mutation
  const assignMutation = useMutation({
    mutationFn: ({ incidentId, technicianId }: { incidentId: number; technicianId?: number | null }) =>
      assignIncident(incidentId, technicianId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['lead-team-queue'] });
      queryClient.invalidateQueries({ queryKey: ['lead-escalated-incidents'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['lead-incident-detail', vars.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['lead-recommendations', vars.incidentId] });
      toast(
        vars.technicianId
          ? 'Ticket assigned successfully to chosen technician.'
          : 'Ticket automatically assigned to best matching candidate.',
        'success'
      );
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to assign incident.', 'error');
    },
  });

  const filteredIncidents = incidents.filter((inc) => {
    if (filterPriority !== 'ALL' && inc.priority !== filterPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        inc.code.toLowerCase().includes(q) ||
        inc.title.toLowerCase().includes(q) ||
        (inc.service?.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Breadcrumb & Control Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 600,
              color: COLORS.onSurfaceVariant,
            }}
          >
            Team Lead Workspace
          </Typography>
          <ChevronRightIcon sx={{ fontSize: 15, color: COLORS.onSurfaceVariant }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface }}>
            Unassigned Triage Queue
          </Typography>
        </Box>

        {/* Title and Global Dispatch Actions */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', lg: 'center' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.5 }}>
              <Typography
                variant="h4"
                sx={{
                  fontSize: { xs: 22, md: 26 },
                  fontWeight: 700,
                  color: COLORS.onSurface,
                  letterSpacing: '-0.02em',
                }}
              >
                Team Triage &amp; Explainable Allocation
              </Typography>
              <Chip
                size="small"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: COLORS.secondary }} />
                    {incidents.length} UNASSIGNED
                  </Box>
                }
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.15)',
                  color: COLORS.primary,
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 13.5, color: COLORS.onSurfaceVariant, maxWidth: 840 }}>
              Review unassigned triage incidents and allocate them to optimal engineers using skill, workload, and SLA risk scoring.
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              size="small"
              onClick={() => refetchQueue()}
              disabled={isFetching}
              startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : <SyncIcon sx={{ fontSize: 16 }} />}
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
            {selectedIncidentId && (
              <Button
                variant="contained"
                disabled={assignMutation.isPending}
                onClick={() => assignMutation.mutate({ incidentId: selectedIncidentId, technicianId: null })}
                startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  borderRadius: 2,
                  px: 2.5,
                  py: 0.8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                }}
              >
                Auto-Assign Ticket
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Two-Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column: Unassigned Incidents Ledger (5 cols) */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: COLORS.surfaceContainer,
              border: `1px solid ${COLORS.border}`,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {(['ALL', 'P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                const isSelected = filterPriority === p;
                return (
                  <Button
                    key={p}
                    size="small"
                    onClick={() => setFilterPriority(p)}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? '#ffffff' : COLORS.onSurfaceVariant,
                      bgcolor: isSelected ? COLORS.surfaceContainerHighest : 'transparent',
                      border: isSelected ? `1px solid ${COLORS.border}` : '1px solid transparent',
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 0.4,
                      textTransform: 'none',
                    }}
                  >
                    {p}
                  </Button>
                );
              })}
            </Box>

            <TextField
              fullWidth
              size="small"
              placeholder="Filter by code, summary, or service..."
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
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                fontSize: 12.5,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
              }}
            />
          </Paper>

          {/* List of Incidents */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isQueueLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <CircularProgress size={28} sx={{ color: COLORS.primary, mb: 1 }} />
                <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5 }}>
                  Loading unassigned queue...
                </Typography>
              </Box>
            ) : filteredIncidents.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: COLORS.surfaceContainer,
                  borderRadius: 3,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 36, color: COLORS.success, mb: 1 }} />
                <Typography variant="h6" sx={{ color: COLORS.onSurface, fontWeight: 700, fontSize: 15 }}>
                  Triage Queue Empty
                </Typography>
                <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5, mt: 0.5 }}>
                  No unassigned incidents require allocation at this time.
                </Typography>
              </Paper>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = inc.id === selectedIncidentId;
                return (
                  <Paper
                    key={inc.id}
                    elevation={0}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: isSelected ? 'rgba(99, 102, 241, 0.12)' : COLORS.surfaceContainer,
                      border: `1px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: COLORS.primary,
                        bgcolor: 'rgba(99, 102, 241, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: COLORS.secondary }}>
                          {inc.code}
                        </Typography>
                        <PriorityBadge priority={inc.priority} />
                        <StatusChip status={inc.status} />
                      </Box>
                      <SlaCountdown due={inc.responseDue || inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
                    </Box>

                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface, mb: 0.75 }}>
                      {inc.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip
                        label={inc.service?.name || 'General'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 10.5,
                          bgcolor: COLORS.surfaceContainerHighest,
                          color: COLORS.onSurfaceVariant,
                        }}
                      />
                      <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                        {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })
            )}
          </Box>
        </Grid>

        {/* Right Column: Explainable Assignment Workbench (7 cols) */}
        <Grid item xs={12} lg={7}>
          {selectedIncidentId && incidentDetail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Incident Header Info Card */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: COLORS.surfaceContainer,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 800, color: COLORS.secondary }}>
                      {incidentDetail.code}
                    </Typography>
                    <PriorityBadge priority={incidentDetail.priority} />
                    <StatusChip status={incidentDetail.status} />
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

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Service
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.3 }}>
                      {incidentDetail.service?.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Category
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.3 }}>
                      {incidentDetail.category?.name || 'Triage'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Impact / Urgency
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.secondary, mt: 0.3, fontFamily: 'JetBrains Mono, monospace' }}>
                      {incidentDetail.impact}/5 • {incidentDetail.urgency}/5
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Explainable Allocation Card */}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PsychologyIcon sx={{ color: COLORS.secondary }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: COLORS.onSurface }}>
                      Explainable Candidate Matching
                    </Typography>
                  </Box>
                  {recommendationsView?.strategy && (
                    <Chip
                      label={`STRATEGY: ${recommendationsView.strategy}`}
                      size="small"
                      sx={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: 'rgba(6, 182, 212, 0.15)',
                        color: COLORS.secondary,
                      }}
                    />
                  )}
                </Box>

                {isRecsLoading ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <CircularProgress size={24} sx={{ color: COLORS.secondary, mb: 1 }} />
                    <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12 }}>
                      Analyzing engineer competencies and queue capacity...
                    </Typography>
                  </Box>
                ) : !recommendationsView || recommendationsView.recommendations.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center', bgcolor: COLORS.surfaceContainerLow, borderRadius: 2 }}>
                    <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
                      No available technician candidates matching current assignment criteria.
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {recommendationsView.recommendations.map((rec: RecommendedTechnician, index: number) => (
                      <Paper
                        key={rec.technicianId}
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          bgcolor: index === 0 ? 'rgba(99, 102, 241, 0.08)' : COLORS.surfaceContainerLow,
                          border: `1px solid ${index === 0 ? 'rgba(99, 102, 241, 0.4)' : COLORS.border}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 2,
                                bgcolor: COLORS.surfaceContainerHighest,
                                color: COLORS.secondary,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 14,
                              }}
                            >
                              <PersonIcon sx={{ fontSize: 20 }} />
                            </Box>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: COLORS.onSurface }}>
                                  {rec.name}
                                </Typography>
                                {index === 0 && (
                                  <Chip
                                    label="TOP MATCH"
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: 9.5,
                                      fontWeight: 800,
                                      bgcolor: COLORS.primary,
                                      color: '#ffffff',
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: 11.5, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                                Load: {rec.currentLoad} / {rec.maxLoad} active incidents
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                              {rec.score}%
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>
                              Fit Score
                            </Typography>
                          </Box>
                        </Box>

                        {/* Match Reasons */}
                        {rec.reasons && rec.reasons.length > 0 && (
                          <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {rec.reasons.map((r, i) => (
                              <Chip
                                key={i}
                                label={r}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                                  color: COLORS.onSurface,
                                  border: `1px solid ${COLORS.border}`,
                                }}
                              />
                            ))}
                          </Box>
                        )}

                        {/* Factors breakdown */}
                        {rec.factors && (
                          <Box sx={{ mb: 2, p: 1.5, bgcolor: COLORS.surfaceContainerLowest, borderRadius: 2 }}>
                            <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', mb: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                              Allocation Factor Breakdown
                            </Typography>
                            <Grid container spacing={1}>
                              {Object.entries(rec.factors).map(([factor, value]) => (
                                <Grid item xs={6} sm={4} key={factor}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                    <Typography sx={{ fontSize: 10.5, color: COLORS.onSurfaceVariant, textTransform: 'capitalize' }}>
                                      {factor}
                                    </Typography>
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                                      {Math.round(Number(value) * 100)}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress
                                    variant="determinate"
                                    value={Math.min(100, Number(value) * 100)}
                                    sx={{
                                      height: 4,
                                      borderRadius: 2,
                                      bgcolor: 'rgba(255, 255, 255, 0.08)',
                                      '& .MuiLinearProgress-bar': { bgcolor: COLORS.secondary },
                                    }}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        )}

                        <Button
                          fullWidth
                          variant="contained"
                          disabled={assignMutation.isPending}
                          onClick={() => assignMutation.mutate({ incidentId: selectedIncidentId, technicianId: rec.technicianId })}
                          startIcon={<AssignIcon sx={{ fontSize: 16 }} />}
                          sx={{
                            bgcolor: index === 0 ? COLORS.primary : COLORS.surfaceContainerHighest,
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12.5,
                            textTransform: 'none',
                            borderRadius: 2,
                            py: 0.8,
                            '&:hover': {
                              bgcolor: index === 0 ? '#4f46e5' : COLORS.primary,
                            },
                          }}
                        >
                          Assign to {rec.name}
                        </Button>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Excluded Candidates Section */}
                {recommendationsView?.excluded && recommendationsView.excluded.length > 0 && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', mb: 1.5 }}>
                      Excluded Engineers ({recommendationsView.excluded.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {recommendationsView.excluded.map((exc) => (
                        <Box
                          key={exc.technicianId}
                          sx={{
                            p: 1.25,
                            borderRadius: 1.5,
                            bgcolor: COLORS.surfaceContainerLow,
                            border: `1px solid ${COLORS.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BlockIcon sx={{ fontSize: 15, color: COLORS.error }} />
                            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: COLORS.onSurface }}>
                              {exc.name}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                            {exc.reason}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: COLORS.surfaceContainer,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>
                Select an incident from the triage queue to view allocation recommendations.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
