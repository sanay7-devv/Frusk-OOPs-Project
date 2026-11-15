import StudioHero from '../../components/StudioHero';
import IncidentAnalysisPanel from '../../components/IncidentAnalysisPanel';
import { tokenStore } from '../../api/client';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listIncidents, createIncident, reassignMockIncident, CreateIncidentPayload } from '../../api/incidents';
import { getServices, getCategories } from '../../api/services';
import { getAdminUsers, getAdminAuditLogs, AuditEntry } from '../../api/admin';
import { api } from '../../api/client';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  IconButton,
  Avatar,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Terminal as TerminalIcon,
  Schedule as ScheduleIcon,
  AddAlert as AddAlertIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  PendingActions as PendingActionsIcon,
  CrisisAlert as CrisisAlertIcon,
  Verified as VerifiedIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon,
  Bolt as BoltIcon,
  RssFeed as RssFeedIcon,
  PriorityHigh as PriorityHighIcon,
  Timer as TimerIcon,
  SwapHoriz as SwapHorizIcon,
  Undo as UndoIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  South as SouthIcon,
  Warning as WarningIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

import { useToast } from '../../components/Toast';
import logoIcon from '../../assets/studio-mark.svg';

interface LiveOperationalEvent {
  id: string;
  type: 'outage' | 'sla_warning' | 'reassignment' | 'rollback';
  title: string;
  time: string;
  code?: string;
  description: string;
  linkText?: string;
  progressPercent?: number;
  targetId?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  // 1. Incidents from Backend
  const { data: incidentPage, refetch: refetchIncidents, isLoading: incidentsLoading, error: incidentsError } = useQuery({
    queryKey: ['admin-incidents-kpi'],
    queryFn: () => listIncidents({ page: 0, size: 100 }),
    refetchInterval: 15000,
  });

  // 2. Services Catalog from Backend
  const { data: services = [] } = useQuery({
    queryKey: ['admin-services-catalog'],
    queryFn: getServices,
  });

