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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress,
  Rating,
  Select,
  FormControl,
} from '@mui/material';
import {
  Search as SearchIcon,
  Bolt as BoltIcon,
  PendingActions as PendingActionsIcon,
  ErrorOutline as ErrorOutlineIcon,
  TaskAlt as TaskAltIcon,
  FilterList as FilterListIcon,
  Sync as SyncIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Reply as ReplyIcon,
  PriorityHigh as PriorityHighIcon,
  Close as CloseIcon,
  Verified as VerifiedIcon,
  Star as StarIcon,
  NotificationsActive as NotificationsIcon,
  Dns as DnsIcon,
  ReportProblem as ProblemIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import {
  listIncidents,
  provideInfo,
  verifyIncident,
  submitFeedback,
  getComments,
  getServicesStatus,
  getKnownOutages,
  joinProblem,
} from '../../api/incidents';
import { unreadCount } from '../../api/notifications';
import type { IncidentSummary, Page, CommentView, StatusBoard, KnownOutageView } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import SlaBar from '../../components/SlaBar';
import { ErrorState } from '../../components/StateViews';

const ACTIVE_STATUSES = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'];
const RESOLVED_STATUSES = ['RESOLVED', 'VERIFIED', 'CLOSED'];

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [replyIncident, setReplyIncident] = useState<IncidentSummary | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [ratingIncident, setRatingIncident] = useState<IncidentSummary | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');

  // Debounce search query 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Server filters for the incident table
  const statusFilterParam =
    filterTab === 'ACTIVE'
      ? ACTIVE_STATUSES
      : filterTab === 'PENDING'
      ? ['PENDING_USER_INFO']
      : filterTab === 'RESOLVED'
      ? RESOLVED_STATUSES
      : undefined;

  // Real backend query for employee incidents with server paging and filters
  const {
    data: pageData,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'employee-home', filterTab, priorityFilter, searchQuery, page, pageSize],
    queryFn: () =>
      listIncidents({
        mine: true,
        status: statusFilterParam,
        priority: priorityFilter !== 'ALL' ? [priorityFilter] : undefined,
        q: searchQuery || undefined,
        page,
        size: pageSize,
        sort: 'createdAt,desc',
      }),
  });

  // True server KPI counts
  const { data: activePage } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'employee-home-count', 'active'],
    queryFn: () => listIncidents({ mine: true, status: ACTIVE_STATUSES, size: 1 }),
  });
  const { data: pendingPage } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'employee-home-count', 'pending'],
    queryFn: () => listIncidents({ mine: true, status: ['PENDING_USER_INFO'], size: 1 }),
  });
  const { data: resolvedPage } = useQuery<Page<IncidentSummary>>({
    queryKey: ['incidents', 'employee-home-count', 'resolved'],
    queryFn: () => listIncidents({ mine: true, status: RESOLVED_STATUSES, size: 1 }),
  });

  const activeCount = activePage?.totalItems ?? 0;
  const pendingCount = pendingPage?.totalItems ?? 0;
  const resolvedCount = resolvedPage?.totalItems ?? 0;
  const totalCount = activeCount + resolvedCount;

  // Unread notifications count
  const { data: unreadNotifications = 0 } = useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => unreadCount(),
    staleTime: 30000,
  });

  // Known Outages
  const { data: knownOutages = [] } = useQuery<KnownOutageView[]>({
    queryKey: ['problems', 'known-outages'],
    queryFn: () => getKnownOutages(),
  });

  // Service Status Board
  const { data: statusBoard } = useQuery<StatusBoard>({
    queryKey: ['services', 'status'],
    queryFn: () => getServicesStatus(),
  });

  // Fetch comments for technician question when Reply dialog is opened
  const { data: replyComments, isLoading: loadingReplyComments } = useQuery<CommentView[]>({
    queryKey: ['incidents', replyIncident?.id, 'comments'],
    queryFn: () => (replyIncident ? getComments(replyIncident.id) : Promise.resolve([])),
    enabled: Boolean(replyIncident),
  });

  const incidents: IncidentSummary[] = pageData?.items || [];
  const totalPages = pageData?.totalPages || 0;
  const totalItems = pageData?.totalItems || 0;

  // First pending incident for action alert banner
  const pendingIncident = incidents.find((i) => i.status === 'PENDING_USER_INFO');

  // Mutations
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => provideInfo(id, message),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      const resumed = data.slaState !== 'PAUSED';
      toast(
        resumed
          ? 'Clarification delivered to assigned technician. The SLA clock has resumed.'
          : `Clarification delivered. SLA status: ${data.slaState}.`,
        'success'
      );
      setReplyIncident(null);
      setReplyMessage('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to submit response.', 'error');
    },
  });

  const joinMutation = useMutation({
    mutationFn: (problemId: number) => joinProblem(problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['problems', 'known-outages'] });
      toast('Successfully joined outage incident tracking.', 'success');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to join outage problem.', 'error');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: number; rating: number; comment?: string }) =>
      submitFeedback(id, rating, comment),
    onSuccess: () => {
      toast('Thank you for rating this incident resolution!', 'success');
      setRatingIncident(null);
      setRatingComment('');
      setRatingValue(5);
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to submit feedback.', 'error');
    },
  });

  // Latest question from technician in reply modal
  const technicianQuestion = replyComments && replyComments.length > 0
    ? replyComments.slice().reverse().find((c) => c.visibility === 'PUBLIC') || replyComments[replyComments.length - 1]
    : null;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* 1. TOP OPERATIONAL HEADER & STATUS SUMMARY */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em' }}>
              EMPLOYEE WORKSPACE
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', mb: 0.5 }}>
            Welcome back, {user?.name || 'Employee'}
          </Typography>
          <Typography sx={{ color: '#94a3b8', fontSize: 14.5, fontFamily: 'Geist, sans-serif' }}>
            Enterprise IT Service Portal
          </Typography>
        </Box>

        {/* Live Status and Unread Notifications Pill */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {unreadNotifications > 0 && (
            <Button
              size="small"
              onClick={() => navigate('/notifications')}
              startIcon={<NotificationsIcon sx={{ fontSize: 16, color: '#f751a1' }} />}
              sx={{
                bgcolor: 'rgba(247, 81, 161, 0.12)',
                border: '1px solid rgba(247, 81, 161, 0.35)',
                color: '#ffb0cd',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: '10px',
                px: 1.8,
                py: 0.7,
                textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(247, 81, 161, 0.22)' },
              }}
            >
              {unreadNotifications} Unread
            </Button>
          )}

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 0.8,
              borderRadius: '12px',
              bgcolor: 'rgba(18, 22, 34, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
            <Box>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: '#dfe2ef', textTransform: 'uppercase' }}>
                Summary
              </Typography>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4cd7f6' }}>
                {activeCount} Active / {resolvedCount} Resolved
              </Typography>
            </Box>
            <Box sx={{ width: '1px', height: 24, bgcolor: 'rgba(255, 255, 255, 0.1)', mx: 0.5 }} />
            <Button
              size="small"
              onClick={() => refetch()}
              disabled={isFetching}
              startIcon={isFetching ? <CircularProgress size={12} color="inherit" /> : <SyncIcon sx={{ fontSize: 14 }} />}
              sx={{
                color: '#c0c1ff',
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'none',
                p: 0.5,
                minWidth: 'auto',
                '&:hover': { bgcolor: 'transparent', color: '#ffffff', textDecoration: 'underline' },
              }}
            >
              Sync
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 2. KNOWN OUTAGE BANNER */}
      {knownOutages.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            bgcolor: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            p: 2.5,
            mb: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(244, 63, 94, 0.15)',
          }}
        >
          <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, bgcolor: '#f43f5e', boxShadow: '0 0 12px #f43f5e' }} />
          {knownOutages.map((outage) => (
            <Box
              key={outage.problemId}
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                gap: 2,
                pl: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, maxWidth: 900 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    bgcolor: 'rgba(244, 63, 94, 0.15)',
                    color: '#f43f5e',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    mt: 0.2,
                  }}
                >
                  <ProblemIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                    <Chip
                      label="ACTIVE OUTAGE"
                      size="small"
                      sx={{
                        bgcolor: '#f43f5e',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: 10.5,
                        height: 20,
                        borderRadius: '4px',
                      }}
                    />
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#dfe2ef' }}>
                      {outage.service?.name} (Lead: {outage.leadCode})
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                      • Affecting ~{outage.affectedUsers} users
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: '#ffffff' }}>
                    {outage.title}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {outage.alreadyJoined ? (
                  <Chip
                    label="Already Joined"
                    size="small"
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                    }}
                  />
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    disabled={joinMutation.isPending}
                    onClick={() => joinMutation.mutate(outage.problemId)}
                    sx={{
                      bgcolor: '#f43f5e',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: 13,
                      borderRadius: '8px',
                      px: 2.2,
                      py: 0.8,
                      '&:hover': { bgcolor: '#e11d48' },
                    }}
                  >
                    Join Outage Report
                  </Button>
                )}
              </Box>
            </Box>
          ))}
        </Paper>
      )}

      {/* 3. DYNAMIC OPERATIONAL ALERT BANNER (Shown when information is requested) */}
      {pendingIncident && (
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '16px',
            bgcolor: 'rgba(247, 81, 161, 0.08)',
            border: '1px solid rgba(247, 81, 161, 0.3)',
            p: 2.5,
            mb: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(247, 81, 161, 0.15)',
          }}
        >
          <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 5, bgcolor: '#f751a1', boxShadow: '0 0 12px #f751a1' }} />
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
              pl: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, maxWidth: 900 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  bgcolor: 'rgba(247, 81, 161, 0.15)',
                  color: '#f751a1',
                  border: '1px solid rgba(247, 81, 161, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(247, 81, 161, 0.25)',
                  flexShrink: 0,
                  mt: 0.3,
                }}
              >
                <PriorityHighIcon sx={{ fontSize: 22 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                  <Chip
                    label="ACTION REQUIRED"
                    size="small"
                    sx={{
                      bgcolor: '#f751a1',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: 10.5,
                      height: 20,
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  />
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#dfe2ef' }}>
                    {pendingIncident.code}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
                    • Assigned technician requested clarification
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#ffffff' }}>
                  {pendingIncident.title}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => navigate(`/employee/incidents/${pendingIncident.id}`)}
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.04)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#dfe2ef',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  borderRadius: '8px',
                  px: 2,
                  py: 0.8,
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)', borderColor: '#6366f1' },
                }}
              >
                View Details
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setReplyIncident(pendingIncident)}
                startIcon={<ReplyIcon sx={{ fontSize: 17 }} />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: '8px',
                  px: 2.2,
                  py: 0.8,
                  boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)',
                }}
              >
                Respond Now
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* 4. SERVICE STATUS BOARD (guide P1-9) */}
      {statusBoard && statusBoard.services && statusBoard.services.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            bgcolor: '#141824',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DnsIcon sx={{ fontSize: 18, color: '#4cd7f6' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#dfe2ef', textTransform: 'uppercase' }}>
                Service Status Board
              </Typography>
              <Chip
                label={statusBoard.label || 'All Systems Operational'}
                size="small"
                sx={{
                  bgcolor: 'rgba(6, 182, 212, 0.12)',
                  color: '#4cd7f6',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10.5,
                  fontWeight: 700,
                  height: 20,
                }}
              />
            </Box>
            <Typography sx={{ fontSize: 11, color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
              Window: {statusBoard.windowDays || 30}d basis
            </Typography>
          </Box>

          <Grid container spacing={1.5}>
            {statusBoard.services.map((svc) => {
              const isHealthy = svc.status === 'HEALTHY';
              const isDegraded = svc.status === 'DEGRADED';
              const isOutage = svc.status === 'OUTAGE';
              const badgeBg = isHealthy ? 'rgba(16, 185, 129, 0.12)' : isDegraded ? 'rgba(245, 158, 11, 0.15)' : 'rgba(244, 63, 94, 0.18)';
              const badgeBorder = isHealthy ? 'rgba(16, 185, 129, 0.3)' : isDegraded ? 'rgba(245, 158, 11, 0.35)' : 'rgba(244, 63, 94, 0.4)';
              const badgeColor = isHealthy ? '#10b981' : isDegraded ? '#f59e0b' : '#f43f5e';

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={svc.id}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '10px',
                      bgcolor: 'rgba(18, 22, 34, 0.7)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 0.5,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                        {svc.name}
                      </Typography>
                      <Chip
                        label={svc.status}
                        size="small"
                        sx={{
                          bgcolor: badgeBg,
                          border: `1px solid ${badgeBorder}`,
                          color: badgeColor,
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 800,
                          fontSize: 10,
                          height: 19,
                        }}
                      />
                    </Box>
                    {svc.reason && (
                      <Typography sx={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                        {svc.reason}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}

      {/* 5. COMMAND BENTO GRID: Action Launchpad & Search */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Quick Search */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              bgcolor: '#141824',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            }}
          >
            <Box>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#4cd7f6', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5 }}>
                Search Incidents
              </Typography>
              <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#ffffff', mb: 2 }}>
                Search your reported incidents or service requests
              </Typography>

              <TextField
                fullWidth
                size="small"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search reported tickets by code, summary, or affected service..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#64748b', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  bgcolor: 'rgba(18, 22, 34, 0.7)',
                  borderRadius: '10px',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.22)' },
                  mb: 0.5,
                }}
              />
            </Box>
          </Paper>
        </Grid>

        {/* Incident Desk CTA Card */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              color: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 24px rgba(99, 102, 241, 0.15)',
            }}
          >
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Chip
                  icon={<BoltIcon sx={{ fontSize: '15px !important', color: '#4cd7f6 !important' }} />}
                  label="INCIDENT DESK"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid rgba(6, 182, 212, 0.35)',
                    color: '#4cd7f6',
                    fontWeight: 800,
                    fontSize: 11,
                    height: 22,
                    borderRadius: '4px',
                  }}
                />
              </Box>

              <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', mb: 0.8, lineHeight: 1.25 }}>
                Experiencing an Interruption?
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                Dispatch a real incident ticket straight to the SRE triage queue with automated category and SLA correlation.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={() => navigate('/employee/report')}
              startIcon={<BoltIcon sx={{ fontSize: 20 }} />}
              sx={{
                mt: 2.5,
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 13.5,
                borderRadius: '8px',
                py: 1.2,
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.4)',
                textTransform: 'none',
                '&:hover': {
                  background: 'linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)',
                  boxShadow: '0 0 28px rgba(6, 182, 212, 0.55)',
                },
              }}
            >
              + Report Issue / Outage
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* 6. TRUE SERVER KPI STREAM */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* KPI 1: Active Incidents */}
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              bgcolor: '#141824',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Active Incidents
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
                  {activeCount}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#c0c1ff', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PendingActionsIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.06)', mt: 1 }}>
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#4cd7f6' }}>
                Open &amp; in progress (server total)
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 2: Awaiting My Action */}
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: pendingCount > 0 ? '1px solid rgba(247, 81, 161, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
              bgcolor: pendingCount > 0 ? 'rgba(247, 81, 161, 0.06)' : '#141824',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: pendingCount > 0 ? '#ffb0cd' : '#94a3b8', textTransform: 'uppercase' }}>
                  Awaiting My Action
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: pendingCount > 0 ? '#f751a1' : '#ffffff', mt: 0.5 }}>
                  {pendingCount}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(247, 81, 161, 0.15)', color: '#ffb0cd', border: '1px solid rgba(247, 81, 161, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ErrorOutlineIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.06)', mt: 1 }}>
              <Typography sx={{ fontSize: 11.5, color: '#dfe2ef' }}>
                {pendingCount > 0 ? 'SLA paused pending your clarification' : 'No pending technician queries'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* KPI 3: Resolved */}
        <Grid item xs={12} sm={6} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              bgcolor: '#141824',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                  Resolved &amp; Closed
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', mt: 0.5 }}>
                  {resolvedCount}
                </Typography>
              </Box>
              <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TaskAltIcon sx={{ fontSize: 22 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, pt: 1.5, borderTop: '1px solid rgba(255, 255, 255, 0.06)', mt: 1 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
              <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#6ee7b7', fontWeight: 600 }}>
                Resolved &amp; verified (server total)
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 7. PRIMARY WORKING AREA: INCIDENTS TABLE */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#141824',
          overflow: 'hidden',
          mb: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Table Header Bar */}
        <Box
          sx={{
            p: 2.5,
            bgcolor: '#0e121d',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
                My Reported Incidents
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: 'Geist, sans-serif' }}>
                Server records: {totalItems} total matches
              </Typography>
            </Box>
            <Chip
              label={`${totalItems} Tickets`}
              size="small"
              sx={{
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#c0c1ff',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: 11,
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Filter Tabs */}
            <Box sx={{ display: 'flex', bgcolor: 'rgba(18, 22, 34, 0.8)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', p: 0.3 }}>
              {(['ALL', 'ACTIVE', 'PENDING', 'RESOLVED'] as const).map((tab) => {
                const count =
                  tab === 'ALL'
                    ? totalCount
                    : tab === 'ACTIVE'
                    ? activeCount
                    : tab === 'PENDING'
                    ? pendingCount
                    : resolvedCount;
                const isSelected = filterTab === tab;
                return (
                  <Button
                    key={tab}
                    size="small"
                    onClick={() => {
                      setFilterTab(tab);
                      setPage(0);
                    }}
                    sx={{
                      fontSize: 11.5,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      bgcolor: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      borderRadius: '6px',
                      px: 1.5,
                      py: 0.4,
                      textTransform: 'none',
                      minWidth: 'auto',
                      '&:hover': { bgcolor: isSelected ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.04)', color: '#dfe2ef' },
                    }}
                  >
                    {tab.charAt(0) + tab.slice(1).toLowerCase()} ({count})
                  </Button>
                );
              })}
            </Box>

            {/* Filter Dropdown */}
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.1)',
                bgcolor: 'rgba(18, 22, 34, 0.6)',
                color: priorityFilter !== 'ALL' ? '#4cd7f6' : '#dfe2ef',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: '8px',
                textTransform: 'none',
                height: 32,
              }}
            >
              {priorityFilter === 'ALL' ? 'Priority' : `Priority: ${priorityFilter}`}
            </Button>
            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              <MenuItem onClick={() => { setPriorityFilter('ALL'); setPage(0); setFilterAnchor(null); }}>All Priorities</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P1'); setPage(0); setFilterAnchor(null); }}>P1 Critical</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P2'); setPage(0); setFilterAnchor(null); }}>P2 High</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P3'); setPage(0); setFilterAnchor(null); }}>P3 Medium</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P4'); setPage(0); setFilterAnchor(null); }}>P4 Low</MenuItem>
            </Menu>

            {/* Refresh Button */}
            <IconButton
              size="small"
              onClick={() => refetch()}
              title="Refresh Feed"
              sx={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                p: 0.8,
                bgcolor: 'rgba(18, 22, 34, 0.6)',
                color: '#dfe2ef',
              }}
            >
              <SyncIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Ledger Table */}
        {isLoading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={32} sx={{ color: '#6366f1', mb: 1.5 }} />
            <Typography sx={{ color: '#94a3b8', fontSize: 13 }}>
              Loading incidents from server...
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState onRetry={() => refetch()} message="Failed to load your incidents. Please check your network connection and retry." />
          </Box>
        ) : incidents.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: '#06b6d4', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              No Incidents Found
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, mx: 'auto', mt: 0.5 }}>
              {searchQuery ? 'No tickets matched your search query on the server.' : 'You have no reported incidents in this status view.'}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto', width: '100%' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: '#0e121d', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <Box component="th" sx={{ py: 1.4, px: 2.5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Incident Code
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 1.5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Priority
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Issue Summary
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 1.5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Service
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 1.5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    Status
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 1.5, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    SLA Clock &amp; Bar
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>
                    Action
                  </Box>
                </Box>
              </Box>

              <Box component="tbody">
                {incidents.map((inc) => (
                  <Box
                    key={inc.id}
                    component="tr"
                    onClick={() => navigate(`/employee/incidents/${inc.id}`)}
                    sx={{
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'background 0.2s',
                      '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' },
                    }}
                  >
                    <Box component="td" sx={{ py: 1.8, px: 2.5, fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, fontWeight: 800, color: '#4cd7f6' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        {inc.code}
                        {inc.major && (
                          <Chip
                            label="MAJOR"
                            size="small"
                            sx={{
                              bgcolor: 'rgba(244, 63, 94, 0.2)',
                              color: '#f43f5e',
                              border: '1px solid rgba(244, 63, 94, 0.4)',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 9.5,
                              fontWeight: 800,
                              height: 18,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 1.5 }}>
                      <PriorityBadge priority={inc.priority} />
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 2 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                        {inc.title}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace', mt: 0.2 }}>
                        Reported {new Date(inc.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 1.5 }}>
                      <Chip
                        label={inc.service?.name || 'General'}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          color: '#dfe2ef',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          fontSize: 11,
                        }}
                      />
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 1.5 }}>
                      <StatusChip status={inc.status} />
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 1.5, minWidth: 160 }}>
                      {inc.status === 'RESOLVED' || inc.status === 'VERIFIED' || inc.status === 'CLOSED' ? (
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#10b981', fontWeight: 700 }}>
                          Remediated
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
                    </Box>
                    {/* Guide Rule: List rows show Details link and perform actions on the detail screen */}
                    <Box component="td" sx={{ py: 1.8, px: 2, textAlign: 'right' }}>
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/employee/incidents/${inc.id}`);
                        }}
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          color: '#4cd7f6',
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: 'none',
                          '&:hover': { bgcolor: 'rgba(76, 215, 246, 0.08)' },
                        }}
                      >
                        Details
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Server Pagination Controls */}
        {totalPages > 1 && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: 12, color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                Showing page {page + 1} of {totalPages} ({totalItems} total)
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
                    fontSize: 11,
                    color: '#dfe2ef',
                    bgcolor: 'rgba(18, 22, 34, 0.7)',
                    '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
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
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#dfe2ef',
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
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#dfe2ef',
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

      {/* MODAL 1: RESPOND / PROVIDE CLARIFICATION WITH TECHNICIAN QUESTION */}
      <Dialog
        open={Boolean(replyIncident)}
        onClose={() => setReplyIncident(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 24px rgba(99, 102, 241, 0.2)',
          },
        }}
      >
        {replyIncident && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
              <Box>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: '#4cd7f6' }}>
                  RESPOND TO TECHNICIAN // {replyIncident.code}
                </Typography>
                <Typography variant="h6" sx={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, color: '#ffffff', fontSize: 16 }}>
                  {replyIncident.title}
                </Typography>
              </Box>
              <IconButton onClick={() => setReplyIncident(null)} size="small" sx={{ color: '#94a3b8' }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ py: 2, borderColor: 'rgba(255, 255, 255, 0.08)' }}>
              {/* Technician's Question Callout */}
              <Paper sx={{ p: 1.8, bgcolor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', mb: 2 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#c0c1ff', mb: 0.5 }}>
                  Technician Query:
                </Typography>
                {loadingReplyComments ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <CircularProgress size={14} sx={{ color: '#c0c1ff' }} />
                    <Typography sx={{ fontSize: 12, color: '#94a3b8' }}>Loading question from technician...</Typography>
                  </Box>
                ) : technicianQuestion ? (
                  <Box>
                    <Typography sx={{ fontSize: 13, color: '#ffffff', fontFamily: 'Geist, sans-serif', fontWeight: 500 }}>
                      "{technicianQuestion.body}"
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94a3b8', mt: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                      Asked by {technicianQuestion.author?.name || 'Assigned Technician'} • {new Date(technicianQuestion.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 13, color: '#dfe2ef', fontStyle: 'italic' }}>
                    Technician requested additional clarification regarding this issue.
                  </Typography>
                )}
              </Paper>

              <Typography sx={{ fontSize: 12, color: '#94a3b8', mb: 1 }}>
                Providing response will submit your clarification to the technician and resume the SLA clock if user input was the pause condition.
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={4}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your clarification, additional logs, or reproduction steps..."
                sx={{
                  bgcolor: 'rgba(18, 22, 34, 0.7)',
                  borderRadius: '10px',
                }}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setReplyIncident(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  if (replyIncident && replyMessage.trim()) {
                    replyMutation.mutate({ id: replyIncident.id, message: replyMessage });
                  }
                }}
                disabled={!replyMessage.trim() || replyMutation.isPending}
                startIcon={replyMutation.isPending ? <CircularProgress size={16} /> : <ReplyIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                Send Clarification
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 2: RESOLUTION FEEDBACK RATING DIALOG */}
      <Dialog
        open={Boolean(ratingIncident)}
        onClose={() => setRatingIncident(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            bgcolor: '#121622',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', color: '#ffffff', pb: 1 }}>
          Rate Resolution Experience
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Typography sx={{ color: '#dfe2ef', fontSize: 13, mb: 2 }}>
            How satisfied are you with the resolution of{' '}
            <strong style={{ color: '#4cd7f6' }}>{ratingIncident?.code}</strong>?
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <Rating
              value={ratingValue}
              onChange={(_, val) => setRatingValue(val || 1)}
              icon={<StarIcon sx={{ fontSize: 32, color: '#f59e0b' }} />}
              emptyIcon={<StarIcon sx={{ fontSize: 32, color: 'rgba(255, 255, 255, 0.15)' }} />}
            />
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            value={ratingComment}
            onChange={(e) => setRatingComment(e.target.value)}
            placeholder="Optional comments on technician support or resolution quality..."
            sx={{
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              borderRadius: '10px',
              mt: 1,
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setRatingIncident(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Skip Rating
          </Button>
          <Button
            variant="contained"
            disabled={feedbackMutation.isPending}
            onClick={() => {
              if (ratingIncident) {
                feedbackMutation.mutate({
                  id: ratingIncident.id,
                  rating: ratingValue,
                  comment: ratingComment.trim() || undefined,
                });
              }
            }}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
            }}
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
