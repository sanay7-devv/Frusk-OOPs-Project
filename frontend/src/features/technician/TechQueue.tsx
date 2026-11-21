import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QueueRowActions from './QueueRowActions';
import { isStaleDataError } from './apiErrors';
import { useLiveRefresh } from '../shared/useLiveRefresh';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bolt as BoltIcon,
  Warning as WarningIcon,
  Sync as SyncIcon,
  PauseCircle as PauseCircleIcon,
  ArrowForward as ArrowForwardIcon,
  EditNote as EditNoteIcon,
  Chat as ChatIcon,
  Send as SendIcon,
  ErrorOutline as ErrorOutlineIcon,
  Hub as HubIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  BookmarkBorder as BookmarkIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import {
  getMyQueue,
  getMyWorkload,
  setMyAvailability,
  acknowledgeIncident,
  startIncident,
  requestInfo,
  reassignIncident as apiReassignIncident,
  type TechnicianView,
} from '../../api/technicians';
import { me as fetchMe } from '../../api/auth';
import { getServices } from '../../api/services';
import {
  addComment,
  getIncident,
  getRecommendations,
  listIncidents,
  listSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from '../../api/incidents';
import { useProblemBasePath } from '../problems/problemAccess';
import { apiErrorMessage } from '../../utils/errors';
import { LoadingState, EmptyState, ErrorState } from '../../components/StateViews';
import PriorityBadge from '../../components/PriorityBadge';
import SlaCountdown from '../../components/SlaCountdown';
import { tokens, slaStateColor } from '../../theme/theme';
import type { IncidentSummary, SavedFilterView } from '../../api/types';
import { alpha, BRAND_GRADIENT, BRAND_GRADIENT_REVERSE } from './staffStyle';

// Colours come from the shared theme tokens; status colours from the shared SLA map.

/** Statuses a technician still has to work on. Used when the queue is filtered on the server. */
const ACTIVE_STATUSES = ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'];
const TAB_STATUSES: Record<string, string[]> = {
  ALL: ACTIVE_STATUSES,
  NEEDS_ACK: ['ASSIGNED'],
  AT_RISK: ACTIVE_STATUSES,
  IN_PROGRESS: ['IN_PROGRESS', 'ACKNOWLEDGED'],
  PENDING_INFO: ['PENDING_USER_INFO'],
};
/** Server-side sort options (GET /incidents sort=field,asc|desc). DEFAULT keeps the queue's own most-urgent-first order. */
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'DEFAULT', label: 'Most urgent SLA first' },
  { value: 'priority,asc', label: 'Priority (P1 first)' },
  { value: 'resolutionDue,asc', label: 'Resolution due (soonest)' },
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
];
const SLA_FILTERS = ['WARNING', 'AT_RISK', 'VIOLATED', 'PAUSED', 'OK'];

