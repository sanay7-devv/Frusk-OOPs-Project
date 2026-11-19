import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  MenuItem,
  TextField,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  ChevronRight as ChevronRightIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  Block as BlockIcon,
  AssignmentTurnedIn as AssignIcon,
  Groups as GroupsIcon,
  PriorityHigh as PriorityHighIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { listIncidents, getIncident, getRecommendations, assignIncident, getSimilarIncidents } from '../../api/incidents';
import { getServices, getCategories } from '../../api/services';
import type { IncidentSummary, IncidentDetail, RecommendationView, RecommendedTechnician, SlaState } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { apiErrorMessage } from '../../utils/errors';
import { COLORS, MONO, STRATEGY_INFO, fieldSx, fmtDateTime, invalidateIncidentCaches } from './shared/ui';
import IntelligencePanel from './shared/IntelligencePanel';
import { OverridePriorityDialog, MarkDuplicateDialog } from './shared/IncidentActionDialogs';
import { TeamWorkloadDialog } from './shared/TeamComponents';

const SORTS = [
  { value: 'priority,asc', label: 'Priority (most urgent first)' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'resolutionDue,asc', label: 'Resolution due soonest' },
];
const SLA_STATES: SlaState[] = ['OK', 'WARNING', 'AT_RISK', 'VIOLATED', 'PAUSED'];

