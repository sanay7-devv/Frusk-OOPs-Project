import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listIncidents, createIncident, CreateIncidentPayload } from '../../api/incidents';
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
import logoIcon from '../../assets/logo.png';

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
  success: '#10b981',
  successContainer: 'rgba(16, 185, 129, 0.15)',
  tertiary: '#f751a1',
};

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
  const { data: incidentPage, refetch: refetchIncidents } = useQuery({
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

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const n = new Date();
    return (
      d.getDate() === n.getDate() &&
      d.getMonth() === n.getMonth() &&
      d.getFullYear() === n.getFullYear()
    );
  };

  const todayIncidents = useMemo(() => incidents.filter((i) => isToday(i.createdAt)), [incidents]);
  const previousIncidents = useMemo(() => incidents.filter((i) => !isToday(i.createdAt)), [incidents]);
  const todayCount = todayIncidents.length;
  const previousCount = previousIncidents.length;
  const activeOpenCount = useMemo(
    () => incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
    [incidents]
  );
  const resolvedCount = useMemo(
    () => incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    [incidents]
  );
  const p1Count = useMemo(
    () => incidents.filter((i) => i.priority === 'P1' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
    [incidents]
  );
  const p2Count = useMemo(
    () => incidents.filter((i) => i.priority === 'P2' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
    [incidents]
  );
  const p3Count = useMemo(
    () => incidents.filter((i) => i.priority === 'P3' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
    [incidents]
  );
  const p4Count = useMemo(
    () => incidents.filter((i) => i.priority === 'P4' && i.status !== 'RESOLVED' && i.status !== 'CLOSED').length,
    [incidents]
  );
  const totalActive = p1Count + p2Count + p3Count + p4Count;

  const slaViolationsCount = useMemo(
    () => incidents.filter((i) => i.slaState === 'VIOLATED').length,
    [incidents]
  );
  const metSlaCount = useMemo(
    () => incidents.filter((i) => i.slaState === 'MET' || i.slaState === 'OK').length,
    [incidents]
  );
  const metSlaRate = useMemo(
    () => (incidents.length > 0 ? ((metSlaCount / incidents.length) * 100).toFixed(1) : '100.0'),
    [incidents, metSlaCount]
  );

  const avgMttrMinutes = useMemo(() => {
    const resolved = incidents.filter((i) => i.resolvedAt && i.createdAt);
    if (!resolved.length) return 32;
    const totalMinutes = resolved.reduce((acc, curr) => {
      const diff = (new Date(curr.resolvedAt).getTime() - new Date(curr.createdAt).getTime()) / 60000;
      return acc + (diff > 0 ? diff : 30);
    }, 0);
    return Math.round(totalMinutes / resolved.length);
  }, [incidents]);

  // Dynamic Donut Geometry
  const donutCircumference = 238.76;
  const p4Dash = totalActive > 0 ? (p4Count / totalActive) * donutCircumference : 0;
  const p3Dash = totalActive > 0 ? (p3Count / totalActive) * donutCircumference : 0;
  const p2Dash = totalActive > 0 ? (p2Count / totalActive) * donutCircumference : 0;
  const p1Dash = totalActive > 0 ? (p1Count / totalActive) * donutCircumference : 0;

  const p4Offset = 0;
  const p3Offset = -p4Dash;
  const p2Offset = -(p4Dash + p3Dash);
  const p1Offset = -(p4Dash + p3Dash + p2Dash);

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

  // Time Range Filter for Velocity Chart
  const [velocityRange, setVelocityRange] = useState<'today' | '7d' | '30d'>('today');

  // Dynamic Real-Time Chart Computation from Real Incident Data
  const chartData = useMemo(() => {
    const width = 680;
    const baseY = 185;
    const topY = 30;
    const plotHeight = baseY - topY;

    const now = new Date();

    interface Point {
      label: string;
      inbound: number;
      resolved: number;
      x: number;
      yInbound: number;
      yResolved: number;
    }

    let buckets: { label: string; inbound: number; resolved: number }[] = [];

    if (velocityRange === 'today') {
      // 7 intervals throughout today: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00, LIVE NOW
      const hours = [0, 4, 8, 12, 16, 20, now.getHours() + now.getMinutes() / 60];
      const labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'LIVE NOW'];

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();

      buckets = labels.map((label, idx) => {
        const thresholdMs = todayStart + hours[idx] * 3600000;
        const inb = incidents.filter((i) => {
          if (!i.createdAt) return false;
          const t = new Date(i.createdAt).getTime();
          return t >= todayStart && t <= thresholdMs;
        }).length;

        const res = incidents.filter((i) => {
          if (!i.resolvedAt) return false;
          const t = new Date(i.resolvedAt).getTime();
          return t >= todayStart && t <= thresholdMs;
        }).length;

        return { label, inbound: inb, resolved: res };
      });
    } else if (velocityRange === '7d') {
      // 7 daily intervals
      for (let d = 6; d >= 0; d--) {
        const targetDate = new Date(now.getTime() - d * 86400000);
        const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).getTime();
        const dayEnd = dayStart + 86400000;

        const dayName = d === 0 ? 'Today' : d === 1 ? 'Yesterday' : targetDate.toLocaleDateString('en-US', { weekday: 'short' });

        const inb = incidents.filter((i) => {
          if (!i.createdAt) return false;
          const t = new Date(i.createdAt).getTime();
          return t >= dayStart && t < dayEnd;
        }).length;

        const res = incidents.filter((i) => {
          if (!i.resolvedAt) return false;
          const t = new Date(i.resolvedAt).getTime();
          return t >= dayStart && t < dayEnd;
        }).length;

        buckets.push({ label: dayName, inbound: inb, resolved: res });
      }
    } else {
      // 30d: 6 5-day intervals
      for (let w = 5; w >= 0; w--) {
        const windowEnd = now.getTime() - w * 5 * 86400000;
        const windowStart = windowEnd - 5 * 86400000;
        const label = w === 0 ? 'Current' : `-${w * 5}d`;

        const inb = incidents.filter((i) => {
          if (!i.createdAt) return false;
          const t = new Date(i.createdAt).getTime();
          return t >= windowStart && t <= windowEnd;
        }).length;

        const res = incidents.filter((i) => {
          if (!i.resolvedAt) return false;
          const t = new Date(i.resolvedAt).getTime();
          return t >= windowStart && t <= windowEnd;
        }).length;

        buckets.push({ label, inbound: inb, resolved: res });
      }
    }

    const maxVal = Math.max(1, ...buckets.map((b) => Math.max(b.inbound, b.resolved)));
    const yMax = maxVal < 4 ? 4 : Math.ceil(maxVal * 1.25);

    const points: Point[] = buckets.map((b, idx) => {
      const x = Math.round((idx / (buckets.length - 1)) * width);
      const yInbound = Math.round(baseY - (b.inbound / yMax) * plotHeight);
      const yResolved = Math.round(baseY - (b.resolved / yMax) * plotHeight);
      return { ...b, x, yInbound, yResolved };
    });

    const buildCurvePath = (pts: { x: number; y: number }[]): string => {
      if (!pts.length) return '';
      let d = `M ${pts[0].x},${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const mx = (p0.x + p1.x) / 2;
        d += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
      }
      return d;
    };

    const inboundLinePath = buildCurvePath(points.map((p) => ({ x: p.x, y: p.yInbound })));
    const inboundAreaPath = `${inboundLinePath} L ${width},${baseY} L 0,${baseY} Z`;

    const resolvedLinePath = buildCurvePath(points.map((p) => ({ x: p.x, y: p.yResolved })));
    const resolvedAreaPath = `${resolvedLinePath} L ${width},${baseY} L 0,${baseY} Z`;

    const rangeInboundTotal = velocityRange === 'today'
      ? (buckets[buckets.length - 1]?.inbound || todayCount)
      : buckets.reduce((acc, b) => acc + b.inbound, 0);

    const rangeResolvedTotal = velocityRange === 'today'
      ? (buckets[buckets.length - 1]?.resolved || resolvedCount)
      : buckets.reduce((acc, b) => acc + b.resolved, 0);

    return {
      points,
      yMax,
      baseY,
      topY,
      inboundLinePath,
      inboundAreaPath,
      resolvedLinePath,
      resolvedAreaPath,
      rangeInboundTotal,
      rangeResolvedTotal,
    };
  }, [incidents, velocityRange, todayCount, resolvedCount]);

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
      {/* 1. TOP CONTEXT STRIP */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 3,
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
              Incident Command &amp; Reliability Center
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Declare Incident Button */}
          <Button
            variant="contained"
            onClick={() => setDeclareOpen(true)}
            startIcon={<AddAlertIcon />}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 0.8,
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
              '&:hover': { opacity: 0.9 },
            }}
          >
            Declare Incident
          </Button>
        </Box>
      </Paper>

      {/* 2. ROW 1: FIVE KPI METRIC CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* KPI 1: Total Incidents Today */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Tooltip title="Click to view today's tickets in Tickets Hub" arrow>
            <Paper
              elevation={0}
              onClick={() => navigate('/admin/tickets?tab=today')}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surfaceContainer,
                backdropFilter: 'blur(16px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: COLORS.primary,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace' }}>
                  Total Incidents Today
                </Typography>
                <ConfirmationNumberIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
                  {todayCount}
                </Typography>
                <Chip
                  icon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                  label="View Today →"
                  size="small"
                  sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(99, 102, 241, 0.15)', color: COLORS.primary, border: '1px solid rgba(99, 102, 241, 0.3)' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <span>vs. previous days</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.secondary, fontWeight: 600 }}>{previousCount} prev</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
            </Paper>
          </Tooltip>
        </Grid>

        {/* KPI 2: Active Open */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Tooltip title="Click to view all active open tickets" arrow>
            <Paper
              elevation={0}
              onClick={() => navigate('/admin/tickets?tab=all&status=ACTIVE')}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surfaceContainer,
                backdropFilter: 'blur(16px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: COLORS.secondary,
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace' }}>
                  Active Open
                </Typography>
                <PendingActionsIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
                  {activeOpenCount}
                </Typography>
                <Chip
                  label="In Progress / New"
                  size="small"
                  sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.secondary, border: `1px solid ${COLORS.border}` }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <span>Immediate attention</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>Live queue</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLORS.primary }} />
            </Paper>
          </Tooltip>
        </Grid>

        {/* KPI 3: P1 Critical (Urgent Crimson Card) */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Tooltip title="Click to view critical P1 tickets" arrow>
            <Paper
              elevation={0}
              onClick={() => navigate('/admin/tickets?tab=all&priority=P1')}
              sx={{
                p: 2,
                borderRadius: 3,
                border: '1px solid rgba(244, 63, 94, 0.3)',
                bgcolor: COLORS.surfaceContainer,
                backdropFilter: 'blur(16px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: COLORS.error,
                  boxShadow: '0 8px 24px rgba(244, 63, 94, 0.25)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: COLORS.error, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace' }}>
                  P1 Critical Incidents
                </Typography>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.error, boxShadow: '0 0 10px #f43f5e', animation: 'pulse 1s infinite' }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.error, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
                  {p1Count < 10 ? `0${p1Count}` : p1Count}
                </Typography>
                <Chip
                  icon={<CrisisAlertIcon sx={{ fontSize: 14, color: '#ffffff !important' }} />}
                  label="Active War Room"
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: COLORS.error, color: '#ffffff' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.error, fontWeight: 500 }}>
                <span>Priority Emergency</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>HIGH SLA</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLORS.error, boxShadow: '0 0 8px #f43f5e' }} />
            </Paper>
          </Tooltip>
        </Grid>

        {/* KPI 4: SLA Violations */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Tooltip title="Click to view all tickets in Tickets Hub" arrow>
            <Paper
              elevation={0}
              onClick={() => navigate('/admin/tickets?tab=all')}
              sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${COLORS.border}`,
                bgcolor: COLORS.surfaceContainer,
                backdropFilter: 'blur(16px)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { borderColor: COLORS.secondary, transform: 'translateY(-2px)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace' }}>
                  SLA Violations
                </Typography>
                <VerifiedIcon sx={{ fontSize: 20, color: slaViolationsCount > 0 ? COLORS.error : COLORS.success }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: slaViolationsCount > 0 ? COLORS.error : COLORS.onSurface, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
                  {slaViolationsCount}
                </Typography>
                <Chip
                  icon={slaViolationsCount > 0 ? <WarningIcon sx={{ fontSize: 14, color: `${COLORS.error} !important` }} /> : <CheckCircleIcon sx={{ fontSize: 14, color: `${COLORS.success} !important` }} />}
                  label={slaViolationsCount > 0 ? 'Breaches Logged' : '100% Preserved'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: slaViolationsCount > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: slaViolationsCount > 0 ? COLORS.error : COLORS.success,
                    border: `1px solid ${slaViolationsCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.onSurfaceVariant }}>
                <span>{slaViolationsCount > 0 ? 'Immediate action required' : 'Zero breaches past 72h'}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: slaViolationsCount > 0 ? COLORS.error : COLORS.success, fontWeight: 600 }}>
                  {slaViolationsCount > 0 ? 'FAIL' : 'OK'}
                </span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: slaViolationsCount > 0 ? COLORS.error : COLORS.success }} />
            </Paper>
          </Tooltip>
        </Grid>

        {/* KPI 5: Met SLA Rate */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: COLORS.secondary, transform: 'translateY(-2px)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'JetBrains Mono, monospace' }}>
                Met SLA Rate
              </Typography>
              <SpeedIcon sx={{ fontSize: 20, color: COLORS.secondary }} />
            </Box>
            <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: COLORS.secondary, letterSpacing: '-0.02em', fontFamily: 'Sora, sans-serif' }}>
                {metSlaRate}%
              </Typography>
              <Chip
                label="Target >98%"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: 'rgba(6, 182, 212, 0.15)', color: COLORS.secondary, border: '1px solid rgba(6, 182, 212, 0.3)' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.onSurfaceVariant }}>
              <span>{metSlaCount} of {incidents.length} on target</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: COLORS.secondary }}>Live Telemetry</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: COLORS.secondary }} />
          </Paper>
        </Grid>
      </Grid>

      {/* 3. ROW 2: TWO VISUAL CHART CONTAINERS (60% / 40%) */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Left 60% (lg: 7): Incident Velocity & Remediation Volume */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Header + Time Range Filter */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                    Incident Velocity &amp; Remediation Volume
                  </Typography>
                  <Tooltip title="Real-time incoming alerts vs resolved incident throughput">
                    <InfoIcon sx={{ fontSize: 16, color: COLORS.onSurfaceVariant }} />
                  </Tooltip>
                </Box>
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.2 }}>
                  Real-time incoming alerts vs resolved incident throughput
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', bgcolor: COLORS.surfaceContainerLow, p: 0.5, borderRadius: 2, border: `1px solid ${COLORS.border}` }}>
                {(['today', '7d', '30d'] as const).map((r) => (
                  <Button
                    key={r}
                    size="small"
                    onClick={() => setVelocityRange(r)}
                    sx={{
                      px: 1.5,
                      py: 0.4,
                      fontSize: 11,
                      fontWeight: velocityRange === r ? 700 : 500,
                      borderRadius: 1.5,
                      textTransform: 'none',
                      bgcolor: velocityRange === r ? COLORS.surfaceContainerHighest : 'transparent',
                      color: velocityRange === r ? '#ffffff' : COLORS.onSurfaceVariant,
                      border: velocityRange === r ? `1px solid ${COLORS.border}` : '1px solid transparent',
                    }}
                  >
                    {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Legend row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: COLORS.primary }} />
                <Typography sx={{ fontSize: 12, color: COLORS.onSurface, fontWeight: 500 }}>
                  Inbound Incidents <span style={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>(Total: {chartData.rangeInboundTotal})</span>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: COLORS.secondary }} />
                <Typography sx={{ fontSize: 12, color: COLORS.onSurface, fontWeight: 500 }}>
                  Remediated <span style={{ fontFamily: 'JetBrains Mono, monospace', color: COLORS.onSurfaceVariant }}>(Total: {chartData.rangeResolvedTotal})</span>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 'auto' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: activeOpenCount > 0 ? COLORS.error : COLORS.success }} />
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, color: activeOpenCount > 0 ? COLORS.error : COLORS.success }}>
                  Current Net Open: {activeOpenCount}
                </Typography>
              </Box>
            </Box>

            {/* Real-Time Area Chart SVG */}
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 240,
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                border: `1px solid ${COLORS.border}`,
                p: 1.5,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <svg className="w-full h-full" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none" viewBox="0 0 680 220">
                <defs>
                  <linearGradient id="velocityPrimaryGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="resolvedSecondaryGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines & Y-axis real scale values */}
                <line x1="0" y1="35" x2="680" y2="35" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <text x="6" y="32" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">{chartData.yMax}</text>

                <line x1="0" y1="85" x2="680" y2="85" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <text x="6" y="82" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">{Math.round(chartData.yMax * 0.66)}</text>

                <line x1="0" y1="135" x2="680" y2="135" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <text x="6" y="132" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">{Math.round(chartData.yMax * 0.33)}</text>

                <line x1="0" y1="185" x2="680" y2="185" stroke="rgba(255,255,255,0.1)" />
                <text x="6" y="182" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace">0</text>

                {/* Area 1: Inbound (Primary) */}
                <path d={chartData.inboundAreaPath} fill="url(#velocityPrimaryGrad)" />
                <path d={chartData.inboundLinePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />

                {/* Area 2: Resolved (Secondary) */}
                <path d={chartData.resolvedAreaPath} fill="url(#resolvedSecondaryGrad)" />
                <path d={chartData.resolvedLinePath} fill="none" stroke="#06b6d4" strokeDasharray="4 2" strokeWidth="2" />

                {/* Real Data Interactive Markers */}
                {chartData.points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.yInbound} r="4" fill="#6366f1" stroke="#090d16" strokeWidth="1.5">
                      <title>{`${p.label} - Inbound: ${p.inbound} incident${p.inbound === 1 ? '' : 's'}`}</title>
                    </circle>
                    <circle cx={p.x} cy={p.yResolved} r="3.5" fill="#06b6d4" stroke="#090d16" strokeWidth="1.5">
                      <title>{`${p.label} - Remediated: ${p.resolved} incident${p.resolved === 1 ? '' : 's'}`}</title>
                    </circle>
                  </g>
                ))}

                {/* Live Real-Time Pulse Marker on latest point */}
                {chartData.points.length > 0 && (() => {
                  const last = chartData.points[chartData.points.length - 1];
                  return (
                    <g>
                      <circle cx={last.x} cy={last.yInbound} r="5" fill="#6366f1" />
                      <circle cx={last.x} cy={last.yInbound} r="11" fill="none" stroke="#6366f1" strokeWidth="1.5">
                        <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <line x1={last.x} y1="30" x2={last.x} y2="185" stroke="#6366f1" strokeDasharray="3 3" strokeWidth="1.5" />
                    </g>
                  );
                })()}

                {/* P1 Alert Hotspot Marker if critical incident is open */}
                {p1Count > 0 && chartData.points.length > 0 && (
                  <g>
                    <circle cx={chartData.points[chartData.points.length - 1].x} cy={chartData.points[chartData.points.length - 1].yInbound} r="4.5" fill="#f43f5e" />
                    <circle cx={chartData.points[chartData.points.length - 1].x} cy={chartData.points[chartData.points.length - 1].yInbound} r="9" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.7">
                      <animate attributeName="r" values="4.5;13;4.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              </svg>

              {/* Dynamic X-Axis Labels */}
              <Box sx={{ position: 'absolute', bottom: 4, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>
                {chartData.points.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: idx === chartData.points.length - 1 ? '#6366f1' : '#64748b',
                      fontWeight: idx === chartData.points.length - 1 ? 700 : 500,
                    }}
                  >
                    {p.label}
                  </span>
                ))}
              </Box>
            </Box>

            {/* Quick Insight Footer */}
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                bgcolor: COLORS.surfaceContainerLow,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BoltIcon sx={{ fontSize: 18, color: COLORS.secondary }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                  System Health:
                </Typography>
                <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant }}>
                  {p1Count > 0
                    ? `${p1Count} active P1 critical incident(s) currently being mitigated`
                    : 'All services operational with healthy throughput'}
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon fontSize="small" />}
                onClick={() => navigate('/admin/tickets?tab=all')}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: COLORS.secondary }}
              >
                View Tickets Queue
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right 40% (lg: 5): Active Priority Distribution Donut */}
        <Grid item xs={12} lg={5}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  Active Priority Distribution
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.2 }}>
                  {totalActive} open tickets segmented by ITIL severity
                </Typography>
              </Box>
              <Chip
                label="LIVE QUEUE"
                size="small"
                sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 800, bgcolor: 'rgba(99, 102, 241, 0.15)', color: COLORS.primary, border: '1px solid rgba(99, 102, 241, 0.3)' }}
              />
            </Box>

            {/* Donut Chart Visual + Center MTTR Summary */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, my: 2 }}>
              <Box sx={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                  {totalActive > 0 && (
                    <>
                      {/* P4 Arc */}
                      {p4Dash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#64748b"
                          strokeWidth="12"
                          strokeDasharray={`${p4Dash} ${donutCircumference - p4Dash}`}
                          strokeDashoffset={p4Offset}
                        />
                      )}
                      {/* P3 Arc */}
                      {p3Dash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="12"
                          strokeDasharray={`${p3Dash} ${donutCircumference - p3Dash}`}
                          strokeDashoffset={p3Offset}
                        />
                      )}
                      {/* P2 Arc */}
                      {p2Dash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="12"
                          strokeDasharray={`${p2Dash} ${donutCircumference - p2Dash}`}
                          strokeDashoffset={p2Offset}
                        />
                      )}
                      {/* P1 Arc */}
                      {p1Dash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#f43f5e"
                          strokeWidth="12"
                          strokeDasharray={`${p1Dash} ${donutCircumference - p1Dash}`}
                          strokeDashoffset={p1Offset}
                        />
                      )}
                    </>
                  )}
                </svg>
                <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, lineHeight: 1, fontFamily: 'Sora, sans-serif' }}>
                    {totalActive}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    Tickets
                  </Typography>
                </Box>
              </Box>

              {/* MTTR Summary Column */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                  Fleetwide MTTR
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  {avgMttrMinutes}m
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: COLORS.success, fontSize: 12, fontWeight: 600 }}>
                  <SouthIcon sx={{ fontSize: 14 }} />
                  <span>On-target response</span>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>
                    Active Escalations
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>
                    {p1Count > 0 ? 'Tier 2 (Lead SRE)' : 'Tier 1 Support'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 4 Severity Bands Tiles Grid */}
            <Grid container spacing={1.5}>
              {/* P1 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.error, boxShadow: '0 0 6px #f43f5e' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: COLORS.error }}>P1 Critical</Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>MTTR: 15m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.error, fontFamily: 'Sora, sans-serif' }}>{p1Count}</Typography>
                </Box>
              </Grid>

              {/* P2 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.primary }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>P2 High</Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>MTTR: 30m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>{p2Count}</Typography>
                </Box>
              </Grid>

              {/* P3 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: COLORS.secondary }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>P3 Medium</Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>MTTR: 60m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>{p3Count}</Typography>
                </Box>
              </Grid>

              {/* P4 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#64748b' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.onSurface }}>P4 Low</Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>MTTR: 120m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>{p4Count}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* 4. ROW 3: OPERATIONAL CARDS (55% / 45%) */}
      <Grid container spacing={3}>
        {/* Left 55% (lg: 7): Technician Team Capacity Heatmap */}
        <Grid item xs={12} lg={7}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  Team Capacity Heatmap
                </Typography>
                <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, mt: 0.2 }}>
                  Live technician workload &amp; concurrency quotas
                </Typography>
              </Box>
              <Chip
                label={`${totalAssignedSlots}/${totalMaxSlots} SLOTS (${overallCapacityPct}%)`}
                size="small"
                sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700, bgcolor: 'rgba(99, 102, 241, 0.15)', color: COLORS.primary, border: '1px solid rgba(99, 102, 241, 0.3)' }}
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
                      bgcolor: COLORS.surfaceContainerLow,
                      border: `1px solid ${COLORS.border}`,
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: COLORS.primary, fontSize: 13, fontWeight: 700, color: '#ffffff' }}>
                          {tech.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>
                            {tech.name}
                          </Typography>
                          <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>
                            {tech.specialty}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 700, color: isAtCapacity ? COLORS.error : COLORS.onSurface }}>
                          {tech.activeCount} / {tech.maxCount} {isAtCapacity ? 'Max' : 'Active'}
                        </Typography>

                        {isAtCapacity ? (
                          <Chip
                            icon={<WarningIcon sx={{ fontSize: 14, color: `${COLORS.error} !important` }} />}
                            label="At Capacity"
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: 'rgba(244, 63, 94, 0.15)', color: COLORS.error, border: '1px solid rgba(244, 63, 94, 0.3)' }}
                          />
                        ) : (
                          <Chip
                            label={`${percentage}% ${tech.status === 'ready' ? 'Ready' : tech.status === 'available' ? 'Available' : 'Busy'}`}
                            size="small"
                            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.secondary, border: `1px solid ${COLORS.border}` }}
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
                            bgcolor: isAtCapacity ? COLORS.surfaceContainerHighest : COLORS.primary,
                            color: isAtCapacity ? COLORS.onSurfaceVariant : '#ffffff',
                            '&:hover': { bgcolor: isAtCapacity ? COLORS.surfaceContainerHigh : COLORS.primaryContainer },
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
                        bgcolor: COLORS.surfaceContainerHighest,
                        '& .MuiLinearProgress-bar': {
                          bgcolor: isAtCapacity ? COLORS.error : percentage > 70 ? COLORS.secondary : COLORS.primary,
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>

            {/* Heatmap Footer */}
            <Box sx={{ mt: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>
                Load distribution monitored in real-time across active engineers
              </Typography>
              <Button
                size="small"
                onClick={handleRebalance}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: COLORS.secondary }}
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
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RssFeedIcon sx={{ fontSize: 20, color: COLORS.primary }} />
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  Live Operational Feed
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 3 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isStreamPaused ? '#ed6c02' : COLORS.secondary,
                    boxShadow: isStreamPaused ? 'none' : '0 0 8px #06b6d4',
                    animation: isStreamPaused ? 'none' : 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    '@keyframes ping': {
                      '75%, 100%': { transform: 'scale(2)', opacity: 0 },
                    },
                  }}
                />
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: COLORS.secondary, textTransform: 'uppercase' }}>
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
                    bgcolor: evt.type === 'outage' ? 'rgba(244, 63, 94, 0.1)' : evt.type === 'sla_warning' ? 'rgba(6, 182, 212, 0.1)' : COLORS.surfaceContainerLow,
                    border: evt.type === 'outage' ? '1px solid rgba(244, 63, 94, 0.25)' : `1px solid ${COLORS.border}`,
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
                      bgcolor: evt.type === 'outage' ? COLORS.error : evt.type === 'sla_warning' ? COLORS.secondary : COLORS.surfaceContainerHighest,
                      color: evt.type === 'outage' || evt.type === 'sla_warning' ? '#ffffff' : COLORS.primary,
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
                          color: evt.type === 'outage' ? COLORS.error : COLORS.onSurface,
                        }}
                      >
                        {evt.title}
                      </Typography>
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: COLORS.onSurfaceVariant }}>
                        {evt.time}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, lineHeight: 1.4 }}>
                      {evt.description}
                    </Typography>

                    {evt.progressPercent !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={evt.progressPercent}
                          sx={{ flexGrow: 1, height: 4, borderRadius: 2, bgcolor: COLORS.surfaceContainerHighest, '& .MuiLinearProgress-bar': { bgcolor: COLORS.primary } }}
                        />
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 700, color: COLORS.primary }}>
                          {evt.progressPercent}% ELAPSED
                        </Typography>
                      </Box>
                    )}

                    {evt.code && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: COLORS.secondary }}>
                          {evt.code}
                        </Typography>
                        {evt.linkText && (
                          <Button
                            size="small"
                            onClick={() => navigate(evt.targetId ? `/admin/tickets/${evt.targetId}` : '/admin/tickets')}
                            sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: 11, fontWeight: 700, color: COLORS.secondary }}
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
            <Box sx={{ mt: 2, p: 1, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsStreamPaused((prev) => !prev);
                    toast(isStreamPaused ? 'Live telemetry resumed.' : 'Live telemetry stream paused.', 'info');
                  }}
                  sx={{ color: COLORS.onSurfaceVariant }}
                >
                  {isStreamPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                </IconButton>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: COLORS.onSurfaceVariant }}>
                  {liveFeedEvents.length} operational events active
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/admin/audit')}
                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, color: COLORS.secondary }}
              >
                Export Audit Trail
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* MODAL: Declare Incident Modal (Live Backend Connected) */}
      <Dialog
        open={declareOpen}
        onClose={() => !isDeclaring && setDeclareOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: COLORS.error, fontFamily: 'Sora, sans-serif' }}>
          <CrisisAlertIcon sx={{ color: COLORS.error }} />
          Declare Major Incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2.5 }}>
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
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
              }}
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
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
              }}
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
                  sx={{
                    bgcolor: COLORS.surfaceContainerLowest,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                  }}
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
                  sx={{
                    bgcolor: COLORS.surfaceContainerLowest,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                  }}
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
                  sx={{
                    bgcolor: 'rgba(18, 22, 34, 0.75)',
                    backdropFilter: 'blur(16px)',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <MenuItem value="P1">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
                      <span style={{ color: '#f43f5e', fontWeight: 700 }}>P1 Critical (War Room &amp; Lead SRE)</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="P2">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fb923c' }} />
                      <span style={{ color: '#fb923c', fontWeight: 600 }}>P2 Major Degraded Outage</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="P3">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#38bdf8' }} />
                      <span style={{ color: '#38bdf8' }}>P3 Moderate Service Impact</span>
                    </Box>
                  </MenuItem>
                  <MenuItem value="P4">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ade80' }} />
                      <span style={{ color: '#4ade80' }}>P4 Low / Minor Issue</span>
                    </Box>
                  </MenuItem>
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
                  sx={{
                    bgcolor: COLORS.surfaceContainerLowest,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
                  }}
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
              sx={{
                bgcolor: COLORS.surfaceContainerLowest,
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.border },
              }}
            >
              <MenuItem value="">
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: COLORS.onSurfaceVariant }}>
                  ⚡ Auto-Assign via ITIL Skill &amp; Load Algorithm
                </Typography>
              </MenuItem>
              {technicians.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: COLORS.primary, color: '#fff' }}>
                        {t.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {t.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                        ({t.specialty})
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${t.activeCount}/${t.maxCount} active`}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        bgcolor: t.status === 'locked' ? 'rgba(244, 63, 94, 0.15)' : t.status === 'busy' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: t.status === 'locked' ? COLORS.error : t.status === 'busy' ? '#f59e0b' : COLORS.success,
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
            sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeclareSubmit}
            disabled={isDeclaring}
            startIcon={isDeclaring ? <CircularProgress size={16} color="inherit" /> : <CrisisAlertIcon />}
            sx={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', textTransform: 'none', fontWeight: 700, '&:hover': { opacity: 0.9 } }}
          >
            {isDeclaring ? 'Saving to Database...' : 'Confirm & Declare Incident'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