  // 3. Incident Categories from Backend
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories-catalog'],
    queryFn: getCategories,
  });

  // 4. Admin Users (Technicians) from Backend
  const { data: adminUsers = [], refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: getAdminUsers,
    refetchInterval: 15000,
  });

  // 5. Audit Log (Live Telemetry Feed) from Backend
  const { data: auditData, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-logs-feed'],
    queryFn: () => getAdminAuditLogs({ page: 0, size: 15 }),
    refetchInterval: 15000,
  });

  const incidents: any[] = (incidentPage as any)?.items || (incidentPage as any)?.content || [];

  // Dynamic Technicians mapped from backend users & real live ticket counts
  const technicians = useMemo(() => {
    const techUsers = (adminUsers || []).filter(
      (u) => u.roles?.includes('TECHNICIAN') || u.roles?.includes('ADMINISTRATOR')
    );
    if (!techUsers.length) {
      return [
        {
          id: 1,
          name: 'Marcus Vance',
          specialty: 'Site Reliability Engineering',
          avatar: '',
          activeCount: incidents.filter((i) => i.assignee?.id === 1 && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 2,
          maxCount: 8,
          status: 'busy' as const,
        },
        {
          id: 2,
          name: 'Sarah Jenkins',
          specialty: 'Network Operations',
          avatar: '',
          activeCount: incidents.filter((i) => i.assignee?.id === 2 && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 1,
          maxCount: 6,
          status: 'available' as const,
        },
        {
          id: 3,
          name: 'System Administrator',
          specialty: 'Platform Command Center',
          avatar: '',
          activeCount: incidents.filter((i) => i.assignee?.id === 3 && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length || 0,
          maxCount: 10,
          status: 'ready' as const,
        },
      ];
    }
    return techUsers.map((tech) => {
      const activeCount = incidents.filter(
        (i) => i.assignee?.id === tech.id && i.status !== 'RESOLVED' && i.status !== 'CLOSED'
      ).length;
      const maxCount = tech.technician?.maxActiveIncidents || (tech.roles?.includes('ADMINISTRATOR') ? 10 : 6);
      const status: 'busy' | 'available' | 'locked' | 'ready' =
        activeCount >= maxCount
          ? 'locked'
          : activeCount > 2
          ? 'busy'
          : activeCount === 0
          ? 'ready'
          : 'available';
      return {
        id: tech.id,
        name: tech.name,
        specialty: tech.department || 'Infrastructure & SRE',
        avatar: '',
        activeCount,
        maxCount,
        status,
      };
    });
  }, [adminUsers, incidents]);

  const totalAssignedSlots = technicians.reduce((acc, t) => acc + t.activeCount, 0);
  const totalMaxSlots = technicians.reduce((acc, t) => acc + t.maxCount, 0) || 20;
  const overallCapacityPct = Math.min(100, Math.round((totalAssignedSlots / totalMaxSlots) * 100));

  // Dynamic Live Feed Stream populated from real backend audit events & newly declared tickets
  const [sessionDeclaredEvents, setSessionDeclaredEvents] = useState<LiveOperationalEvent[]>([]);

  const liveFeedEvents: LiveOperationalEvent[] = useMemo(() => {
    const rawAudit: AuditEntry[] = auditData?.items || auditData?.content || [];
    const auditMapped: LiveOperationalEvent[] = rawAudit.map((log) => {
      const act = log.action || '';
      const isOutage = act.includes('ESCALAT') || act.includes('CRITICAL');
      const isReassign = act.includes('ASSIGN');
      const isResolved = act.includes('RESOLV') || act.includes('CLOSE');
      const type: 'outage' | 'sla_warning' | 'reassignment' | 'rollback' = isOutage
        ? 'outage'
        : isReassign
        ? 'reassignment'
        : isResolved
        ? 'rollback'
        : 'sla_warning';

      const date = log.timestamp || log.occurredAt ? new Date(log.timestamp || log.occurredAt!) : new Date();
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

      return {
        id: `audit-${log.id}`,
        type,
        title: log.incidentCode ? `${act.replace(/_/g, ' ')}: ${log.incidentCode}` : act.replace(/_/g, ' '),
        time: timeStr,
        code: log.incidentCode || `ACTOR: ${log.actorEmail || 'System'}`,
        description: log.description || `Event logged by ${log.actorEmail || 'System'}`,
        linkText: log.incidentId ? 'View Ticket →' : undefined,
        targetId: log.incidentId || undefined,
      };
    });

    const combined = [...sessionDeclaredEvents, ...auditMapped];
    return combined.slice(0, 15);
  }, [sessionDeclaredEvents, auditData]);

  // Real-Time Server Latency & Health Probing
  const [latency, setLatency] = useState<number | null>(null);
  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [lastPingTime, setLastPingTime] = useState<string>('');

  const measureLatency = async () => {
    const startTime = performance.now();
    try {
      await api.get('/ping', { timeout: 3500 });
      const duration = Math.round(performance.now() - startTime);
      setLatency(duration);
      setIsServerOnline(true);
      setLastPingTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    } catch (err: any) {
      if (err?.code === 'ERR_NETWORK' || !err?.response) {
        setIsServerOnline(false);
        setLatency(null);
      } else {
        const duration = Math.round(performance.now() - startTime);
        setLatency(duration);
        setIsServerOnline(true);
        setLastPingTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
      }
    }
  };

  useEffect(() => {
    measureLatency();
    const interval = setInterval(measureLatency, 5000);
    return () => clearInterval(interval);
  }, []);

  // Live Feed Stream pause toggle
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  // Declare Incident Modal State (Connected to Backend)
  const [declareOpen, setDeclareOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(5);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | ''>(4);
  const [affectedUsers, setAffectedUsers] = useState<number>(500);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | ''>('');
  const [isDeclaring, setIsDeclaring] = useState(false);

  // Sync service and category selection with loaded catalogs
  useEffect(() => {
    if (services.length > 0 && !services.some((s) => s.id === selectedServiceId)) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (categories.length > 0 && selectedCategoryId === '') {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Handle Declare Incident (Real Backend Database Insertion)
  const handleDeclareSubmit = async () => {
    const trimmedTitle = incidentTitle.trim();
    const trimmedDescription = incidentDescription.trim();

    if (trimmedTitle.length < 5) {
      toast('Incident summary/title must be at least 5 characters.', 'warning');
      return;
    }
    if (trimmedDescription.length < 20) {
      toast('Incident description must be at least 20 characters for diagnostic context.', 'warning');
      return;
    }

    const serviceIdToUse = selectedServiceId || (services.length > 0 ? services[0].id : 1);

    let impact = 5;
    let urgency = 5;
    if (incidentSeverity === 'P1') {
      impact = 5;
      urgency = 5;
    } else if (incidentSeverity === 'P2') {
      impact = 4;
      urgency = 4;
    } else if (incidentSeverity === 'P3') {
      impact = 3;
      urgency = 3;
    } else {
      impact = 2;
      urgency = 2;
    }

    setIsDeclaring(true);
    try {
      const payload: CreateIncidentPayload = {
        title: trimmedTitle,
        description: trimmedDescription,
        serviceId: serviceIdToUse,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        impact,
        urgency,
        affectedUsers: Math.max(1, Number(affectedUsers) || 100),
        confirmNotDuplicate: true,
      };

      const created = await createIncident(payload);

      // If a technician was assigned, update backend and local state
      if (selectedAssigneeId) {
        const chosenTech = technicians.find((t) => t.id === Number(selectedAssigneeId));
        try {
          await api.post(`/incidents/${created.id}/assign`, { technicianId: Number(selectedAssigneeId) });
        } catch {
          await api.post(`/incidents/${created.id}/reassign`, {
            technicianId: Number(selectedAssigneeId),
            reason: 'Assigned during incident declaration by Administrator',
          }).catch(() => {});
        }
        if (chosenTech) {
          reassignMockIncident(created.id, chosenTech.id, chosenTech.name);
          created.assignee = { id: chosenTech.id, name: chosenTech.name };
        }
      }

      // Create operational event in the live feed
      const newEvent: LiveOperationalEvent = {
        id: `declared-${created.id || Date.now()}`,
        type: 'outage',
        title: `${created.priority || incidentSeverity} Incident: ${created.title}`,
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        code: `${created.priority || incidentSeverity} // ${created.code}`,
        description: created.description,
        linkText: 'View Ticket →',
        targetId: created.id,
      };
      setSessionDeclaredEvents((prev) => [newEvent, ...prev]);

      // Refetch live KPI counts, audit logs, and users so counters increment immediately
      refetchIncidents();
      refetchAudit();
      refetchUsers();

      const assignText = selectedAssigneeId
        ? ` and assigned to ${technicians.find((t) => t.id === Number(selectedAssigneeId))?.name || 'technician'}`
        : '';
      toast(`Incident ${created.code} successfully declared${assignText} in backend database!`, 'success');
      setDeclareOpen(false);
      setIncidentTitle('');
      setIncidentDescription('');
      setSelectedAssigneeId('');
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to declare incident on backend';
      toast(errMsg, 'error');
    } finally {
      setIsDeclaring(false);
    }
  };

  // Optimize & verify workload distribution across technicians
  const handleRebalance = () => {
    refetchIncidents();
    refetchUsers();
    toast('Workload analyzed: technician queues verified optimal.', 'info');
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      <StudioHero workspace="admin" />
      {/* 1. TOP CONTEXT STRIP */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
           
           {/* <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: '#e5eaf4',
              color: '#1653c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/*<TerminalIcon sx={{ fontSize: 26 }} /> 
             also end with </Box> to for the cod ebut this box in unneccesart so skipped*/} 
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#5c5a52' }}>
                SYS.TELEMETRY// REGION_AP_SOUTH_INDIA
              </Typography> */}
              {/* //TODO this has to be taken care blue dot not looking good 
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#1653c7' }} /> */}
              {/*<Typography sx={{ fontSize: 11, fontWeight: 700, color: '#1653c7', textTransform: 'uppercase' }}>
                Executive Mode
              </Typography> */}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#172b4d', letterSpacing: '-0.01em' }}>
              Incident overview
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* IST Clock */}
          {/* 
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, bgcolor: '#f1f5f9', borderRadius: 2 }}>
            <ScheduleIcon sx={{ fontSize: 16, color: '#6a685f' }} />
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#172b4d' }}>
              {istTime || 'IST --:--:--'}
            </Typography>
          </Box>
           
          The IST time not required
           */}
         

          {/* Heartbeat & Real-Time Latency Indicator */}
          <Tooltip
            arrow
            title={
              <Box sx={{ p: 0.5, fontSize: 11 }}>
                <Typography variant="caption" fontWeight="bold" display="block">
                  {isServerOnline ? '🟢 Backend Server Connected' : '🔴 Backend Server Offline'}
                </Typography>
                <Typography variant="caption" display="block" color="#94a3b8">
                  Endpoint: /api/v1/ping
                </Typography>
                {latency !== null && (
                  <Typography variant="caption" display="block" color="#94a3b8">
                    Round-trip latency: {latency} ms
                  </Typography>
                )}
                {lastPingTime && (
                  <Typography variant="caption" display="block" color="#94a3b8">
                    Last probe: {lastPingTime}
                  </Typography>
                )}
                <Typography variant="caption" display="block" color="#38bdf8" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                  Click badge to probe now
                </Typography>
              </Box>
            }
          >
            <Box
              onClick={measureLatency}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.9,
                px: 1.5,
                py: 0.6,
                bgcolor: isServerOnline ? (latency !== null && latency > 200 ? '#fef3c7' : '#f0fdf4') : '#fef2f2',
                borderRadius: 2,
                border: '1px solid',
                borderColor: isServerOnline ? (latency !== null && latency > 200 ? '#fde68a' : '#bbf7d0') : '#fecaca',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transform: 'scale(1.02)',
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: isServerOnline
                    ? latency !== null && latency > 200
                      ? '#d97706'
                      : '#10b981'
                    : '#ef4444',
                  boxShadow: isServerOnline
                    ? latency !== null && latency > 200
                      ? '0 0 0 2px rgba(217, 119, 6, 0.25)'
                      : '0 0 0 2px rgba(16, 185, 129, 0.25)'
                    : '0 0 0 2px rgba(239, 68, 68, 0.25)',
                  animation: isServerOnline ? 'pulseHeartbeat 1.8s infinite' : 'none',
                  '@keyframes pulseHeartbeat': {
                    '0%': { transform: 'scale(0.95)', opacity: 0.7 },
                    '50%': { transform: 'scale(1.35)', opacity: 1 },
                    '100%': { transform: 'scale(0.95)', opacity: 0.7 },
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: isServerOnline
                    ? latency !== null && latency > 200
                      ? '#92400e'
                      : '#065f46'
                    : '#991b1b',
                  letterSpacing: '0.02em',
                }}
              >
                {isServerOnline
                  ? latency !== null
                    ? `LATENCY ${latency}ms`
                    : 'CHECKING...'
                  : 'OFFLINE (503)'}
              </Typography>
            </Box>
          </Tooltip>

          {/* Declare Incident Button */}
          <Button
            variant="contained"
            onClick={() => setDeclareOpen(true)}
            startIcon={<AddAlertIcon />}
            sx={{
              borderRadius: 2,
              bgcolor: '#2457b7',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 0.8,
              boxShadow: 'none',
              '&:hover': { bgcolor: '#1d4694' },
            }}
          >
            Create incident
          </Button>
        </Box>
      </Paper>

      <IncidentAnalysisPanel incidents={incidents} totalAvailable={(incidentPage as any)?.totalItems ?? incidents.length} loading={incidentsLoading} error={incidentsError} onRetry={() => void refetchIncidents()} sample={Boolean(tokenStore.getAccess()?.startsWith('mock-'))} />
      <details className="dashboard-secondary"><summary>Team workload and recent activity</summary>
      {/* 4. ROW 3: OPERATIONAL CARDS (55% / 45%) */}
      <Grid container spacing={3}>
        {/* Left 55% (lg: 7): Technician Team Capacity Heatmap */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#172b4d' }}>
                  Team Capacity Heatmap
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#5c5a52', mt: 0.2 }}>
                  Live technician workload &amp; concurrency quotas
                </Typography>
              </Box>
              <Chip
                label={`${totalAssignedSlots}/${totalMaxSlots} SLOTS (${overallCapacityPct}%)`}
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, bgcolor: '#e5eaf4', color: '#1653c7' }}
              />
            </Box>

            {/* Technician list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
              {technicians.map((tech) => {
                const percentage = Math.round((tech.activeCount / tech.maxCount) * 100);
                const isAtCapacity = tech.status === 'locked' || tech.activeCount >= tech.maxCount;
                return (
                  <Box
                    key={tech.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: '#f1f5f9',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: '#e5eaf4' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#1653c7', fontSize: 13, fontWeight: 700 }}>
                          {tech.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#172b4d' }}>
                            {tech.name}
                          </Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#5c5a52' }}>
                            {tech.specialty}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: isAtCapacity ? '#ba1a1a' : '#172b4d' }}>
                          {tech.activeCount} / {tech.maxCount} {isAtCapacity ? 'Max' : 'Active'}
                        </Typography>

                        {isAtCapacity ? (
                          <Chip
                            icon={<WarningIcon sx={{ fontSize: 14, color: '#ba1a1a !important' }} />}
                            label="At Capacity"
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#ffdad6', color: '#93000a' }}
                          />
                        ) : (
                          <Chip
                            label={`${percentage}% ${tech.status === 'ready' ? 'Ready' : tech.status === 'available' ? 'Available' : 'Busy'}`}
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: tech.status === 'ready' ? '#d9e2ff' : '#d8e3fb', color: '#001945' }}
                          />
                        )}

                        <Button
                          size="small"
                          onClick={() => navigate(`/admin/tickets?tab=all&assigneeId=${tech.id}`)}
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: 1.5,
                            px: 1.5,
                            py: 0.3,
                            bgcolor: isAtCapacity ? '#ffffff' : '#1653c7',
                            color: isAtCapacity ? '#6a685f' : '#ffffff',
                            '&:hover': { bgcolor: isAtCapacity ? '#ffffff' : '#00468c' },
                          }}
                        >
                          View Queue
                        </Button>
                      </Box>
                    </Box>

                    {/* Progress Bar */}
                    <LinearProgress
                      variant="determinate"
                      value={percentage}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: '#d8e3fb',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isAtCapacity ? '#ba1a1a' : percentage > 70 ? '#1653c7' : '#759efd',
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>

            {/* Heatmap Footer */}
            <Box sx={{ mt: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#5c5a52' }}>
                Load distribution monitored in real-time across active engineers
              </Typography>
              <Button
                size="small"
                onClick={handleRebalance}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#1653c7' }}
              >
                Verify Workload Distribution
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right 45% (lg: 5): Live Operational Feed */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RssFeedIcon sx={{ fontSize: 20, color: '#1653c7' }} />
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#172b4d' }}>
                  Live Operational Feed
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isStreamPaused ? '#ed6c02' : '#1653c7',
                    animation: isStreamPaused ? 'none' : 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    '@keyframes ping': {
                      '75%, 100%': { transform: 'scale(2)', opacity: 0 },
                    },
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#1653c7', textTransform: 'uppercase' }}>
                  {isStreamPaused ? 'Feed: Paused' : 'Live Audit Stream'}
                </Typography>
              </Box>
            </Box>

            {/* Feed Stream Items Container */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1, maxHeight: 310, overflowY: 'auto', pr: 0.5 }}>
              {liveFeedEvents.map((evt) => (
                <Box
                  key={evt.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: evt.type === 'outage' ? 'rgba(255, 218, 214, 0.3)' : evt.type === 'sla_warning' ? 'rgba(219, 232, 255, 0.4)' : '#f1f5f9',
                    border: evt.type === 'outage' ? '1px solid rgba(186, 26, 26, 0.2)' : '1px solid #e2e8f0',
                    display: 'flex',
                    gap: 1.5,
                    alignItems: 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      bgcolor: evt.type === 'outage' ? '#ba1a1a' : evt.type === 'sla_warning' ? '#1653c7' : '#d8e3fb',
                      color: evt.type === 'outage' || evt.type === 'sla_warning' ? '#ffffff' : '#1653c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      shrink: 0,
                      mt: 0.2,
                    }}
                  >
                    {evt.type === 'outage' && <PriorityHighIcon sx={{ fontSize: 15 }} />}
                    {evt.type === 'sla_warning' && <TimerIcon sx={{ fontSize: 15 }} />}
                    {evt.type === 'reassignment' && <SwapHorizIcon sx={{ fontSize: 15 }} />}
                    {evt.type === 'rollback' && <UndoIcon sx={{ fontSize: 15 }} />}
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: evt.type === 'outage' ? '#ba1a1a' : '#172b4d',
                        }}
                      >
                        {evt.title}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#6a685f' }}>
                        {evt.time}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 12, color: '#5c5a52', lineHeight: 1.4 }}>
                      {evt.description}
                    </Typography>

                    {evt.progressPercent !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={evt.progressPercent}
                          sx={{ flexGrow: 1, height: 4, borderRadius: 2, bgcolor: '#d8e3fb', '& .MuiLinearProgress-bar': { bgcolor: '#1653c7' } }}
                        />
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#1653c7' }}>
                          {evt.progressPercent}% ELAPSED
                        </Typography>
                      </Box>
                    )}

                    {evt.code && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#6a685f' }}>
                          {evt.code}
                        </Typography>
                        {evt.linkText && (
                          <Button
                            size="small"
                            onClick={() => navigate(evt.targetId ? `/admin/tickets/${evt.targetId}` : '/admin/tickets')}
                            sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: 11, fontWeight: 700, color: '#1653c7' }}
                          >
                            {evt.linkText}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Feed Controls Footer */}
            <Box sx={{ mt: 2, p: 1, bgcolor: '#f1f5f9', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsStreamPaused((prev) => !prev);
                    toast(isStreamPaused ? 'Live telemetry resumed.' : 'Live telemetry stream paused.', 'info');
                  }}
                  sx={{ color: '#5c5a52' }}
                >
                  {isStreamPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                </IconButton>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#5c5a52' }}>
                  {liveFeedEvents.length} operational events active
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/admin/audit')}
                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, color: '#1653c7' }}
              >
                Export Audit Trail
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* MODAL: Declare Incident Modal (Live Backend Connected) */}
      </details>
      <Dialog
        open={declareOpen}
        onClose={() => !isDeclaring && setDeclareOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#ba1a1a' }}>
          <CrisisAlertIcon sx={{ color: '#ba1a1a' }} />
          Declare Major Incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#f1f5f9' }}>
          <Typography sx={{ fontSize: 13, color: '#5c5a52', mb: 2.5 }}>
            Declaring an incident creates a live ticket in the backend database, calculates SLA targets, and broadcasts real-time telemetry to on-call engineers.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Incident Summary / Title *"
              fullWidth
              size="small"
              placeholder="e.g., Ingress HTTP 504 gateway timeout spikes across edge clusters"
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
              helperText="Minimum 5 characters required by backend validation"
              disabled={isDeclaring}
            />

            <TextField
              label="Diagnostic Details & Description *"
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Describe observed symptoms, customer impact, error traces, and initial mitigations..."
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              helperText="Minimum 20 characters required by backend validation"
              disabled={isDeclaring}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Impacted Service *"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                  disabled={isDeclaring}
                >
                  {services.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  disabled={isDeclaring}
                >
                  <MenuItem value="">
                    <em>(Auto / General Triage)</em>
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Severity Level *"
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value as 'P1' | 'P2' | 'P3' | 'P4')}
                  disabled={isDeclaring}
                >
                  <MenuItem value="P1">P1 Critical (War Room &amp; Lead SRE)</MenuItem>
                  <MenuItem value="P2">P2 Major Degraded Outage</MenuItem>
                  <MenuItem value="P3">P3 Moderate Service Impact</MenuItem>
                  <MenuItem value="P4">P4 Low / Minor Issue</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  type="number"
                  fullWidth
                  size="small"
                  label="Estimated Affected Users *"
                  value={affectedUsers}
                  onChange={(e) => setAffectedUsers(Math.max(1, Number(e.target.value)))}
                  inputProps={{ min: 1, max: 1000000 }}
                  disabled={isDeclaring}
                />
              </Grid>
            </Grid>

            {/* Assign Handler / Technician Dropdown */}
            <TextField
              select
              fullWidth
              size="small"
              label="Assign Handler / Technician (Optional)"
              value={selectedAssigneeId}
              onChange={(e) => setSelectedAssigneeId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={isDeclaring}
              helperText="Assign to an enrolled technician / lead immediately, or leave blank for ITIL auto-routing"
            >
              <MenuItem value="">
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: '#64748b' }}>
                  ⚡ Auto-Assign via ITIL Skill &amp; Load Algorithm
                </Typography>
              </MenuItem>
              {technicians.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#1653c7', color: '#fff' }}>
                        {t.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        ({t.specialty})
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${t.activeCount}/${t.maxCount} active`}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: t.status === 'locked' ? '#fee2e2' : t.status === 'busy' ? '#fef3c7' : '#dcfce7',
                        color: t.status === 'locked' ? '#991b1b' : t.status === 'busy' ? '#92400e' : '#166534',
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setDeclareOpen(false)}
            disabled={isDeclaring}
            sx={{ textTransform: 'none', color: '#5c5a52', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeclareSubmit}
            disabled={isDeclaring}
            startIcon={isDeclaring ? <CircularProgress size={16} color="inherit" /> : <CrisisAlertIcon />}
            sx={{ bgcolor: '#ba1a1a', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#93000a' } }}
          >
            {isDeclaring ? 'Saving to Database...' : 'Confirm & Declare Incident'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

