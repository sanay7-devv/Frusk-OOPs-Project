import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Bookmark as BookmarkIcon,
  BookmarkAdd as BookmarkAddIcon,
  DeleteOutline as DeleteIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

import {
  listIncidents,
  listSavedFilters,
  createSavedFilter,
  deleteSavedFilter,
} from '../../api/incidents';
import { getServices } from '../../api/services';
import type { IncidentSummary, Page, SavedFilterView } from '../../api/types';
import type { ServiceItem } from '../../api/services';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import SlaBar from '../../components/SlaBar';
import { ErrorState } from '../../components/StateViews';
import { useToast } from '../../components/Toast';
import { tokens, slaStateColor } from '../../theme/theme';
import { alpha } from '@mui/material/styles';

const COLORS = {
  surface: tokens.background,
  surfaceContainerLowest: tokens.surfaceContainerLowest,
  surfaceContainerLow: tokens.surfaceContainerLow,
  surfaceContainer: tokens.surfaceContainer,
  surfaceContainerHigh: tokens.surfaceContainerHigh,
  surfaceContainerHighest: tokens.surfaceContainerHighest,
  onSurface: tokens.onSurface,
  onSurfaceVariant: tokens.onSurfaceVariant,
  border: tokens.outlineVariant,
  primary: tokens.primary,
  secondary: tokens.secondary,
  error: slaStateColor.VIOLATED,
  warning: slaStateColor.AT_RISK,
  success: slaStateColor.MET,
};

const ACTIVE_STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'];
const RESOLVED_STATUSES = ['RESOLVED', 'VERIFIED', 'CLOSED'];