export default function TeamQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMINISTRATOR') ?? false;

  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [slaFilter, setSlaFilter] = useState<SlaState | ''>('');
  const [sort, setSort] = useState('priority,asc');

  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [workloadOpen, setWorkloadOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<RecommendedTechnician | null>(null);
  const [justAssigned, setJustAssigned] = useState<{ technicianId: number; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Any filter change goes back to the first page.
  useEffect(() => {
    setPage(0);
  }, [filterPriority, debouncedQ, serviceId, categoryId, slaFilter, sort]);

  const { data: services = [] } = useQuery({ queryKey: ['catalog-services'], queryFn: getServices, staleTime: 300000 });
  const { data: categories = [] } = useQuery({ queryKey: ['catalog-categories'], queryFn: getCategories, staleTime: 300000 });

  // 1. Unassigned incidents (CLASSIFIED only); filtering, sorting and paging happen on the server.
  const {
    data: queueData,
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
    isFetching,
  } = useQuery({
    queryKey: ['lead-team-queue', page, pageSize, filterPriority, debouncedQ, serviceId, categoryId, slaFilter, sort],
    queryFn: () =>
      listIncidents({
        status: ['CLASSIFIED'],
        page,
        size: pageSize,
        sort,
        priority: filterPriority === 'ALL' ? undefined : [filterPriority],
        q: debouncedQ || undefined,
        serviceId: serviceId === '' ? undefined : serviceId,
        categoryId: categoryId === '' ? undefined : categoryId,
        slaState: slaFilter || undefined,
      }),
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });

  const incidents: IncidentSummary[] = queueData?.items ?? [];
  const totalItems = queueData?.totalItems ?? incidents.length;
  const totalPages = queueData?.totalPages ?? 1;
  const hasFilters = filterPriority !== 'ALL' || !!debouncedQ || serviceId !== '' || categoryId !== '' || slaFilter !== '';

  // Auto-select the first incident when the list changes and the selection is gone.
  useEffect(() => {
    if (incidents.length > 0) {
      if (!selectedIncidentId || !incidents.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(incidents[0].id);
      }
    } else {
      setSelectedIncidentId(null);
    }
  }, [incidents, selectedIncidentId]);

  // 2. Selected incident details
  const {
    data: incidentDetail,
    isLoading: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<IncidentDetail>({
    queryKey: ['lead-incident-detail', selectedIncidentId],
    queryFn: () => getIncident(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // 3. Explainable recommendations
  const {
    data: recommendationsView,
    isLoading: isRecsLoading,
    error: recsError,
    refetch: refetchRecs,
  } = useQuery<RecommendationView>({
    queryKey: ['lead-recommendations', selectedIncidentId],
    queryFn: () => getRecommendations(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // 4. Duplicate hint from the server's similar-incident matches
  const { data: similar } = useQuery({
    queryKey: ['incidents', selectedIncidentId, 'similar'],
    queryFn: () => getSimilarIncidents(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });
  const duplicateHints = (similar ?? []).filter((x) => x.match === 'DUPLICATE');

  // 5. Assignment mutation
  const assignMutation = useMutation({
    mutationFn: ({ incidentId, technicianId }: { incidentId: number; technicianId?: number | null; name?: string }) =>
      assignIncident(incidentId, technicianId),
    onSuccess: (res, vars) => {
      invalidateIncidentCaches(queryClient);
      const name = vars.name ?? res.assignee?.name ?? 'the best match';
      if (res.assignee) setJustAssigned({ technicianId: res.assignee.id, name });
      toast(`Ticket assigned to ${name}.`, 'success');
    },
    onError: (err, vars) => {
      // A 409 means the status or the technician's capacity changed: refresh everything the choice depended on.
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        invalidateIncidentCaches(queryClient);
        queryClient.invalidateQueries({ queryKey: ['lead-recommendations', vars.incidentId] });
      }
      toast(apiErrorMessage(err), 'error');
    },
  });

  const canAssign = !!incidentDetail?.allowedActions?.includes('ASSIGN');
  const assignBlockedReason = incidentDetail && !canAssign ? `Assigning is not allowed while the incident is ${incidentDetail.status}.` : '';
  const pendingTech = assignMutation.isPending ? assignMutation.variables?.technicianId : undefined;
  const strategyInfo = recommendationsView?.strategy ? STRATEGY_INFO[recommendationsView.strategy] : undefined;
  const topScore = recommendationsView?.recommendations?.[0]?.score;

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
                    {totalItems} UNASSIGNED
                  </Box>
                }
                sx={{
                  bgcolor: 'rgba(99, 102, 241, 0.15)',
                  color: COLORS.primary,
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  fontSize: 12,
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
            <Button
              size="small"
              onClick={() => setWorkloadOpen(true)}
              startIcon={<GroupsIcon sx={{ fontSize: 16 }} />}
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
              Team workload
            </Button>
            {selectedIncidentId && (
              <Tooltip title={assignBlockedReason} disableHoverListener={!assignBlockedReason}>
                <span>
                  <Button
                    variant="contained"
                    disabled={assignMutation.isPending || !canAssign}
                    onClick={() => assignMutation.mutate({ incidentId: selectedIncidentId, technicianId: null })}
                    startIcon={
                      assignMutation.isPending && pendingTech == null ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <AutoAwesomeIcon sx={{ fontSize: 16 }} />
                      )
                    }
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
                </span>
              </Tooltip>
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
                      fontSize: 12.5,
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
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value === '' ? '' : Number(e.target.value))}
                sx={{ minWidth: 140, flex: 1, ...fieldSx }}
              >
                <MenuItem value="">All services</MenuItem>
                {services.map((sv) => (
                  <MenuItem key={sv.id} value={sv.id}>
                    {sv.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                sx={{ minWidth: 140, flex: 1, ...fieldSx }}
              >
                <MenuItem value="">All categories</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="SLA state"
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value as SlaState | '')}
                sx={{ minWidth: 120, flex: 1, ...fieldSx }}
              >
                <MenuItem value="">Any</MenuItem>
                {SLA_STATES.map((st) => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                sx={{ minWidth: 200, flex: 2, ...fieldSx }}
              >
                {SORTS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Paper>

          {/* List of Incidents */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {isQueueLoading ? (
              <LoadingState />
            ) : queueError ? (
              <ErrorState onRetry={() => refetchQueue()} message={apiErrorMessage(queueError)} />
            ) : incidents.length === 0 ? (
              <EmptyState
                message={hasFilters ? 'No unassigned incidents match these filters.' : 'Triage queue empty. No unassigned incidents need allocation right now.'}
              />
            ) : (
              incidents.map((inc) => {
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
                        {inc.major && (
                          <Chip
                            label="MAJOR"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 12,
                              fontWeight: 800,
                              fontFamily: MONO,
                              bgcolor: 'rgba(244, 63, 94, 0.25)',
                              color: '#fb7185',
                              border: '1px solid rgba(244, 63, 94, 0.5)',
                            }}
                          />
                        )}
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                          {inc.responseDue ? 'Response due' : 'Resolution due'}
                        </Typography>
                        <SlaCountdown due={inc.responseDue ?? inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
                      </Box>
                    </Box>

                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface, mb: 0.75 }}>
                      {inc.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                        <Chip
                          label={inc.service.name}
                          size="small"
                          sx={{ height: 20, fontSize: 12, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant }}
                        />
                        <Chip
                          label={inc.category?.name ?? 'No category'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: 12,
                            bgcolor: COLORS.surfaceContainerHighest,
                            color: inc.category ? COLORS.onSurfaceVariant : COLORS.warning,
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
                        {fmtDateTime(inc.createdAt)}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })
            )}

            {totalItems > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: COLORS.surfaceContainer,
                  border: `1px solid ${COLORS.border}`,
                  mt: 2,
                }}
              >
                <Button
                  size="small"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  sx={{ textTransform: 'none', color: COLORS.onSurface, fontSize: 12 }}
                >
                  Prev
                </Button>
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                  Page {page + 1} of {Math.max(1, totalPages)}
                </Typography>
                <Button
                  size="small"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  sx={{ textTransform: 'none', color: COLORS.onSurface, fontSize: 12 }}
                >
                  Next
                </Button>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Right Column: Explainable Assignment Workbench (7 cols) */}
        <Grid item xs={12} lg={7}>
          {selectedIncidentId && isDetailLoading ? (
            <LoadingState />
          ) : selectedIncidentId && detailError ? (
            <ErrorState onRetry={() => refetchDetail()} message={apiErrorMessage(detailError)} />
          ) : selectedIncidentId && incidentDetail ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {justAssigned && (
                <Alert
                  severity="success"
                  onClose={() => setJustAssigned(null)}
                  action={
                    <Button color="inherit" size="small" onClick={() => setWorkloadOpen(true)} sx={{ textTransform: 'none', fontSize: 12.5 }}>
                      See updated load
                    </Button>
                  }
                  sx={{ fontSize: 13 }}
                >
                  Assigned to {justAssigned.name}. Open the team workload to see their new load.
                </Alert>
              )}
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
                    {incidentDetail.major && <Chip label="MAJOR" size="small" sx={{ height: 20, fontSize: 12, fontWeight: 800, color: '#fb7185' }} />}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {incidentDetail.allowedActions?.includes('OVERRIDE_PRIORITY') && (
                      <Button
                        size="small"
                        onClick={() => setOverrideOpen(true)}
                        startIcon={<PriorityHighIcon sx={{ fontSize: 16 }} />}
                        sx={{ color: COLORS.warning, fontSize: 12.5, textTransform: 'none' }}
                      >
                        Override priority
                      </Button>
                    )}
                    {incidentDetail.allowedActions?.includes('MARK_DUPLICATE') && (
                      <Button
                        size="small"
                        onClick={() => setDuplicateOpen(true)}
                        startIcon={<ContentCopyIcon sx={{ fontSize: 16 }} />}
                        sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5, textTransform: 'none' }}
                      >
                        Mark duplicate
                      </Button>
                    )}
                    <Button
                      size="small"
                      onClick={() => navigate(`/tech/incidents/${incidentDetail.id}`)}
                      sx={{ color: COLORS.secondary, fontSize: 12.5, textTransform: 'none' }}
                    >
                      Diagnose in Workbench
                    </Button>
                  </Box>
                </Box>
                {duplicateHints.length > 0 && (
                  <Alert severity="warning" sx={{ mb: 1.5, fontSize: 12.5 }}>
                    Possible duplicate of {duplicateHints.map((d) => `${d.code} (${Math.round(d.similarity * 100)}%)`).join(', ')}.
                  </Alert>
                )}

                <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, mb: 1 }}>
                  {incidentDetail.title}
                </Typography>
                <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 1.6, mb: 2 }}>
                  {incidentDetail.description}
                </Typography>

                <Divider sx={{ borderColor: COLORS.border, mb: 2 }} />

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Service
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.3 }}>
                      {incidentDetail.service.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
                      Category
                    </Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface, mt: 0.3 }}>
                      {incidentDetail.category?.name ?? 'None yet (needs triage)'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
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
                    <Tooltip title={strategyInfo?.text ?? 'Active assignment strategy'}>
                      <Chip
                        label={`STRATEGY: ${strategyInfo?.label ?? recommendationsView.strategy}`}
                        size="small"
                        sx={{
                          fontFamily: MONO,
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: 'rgba(6, 182, 212, 0.15)',
                          color: COLORS.secondary,
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
                {strategyInfo && (
                  <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, mb: 2 }}>
                    {strategyInfo.text}
                    {isAdmin && (
                      <Button size="small" onClick={() => navigate('/admin/config')} sx={{ textTransform: 'none', fontSize: 12.5, ml: 0.5 }}>
                        Change strategy in Config
                      </Button>
                    )}
                  </Typography>
                )}
                {!canAssign && assignBlockedReason && (
                  <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
                    {assignBlockedReason}
                  </Alert>
                )}

                {isRecsLoading ? (
                  <LoadingState />
                ) : recsError ? (
                  <ErrorState onRetry={() => refetchRecs()} message={apiErrorMessage(recsError)} />
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
                                      fontSize: 12,
                                      fontWeight: 800,
                                      bgcolor: COLORS.primary,
                                      color: '#ffffff',
                                    }}
                                  />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                                Weighted Load: {rec.currentLoad} / {rec.maxLoad}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography sx={{ fontSize: 16, fontWeight: 800, color: COLORS.secondary, fontFamily: 'JetBrains Mono, monospace' }}>
                              {rec.score}%
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>
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
                                  fontSize: 12.5,
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
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', mb: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                              Allocation Factor Breakdown
                            </Typography>
                            <Grid container spacing={1}>
                              {Object.entries(rec.factors).map(([factor, value]) => (
                                <Grid item xs={6} sm={4} key={factor}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                                    <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, textTransform: 'capitalize' }}>
                                      {factor}
                                    </Typography>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
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
                          disabled={assignMutation.isPending || !canAssign}
                          onClick={() =>
                            index === 0
                              ? assignMutation.mutate({ incidentId: selectedIncidentId, technicianId: rec.technicianId, name: rec.name })
                              : setConfirmTarget(rec)
                          }
                          startIcon={
                            pendingTech === rec.technicianId ? (
                              <CircularProgress size={14} color="inherit" />
                            ) : (
                              <AssignIcon sx={{ fontSize: 16 }} />
                            )
                          }
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
                          {canAssign ? `Assign to ${rec.name}` : 'Assign not available'}
                        </Button>
                      </Paper>
                    ))}
                  </Box>
                )}

                {/* Excluded Candidates Section */}
                {recommendationsView?.excluded && recommendationsView.excluded.length > 0 && (
                  <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${COLORS.border}` }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', mb: 1.5 }}>
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
                          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                            {exc.reason}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>

              <IntelligencePanel incidentId={incidentDetail.id} onOpenIncident={(id) => navigate(`/tech/incidents/${id}`)} />
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

      {incidentDetail && (
        <OverridePriorityDialog open={overrideOpen} incident={incidentDetail} onClose={() => setOverrideOpen(false)} />
      )}
      {selectedIncidentId && (
        <MarkDuplicateDialog open={duplicateOpen} incidentId={selectedIncidentId} onClose={() => setDuplicateOpen(false)} />
      )}
      <TeamWorkloadDialog open={workloadOpen} onClose={() => setWorkloadOpen(false)} highlightId={justAssigned?.technicianId} />
      <ConfirmDialog
        open={confirmTarget != null}
        title="Assign a lower-ranked technician?"
        description={
          confirmTarget
            ? `${confirmTarget.name} scored ${confirmTarget.score}% against ${topScore ?? '?'}% for the top match. This overrides the engine's choice.`
            : undefined
        }
        confirmLabel="Assign anyway"
        isLoading={assignMutation.isPending}
        onConfirm={() => {
          if (confirmTarget && selectedIncidentId) {
            assignMutation.mutate(
              { incidentId: selectedIncidentId, technicianId: confirmTarget.technicianId, name: confirmTarget.name },
              { onSettled: () => setConfirmTarget(null) }
            );
          }
        }}
        onClose={() => setConfirmTarget(null)}
      />
    </Box>
  );
}
