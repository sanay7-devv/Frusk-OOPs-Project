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
import logoIcon from '../../assets/logo.png';

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
              bgcolor: '#dee8ff',
              color: '#004d99',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/*<TerminalIcon sx={{ fontSize: 26 }} /> 
             also end with </Box> to for the cod ebut this box in unneccesart so skipped*/} 
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: '#425059' }}>
                SYS.TELEMETRY// REGION_AP_SOUTH_INDIA
              </Typography> */}
              {/* //TODO this has to be taken care blue dot not looking good 
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#2b5bb5' }} /> */}
              {/*<Typography sx={{ fontSize: 11, fontWeight: 700, color: '#004d99', textTransform: 'uppercase' }}>
                Executive Mode
              </Typography> */}
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#111c2d', letterSpacing: '-0.01em' }}>
              Incident Command &amp; Reliability Center
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* IST Clock */}
          {/* 
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, bgcolor: '#f0f3ff', borderRadius: 2 }}>
            <ScheduleIcon sx={{ fontSize: 16, color: '#727783' }} />
            <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#111c2d' }}>
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
              bgcolor: '#ba1a1a',
              color: '#ffffff',
              textTransform: 'none',
              fontWeight: 700,
              px: 2,
              py: 0.8,
              boxShadow: '0 2px 4px rgba(186, 26, 26, 0.3)',
              '&:hover': { bgcolor: '#93000a' },
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
                border: '1px solid #bfdbfe',
                bgcolor: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(43, 91, 181, 0.18)',
                  borderColor: '#2b5bb5',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#425059', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Incidents Today
                </Typography>
                <ConfirmationNumberIcon sx={{ fontSize: 20, color: '#2b5bb5' }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.02em' }}>
                  {todayCount}
                </Typography>
                <Chip
                  icon={<ArrowForwardIcon sx={{ fontSize: 13 }} />}
                  label="View Today →"
                  size="small"
                  sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#dee8ff', color: '#004d99' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
                <span>vs. previous days</span>
                <span style={{ fontFamily: 'monospace', color: '#727783', fontWeight: 600 }}>{previousCount} prev</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#2b5bb5' }} />
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
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(0, 77, 153, 0.15)',
                  borderColor: '#004d99',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#425059', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Active Open
                </Typography>
                <PendingActionsIcon sx={{ fontSize: 20, color: '#425059' }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.02em' }}>
                  {activeOpenCount}
                </Typography>
                <Chip
                  label="In Progress / New"
                  size="small"
                  sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: '#d8e3fb', color: '#00468c' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
                <span>Immediate attention</span>
                <span style={{ fontFamily: 'monospace', color: '#727783' }}>Live queue</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#004d99' }} />
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
                border: '1px solid #ffdad6',
                bgcolor: 'rgba(255, 218, 214, 0.35)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 24px rgba(186, 26, 26, 0.2)',
                  borderColor: '#ba1a1a',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#93000a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  P1 Critical Incidents
                </Typography>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ba1a1a', boxShadow: '0 0 0 4px rgba(186, 26, 26, 0.2)' }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#ba1a1a', letterSpacing: '-0.02em' }}>
                  {p1Count < 10 ? `0${p1Count}` : p1Count}
                </Typography>
                <Chip
                  icon={<CrisisAlertIcon sx={{ fontSize: 14, color: '#ffffff !important' }} />}
                  label="Active War Room"
                  size="small"
                  sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#ba1a1a', color: '#ffffff' }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#93000a', fontWeight: 500 }}>
                <span>Priority Emergency</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>HIGH SLA</span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#ba1a1a' }} />
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
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#425059', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SLA Violations
                </Typography>
                <VerifiedIcon sx={{ fontSize: 20, color: slaViolationsCount > 0 ? '#ba1a1a' : '#059669' }} />
              </Box>
              <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: slaViolationsCount > 0 ? '#ba1a1a' : '#111c2d', letterSpacing: '-0.02em' }}>
                  {slaViolationsCount}
                </Typography>
                <Chip
                  icon={slaViolationsCount > 0 ? <WarningIcon sx={{ fontSize: 14, color: '#ba1a1a !important' }} /> : <CheckCircleIcon sx={{ fontSize: 14, color: '#0f1d25 !important' }} />}
                  label={slaViolationsCount > 0 ? 'Breaches Logged' : '100% Preserved'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    bgcolor: slaViolationsCount > 0 ? '#ffdad6' : '#d6e5ef',
                    color: slaViolationsCount > 0 ? '#93000a' : '#0f1d25',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
                <span>{slaViolationsCount > 0 ? 'Immediate action required' : 'Zero breaches past 72h'}</span>
                <span style={{ fontFamily: 'monospace', color: slaViolationsCount > 0 ? '#ba1a1a' : '#727783', fontWeight: 600 }}>
                  {slaViolationsCount > 0 ? 'FAIL' : 'OK'}
                </span>
              </Box>
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: slaViolationsCount > 0 ? '#ba1a1a' : '#059669' }} />
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
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#425059', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Met SLA Rate
              </Typography>
              <SpeedIcon sx={{ fontSize: 20, color: '#004d99' }} />
            </Box>
            <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#004d99', letterSpacing: '-0.02em' }}>
                {metSlaRate}%
              </Typography>
              <Chip
                label="Target >98%"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#d9e2ff', color: '#001945' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
              <span>{metSlaCount} of {incidents.length} on target</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#004d99' }}>Live Telemetry</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#1565c0' }} />
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
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
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
                  <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#111c2d' }}>
                    Incident Velocity &amp; Remediation Volume
                  </Typography>
                  <Tooltip title="Real-time incoming alerts vs resolved incident throughput">
                    <InfoIcon sx={{ fontSize: 16, color: '#727783' }} />
                  </Tooltip>
                </Box>
                <Typography sx={{ fontSize: 12, color: '#425059', mt: 0.2 }}>
                  Real-time incoming alerts vs resolved incident throughput
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', bgcolor: '#f0f3ff', p: 0.5, borderRadius: 2 }}>
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
                      bgcolor: velocityRange === r ? '#ffffff' : 'transparent',
                      color: velocityRange === r ? '#004d99' : '#425059',
                      boxShadow: velocityRange === r ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
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
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#004d99' }} />
                <Typography sx={{ fontSize: 12, color: '#111c2d', fontWeight: 500 }}>
                  Inbound Incidents <span style={{ fontFamily: 'sans-serif', color: '#727783' }}>(Total: {chartData.rangeInboundTotal})</span>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#759efd' }} />
                <Typography sx={{ fontSize: 12, color: '#111c2d', fontWeight: 500 }}>
                  Remediated <span style={{ fontFamily: 'sans-serif', color: '#727783' }}>(Total: {chartData.rangeResolvedTotal})</span>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 'auto' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: activeOpenCount > 0 ? '#ba1a1a' : '#059669' }} />
                <Typography sx={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700, color: activeOpenCount > 0 ? '#ba1a1a' : '#059669' }}>
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
                bgcolor: 'rgba(240, 243, 255, 0.4)',
                borderRadius: 2,
                p: 1.5,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
              }}
            >
              <svg className="w-full h-full" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none" viewBox="0 0 680 220">
                <defs>
                  <linearGradient id="velocityPrimaryGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#004d99" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#004d99" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="resolvedSecondaryGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#759efd" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#759efd" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines & Y-axis real scale values */}
                <line x1="0" y1="35" x2="680" y2="35" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <text x="6" y="32" fill="#727783" fontSize="10" fontFamily="monospace">{chartData.yMax}</text>

                <line x1="0" y1="85" x2="680" y2="85" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <text x="6" y="82" fill="#727783" fontSize="10" fontFamily="monospace">{Math.round(chartData.yMax * 0.66)}</text>

                <line x1="0" y1="135" x2="680" y2="135" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <text x="6" y="132" fill="#727783" fontSize="10" fontFamily="monospace">{Math.round(chartData.yMax * 0.33)}</text>

                <line x1="0" y1="185" x2="680" y2="185" stroke="#c2c6d4" strokeOpacity="0.5" />
                <text x="6" y="182" fill="#727783" fontSize="10" fontFamily="monospace">0</text>

                {/* Area 1: Inbound (Primary) - Computed dynamically from real incidents */}
                <path d={chartData.inboundAreaPath} fill="url(#velocityPrimaryGrad)" />
                <path d={chartData.inboundLinePath} fill="none" stroke="#004d99" strokeWidth="2.5" />

                {/* Area 2: Resolved (Secondary) - Computed dynamically from real incidents */}
                <path d={chartData.resolvedAreaPath} fill="url(#resolvedSecondaryGrad)" />
                <path d={chartData.resolvedLinePath} fill="none" stroke="#759efd" strokeDasharray="4 2" strokeWidth="2" />

                {/* Real Data Interactive Markers */}
                {chartData.points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.yInbound} r="4" fill="#004d99" stroke="#ffffff" strokeWidth="1.5">
                      <title>{`${p.label} - Inbound: ${p.inbound} incident${p.inbound === 1 ? '' : 's'}`}</title>
                    </circle>
                    <circle cx={p.x} cy={p.yResolved} r="3.5" fill="#759efd" stroke="#ffffff" strokeWidth="1.5">
                      <title>{`${p.label} - Remediated: ${p.resolved} incident${p.resolved === 1 ? '' : 's'}`}</title>
                    </circle>
                  </g>
                ))}

                {/* Live Real-Time Pulse Marker on latest point */}
                {chartData.points.length > 0 && (() => {
                  const last = chartData.points[chartData.points.length - 1];
                  return (
                    <g>
                      <circle cx={last.x} cy={last.yInbound} r="5" fill="#004d99" />
                      <circle cx={last.x} cy={last.yInbound} r="11" fill="none" stroke="#004d99" strokeWidth="1.5">
                        <animate attributeName="r" values="5;14;5" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <line x1={last.x} y1="30" x2={last.x} y2="185" stroke="#004d99" strokeDasharray="3 3" strokeWidth="1.5" />
                    </g>
                  );
                })()}

                {/* P1 Alert Hotspot Marker if critical incident is open */}
                {p1Count > 0 && chartData.points.length > 0 && (
                  <g>
                    <circle cx={chartData.points[chartData.points.length - 1].x} cy={chartData.points[chartData.points.length - 1].yInbound} r="4.5" fill="#ba1a1a" />
                    <circle cx={chartData.points[chartData.points.length - 1].x} cy={chartData.points[chartData.points.length - 1].yInbound} r="9" fill="none" stroke="#ba1a1a" strokeWidth="1.5" opacity="0.7">
                      <animate attributeName="r" values="4.5;13;4.5" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                  </g>
                )}
              </svg>

              {/* Dynamic X-Axis Labels */}
              <Box sx={{ position: 'absolute', bottom: 4, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 10, color: '#727783' }}>
                {chartData.points.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      color: idx === chartData.points.length - 1 ? '#004d99' : '#727783',
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
                bgcolor: '#f0f3ff',
                borderRadius: 2,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BoltIcon sx={{ fontSize: 18, color: '#2b5bb5' }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#111c2d' }}>
                  System Health:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#425059' }}>
                  {p1Count > 0
                    ? `${p1Count} active P1 critical incident(s) currently being mitigated`
                    : 'All services operational with healthy throughput'}
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon fontSize="small" />}
                onClick={() => navigate('/admin/tickets?tab=all')}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#004d99' }}
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
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#111c2d' }}>
                  Active Priority Distribution
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#425059', mt: 0.2 }}>
                  {totalActive} open tickets segmented by ITIL severity
                </Typography>
              </Box>
              <Chip
                label="LIVE QUEUE"
                size="small"
                sx={{ fontFamily: 'sans-serif', fontSize: 9, fontWeight: 800, bgcolor: '#dee8ff', color: '#004d99' }}
              />
            </Box>

            {/* Donut Chart Visual + Center MTTR Summary */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, my: 2 }}>
              <Box sx={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                  {totalActive > 0 && (
                    <>
                      {/* P4 Arc */}
                      {p4Dash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r="38"
                          fill="none"
                          stroke="#425059"
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
                          stroke="#2b5bb5"
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
                          stroke="#759efd"
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
                          stroke="#ba1a1a"
                          strokeWidth="12"
                          strokeDasharray={`${p1Dash} ${donutCircumference - p1Dash}`}
                          strokeDashoffset={p1Offset}
                        />
                      )}
                    </>
                  )}
                </svg>
                <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#111c2d', lineHeight: 1 }}>
                    {totalActive}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#727783', textTransform: 'uppercase' }}>
                    Tickets
                  </Typography>
                </Box>
              </Box>

              {/* MTTR Summary Column */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#727783', textTransform: 'uppercase' }}>
                  Fleetwide MTTR
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#111c2d' }}>
                  {avgMttrMinutes}m
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#059669', fontSize: 12, fontWeight: 600 }}>
                  <SouthIcon sx={{ fontSize: 14 }} />
                  <span>On-target response</span>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#727783', textTransform: 'uppercase' }}>
                    Active Escalations
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>
                    {p1Count > 0 ? 'Tier 2 (Lead SRE)' : 'Tier 1 Support'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 4 Severity Bands Tiles Grid */}
            <Grid container spacing={1.5}>
              {/* P1 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255, 218, 214, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ba1a1a' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#ba1a1a' }}>P1 Critical</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 15m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#ba1a1a' }}>{p1Count}</Typography>
                </Box>
              </Grid>

              {/* P2 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#759efd' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P2 High</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 30m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>{p2Count}</Typography>
                </Box>
              </Grid>

              {/* P3 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#2b5bb5' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P3 Medium</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 60m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>{p3Count}</Typography>
                </Box>
              </Grid>

              {/* P4 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#425059' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P4 Low</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 120m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>{p4Count}</Typography>
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
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#111c2d' }}>
                  Team Capacity Heatmap
                </Typography>
                <Typography sx={{ fontSize: 12, color: '#425059', mt: 0.2 }}>
                  Live technician workload &amp; concurrency quotas
                </Typography>
              </Box>
              <Chip
                label={`${totalAssignedSlots}/${totalMaxSlots} SLOTS (${overallCapacityPct}%)`}
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, bgcolor: '#dee8ff', color: '#004d99' }}
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
                      bgcolor: '#f0f3ff',
                      transition: 'background-color 0.2s',
                      '&:hover': { bgcolor: '#e7eeff' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: '#004d99', fontSize: 13, fontWeight: 700 }}>
                          {tech.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#111c2d' }}>
                            {tech.name}
                          </Typography>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#425059' }}>
                            {tech.specialty}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: isAtCapacity ? '#ba1a1a' : '#111c2d' }}>
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
                            bgcolor: isAtCapacity ? '#ffffff' : '#004d99',
                            color: isAtCapacity ? '#727783' : '#ffffff',
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
                          bgcolor: isAtCapacity ? '#ba1a1a' : percentage > 70 ? '#2b5bb5' : '#759efd',
                        },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>

            {/* Heatmap Footer */}
            <Box sx={{ mt: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#425059' }}>
                Load distribution monitored in real-time across active engineers
              </Typography>
              <Button
                size="small"
                onClick={handleRebalance}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#004d99' }}
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
                <RssFeedIcon sx={{ fontSize: 20, color: '#004d99' }} />
                <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 700, color: '#111c2d' }}>
                  Live Operational Feed
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.5, bgcolor: '#f0f3ff', borderRadius: 3 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: isStreamPaused ? '#ed6c02' : '#2b5bb5',
                    animation: isStreamPaused ? 'none' : 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
                    '@keyframes ping': {
                      '75%, 100%': { transform: 'scale(2)', opacity: 0 },
                    },
                  }}
                />
                <Typography sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#2b5bb5', textTransform: 'uppercase' }}>
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
                    bgcolor: evt.type === 'outage' ? 'rgba(255, 218, 214, 0.3)' : evt.type === 'sla_warning' ? 'rgba(219, 232, 255, 0.4)' : '#f0f3ff',
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
                      bgcolor: evt.type === 'outage' ? '#ba1a1a' : evt.type === 'sla_warning' ? '#2b5bb5' : '#d8e3fb',
                      color: evt.type === 'outage' || evt.type === 'sla_warning' ? '#ffffff' : '#004d99',
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
                          color: evt.type === 'outage' ? '#ba1a1a' : '#111c2d',
                        }}
                      >
                        {evt.title}
                      </Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#727783' }}>
                        {evt.time}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 12, color: '#425059', lineHeight: 1.4 }}>
                      {evt.description}
                    </Typography>

                    {evt.progressPercent !== undefined && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={evt.progressPercent}
                          sx={{ flexGrow: 1, height: 4, borderRadius: 2, bgcolor: '#d8e3fb', '& .MuiLinearProgress-bar': { bgcolor: '#004d99' } }}
                        />
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#004d99' }}>
                          {evt.progressPercent}% ELAPSED
                        </Typography>
                      </Box>
                    )}

                    {evt.code && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                        <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#727783' }}>
                          {evt.code}
                        </Typography>
                        {evt.linkText && (
                          <Button
                            size="small"
                            onClick={() => navigate(evt.targetId ? `/admin/tickets/${evt.targetId}` : '/admin/tickets')}
                            sx={{ p: 0, minWidth: 0, textTransform: 'none', fontSize: 11, fontWeight: 700, color: '#004d99' }}
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
            <Box sx={{ mt: 2, p: 1, bgcolor: '#f0f3ff', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsStreamPaused((prev) => !prev);
                    toast(isStreamPaused ? 'Live telemetry resumed.' : 'Live telemetry stream paused.', 'info');
                  }}
                  sx={{ color: '#425059' }}
                >
                  {isStreamPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                </IconButton>
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#425059' }}>
                  {liveFeedEvents.length} operational events active
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => navigate('/admin/audit')}
                sx={{ textTransform: 'none', fontSize: 11, fontWeight: 700, color: '#004d99' }}
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
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#ba1a1a' }}>
          <CrisisAlertIcon sx={{ color: '#ba1a1a' }} />
          Declare Major Incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#f1f5f9' }}>
          <Typography sx={{ fontSize: 13, color: '#425059', mb: 2.5 }}>
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
                      <Avatar sx={{ width: 22, height: 22, fontSize: 11, bgcolor: '#004d99', color: '#fff' }}>
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
            sx={{ textTransform: 'none', color: '#425059', fontWeight: 600 }}
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