export default function MyIncidents() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<string>('createdAt,desc');
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);

  // Saved Views State
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [activeSavedViewId, setActiveSavedViewId] = useState<number | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Status parameter for server query
  const statusFilterParam =
    statusFilter === 'ACTIVE'
      ? ACTIVE_STATUSES
      : statusFilter === 'RESOLVED'
      ? RESOLVED_STATUSES
      : undefined;

  // Real backend query for employee incidents with server filtering and pagination
  const { data, isLoading, isError, refetch, isFetching } = useQuery<Page<IncidentSummary>>({
    queryKey: [
      'incidents',
      'my-incidents',
      statusFilter,
      priorityFilter,
      serviceFilter,
      sortOrder,
      searchQuery,
      page,
      pageSize,
    ],
    queryFn: () =>
      listIncidents({
        mine: true,
        status: statusFilterParam,
        priority: priorityFilter !== 'ALL' ? [priorityFilter] : undefined,
        serviceId: serviceFilter !== 'ALL' ? Number(serviceFilter) : undefined,
        q: searchQuery || undefined,
        sort: sortOrder,
        page,
        size: pageSize,
      }),
  });

  // Services for filter dropdown
  const { data: services = [] } = useQuery<ServiceItem[]>({
    queryKey: ['services'],
    queryFn: getServices,
  });

  // Saved Views query
  const { data: savedViews = [] } = useQuery<SavedFilterView[]>({
    queryKey: ['saved-filters'],
    queryFn: listSavedFilters,
  });

  // True server counts
  const { data: activePage } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'my-incidents-count', 'active'],
    queryFn: () => listIncidents({ mine: true, status: ACTIVE_STATUSES, size: 1 }),
  });
  const { data: resolvedPage } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'my-incidents-count', 'resolved'],
    queryFn: () => listIncidents({ mine: true, status: RESOLVED_STATUSES, size: 1 }),
  });

  const activeCount = activePage?.totalItems ?? 0;
  const resolvedCount = resolvedPage?.totalItems ?? 0;
  const totalCount = activeCount + resolvedCount;

  // Saved view mutations
  const createViewMutation = useMutation({
    mutationFn: (name: string) =>
      createSavedFilter({
        name,
        filter: {
          status: statusFilter,
          priority: priorityFilter,
          serviceId: serviceFilter,
          sort: sortOrder,
          q: searchQuery,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast('View saved.', 'success');
      setSaveViewOpen(false);
      setViewName('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to save view.', 'error');
    },
  });

  const deleteViewMutation = useMutation({
    mutationFn: (id: number) => deleteSavedFilter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast('Saved view deleted.', 'success');
      setActiveSavedViewId(null);
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to delete saved view.', 'error');
    },
  });

  const applySavedView = (view: SavedFilterView) => {
    setActiveSavedViewId(view.id);
    const f = view.filter || {};
    if (f.status) setStatusFilter(f.status);
    if (f.priority) setPriorityFilter(f.priority);
    if (f.serviceId) setServiceFilter(String(f.serviceId));
    if (f.sort) setSortOrder(f.sort);
    if (f.q !== undefined) {
      setSearchInput(f.q);
      setSearchQuery(f.q);
    }
    setPage(0);
    toast(`Applied saved view "${view.name}".`, 'info');
  };

  const incidents: IncidentSummary[] = data?.items || [];
  const totalPages = data?.totalPages || 0;
  const totalItems = data?.totalItems || 0;

  const isResolvedOrClosed = (status: string) =>
    status === 'RESOLVED' || status === 'VERIFIED' || status === 'CLOSED';

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header Bar */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography
              variant="h5" component="h1"
              sx={{
                fontWeight: 800,
                color: COLORS.onSurface,
                fontFamily: 'Sora, sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              My incidents
            </Typography>
            <Chip
              label={`${totalItems} ${totalItems === 1 ? 'report' : 'reports'}`}
              size="small"
              sx={{
                bgcolor: alpha(tokens.primary, 0.15),
                color: COLORS.primary,
                border: `1px solid ${alpha(tokens.primary, 0.3)}`,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 12,
                height: 22,
              }}
            />
          </Box>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
            See the problems you have reported and where they stand
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            size="small"
            onClick={() => setSaveViewOpen(true)}
            startIcon={<BookmarkAddIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: COLORS.surfaceContainer,
              color: COLORS.secondary,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
            }}
          >
            Save this view
          </Button>

          <Button
            size="small"
            onClick={() => refetch()}
            startIcon={isFetching ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon sx={{ fontSize: 16 }} />}
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
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
            }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate('/employee/report')}
            startIcon={<AddIcon />}
            sx={{
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              borderRadius: 2,
              px: 2.5,
              py: 0.8,
              fontSize: 12.5,
              fontWeight: 700,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              boxShadow: `0 4px 14px ${alpha(tokens.primary, 0.35)}`,
              '&:hover': { opacity: 0.9 },
            }}
          >
            Report a problem
          </Button>
        </Box>
      </Box>

      {/* Saved Views Bar (guide Tier 3) */}
      {savedViews.length > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: COLORS.onSurfaceVariant }}>
            <BookmarkIcon sx={{ fontSize: 16, color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
              Saved views:
            </Typography>
          </Box>
          {savedViews.map((sv) => (
            <Chip
              key={sv.id}
              label={sv.name}
              size="small"
              onClick={() => applySavedView(sv)}
              onDelete={() => deleteViewMutation.mutate(sv.id)}
              deleteIcon={<DeleteIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                bgcolor: activeSavedViewId === sv.id ? alpha(tokens.secondary, 0.2) : COLORS.surfaceContainerLow,
                color: activeSavedViewId === sv.id ? COLORS.secondary : COLORS.onSurface,
                border: activeSavedViewId === sv.id ? `1px solid ${COLORS.secondary}` : `1px solid ${COLORS.border}`,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            />
          ))}
          {activeSavedViewId && (
            <Button
              size="small"
              onClick={() => {
                setActiveSavedViewId(null);
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setServiceFilter('ALL');
                setSortOrder('createdAt,desc');
                setSearchInput('');
                setSearchQuery('');
                setPage(0);
              }}
              sx={{ fontSize: 12, textTransform: 'none', color: COLORS.onSurfaceVariant }}
            >
              Reset filters
            </Button>
          )}
        </Box>
      )}

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.8,
          mb: 3,
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Status Tabs */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.8,
            bgcolor: COLORS.surfaceContainerLow,
            p: 0.5,
            borderRadius: 2,
            border: `1px solid ${COLORS.border}`,
            flexWrap: 'nowrap',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'ALL', label: 'All', count: totalCount },
            { id: 'ACTIVE', label: 'Active', count: activeCount },
            { id: 'RESOLVED', label: 'Resolved', count: resolvedCount },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <Button
                key={tab.id}
                size="small"
                onClick={() => {
                  setStatusFilter(tab.id as any);
                  setPage(0);
                }}
                sx={{
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: 12,
                  color: isSelected ? tokens.white : COLORS.onSurfaceVariant,
                  bgcolor: isSelected ? COLORS.surfaceContainerHighest : 'transparent',
                  border: isSelected ? `1px solid ${COLORS.border}` : '1px solid transparent',
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 0.6,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                }}
              >
                <span>{tab.label}</span>
                <Box
                  component="span"
                  sx={{
                    ml: 0.8,
                    px: 0.8,
                    py: 0.1,
                    borderRadius: 1,
                    bgcolor: isSelected ? COLORS.primary : COLORS.surfaceContainerHighest,
                    color: tokens.white,
                    fontSize: 12,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </Box>
              </Button>
            );
          })}
        </Box>

        {/* Server Filter Dropdowns and Search */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Priority Filter */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: COLORS.onSurfaceVariant, fontSize: 12 }}>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(0);
              }}
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                color: COLORS.onSurface,
                fontSize: 12,
                height: 38,
                '& fieldset': { borderColor: COLORS.border },
              }}
            >
              <MenuItem value="ALL">All Priorities</MenuItem>
              <MenuItem value="P1">P1 Critical</MenuItem>
              <MenuItem value="P2">P2 High</MenuItem>
              <MenuItem value="P3">P3 Medium</MenuItem>
              <MenuItem value="P4">P4 Low</MenuItem>
            </Select>
          </FormControl>

          {/* Service Filter */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: COLORS.onSurfaceVariant, fontSize: 12 }}>Service</InputLabel>
            <Select
              value={serviceFilter}
              label="Service"
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setPage(0);
              }}
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                color: COLORS.onSurface,
                fontSize: 12,
                height: 38,
                '& fieldset': { borderColor: COLORS.border },
              }}
            >
              <MenuItem value="ALL">All Services</MenuItem>
              {services.map((svc) => (
                <MenuItem key={svc.id} value={String(svc.id)}>
                  {svc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Sort Order */}
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel sx={{ color: COLORS.onSurfaceVariant, fontSize: 12 }}>Sort</InputLabel>
            <Select
              value={sortOrder}
              label="Sort"
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(0);
              }}
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                color: COLORS.onSurface,
                fontSize: 12,
                height: 38,
                '& fieldset': { borderColor: COLORS.border },
              }}
            >
              <MenuItem value="createdAt,desc">Newest first</MenuItem>
              <MenuItem value="createdAt,asc">Oldest first</MenuItem>
              <MenuItem value="resolutionDue,asc">Closest to deadline</MenuItem>
              <MenuItem value="priority,asc">Highest priority first</MenuItem>
            </Select>
          </FormControl>

          {/* Search Field */}
          <TextField
            size="small"
            placeholder="Search by code or title"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 220 },
              '& .MuiOutlinedInput-root': {
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                fontSize: 12.5,
                color: COLORS.onSurface,
                height: 38,
                '& fieldset': { borderColor: COLORS.border },
              },
            }}
          />
        </Box>
      </Paper>

      {/* Incidents Ledger Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: COLORS.surfaceContainer,
          border: `1px solid ${COLORS.border}`,
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
        }}
      >
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ color: COLORS.primary, mb: 1.5 }} />
            <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13 }}>
              Loading your incidents...
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState onRetry={() => refetch()} message="Could not load your incidents. Check your connection and try again." />
          </Box>
        ) : incidents.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: COLORS.secondary, mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              No incidents found
            </Typography>
            <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, maxWidth: 440, mx: 'auto', mt: 0.5 }}>
              {searchQuery ? 'Nothing matches your search.' : 'You have not reported any problems yet.'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 900, '& th, & td': { px: 1.25 }, '& th:first-of-type, & td:first-of-type': { pl: 2 } }}>
              <TableHead>
                <TableRow sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap', width: 130 }}>
                    Code
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Problem
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Priority
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Handled by
                  </TableCell>
                  <TableCell sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    Time left
                  </TableCell>
                  <TableCell align="right" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {incidents.map((inc: IncidentSummary) => (
                  <TableRow
                    key={inc.id}
                    hover
                    onClick={() => navigate(`/employee/incidents/${inc.id}`)}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: `1px solid ${COLORS.border}`,
                      '&:hover': { bgcolor: alpha(tokens.primary, 0.04) },
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 800, color: COLORS.secondary, whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        {inc.code}
                        {inc.major && (
                          <Chip
                            label="Major"
                            size="small"
                            sx={{
                              bgcolor: alpha(tokens.danger, 0.2),
                              color: tokens.danger,
                              border: `1px solid ${alpha(tokens.danger, 0.4)}`,
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 12,
                              fontWeight: 800,
                              height: 18,
                            }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ minWidth: 240 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                          {inc.title}
                        </Typography>
                        {inc.status === 'PENDING_USER_INFO' && (
                          <Chip
                            label="Needs your reply"
                            size="small"
                            sx={{
                              bgcolor: alpha(tokens.tertiary, 0.2),
                              color: tokens.tertiary,
                              border: `1px solid ${alpha(tokens.tertiary, 0.4)}`,
                              height: 18,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.25 }}>
                        {inc.service?.name || 'General'} · Reported {new Date(inc.createdAt).toLocaleString(undefined, { dateStyle: 'medium' })}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={inc.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={inc.status} />
                    </TableCell>
                    {/* Assignee Column */}
                    <TableCell>
                      {inc.assignee ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <PersonIcon sx={{ fontSize: 15, color: COLORS.primary }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.onSurface }}>
                            {inc.assignee.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontStyle: 'italic' }}>
                          Not yet assigned
                        </Typography>
                      )}
                    </TableCell>
                    {/* SLA Clock & Bar Column */}
                    <TableCell sx={{ minWidth: 135 }}>
                      {isResolvedOrClosed(inc.status) ? (
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: COLORS.success, fontWeight: 700 }}>
                          Done
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                          <SlaCountdown
                            due={inc.resolutionDue}
                            createdAt={inc.createdAt}
                            slaState={inc.slaState}
                          />
                          <SlaBar
                            createdAt={inc.createdAt}
                            due={inc.resolutionDue}
                            slaState={inc.slaState}
                            height={4}
                          />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap', width: 110 }}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employee/incidents/${inc.id}`);
                        }}
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          color: COLORS.secondary,
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'none',
                          whiteSpace: 'nowrap',
                          borderRadius: 1.5,
                          px: 1.5,
                          '&:hover': { bgcolor: alpha(tokens.secondary, 0.1) },
                        }}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Server Pagination Controls */}
        {totalPages > 1 && (
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainerLow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                Page {page + 1} of {totalPages} ({totalItems} incidents)
              </Typography>
              <FormControl size="small">
                <Select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  sx={{
                    height: 28,
                    fontSize: 12,
                    color: COLORS.onSurface,
                    bgcolor: COLORS.surfaceContainerLowest,
                    '& fieldset': { borderColor: COLORS.border },
                  }}
                >
                  <MenuItem value={10}>10 / page</MenuItem>
                  <MenuItem value={20}>20 / page</MenuItem>
                  <MenuItem value={50}>50 / page</MenuItem>
                  <MenuItem value={100}>100 / page</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                startIcon={<ChevronLeftIcon />}
                sx={{
                  borderColor: COLORS.border,
                  color: COLORS.onSurface,
                  textTransform: 'none',
                  fontSize: 12,
                }}
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                endIcon={<ChevronRightIcon />}
                sx={{
                  borderColor: COLORS.border,
                  color: COLORS.onSurface,
                  textTransform: 'none',
                  fontSize: 12,
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Save View Modal Dialog */}
      <Dialog
        open={saveViewOpen}
        onClose={() => setSaveViewOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: COLORS.surfaceContainerLow,
            border: `1px solid ${COLORS.border}`,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ color: COLORS.onSurface, fontWeight: 700, fontSize: 16 }}>
          Save this view
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 12.5, mb: 2 }}>
            Give your current search and filters a name so you can use them again.
          </Typography>
          <TextField
            fullWidth
            autoFocus
            size="small"
            label="Name"
            value={viewName}
            onChange={(e) => setViewName(e.target.value)}
            placeholder="For example: Open urgent problems"
            inputProps={{ maxLength: 60 }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: COLORS.surfaceContainerLowest,
                color: COLORS.onSurface,
                '& fieldset': { borderColor: COLORS.border },
              },
              '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setSaveViewOpen(false)} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!viewName.trim() || createViewMutation.isPending}
            onClick={() => createViewMutation.mutate(viewName.trim())}
            sx={{
              background: `linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`,
              color: tokens.white,
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
