import IncidentBoard from '../../components/IncidentBoard';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Stack,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Today as TodayIcon,
  History as HistoryIcon,
  ListAlt as ListAltIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AssignmentInd as AssignmentIndIcon,
  CrisisAlert as CrisisAlertIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  FilterAltOff as FilterAltOffIcon,
} from '@mui/icons-material';
import { listIncidents, createIncident, CreateIncidentPayload, reassignMockIncident } from '../../api/incidents';
import { getServices } from '../../api/services';
import { getAdminUsers } from '../../api/admin';
import { api } from '../../api/client';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import { useToast } from '../../components/Toast';

function TicketLedger() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 0 = Today's Tickets, 1 = Previous Days' Tickets, 2 = All Tickets
  const initialTabParam = searchParams.get('tab');
  const getTabFromParam = (param: string | null): number => {
    if (param === 'today') return 0;
    if (param === 'previous') return 1;
    if (param === 'all') return 2;
    return 0; // Default to Today's Tickets
  };

  const [activeTab, setActiveTab] = useState<number>(getTabFromParam(initialTabParam));

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(getTabFromParam(tabParam));
    }
  }, [searchParams]);

  // Filters State
  const [q, setQ] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get('status') === 'ACTIVE' ? 'ACTIVE' : searchParams.get('status') || 'ALL'
  );
  const [levelFilter, setLevelFilter] = useState<string>('ALL');

  // Dialog states
  const [declareOpen, setDeclareOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [targetIncident, setTargetIncident] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number>(0);
  const [reassignReason, setReassignReason] = useState('');

  // Declare Incident Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newServiceId, setNewServiceId] = useState<number>(1);
  const [newImpact, setNewImpact] = useState<number>(3);
  const [newUrgency, setNewUrgency] = useState<number>(3);
  const [newAssigneeId, setNewAssigneeId] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: services = [] } = useQuery({
    queryKey: ['admin-services-catalog'],
    queryFn: getServices,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAdminUsers,
  });

  const technicians = useMemo(
    () => users.filter((u) => u.roles.includes('TECHNICIAN') || u.roles.includes('ADMINISTRATOR')),
    [users]
  );

  const {
    data: incidentPage,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['admin-incidents-list', q, priorityFilter, statusFilter, levelFilter],
    queryFn: () =>
      listIncidents({
        q: q.trim() || undefined,
        priority: priorityFilter !== 'ALL' ? [priorityFilter] : undefined,
        status: statusFilter === 'ACTIVE' ? undefined : statusFilter !== 'ALL' ? [statusFilter] : undefined,
        escalationLevel: levelFilter !== 'ALL' ? Number(levelFilter) : undefined,
        page: 0,
        size: 100,
        sort: 'createdAt,desc',
      }),
    refetchInterval: 15000,
  });

  const allIncidents: any[] = (incidentPage as any)?.items || (incidentPage as any)?.content || [];

  // Helper to check if a date belongs to today (local calendar date)
  const isCreatedToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    const today = new Date();
    return (
      itemDate.getDate() === today.getDate() &&
      itemDate.getMonth() === today.getMonth() &&
      itemDate.getFullYear() === today.getFullYear()
    );
  };

  // Group into Today's vs Previous Days'
  const todayTickets = useMemo(() => allIncidents.filter((i) => isCreatedToday(i.createdAt)), [allIncidents]);
  const previousTickets = useMemo(() => allIncidents.filter((i) => !isCreatedToday(i.createdAt)), [allIncidents]);

  // Current list based on active tab & active open filter
  const displayedIncidents = useMemo(() => {
    let baseList = activeTab === 0 ? todayTickets : activeTab === 1 ? previousTickets : allIncidents;

    if (statusFilter === 'ACTIVE') {
      baseList = baseList.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
    }

    return baseList;
  }, [activeTab, todayTickets, previousTickets, allIncidents, statusFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const todayCount = todayTickets.length;
    const prevCount = previousTickets.length;
    const unassignedCount = allIncidents.filter((i) => !i.assignee).length;
    const activeCount = allIncidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length;
    const p1Count = allIncidents.filter(
      (i) => i.priority === 'P1' && i.status !== 'RESOLVED' && i.status !== 'CLOSED'
    ).length;
    return { todayCount, prevCount, unassignedCount, activeCount, p1Count };
  }, [todayTickets, previousTickets, allIncidents]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const paramVal = newValue === 0 ? 'today' : newValue === 1 ? 'previous' : 'all';
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', paramVal);
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setQ('');
    setPriorityFilter('ALL');
    setStatusFilter('ALL');
    setLevelFilter('ALL');
    const newParams = new URLSearchParams();
    newParams.set('tab', activeTab === 0 ? 'today' : activeTab === 1 ? 'previous' : 'all');
    setSearchParams(newParams);
  };

  // Handle Quick Reassign
  const handleOpenAssign = (inc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setTargetIncident(inc);
    setSelectedTechId(inc.assignee?.id || 0);
    setReassignReason('');
    setReassignOpen(true);
  };

  const handleSaveReassign = async () => {
    if (!selectedTechId || !targetIncident) {
      toast('Please choose a technician', 'warning');
      return;
    }
    const tech = technicians.find((t) => t.id === selectedTechId);
    setIsSubmitting(true);
    try {
      await api.post(`/incidents/${targetIncident.id}/reassign`, {
        technicianId: selectedTechId,
        reason: reassignReason || 'Reassigned from Tickets Hub',
      });
      toast(`Ticket ${targetIncident.code} assigned to ${tech?.name || 'technician'}`, 'success');
      reassignMockIncident(targetIncident.id, selectedTechId, tech?.name || 'Technician');
      setReassignOpen(false);
      refetch();
    } catch {
      // Offline fallback
      reassignMockIncident(targetIncident.id, selectedTechId, tech?.name || 'Technician');
      toast(`Ticket ${targetIncident.code} assigned to ${tech?.name || 'technician'} (Offline mode)`, 'info');
      setReassignOpen(false);
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create Incident / Declare Ticket
  const handleCreate = async () => {
    const trimmedTitle = newTitle.trim();
    const trimmedDesc = newDesc.trim();
    if (trimmedTitle.length < 5) {
      toast('Ticket summary/title must be at least 5 characters.', 'warning');
      return;
    }
    if (trimmedDesc.length < 20) {
      toast('Ticket description must be at least 20 characters for diagnostic context.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateIncidentPayload = {
        title: trimmedTitle,
        description: trimmedDesc,
        serviceId: newServiceId,
        impact: newImpact,
        urgency: newUrgency,
        affectedUsers: 1,
      };
      const created = await createIncident(payload);

      // If an assignee was chosen during declaration, assign it in backend & optimistic state
      if (newAssigneeId) {
        const tech = technicians.find((t) => t.id === Number(newAssigneeId));
        try {
          await api.post(`/incidents/${created.id}/assign`, { technicianId: Number(newAssigneeId) });
        } catch {
          await api.post(`/incidents/${created.id}/reassign`, {
            technicianId: Number(newAssigneeId),
            reason: 'Directly assigned during ticket declaration',
          }).catch(() => {});
        }
        if (tech) {
          reassignMockIncident(created.id, tech.id, tech.name);
          created.assignee = { id: tech.id, name: tech.name };
        }
      }

      toast(
        `Ticket ${created.code} successfully created${
          newAssigneeId ? ` and assigned to ${technicians.find((t) => t.id === Number(newAssigneeId))?.name || 'technician'}` : ' and queued'
        }`,
        'success'
      );
      setDeclareOpen(false);
      setNewTitle('');
      setNewDesc('');
      setNewAssigneeId('');
      refetch();
      // Ensure we switch to today's tab to view the created ticket
      setActiveTab(0);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('tab', 'today');
      setSearchParams(newParams);
    } catch (e: any) {
      toast(e.message || 'Failed to create ticket', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to format date cleanly
  const formatTicketDate = (dateStr?: string, isTodayTicket: boolean = false) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isTodayTicket) {
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
      const relStr = diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
      return `Today, ${timeStr} (${relStr})`;
    }
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render Escalation Level Badge
  const renderEscalationBadge = (level?: number) => {
    switch (level) {
      case 1:
        return (
          <Chip
            size="small"
            label="L1 • Lead Escalation"
            sx={{
              bgcolor: '#fef3c7',
              color: '#b45309',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid #fde68a',
            }}
          />
        );
      case 2:
        return (
          <Chip
            size="small"
            label="L2 • SRE / Admin"
            sx={{
              bgcolor: '#fee2e2',
              color: '#b91c1c',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid #fecaca',
            }}
          />
        );
      case 3:
        return (
          <Chip
            size="small"
            label="L3 • War Room"
            sx={{
              bgcolor: '#7f1d1d',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.72rem',
            }}
          />
        );
      case 0:
      default:
        return (
          <Chip
            size="small"
            label="L0 • Frontline Tech"
            sx={{
              bgcolor: '#e0f2fe',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid #bae6fd',
            }}
          />
        );
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1440, mx: 'auto' }}>
      {/* 1. Header Banner */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3}
        spacing={2}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ConfirmationNumberIcon sx={{ fontSize: 32, color: '#1653c7' }} />
            <Typography variant="h4" fontWeight="800" sx={{ color: '#172b4d', letterSpacing: '-0.02em' }}>
              Ticket management
            </Typography>
            <Chip
              label="Incident management"
              size="small"
              sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 700, height: 22 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Master operational repository of today&apos;s tickets, historical tickets, assigned handlers, and escalation levels
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={isFetching ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={() => {
              refetch();
              toast('Refreshed tickets from backend', 'info');
            }}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDeclareOpen(true)}
            sx={{
              borderRadius: 2,
              bgcolor: '#2457b7',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(186, 26, 26, 0.25)',
              '&:hover': { bgcolor: '#1d4694' },
            }}
          >
            Create incident
          </Button>
        </Stack>
      </Stack>

      {/* 2. Top Metric Cards Strip */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => handleTabChange({} as any, 0)}
            sx={{
              borderRadius: 2.5,
              border: activeTab === 0 ? '2px solid #1653c7' : '1px solid #e2e8f0',
              bgcolor: activeTab === 0 ? '#f0f5ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(43,91,181,0.1)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                  Today&apos;s Tickets
                </Typography>
                <TodayIcon sx={{ fontSize: 18, color: '#1653c7' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#172b4d', mt: 1 }}>
                {metrics.todayCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Reported since midnight
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => handleTabChange({} as any, 1)}
            sx={{
              borderRadius: 2.5,
              border: activeTab === 1 ? '2px solid #1653c7' : '1px solid #e2e8f0',
              bgcolor: activeTab === 1 ? '#f0f5ff' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,77,153,0.1)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                  Previous Days
                </Typography>
                <HistoryIcon sx={{ fontSize: 18, color: '#6a685f' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#172b4d', mt: 1 }}>
                {metrics.prevCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Historical records
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => {
              setStatusFilter('ACTIVE');
              setActiveTab(2);
            }}
            sx={{
              borderRadius: 2.5,
              border: statusFilter === 'ACTIVE' ? '2px solid #1653c7' : '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                  Active Workload
                </Typography>
                <AssignmentIndIcon sx={{ fontSize: 18, color: '#1653c7' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1653c7', mt: 1 }}>
                {metrics.activeCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In Progress &amp; Assigned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            onClick={() => {
              setPriorityFilter('P1');
              setActiveTab(2);
            }}
            sx={{
              borderRadius: 2.5,
              border: priorityFilter === 'P1' ? '2px solid #ba1a1a' : '1px solid #ffdad6',
              bgcolor: 'rgba(255, 218, 214, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(186,26,26,0.12)' },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#ba1a1a', textTransform: 'uppercase' }}>
                  Critical P1 Outages
                </Typography>
                <CrisisAlertIcon sx={{ fontSize: 18, color: '#ba1a1a' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#ba1a1a', mt: 1 }}>
                {metrics.p1Count < 10 ? `0${metrics.p1Count}` : metrics.p1Count}
              </Typography>
              <Typography variant="caption" sx={{ color: '#93000a', fontWeight: 600 }}>
                High SLA Attention
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 2.5,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#5c5a52', textTransform: 'uppercase' }}>
                  Unassigned Triage
                </Typography>
                <WarningIcon sx={{ fontSize: 18, color: '#d97706' }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: metrics.unassignedCount > 0 ? '#d97706' : '#172b4d', mt: 1 }}>
                {metrics.unassignedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting Handler Assignment
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Tab Switcher: Today's vs Previous Days' vs All */}
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f7fa', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14,
                py: 2,
                minHeight: 54,
              },
            }}
          >
            <Tab
              icon={<TodayIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Today&apos;s Tickets</span>
                  <Chip
                    label={metrics.todayCount}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      bgcolor: activeTab === 0 ? '#1653c7' : '#e2e8f0',
                      color: activeTab === 0 ? '#ffffff' : '#475569',
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<HistoryIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Previous Days&apos; Tickets</span>
                  <Chip
                    label={metrics.prevCount}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      bgcolor: activeTab === 1 ? '#1653c7' : '#e2e8f0',
                      color: activeTab === 1 ? '#ffffff' : '#475569',
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<ListAltIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>All Tickets</span>
                  <Chip
                    label={allIncidents.length}
                    size="small"
                    sx={{
                      height: 20,
                      fontWeight: 700,
                      bgcolor: activeTab === 2 ? '#1653c7' : '#e2e8f0',
                      color: activeTab === 2 ? '#ffffff' : '#475569',
                    }}
                  />
                </Box>
              }
            />
          </Tabs>
        </Box>

        {/* 4. Toolbar / Filter Controls */}
        <Box sx={{ p: 2, bgcolor: '#ffffff' }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center">
            <TextField
              placeholder="Search code, title, handler name, reporter, or service..."
              size="small"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              sx={{ flex: 1, width: '100%' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: '#6a685f' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              select
              size="small"
              label="Priority Level"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="ALL">All Priorities</MenuItem>
              <MenuItem value="P1">P1 - Critical</MenuItem>
              <MenuItem value="P2">P2 - High</MenuItem>
              <MenuItem value="P3">P3 - Medium</MenuItem>
              <MenuItem value="P4">P4 - Low</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Ticket Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="ACTIVE">Active (Unresolved)</MenuItem>
              <MenuItem value="NEW">New</MenuItem>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
              <MenuItem value="ACKNOWLEDGED">Acknowledged</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="RESOLVED">Resolved</MenuItem>
              <MenuItem value="CLOSED">Closed</MenuItem>
            </TextField>

            <TextField
              select
              size="small"
              label="Escalation Level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="ALL">All Escalation Levels</MenuItem>
              <MenuItem value="0">Level 0 - Frontline Tech</MenuItem>
              <MenuItem value="1">Level 1 - Lead Escalated</MenuItem>
              <MenuItem value="2">Level 2 - SRE / Admin</MenuItem>
              <MenuItem value="3">Level 3 - War Room</MenuItem>
            </TextField>

            {(q || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || levelFilter !== 'ALL') && (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={handleResetFilters}
                startIcon={<FilterAltOffIcon />}
                sx={{ textTransform: 'none', minWidth: 130 }}
              >
                Reset
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* 5. Main Tickets Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          overflowX: 'auto',
        }}
      >
        {isLoading ? (
          <Box p={8} display="flex" flexDirection="column" alignItems="center" gap={2}>
            <CircularProgress size={36} />
            <Typography variant="body2" color="text.secondary">
              Loading tickets from backend...
            </Typography>
          </Box>
        ) : displayedIncidents.length === 0 ? (
          <Box p={8} textAlign="center">
            <Typography variant="h6" fontWeight="700" color="#172b4d" gutterBottom>
              {activeTab === 0
                ? "No tickets reported today matching your filters"
                : activeTab === 1
                ? "No previous days' tickets matching your filters"
                : "No tickets found"}
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {q || priorityFilter !== 'ALL' || statusFilter !== 'ALL' || levelFilter !== 'ALL'
                ? 'Try broadening your search query or reset the filters.'
                : 'Declare a new ticket or check another tab.'}
            </Typography>
            <Button variant="outlined" size="small" onClick={handleResetFilters}>
              Clear All Filters
            </Button>
          </Box>
        ) : (
          <Table sx={{ minWidth: 1320 }}>
            <TableHead sx={{ bgcolor: '#f5f7fa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>TICKET CODE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>TITLE &amp; SERVICE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>TICKET LEVEL</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>HANDLING ASSIGNEE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>SLA TARGET</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>REPORTED AT</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12, textAlign: 'right' }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedIncidents.map((inc) => {
                const isToday = isCreatedToday(inc.createdAt);
                return (
                  <TableRow
                    key={inc.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      '&:hover': { bgcolor: '#f5f7fa' },
                    }}
                    onClick={() => navigate(`/admin/tickets/${inc.id}`)}
                  >
                    {/* 1. Ticket Code */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                            fontWeight: 600,
                            color: '#1653c7',
                            fontSize: '0.85rem',
                          }}
                        >
                          {inc.code}
                        </Typography>
                        {inc.major && (
                          <Chip
                            label="MAJOR"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              fontWeight: 800,
                              bgcolor: '#2457b7',
                              color: '#ffffff',
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    {/* 2. Title & Service */}
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" fontWeight="700" color="#172b4d" noWrap>
                        {inc.title}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" mt={0.4}>
                        <Chip
                          label={inc.service?.name || 'General Service'}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                          }}
                        />
                        {inc.category?.name && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            • {inc.category.name}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>

                    {/* 3. Ticket Level (Priority & Escalation Level) */}
                    <TableCell>
                      <Stack spacing={0.6} alignItems="flex-start">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PriorityBadge priority={inc.priority} />
                        </Box>
                        {renderEscalationBadge(inc.escalationLevel)}
                      </Stack>
                    </TableCell>

                    {/* 4. Handling Assignee & Reporter ("Who is handling what") */}
                    <TableCell sx={{ minWidth: 190 }}>
                      {inc.assignee?.name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              fontSize: 12,
                              fontWeight: 700,
                              bgcolor: '#1653c7',
                              color: '#ffffff',
                            }}
                          >
                            {inc.assignee.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="700" color="#172b4d">
                              {inc.assignee.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Reported by {inc.reporter?.name || 'Staff'}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Box>
                          <Chip
                            icon={<WarningIcon sx={{ fontSize: 14, color: '#b45309 !important' }} />}
                            label="Unassigned"
                            size="small"
                            sx={{
                              height: 22,
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              bgcolor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.3}>
                            Reported by {inc.reporter?.name || 'Staff'}
                          </Typography>
                        </Box>
                      )}
                    </TableCell>

                    {/* 5. Status */}
                    <TableCell>
                      <StatusChip status={inc.status} />
                    </TableCell>

                    {/* 6. SLA Countdown */}
                    <TableCell>
                      <SlaCountdown
                        due={inc.resolutionDue || inc.responseDue}
                        createdAt={inc.createdAt}
                        slaState={inc.slaState}
                      />
                    </TableCell>

                    {/* 7. Reported Date */}
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Typography variant="body2" fontSize="0.82rem" color="#172b4d" fontWeight={isToday ? 700 : 500}>
                        {formatTicketDate(inc.createdAt, isToday)}
                      </Typography>
                      {isToday && (
                        <Chip
                          label="TODAY"
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 9,
                            fontWeight: 800,
                            bgcolor: '#dbeafe',
                            color: '#1d4ed8',
                            mt: 0.3,
                          }}
                        />
                      )}
                    </TableCell>

                    {/* 8. Actions */}
                    <TableCell sx={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Assign / Reassign Technician">
                        <IconButton
                          size="small"
                          onClick={(e) => handleOpenAssign(inc, e)}
                          sx={{ color: '#1653c7', mr: 0.5 }}
                        >
                          <AssignmentIndIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Ticket Details">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/tickets/${inc.id}`);
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* 6. Quick Assign / Reassign Dialog */}
      <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Assign Handler: {targetIncident?.code}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Box sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight="700" color="#172b4d">
                {targetIncident?.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Service: {targetIncident?.service?.name} | Priority: {targetIncident?.priority}
              </Typography>
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Select Technician / Handler</InputLabel>
              <Select
                value={selectedTechId}
                label="Select Technician / Handler"
                onChange={(e) => setSelectedTechId(Number(e.target.value))}
              >
                {technicians.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon sx={{ fontSize: 18, color: '#5c5a52' }} />
                      <Box>
                        <Typography variant="body2" fontWeight="600">
                          {t.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.roles.includes('ADMINISTRATOR') ? 'System Admin' : 'Technician'} • {t.department || 'IT Operations'}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Assignment Notes / Justification"
              size="small"
              fullWidth
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g. Assigned to specialist for immediate triage"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReassignOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveReassign} disabled={isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Save Assignment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. Declare Ticket / Incident Dialog */}
      <Dialog open={declareOpen} onClose={() => setDeclareOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Declare New Ticket / Incident</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Ticket Summary / Title"
              fullWidth
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Core Database Aurora Replica Lag Spikes"
              required
            />
            <TextField
              label="Detailed Technical Description"
              fullWidth
              multiline
              rows={3}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe symptoms, edge clusters affected, and impact..."
              required
            />
            <FormControl fullWidth>
              <InputLabel>Impacted Service</InputLabel>
              <Select
                value={newServiceId}
                label="Impacted Service"
                onChange={(e) => setNewServiceId(Number(e.target.value))}
              >
                {services.map((svc) => (
                  <MenuItem key={svc.id} value={svc.id}>
                    {svc.name} (Criticality: {svc.criticality}/5)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Impact (1-5)</InputLabel>
                <Select
                  value={newImpact}
                  label="Impact (1-5)"
                  onChange={(e) => setNewImpact(Number(e.target.value))}
                >
                  <MenuItem value={1}>1 - Minor / Single User</MenuItem>
                  <MenuItem value={2}>2 - Moderate / Department</MenuItem>
                  <MenuItem value={3}>3 - Significant / Site</MenuItem>
                  <MenuItem value={4}>4 - Severe / Multiple Sites</MenuItem>
                  <MenuItem value={5}>5 - Catastrophic / Enterprise</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Urgency (1-5)</InputLabel>
                <Select
                  value={newUrgency}
                  label="Urgency (1-5)"
                  onChange={(e) => setNewUrgency(Number(e.target.value))}
                >
                  <MenuItem value={1}>1 - Low Workaround</MenuItem>
                  <MenuItem value={2}>2 - Standard Urgency</MenuItem>
                  <MenuItem value={3}>3 - Elevated</MenuItem>
                  <MenuItem value={4}>4 - High Urgency</MenuItem>
                  <MenuItem value={5}>5 - Immediate Action Required</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {/* Assignee / Handler Selection */}
            <FormControl fullWidth>
              <InputLabel>Assign Handler / Technician (Optional)</InputLabel>
              <Select
                value={newAssigneeId}
                label="Assign Handler / Technician (Optional)"
                onChange={(e) => setNewAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <MenuItem value="">
                  <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#64748b' }}>
                    ⚡ Auto-Assign via Workload Algorithm
                  </Typography>
                </MenuItem>
                {technicians.map((tech) => (
                  <MenuItem key={tech.id} value={tech.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#1653c7', color: '#fff' }}>
                          {tech.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {tech.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          ({tech.department || (tech.roles.includes('ADMINISTRATOR') ? 'Admin' : 'Technician')})
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={tech.roles.includes('ADMINISTRATOR') ? 'Admin' : 'Technician'}
                        sx={{ height: 18, fontSize: 10, bgcolor: '#e2e8f0', fontWeight: 600 }}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeclareOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



export default function Tickets() {
  const [view, setView] = useState('ledger');
  return <section><div className="workspace-view-switch" role="group" aria-label="Ticket view"><span>YOUR VIEW</span><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Browse incidents</button><button aria-pressed={view === 'ledger'} onClick={() => setView('ledger')}>Manage tickets</button></div>{view === 'cards' ? <IncidentBoard admin /> : <TicketLedger />}</section>;
}
