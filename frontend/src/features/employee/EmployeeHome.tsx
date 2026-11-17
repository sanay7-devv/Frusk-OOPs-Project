import { useState } from 'react';
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
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/Toast';
import { listIncidents, provideInfo, verifyIncident } from '../../api/incidents';
import type { IncidentSummary, Page } from '../../api/types';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import { ErrorState } from '../../components/StateViews';

export default function EmployeeHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  // Modals
  const [replyIncident, setReplyIncident] = useState<IncidentSummary | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [verifyConfirmIncident, setVerifyConfirmIncident] = useState<IncidentSummary | null>(null);

  // Real backend query for employee incidents
  const { data: pageData, isLoading, isError, refetch, isFetching } = useQuery<Page<IncidentSummary>>({
    queryKey: ['employee-incidents-home'],
    queryFn: () => listIncidents({ mine: true, size: 50 }),
  });

  const incidents: IncidentSummary[] = pageData?.items || [];

  // Mutations
  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) => provideInfo(id, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incidents-home'] });
      toast('Clarification delivered to assigned technician. The SLA clock has resumed.', 'success');
      setReplyIncident(null);
      setReplyMessage('');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to submit response.', 'error');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) => verifyIncident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-incidents-home'] });
      toast('Incident fix verified.', 'success');
    },
    onError: (err: any) => {
      toast(err?.response?.data?.message || 'Failed to verify incident.', 'error');
    },
  });

  // Dynamic status counts
  const activeCount = incidents.filter(
    (i) => i.status !== 'RESOLVED' && i.status !== 'VERIFIED' && i.status !== 'CLOSED'
  ).length;
  const pendingCount = incidents.filter((i) => i.status === 'PENDING_USER_INFO').length;
  const resolvedCount = incidents.filter(
    (i) => i.status === 'RESOLVED' || i.status === 'VERIFIED' || i.status === 'CLOSED'
  ).length;

  const pendingIncident = incidents.find((i) => i.status === 'PENDING_USER_INFO');

  // Filtered list
  const filteredIncidents = incidents.filter((inc) => {
    if (filterTab === 'ACTIVE' && (inc.status === 'RESOLVED' || inc.status === 'VERIFIED' || inc.status === 'CLOSED')) {
      return false;
    }
    if (filterTab === 'PENDING' && inc.status !== 'PENDING_USER_INFO') {
      return false;
    }
    if (filterTab === 'RESOLVED' && inc.status !== 'RESOLVED' && inc.status !== 'VERIFIED' && inc.status !== 'CLOSED') {
      return false;
    }
    if (priorityFilter !== 'ALL' && inc.priority !== priorityFilter) {
      return false;
    }
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
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* 1. TOP OPERATIONAL HEADER & REALTIME STATUS */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3.5,
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

        {/* Live Status Pill */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1,
            borderRadius: '12px',
            bgcolor: 'rgba(18, 22, 34, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#06b6d4', boxShadow: '0 0 8px #06b6d4' }} />
          <Box>
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: '#dfe2ef', textTransform: 'uppercase' }}>
              Incidents Summary
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

      {/* 2. DYNAMIC OPERATIONAL ALERT BANNER (Shown when information is requested) */}
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
            mb: 3.5,
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

      {/* 3. COMMAND BENTO GRID: Action Launchpad & Search */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Quick Search & KB Triage (8 cols) */}
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Incident Desk CTA Card (4 cols) */}
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

      {/* 4. KPI STREAM */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
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
                Open &amp; in progress
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
                Resolved &amp; closed
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 5. PRIMARY WORKING AREA: INCIDENTS GRID */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          bgcolor: '#141824',
          overflow: 'hidden',
          mb: 3.5,
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
                Overview of your open and resolved requests
              </Typography>
            </Box>
            <Chip
              label={`${filteredIncidents.length} Tickets`}
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
                    ? incidents.length
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
                    onClick={() => setFilterTab(tab)}
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
              {priorityFilter === 'ALL' ? 'Filter' : `Priority: ${priorityFilter}`}
            </Button>
            <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
              <MenuItem onClick={() => { setPriorityFilter('ALL'); setFilterAnchor(null); }}>All Priorities</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P1'); setFilterAnchor(null); }}>P1 Critical</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P2'); setFilterAnchor(null); }}>P2 High</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P3'); setFilterAnchor(null); }}>P3 Medium</MenuItem>
              <MenuItem onClick={() => { setPriorityFilter('P4'); setFilterAnchor(null); }}>P4 Low</MenuItem>
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
              Loading incidents...
            </Typography>
          </Box>
        ) : isError ? (
          <Box sx={{ p: 3 }}>
            <ErrorState onRetry={() => refetch()} message="Failed to load your incidents. Please check your network connection and retry." />
          </Box>
        ) : filteredIncidents.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 44, color: '#06b6d4', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff', fontFamily: 'Sora, sans-serif' }}>
              No Incidents Found
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#94a3b8', maxWidth: 440, mx: 'auto', mt: 0.5 }}>
              {searchQuery ? 'No tickets matched your search query.' : 'You have no reported incidents in this status view.'}
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
                    SLA Clock
                  </Box>
                  <Box component="th" sx={{ py: 1.4, px: 2, fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>
                    Action
                  </Box>
                </Box>
              </Box>

              <Box component="tbody">
                {filteredIncidents.map((inc) => (
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
                      {inc.code}
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
                    <Box component="td" sx={{ py: 1.8, px: 1.5 }}>
                      {inc.status === 'RESOLVED' || inc.status === 'VERIFIED' || inc.status === 'CLOSED' ? (
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: '#10b981', fontWeight: 700 }}>
                          Remediated
                        </Typography>
                      ) : (
                        <SlaCountdown
                          due={inc.resolutionDue}
                          createdAt={inc.createdAt}
                          slaState={inc.slaState}
                        />
                      )}
                    </Box>
                    <Box component="td" sx={{ py: 1.8, px: 2, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      {inc.status === 'PENDING_USER_INFO' ? (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setReplyIncident(inc)}
                          startIcon={<ReplyIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            background: 'linear-gradient(135deg, #f751a1 0%, #6366f1 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 11.5,
                            textTransform: 'none',
                            borderRadius: '6px',
                            px: 1.5,
                          }}
                        >
                          Respond
                        </Button>
                      ) : inc.status === 'RESOLVED' ? (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => setVerifyConfirmIncident(inc)}
                          disabled={verifyMutation.isPending}
                          startIcon={<VerifiedIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            bgcolor: '#10b981',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 11.5,
                            textTransform: 'none',
                            borderRadius: '6px',
                            px: 1.5,
                            '&:hover': { bgcolor: '#059669' },
                          }}
                        >
                          Verify Fix
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          onClick={() => navigate(`/employee/incidents/${inc.id}`)}
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            color: '#4cd7f6',
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: 'none',
                          }}
                        >
                          Details
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Paper>

      {/* MODAL 1: RESPOND / PROVIDE CLARIFICATION */}
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
              <Paper sx={{ p: 1.8, bgcolor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', mb: 2 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, fontWeight: 700, color: '#c0c1ff' }}>
                  SLA Pause Status:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#dfe2ef', mt: 0.3, fontFamily: 'Geist, sans-serif' }}>
                  The SLA clock is currently paused awaiting user feedback. Submitting your response will automatically resume the SLA clock and return the ticket to active triage.
                </Typography>
              </Paper>

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
                Send &amp; Resume SLA
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* MODAL 2: VERIFY RESOLUTION CONFIRMATION */}
      <Dialog
        open={Boolean(verifyConfirmIncident)}
        onClose={() => setVerifyConfirmIncident(null)}
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
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', color: '#ffffff' }}>
          Confirm Incident Resolution
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
          <Typography sx={{ color: '#dfe2ef', fontSize: 13.5, lineHeight: 1.6 }}>
            Are you sure the reported issue for{' '}
            <strong style={{ color: '#4cd7f6' }}>{verifyConfirmIncident?.code}</strong> is completely resolved?
            Once verified, the ticket will be marked as verified and completed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => setVerifyConfirmIncident(null)} sx={{ color: '#94a3b8', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={verifyMutation.isPending}
            onClick={() => {
              if (verifyConfirmIncident) {
                verifyMutation.mutate(verifyConfirmIncident.id);
                setVerifyConfirmIncident(null);
              }
            }}
            sx={{
              bgcolor: '#10b981',
              color: '#ffffff',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#059669' },
            }}
          >
            Confirm &amp; Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