/** One definition for the Pending Info tab and its KPI card. */
const isPendingInfo = (i: IncidentSummary) => i.status === 'PENDING_USER_INFO';

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < 60000) return 'just now';
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function TechQueue() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Server pushes (STOMP via realtime/useRealtime) reload the queue and workload at once.
  useLiveRefresh(() => {
    queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
    queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  });

  const [filterTab, setFilterTab] = useState<'ALL' | 'NEEDS_ACK' | 'AT_RISK' | 'IN_PROGRESS' | 'PENDING_INFO'>('ALL');
  // searchInput follows the keyboard; searchQuery is what the server is asked, after a short pause.
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [slaFilter, setSlaFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('DEFAULT');
  // 'MINE' = GET /technicians/me/queue; 'TEAM' = GET /incidents without assignedToMe (the server decides what this person may see).
  const [scope, setScope] = useState<'MINE' | 'TEAM'>('MINE');
  const canSeeTeam = !!user?.permissions?.includes('TEAM_VIEW');
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [activeViewId, setActiveViewId] = useState<number | null>(null);

  // Interactive Modals
  const [noteModalIncident, setNoteModalIncident] = useState<IncidentSummary | null>(null);
  const [noteText, setNoteText] = useState('');
  const [requestInfoIncident, setRequestInfoIncident] = useState<IncidentSummary | null>(null);
  const [requestInfoText, setRequestInfoText] = useState('');
  const problemBase = useProblemBasePath();
  // Major incidents: open the problem record (Major Incident Mode) the incident belongs to.
  const openProblem = async (inc: IncidentSummary) => {
    try {
      const detail = await getIncident(inc.id);
      if (detail.problemId) navigate(`${problemBase}/${detail.problemId}`);
      else toast(`${inc.code} is not linked to a problem record.`, 'info');
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    }
  };
  const [reassignIncident, setReassignIncident] = useState<IncidentSummary | null>(null);
  const [reassignTargetId, setReassignTargetId] = useState<number | ''>('');
  const [reassignReason, setReassignReason] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [actionInProgressId, setActionInProgressId] = useState<number | null>(null);

  // 1. Fetch real technician queue with server-side paging
  const {
    data: queuePage,
    isLoading: isQueueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['tech-my-queue', page, pageSize],
    queryFn: () => getMyQueue(page, pageSize),
    refetchInterval: 60000, // fallback only; pushes arrive through useLiveRefresh
  });

  // 2. Fetch real workload stats
  const {
    data: workload,
    isLoading: isWorkloadLoading,
    refetch: refetchWorkload,
  } = useQuery({
    queryKey: ['tech-my-workload'],
    queryFn: () => getMyWorkload(),
    refetchInterval: 60000,
  });

  // 3. Reassign candidates come from the incident's own ranking (eligible and excluded, with reasons).
  //    GET /technicians is team-lead only, so a plain technician would get 403 there.
  const {
    data: reassignRecs,
    isLoading: reassignRecsLoading,
    error: reassignRecsError,
  } = useQuery({
    queryKey: ['incident-recommendations', reassignIncident?.id],
    queryFn: () => getRecommendations((reassignIncident as IncidentSummary).id),
    enabled: reassignIncident != null,
  });

  // 4. Services for the filter (all services, not only those that happen to be on this page)
  const { data: serviceList = [], error: servicesError } = useQuery({
    queryKey: ['services-all'],
    queryFn: getServices,
    staleTime: 5 * 60_000,
  });

  // 5. Own profile: current availability
  const { data: meProfile } = useQuery({ queryKey: ['auth-me'], queryFn: fetchMe, staleTime: 30_000 });

  // 6. Saved views (GET/POST/DELETE /saved-filters)
  const { data: allSavedViews = [] } = useQuery<SavedFilterView[]>({ queryKey: ['saved-filters'], queryFn: listSavedFilters });
  const savedViews = allSavedViews.filter((v) => v.filter?.screen !== 'team-queue');

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => {
    setPage(0);
  }, [searchQuery, serviceFilter, priorityFilter, slaFilter, sortOrder, filterTab, scope]);

  const serverFiltered =
    filterTab !== 'ALL' || scope === 'TEAM' || searchQuery !== '' || serviceFilter !== 'ALL' || priorityFilter !== 'ALL' || slaFilter !== 'ALL' || sortOrder !== 'DEFAULT';

  // 7. Filtered / sorted list from the server: GET /incidents?assignedToMe=true&...
  const {
    data: filteredPage,
    isLoading: isFilteredLoading,
    error: filteredError,
    refetch: refetchFiltered,
  } = useQuery({
    queryKey: ['tech-my-queue', 'filtered', scope, searchQuery, serviceFilter, priorityFilter, slaFilter, sortOrder, filterTab, page, pageSize],
    queryFn: () =>
      listIncidents({
        assignedToMe: scope === 'MINE',
        status: TAB_STATUSES[filterTab],
        q: searchQuery || undefined,
        serviceId: serviceFilter === 'ALL' ? undefined : Number(serviceFilter),
        priority: priorityFilter === 'ALL' ? undefined : [priorityFilter],
        slaState: slaFilter === 'ALL' ? undefined : slaFilter,
        sort: sortOrder === 'DEFAULT' ? undefined : sortOrder,
        page,
        size: pageSize,
      }),
    enabled: serverFiltered,
    refetchInterval: 60000, // fallback only; pushes arrive through useLiveRefresh
  });

  const queue = queuePage?.items ?? [];
  const activePage = serverFiltered ? filteredPage : queuePage;
  const rows = serverFiltered ? (filteredPage?.items ?? []) : queue;
  const totalItems = activePage?.totalItems ?? rows.length;
  const totalPages = activePage?.totalPages ?? 1;
  // Newest known value wins: the response of our own PUT, then the technician list, then the sign-in profile.
  const [availabilityOverride, setAvailabilityOverride] = useState<TechnicianView['availability'] | null>(null);
  const currentAvailability = availabilityOverride ?? meProfile?.technician?.availability ?? user?.technician?.availability ?? null;
  const isAvailable = currentAvailability === 'AVAILABLE';
  const availabilityLabel =
    currentAvailability === 'AVAILABLE' ? 'Available'
    : currentAvailability === 'BUSY' ? 'Busy'
    : currentAvailability === 'AWAY' ? 'Away'
    : currentAvailability === 'OFF_DUTY' ? 'Off duty'
    : 'Unknown';

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('tech-queue-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Actions
  const handleToggleAvailability = async () => {
    const newStatus = isAvailable ? 'AWAY' : 'AVAILABLE';
    try {
      const updated = await setMyAvailability(newStatus);
      setAvailabilityOverride(updated.availability);
      toast(`Availability set to ${updated.availability.replace('_', ' ').toLowerCase()}.`, 'info');
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['auth-me'] });
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    }
  };

  const handleAcknowledge = async (id: number) => {
    setActionInProgressId(id);
    try {
      const res = await acknowledgeIncident(id);
      toast(`Incident ${res?.code || `#${id}`} acknowledged. Response timer stopped.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleStartWork = async (id: number) => {
    setActionInProgressId(id);
    try {
      const res = await startIncident(id);
      toast(`Work started on ${res?.code || `#${id}`}. Now in progress.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSaveNote = async () => {
    if (!noteModalIncident || !noteText.trim()) return;
    try {
      await addComment(noteModalIncident.id, noteText.trim(), 'INTERNAL');
      toast(`Investigation note appended to timeline for ${noteModalIncident.code}.`, 'info');
      queryClient.invalidateQueries({ queryKey: ['incident-comments', noteModalIncident.id] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      setNoteModalIncident(null);
      setNoteText('');
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    }
  };

  const handleSendInfoRequest = async () => {
    if (!requestInfoIncident || !requestInfoText.trim()) return;
    try {
      await requestInfo(requestInfoIncident.id, requestInfoText.trim());
      toast(`Information clarification dispatched to reporter. SLA clock paused.`, 'warning');
      setRequestInfoIncident(null);
      setRequestInfoText('');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    }
  };

  const handleReassign = async () => {
    if (!reassignIncident || !reassignTargetId) return;
    if (reassignReason.trim().length < 10) {
      toast('Reason must be at least 10 characters long.', 'warning');
      return;
    }
    try {
      await apiReassignIncident(
        reassignIncident.id,
        Number(reassignTargetId),
        reassignReason.trim()
      );
      toast(`Incident ${reassignIncident.code} reassigned.`, 'info');
      setReassignIncident(null);
      setReassignReason('');
      setReassignTargetId('');
      queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-workload'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err: any) {
      toast(apiErrorMessage(err), 'error');
      if (isStaleDataError(err)) {
        queryClient.invalidateQueries({ queryKey: ['tech-my-queue'] });
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
      }
    }
  };

  const createViewMutation = useMutation({
    mutationFn: (name: string) =>
      createSavedFilter({
        name,
        filter: {
          q: searchQuery || undefined,
          serviceId: serviceFilter === 'ALL' ? undefined : Number(serviceFilter),
          priority: priorityFilter === 'ALL' ? undefined : [priorityFilter],
          slaState: slaFilter === 'ALL' ? undefined : slaFilter,
          sort: sortOrder === 'DEFAULT' ? undefined : sortOrder,
        },
      }),
    onSuccess: (view) => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast(`Saved view "${view.name}" created.`, 'success');
      setActiveViewId(view.id);
      setSaveViewOpen(false);
      setViewName('');
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const deleteViewMutation = useMutation({
    mutationFn: (id: number) => deleteSavedFilter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast('Saved view deleted.', 'success');
      setActiveViewId(null);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const applySavedView = (view: SavedFilterView) => {
    const f = view.filter ?? {};
    setActiveViewId(view.id);
    setSearchInput(typeof f.q === 'string' ? f.q : '');
    setSearchQuery(typeof f.q === 'string' ? f.q : '');
    setServiceFilter(f.serviceId ? String(f.serviceId) : 'ALL');
    setPriorityFilter(Array.isArray(f.priority) && f.priority[0] ? String(f.priority[0]) : 'ALL');
    setSlaFilter(typeof f.slaState === 'string' ? f.slaState : 'ALL');
    setSortOrder(typeof f.sort === 'string' ? f.sort : 'DEFAULT');
    toast(`Applied saved view "${view.name}".`, 'info');
  };

  const clearFilters = () => {
    setActiveViewId(null);
    setSearchInput('');
    setSearchQuery('');
    setServiceFilter('ALL');
    setPriorityFilter('ALL');
    setSlaFilter('ALL');
    setSortOrder('DEFAULT');
  };

  // The server already applied search, service, priority, SLA state and sort; only the tab is left to narrow here.
  const filteredQueue = rows.filter((inc) => {
    const isAtRisk = inc.slaState === 'WARNING' || inc.slaState === 'AT_RISK' || inc.slaState === 'VIOLATED';
    if (filterTab === 'NEEDS_ACK' && inc.status !== 'ASSIGNED') return false;
    if (filterTab === 'AT_RISK' && !isAtRisk) return false;
    if (filterTab === 'IN_PROGRESS' && inc.status !== 'IN_PROGRESS' && inc.status !== 'ACKNOWLEDGED') return false;
    if (filterTab === 'PENDING_INFO' && !isPendingInfo(inc)) return false;
    return true;
  });

  const needsAckCount = queue.filter((i) => i.status === 'ASSIGNED').length;
  const atRiskCount = queue.filter((i) => i.slaState === 'WARNING' || i.slaState === 'AT_RISK' || i.slaState === 'VIOLATED').length;
  const inProgressCount = queue.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'ACKNOWLEDGED').length;
  const pendingInfoCount = queue.filter(isPendingInfo).length;

  // Workload values from real backend
  const activeLoad = workload?.load ?? queue.length;
  const maxQuota = workload?.maxLoad ?? 10;
  const capacityPercent = Math.min(100, Math.round((activeLoad / maxQuota) * 100));
  const capacityWarnAt = workload?.capacityWarnPercent ?? Infinity;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* 1. TOP COMMAND BAR */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'flex-start', lg: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 800, color: tokens.onSurface, letterSpacing: '-0.01em', fontFamily: 'Sora, sans-serif' }}>
              My queue
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.4,
                borderRadius: 3,
                bgcolor: queueError ? alpha(tokens.danger, 0.15) : alpha(tokens.primary, 0.15),
                color: queueError ? slaStateColor.VIOLATED : tokens.primary,
                border: `1px solid ${queueError ? alpha(tokens.danger, 0.3) : alpha(tokens.primary, 0.3)}`,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: queueError ? slaStateColor.VIOLATED : tokens.primary,
                  boxShadow: queueError ? `0 0 8px ${tokens.danger}` : `0 0 8px ${tokens.primary}`,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              {queueError ? 'Offline, retrying' : 'Live'}
            </Box>
            <Chip
              label="⌘K Filter"
              size="small"
              clickable
              onClick={() => document.getElementById('tech-queue-search')?.focus()}
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                height: 22,
                bgcolor: tokens.surfaceContainerHigh,
                color: tokens.onSurfaceVariant,
                border: `1px solid ${tokens.outlineVariant}`,
                fontWeight: 700,
              }}
            />
            <IconButton aria-label="Refresh queue" size="small" onClick={() => { refetchQueue(); refetchWorkload(); }} sx={{ color: tokens.onSurfaceVariant }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            Signed in as {user?.name || 'Technician'}
          </Typography>
        </Box>

        {/* Capacity & Availability Pill Control */}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: 2.5,
            border: `1px solid ${tokens.outlineVariant}`,
            bgcolor: tokens.surfaceContainer,
            backdropFilter: 'blur(16px)',
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: isAvailable ? tokens.secondary : slaStateColor.VIOLATED,
              boxShadow: isAvailable ? `0 0 10px ${tokens.secondary}` : `0 0 10px ${tokens.danger}`,
            }}
          />
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.onSurface, lineHeight: 1.2 }}>
              Status: {availabilityLabel}
            </Typography>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
              {isAvailable ? 'Accepting auto-assignment' : 'Not receiving auto-assignment'}
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={handleToggleAvailability}
            sx={{
              ml: 1,
              bgcolor: tokens.surfaceContainerHigh,
              color: tokens.onSurface,
              border: `1px solid ${tokens.outlineVariant}`,
              fontSize: 12.5,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              textTransform: 'none',
              borderRadius: 1.5,
              px: 1.5,
              py: 0.5,
              '&:hover': { bgcolor: tokens.surfaceContainerHighest },
            }}
          >
            {isAvailable ? 'Set Away' : 'Set Available'}
          </Button>
        </Paper>
      </Box>

      {queueError && <ErrorState message={apiErrorMessage(queueError)} onRetry={() => refetchQueue()} />}

      {/* 2. OPERATIONAL HEALTH & WORKLOAD CAPACITY BENTO GRID */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* SRE Workload Capacity Gauge (5 cols) */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${tokens.outlineVariant}`,
              bgcolor: tokens.surfaceContainer,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: 2,
                    background: BRAND_GRADIENT,
                    color: tokens.onSurface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                  }}
                >
                  {(user?.name || 'T').substring(0, 2).toUpperCase()}
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800, color: tokens.onSurface }}>
                      {user?.name || 'Technician 1'}
                    </Typography>
                    <Chip
                      label={user?.technician?.escalationLevel === 1 ? 'Team Lead (L1)' : 'Technician (L0)'}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace',
                        bgcolor: alpha(tokens.primary, 0.15),
                        color: tokens.primary,
                        border: `1px solid ${alpha(tokens.primary, 0.3)}`,
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: capacityPercent >= capacityWarnAt ? slaStateColor.VIOLATED : tokens.secondary, fontWeight: 700, fontSize: 12 }}>
                    {capacityPercent >= capacityWarnAt && <WarningIcon sx={{ fontSize: 15 }} />}
                    <span>{activeLoad} of {maxQuota} weighted load ({capacityPercent}%)</span>
                  </Box>
                </Box>
              </Box>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.onSurfaceVariant, fontWeight: 600 }}>
                Limit: {maxQuota}
              </Typography>
            </Box>

            {/* Segmented Slots */}
            <Box>
              <LinearProgress
                variant="determinate"
                value={capacityPercent}
                sx={{
                  height: 10,
                  borderRadius: 1,
                  bgcolor: tokens.surfaceContainerHighest,
                  mb: 1,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: capacityPercent >= capacityWarnAt ? slaStateColor.VIOLATED : tokens.primary,
                    borderRadius: 1,
                  },
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: tokens.onSurfaceVariant }}>
                <span>Active tickets: {queue.length}</span>
                <span>Resolved this week: {workload?.resolvedThisWeek ?? 0}</span>
                <span style={{ color: capacityPercent >= capacityWarnAt ? slaStateColor.VIOLATED : tokens.textDisabled }}>
                  {capacityPercent >= capacityWarnAt ? 'Near Capacity' : 'Available Capacity'}
                </span>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Fast KPI Chips Counter (7 cols) */}
        <Grid item xs={12} lg={7}>
          <Grid container spacing={1.5} sx={{ height: '100%' }}>
            {/* KPI 1: Needs Ack */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: tokens.surfaceContainer,
                  border: needsAckCount > 0 ? `1px solid ${alpha(tokens.danger, 0.3)}` : `1px solid ${tokens.outlineVariant}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: needsAckCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Needs Ack
                  </Typography>
                  <BoltIcon sx={{ fontSize: 18, color: needsAckCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: needsAckCount > 0 ? slaStateColor.VIOLATED : tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {needsAckCount}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: needsAckCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant }}>
                    {needsAckCount > 0 ? 'Acknowledge' : 'Clear'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* KPI 2: At-Risk SLAs */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: tokens.surfaceContainer,
                  border: atRiskCount > 0 ? `1px solid ${alpha(tokens.danger, 0.3)}` : `1px solid ${tokens.outlineVariant}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: atRiskCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    At-Risk SLA
                  </Typography>
                  <ErrorOutlineIcon sx={{ fontSize: 18, color: atRiskCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: atRiskCount > 0 ? slaStateColor.VIOLATED : tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {atRiskCount}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Tickets
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: atRiskCount > 0 ? slaStateColor.VIOLATED : tokens.onSurfaceVariant, fontWeight: 700 }}>
                  {atRiskCount > 0 ? 'Action required' : 'All targets healthy'}
                </Typography>
              </Paper>
            </Grid>

            {/* KPI 3: In Progress */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: tokens.surfaceContainer,
                  border: `1px solid ${tokens.outlineVariant}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    In Progress
                  </Typography>
                  <SyncIcon sx={{ fontSize: 18, color: tokens.primary }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {inProgressCount}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Active
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: tokens.onSurfaceVariant }}>
                  Under investigation
                </Typography>
              </Paper>
            </Grid>

            {/* KPI 4: Pending Info */}
            <Grid item xs={6} sm={3}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: tokens.surfaceContainer,
                  border: `1px solid ${tokens.outlineVariant}`,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Pending Info
                  </Typography>
                  <PauseCircleIcon sx={{ fontSize: 18, color: tokens.secondary }} />
                </Box>
                <Box sx={{ my: 1, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    {pendingInfoCount}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                    Paused
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* 3. FILTER CONTROLS & QUERY MATRIX */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {/* Primary Filter Tabs + Search */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
            borderBottom: `1px solid ${tokens.outlineVariant}`,
            pb: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: tokens.surfaceContainerLow, p: 0.5, borderRadius: 2, border: `1px solid ${tokens.outlineVariant}`, flexWrap: 'wrap' }}>
            {(
              [
                { id: 'ALL', label: 'All Active', count: queue.length, bg: tokens.primary, text: tokens.onSurface },
                { id: 'NEEDS_ACK', label: 'Needs Acknowledgment', count: needsAckCount, bg: slaStateColor.VIOLATED, text: tokens.onSurface },
                { id: 'AT_RISK', label: 'At-Risk SLAs', count: atRiskCount, bg: alpha(tokens.danger, 0.2), text: slaStateColor.VIOLATED },
                { id: 'IN_PROGRESS', label: 'In Progress', count: inProgressCount, bg: alpha(tokens.primary, 0.2), text: tokens.primary },
                { id: 'PENDING_INFO', label: 'Waiting for requester', count: pendingInfoCount, bg: alpha(tokens.secondary, 0.2), text: tokens.secondary },
              ] as const
            ).map((tab) => {
              const isSelected = filterTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  size="small"
                  onClick={() => setFilterTab(tab.id)}
                  sx={{
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 0.6,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: isSelected ? tab.bg : 'transparent',
                    color: isSelected ? tab.text : tokens.onSurfaceVariant,
                    '&:hover': { bgcolor: isSelected ? tab.bg : tokens.surfaceContainerHigh },
                  }}
                >
                  {tab.label} ({tab.count})
                </Button>
              );
            })}
          </Box>

          {/* Quick Search Input */}
          <TextField
            id="tech-queue-search"
            size="small"
            placeholder="Search code, title, description (⌘K)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: tokens.onSurfaceVariant }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 320 },
              bgcolor: tokens.surfaceContainerLow,
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
            }}
          />
        </Box>

        {/* Secondary Filter Line */}
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: tokens.surfaceContainer,
            border: `1px solid ${tokens.outlineVariant}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {canSeeTeam && (
              <ToggleButtonGroup
                size="small"
                exclusive
                value={scope}
                onChange={(_, v) => v && setScope(v)}
                aria-label="Queue scope"
                sx={{ '& .MuiToggleButton-root': { fontSize: 12, fontWeight: 700, textTransform: 'none', px: 1.5, py: 0.4, color: tokens.onSurfaceVariant } }}
              >
                <ToggleButton value="MINE">Only mine</ToggleButton>
                <ToggleButton value="TEAM">Team</ToggleButton>
              </ToggleButtonGroup>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Service:
              </Typography>
              <Select
                size="small"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                error={!!servicesError}
                sx={{
                  bgcolor: tokens.surfaceContainerLow,
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  color: tokens.onSurface,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
                }}
              >
                <MenuItem value="ALL">All Services</MenuItem>
                {serviceList.map((svc) => (
                  <MenuItem key={svc.id} value={String(svc.id)}>{svc.name}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Priority:
              </Typography>
              <Select
                size="small"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                sx={{
                  bgcolor: tokens.surfaceContainerLow,
                  fontSize: 12,
                  fontWeight: 600,
                  height: 30,
                  borderRadius: 1.5,
                  color: tokens.onSurface,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
                }}
              >
                <MenuItem value="ALL">All Priorities</MenuItem>
                <MenuItem value="P1">P1 - Critical</MenuItem>
                <MenuItem value="P2">P2 - High</MenuItem>
                <MenuItem value="P3">P3 - Medium</MenuItem>
                <MenuItem value="P4">P4 - Low</MenuItem>
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                SLA:
              </Typography>
              <Select
                size="small"
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                sx={{ bgcolor: tokens.surfaceContainerLow, fontSize: 12, fontWeight: 600, height: 30, borderRadius: 1.5, color: tokens.onSurface, '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant } }}
              >
                <MenuItem value="ALL">Any state</MenuItem>
                {SLA_FILTERS.map((st) => (
                  <MenuItem key={st} value={st}>{st.replace('_', ' ')}</MenuItem>
                ))}
              </Select>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                Sort:
              </Typography>
              <Select
                size="small"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                sx={{ bgcolor: tokens.surfaceContainerLow, fontSize: 12, fontWeight: 600, height: 30, borderRadius: 1.5, color: tokens.onSurface, '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant } }}
              >
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {serverFiltered && (
              <Button size="small" onClick={clearFilters} sx={{ textTransform: 'none', fontSize: 12, color: tokens.onSurfaceVariant }}>
                Clear filters
              </Button>
            )}
            <Button
              size="small"
              variant="outlined"
              startIcon={<BookmarkIcon sx={{ fontSize: 16 }} />}
              disabled={!serverFiltered}
              onClick={() => setSaveViewOpen(true)}
              sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700 }}
            >
              Save view
            </Button>
          </Box>
        </Paper>

        {savedViews.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
              SAVED VIEWS:
            </Typography>
            {savedViews.map((sv) => (
              <Chip
                key={sv.id}
                label={sv.name}
                size="small"
                onClick={() => applySavedView(sv)}
                onDelete={() => deleteViewMutation.mutate(sv.id)}
                deleteIcon={<DeleteIcon sx={{ fontSize: '16px !important' }} />}
                sx={{
                  fontSize: 12,
                  bgcolor: activeViewId === sv.id ? alpha(tokens.secondary, 0.2) : tokens.surfaceContainerLow,
                  color: activeViewId === sv.id ? tokens.secondary : tokens.onSurface,
                  border: `1px solid ${activeViewId === sv.id ? tokens.secondary : tokens.outlineVariant}`,
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* 4. HIGH-DENSITY INCIDENT QUEUE STREAM */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {serverFiltered && filteredError ? (
          <ErrorState message={apiErrorMessage(filteredError)} onRetry={() => refetchFiltered()} />
        ) : (serverFiltered ? isFilteredLoading : isQueueLoading) ? (
          <LoadingState />
        ) : filteredQueue.length === 0 ? (
          <EmptyState
            message={
              !serverFiltered && queue.length === 0
                ? 'Your queue is completely clear. No tickets assigned to you right now.'
                : 'No incidents match your current filter criteria.'
            }
          />
        ) : (
          filteredQueue.map((inc) => {
            const isCritical = inc.priority === 'P1';
            const isHigh = inc.priority === 'P2';
            const isPaused = isPendingInfo(inc) || inc.slaState === 'PAUSED';
            const targetDue = inc.status === 'ASSIGNED' ? inc.responseDue : inc.resolutionDue;

            return (
              <Paper
                key={inc.id}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid ${tokens.outlineVariant}`,
                  borderLeft: isCritical ? `4px solid ${slaStateColor.VIOLATED}` : isHigh ? `4px solid ${tokens.secondary}` : `1px solid ${tokens.outlineVariant}`,
                  bgcolor: isPaused ? tokens.surfaceContainerLow : tokens.surfaceContainer,
                  backdropFilter: 'blur(16px)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: alpha(tokens.primary, 0.4),
                    boxShadow: `0 8px 24px ${alpha(tokens.surfaceContainerLowest, 0.3)}`,
                  },
                }}
              >
                {/* Upper Metadata & Title */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', lg: 'row' },
                    alignItems: { xs: 'flex-start', lg: 'center' },
                    justifyContent: 'space-between',
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Box sx={{ maxWidth: 880 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <PriorityBadge priority={inc.priority} />
                      {inc.major && (
                        <Chip
                          label="MAJOR INCIDENT"
                          size="small"
                          sx={{
                            bgcolor: tokens.danger,
                            color: tokens.onSurface,
                            fontWeight: 800,
                            fontSize: 12,
                            fontFamily: 'JetBrains Mono, monospace',
                            letterSpacing: '0.05em',
                            height: 22,
                          }}
                        />
                      )}
                      <Typography
                        onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 13,
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                          color: tokens.secondary,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                        }}
                      >
                        {inc.code}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>•</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant }}>
                        {inc.service?.name || 'General Service'}
                      </Typography>
                      {inc.category?.name && (
                        <>
                          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>•</Typography>
                          <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                            {inc.category.name}
                          </Typography>
                        </>
                      )}
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>•</Typography>
                      <Typography sx={{ fontSize: 12.5, color: tokens.textDisabled, fontFamily: 'JetBrains Mono, monospace' }}>
                        {timeAgo(inc.createdAt)}
                      </Typography>
                      {inc.escalationLevel > 0 && (
                        <Chip
                          label={`Escalation Level ${inc.escalationLevel}`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 12,
                            fontWeight: 700,
                            bgcolor: alpha(tokens.danger, 0.15),
                            color: slaStateColor.VIOLATED,
                            border: `1px solid ${alpha(tokens.danger, 0.3)}`,
                          }}
                        />
                      )}
                    </Box>

                    <Typography
                      variant="h6"
                      onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                      sx={{
                        fontWeight: 700,
                        color: tokens.onSurface,
                        fontSize: 16,
                        fontFamily: 'Sora, sans-serif',
                        cursor: 'pointer',
                        '&:hover': { color: tokens.primary },
                        mb: 0.5,
                      }}
                    >
                      {inc.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                        Reporter: <strong>{inc.reporter?.name || 'Employee'}</strong>
                      </Typography>
                      <Chip
                        label={inc.status.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: 12,
                          fontWeight: 700,
                          bgcolor: inc.status === 'ASSIGNED' ? alpha(tokens.danger, 0.15) : inc.status === 'IN_PROGRESS' ? alpha(tokens.primary, 0.15) : alpha(tokens.secondary, 0.15),
                          color: inc.status === 'ASSIGNED' ? slaStateColor.VIOLATED : inc.status === 'IN_PROGRESS' ? tokens.primary : tokens.secondary,
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* SLA Countdown Meter Component (Response & Resolution clocks) */}
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {inc.responseDue && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: tokens.surfaceContainerLowest,
                          border: `1px solid ${tokens.outlineVariant}`,
                          minWidth: 190,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: tokens.onSurfaceVariant, mb: 0.6 }}>
                          Response SLA
                        </Typography>
                        <SlaCountdown due={inc.responseDue} createdAt={inc.createdAt} slaState={inc.status === 'ASSIGNED' ? inc.slaState : 'MET'} />
                      </Paper>
                    )}
                    {inc.resolutionDue && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: tokens.surfaceContainerLowest,
                          border: `1px solid ${tokens.outlineVariant}`,
                          minWidth: 190,
                        }}
                      >
                        <Typography sx={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: tokens.onSurfaceVariant, mb: 0.6 }}>
                          Resolution SLA
                        </Typography>
                        <SlaCountdown due={inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
                      </Paper>
                    )}
                  </Box>
                </Box>

                {/* Bottom toolbar: the row's buttons come from the incident's allowedActions (ActionButtons) */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    pt: 1.5,
                    borderTop: `1px solid ${tokens.outlineVariant}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <QueueRowActions
                      incident={inc}
                      problemBase={problemBase}
                      pendingId={actionInProgressId}
                      handlers={{
                        onAcknowledge: (i) => handleAcknowledge(i.id),
                        onStart: (i) => handleStartWork(i.id),
                        onRequestInfo: setRequestInfoIncident,
                        onNote: setNoteModalIncident,
                        onReassign: setReassignIncident,
                      }}
                    />
                    {inc.major && problemBase && (
                      <Button
                        size="small"
                        onClick={() => openProblem(inc)}
                        startIcon={<HubIcon sx={{ fontSize: 15 }} />}
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: slaStateColor.VIOLATED,
                          bgcolor: alpha(tokens.danger, 0.1),
                          border: `1px solid ${alpha(tokens.danger, 0.3)}`,
                          textTransform: 'none',
                          px: 1.5,
                          borderRadius: 1.5,
                          '&:hover': { bgcolor: alpha(tokens.danger, 0.2) },
                        }}
                      >
                        Open problem
                      </Button>
                    )}
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 15 }} />}
                    sx={{
                      borderColor: tokens.primary,
                      color: tokens.primary,
                      fontSize: 12.5,
                      fontWeight: 700,
                      textTransform: 'none',
                      px: 1.8,
                      borderRadius: 1.5,
                      '&:hover': { bgcolor: alpha(tokens.primary, 0.1) },
                    }}
                  >
                    Diagnose in Workbench
                  </Button>
                </Box>
              </Paper>
            );
          })
        )}

        {/* Server-side Pagination Bar */}
        {totalItems > 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              mt: 3,
              p: 2,
              borderRadius: 2.5,
              bgcolor: tokens.surfaceContainer,
              border: `1px solid ${tokens.outlineVariant}`,
            }}
          >
            <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
              Showing {rows.length > 0 ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, totalItems)} of {totalItems} incidents
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{
                  borderColor: tokens.outlineVariant,
                  color: tokens.onSurface,
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                Previous Page
              </Button>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.primary, fontFamily: 'JetBrains Mono, monospace' }}>
                Page {page + 1} of {Math.max(1, totalPages)}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                sx={{
                  borderColor: tokens.outlineVariant,
                  color: tokens.onSurface,
                  textTransform: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                Next Page
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* DIALOG 1: APPEND NOTE */}
      <Dialog
        open={Boolean(noteModalIncident)}
        onClose={() => setNoteModalIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        {noteModalIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 700, color: tokens.secondary }}>
                  {noteModalIncident.code}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                  Add note
                </Typography>
              </Box>
              <IconButton aria-label="Close note dialog" onClick={() => setNoteModalIncident(null)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: tokens.outlineVariant }}>
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 1.5 }}>
                {noteModalIncident.title}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Log diagnostic findings, root cause analysis hypothesis, or deployment timestamps..."
                sx={{
                  bgcolor: tokens.surfaceContainerLowest,
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setNoteModalIncident(null)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveNote}
                disabled={!noteText.trim()}
                sx={{ background: BRAND_GRADIENT, textTransform: 'none', fontWeight: 700 }}
              >
                Save note
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 2: REQUEST INFO / PAUSE SLA */}
      <Dialog
        open={Boolean(requestInfoIncident)}
        onClose={() => setRequestInfoIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        {requestInfoIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 700, color: tokens.secondary }}>
                  Ask the requester about {requestInfoIncident.code}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                  Request Information from Reporter
                </Typography>
              </Box>
              <IconButton aria-label="Close request-info dialog" onClick={() => setRequestInfoIncident(null)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: tokens.outlineVariant }}>
              <Paper sx={{ p: 1.8, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 2, mb: 2 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.secondary }}>
                  Reporter: {requestInfoIncident.reporter?.name || 'Employee'}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: tokens.onSurfaceVariant, mt: 0.5 }}>
                  Submitting this request will automatically freeze the SLA countdown clock until the employee provides the requested diagnostics.
                </Typography>
              </Paper>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={requestInfoText}
                onChange={(e) => setRequestInfoText(e.target.value)}
                inputProps={{ maxLength: 2000 }}
                helperText={`${requestInfoText.length}/2000 (at least 10)`}
                placeholder="Specify the log file, screenshot, or reproduction steps required (minimum 10 characters)..."
                sx={{
                  bgcolor: tokens.surfaceContainerLowest,
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant },
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setRequestInfoIncident(null)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSendInfoRequest}
                disabled={requestInfoText.trim().length < 10}
                sx={{ background: BRAND_GRADIENT_REVERSE, textTransform: 'none', fontWeight: 700 }}
              >
                Send Request & Pause Clock
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 4: REASSIGN MODAL */}
      <Dialog
        open={Boolean(reassignIncident)}
        onClose={() => setReassignIncident(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        {reassignIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.onSurface, fontSize: 16, fontFamily: 'Sora, sans-serif' }}>
                Reassign Incident {reassignIncident.code}
              </Typography>
              <IconButton aria-label="Close reassign dialog" onClick={() => setReassignIncident(null)} size="small" sx={{ color: tokens.onSurfaceVariant }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: tokens.outlineVariant }}>
              <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant, mb: 2 }}>
                Select target technician (required):
              </Typography>
              <Select
                fullWidth
                size="small"
                value={reassignTargetId}
                onChange={(e) => setReassignTargetId(e.target.value === '' ? '' : Number(e.target.value))}
                displayEmpty
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 2, color: tokens.onSurface, mb: 2, '& .MuiOutlinedInput-notchedOutline': { borderColor: tokens.outlineVariant } }}
              >
                <MenuItem value="" disabled>-- Select a technician --</MenuItem>
                {(reassignRecs?.recommendations ?? [])
                  .filter((r) => r.technicianId !== undefined)
                  .map((r) => (
                    <MenuItem key={r.technicianId} value={r.technicianId}>
                      {r.name} (score {r.score}, load {r.currentLoad}/{r.maxLoad})
                    </MenuItem>
                  ))}
              </Select>
              {reassignRecsLoading && (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 1.5 }}>Loading eligible technicians…</Typography>
              )}
              {reassignRecsError && (
                <Typography sx={{ fontSize: 12, color: slaStateColor.VIOLATED, mb: 1.5 }}>
                  Could not load eligible technicians: {apiErrorMessage(reassignRecsError)}
                </Typography>
              )}
              {reassignRecs && reassignRecs.recommendations.length === 0 && (
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, mb: 1.5 }}>No technician is eligible right now.</Typography>
              )}
              {reassignRecs && reassignRecs.excluded.length > 0 && (
                <Box sx={{ mb: 1.5 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurfaceVariant }}>Not eligible</Typography>
                  {reassignRecs.excluded.map((x) => (
                    <Typography key={x.technicianId} sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>
                      {x.name}: {x.reason}
                    </Typography>
                  ))}
                </Box>
              )}
              <TextField
                fullWidth
                size="small"
                label="Reason for reassignment (min 10 characters)"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                inputProps={{ maxLength: 1000 }}
                placeholder="Skill specialization, workload rebalancing, etc."
                error={reassignReason.length > 0 && reassignReason.trim().length < 10}
                helperText={
                  reassignReason.length > 0 && reassignReason.trim().length < 10
                    ? `At least 10 characters required (${reassignReason.trim().length}/10)`
                    : 'Required by ITIL audit policy'
                }
                sx={{ bgcolor: tokens.surfaceContainerLowest, borderRadius: 2 }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReassignIncident(null)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleReassign}
                disabled={!reassignTargetId || reassignReason.trim().length < 10}
                sx={{ background: BRAND_GRADIENT, textTransform: 'none', fontWeight: 700 }}
              >
                Confirm Transfer
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* DIALOG 5: SAVE VIEW */}
      <Dialog
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: tokens.surfaceContainer, border: `1px solid ${tokens.outlineVariant}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, color: tokens.onSurface }}>Save this view</DialogTitle>
        <DialogContent dividers sx={{ borderColor: tokens.outlineVariant }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="View name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            inputProps={{ maxLength: 60 }}
            helperText={`${viewName.length}/60. Saves search, service, priority, SLA state and sort.`}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSaveViewOpen(false)} sx={{ textTransform: 'none', color: tokens.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!viewName.trim() || createViewMutation.isPending}
            onClick={() => createViewMutation.mutate(viewName.trim())}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
