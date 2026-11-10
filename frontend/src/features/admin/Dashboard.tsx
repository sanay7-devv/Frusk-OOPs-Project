import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface SreEngineer {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  activeCount: number;
  maxCount: number;
  status: 'busy' | 'available' | 'locked' | 'ready';
}

interface OperationalEvent {
  id: string;
  type: 'outage' | 'sla_warning' | 'reassignment' | 'rollback';
  title: string;
  time: string;
  code?: string;
  description: string;
  linkText?: string;
  progressPercent?: number;
}

const INITIAL_ENGINEERS: SreEngineer[] = [
  {
    id: '1',
    name: 'Marcus Chen',
    specialty: 'Infra Core / DB Tier',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
    activeCount: 4,
    maxCount: 5,
    status: 'busy',
  },
  {
    id: '2',
    name: 'Sarah Jenkins',
    specialty: 'Gateway & Routing',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80',
    activeCount: 2,
    maxCount: 5,
    status: 'available',
  },
  {
    id: '3',
    name: 'Alex Rivera',
    specialty: 'SecOps & IAM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    activeCount: 5,
    maxCount: 5,
    status: 'locked',
  },
  {
    id: '4',
    name: 'Priya Patel',
    specialty: 'Kubernetes Core',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
    activeCount: 1,
    maxCount: 5,
    status: 'ready',
  },
];
//TODO change this afther connecting backend these are hardcoded things only no use
const INITIAL_FEED_EVENTS: OperationalEvent[] = [
  {
    id: 'evt-1',
    type: 'outage',
    title: 'P1 Outage: Payment Gateway',
    time: '14:41:02',
    code: 'SEV_1 // INC-2026-00095',
    description: 'Ingress HTTP 504 spikes detected across India Central & South edge clusters (Mumbai / Hyderabad). Incident bridge #WAR-09 activated.',
    linkText: 'Join Bridge →',
  },
  {
    id: 'evt-2',
    type: 'sla_warning',
    title: 'SLA Warning: INC-2026-00089',
    time: '14:38:22',
    description: '18m remaining prior to tier violation on Elasticsearch-Hot-Node.',
    progressPercent: 76,
  },
  {
    id: 'evt-3',
    type: 'reassignment',
    title: 'Workload Reassigned',
    time: '14:32:10',
    description: 'Elena V. reassigned INC-2026-00094 to Cloud Infra team lead.',
  },
  {
    id: 'evt-4',
    type: 'rollback',
    title: 'Canary Rollback Executed',
    time: '14:27:49',
    description: 'ArgoCD automated roll back on billing-worker-v2.14 after probe fault.',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();

  // Dynamic Indian Standard Time (IST) Clock
  const [istTime, setIstTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setIstTime(`IST ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Time Range Filter for Velocity Chart
  const [velocityRange, setVelocityRange] = useState<'today' | '7d' | '30d'>('today');

  // Live Feed Stream state
  const [isStreamPaused, setIsStreamPaused] = useState(false);
  const [feedEvents, setFeedEvents] = useState<OperationalEvent[]>(INITIAL_FEED_EVENTS);
  const [engineers, setEngineers] = useState<SreEngineer[]>(INITIAL_ENGINEERS);

  // Declare Incident Modal
  const [declareOpen, setDeclareOpen] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentSeverity, setIncidentSeverity] = useState('P1');
  const [incidentService, setIncidentService] = useState('Payment Gateway');

  // Handle Declare Incident
  const handleDeclareSubmit = () => {
    if (!incidentTitle.trim()) {
      toast('Please enter an incident summary', 'warning');
      return;
    }
    const newEvent: OperationalEvent = {
      id: `evt-${Date.now()}`,
      type: 'outage',
      title: `${incidentSeverity} Outage: ${incidentService}`,
      time: new Date().toTimeString().split(' ')[0],
      code: `SEV_1 // INC-2026-00${Math.floor(100 + Math.random() * 900)}`,
      description: incidentTitle,
      linkText: 'Join Bridge →',
    };
    setFeedEvents((prev) => [newEvent, ...prev]);
    toast(`Emergency ${incidentSeverity} Incident declared and broadcasted.`, 'error');
    setDeclareOpen(false);
    setIncidentTitle('');
  };

  // Rebalance workload
  const handleRebalance = () => {
    setEngineers((prev) =>
      prev.map((e) => ({
        ...e,
        activeCount: Math.min(e.maxCount, Math.floor(Math.random() * 3) + 2),
      }))
    );
    toast('Automated round-robin rebalancing completed across all active SREs.', 'info');
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
         

          {/* Heartbeat Indicator */}
          {/*this to show that there is still connection between teh frontend and the application
          it also gives the latency which will help determine the performance of the application */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, px: 1.5, py: 0.6, bgcolor: '#f0f3ff', borderRadius: 2 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '53%',
                bgcolor: '#08e51eff', //? color can be chnaged accoring to the preferences 
                //TODO i have to make this proper and no heartbeat effect for now
                //animation: 'pulse 1.5s infinite',
                //'@keyframes pulse': { //this creates an effect of glowing dot
                  //'0%': { transform: 'scale(0.95)', opacity: 0.7 },
                  //'50%': { transform: 'scale(1.3)', opacity: 1 },
                  //'100%': { transform: 'scale(0.95)', opacity: 0.7 },
                //},
              }}
            />
            <Typography sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#111c2d' }}>
              HEARTBEAT 1.2s {/* //! This has to be changed properly afterwards with real backend latency  */}
            </Typography>
          </Box>

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
        {/* KPI 1: Total Tickets Today */}
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
                Total Tickets Today
              </Typography>
              <ConfirmationNumberIcon sx={{ fontSize: 20, color: '#2b5bb5' }} />
            </Box>
            <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.02em' }}>
                128
              </Typography>
              <Chip
                icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
                label="+12%"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#dee8ff', color: '#004d99' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
              <span>vs. 24h baseline</span>
              <span style={{ fontFamily: 'monospace', color: '#727783' }}>114 prev</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#2b5bb5' }} />
          </Paper>
        </Grid>

        {/* KPI 2: Active Open */}
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
                Active Open
              </Typography>
              <PendingActionsIcon sx={{ fontSize: 20, color: '#425059' }} />
            </Box>
            <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.02em' }}>
                34
              </Typography>
              <Chip
                label="8 triage alert"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 600, bgcolor: '#d8e3fb', color: '#00468c' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
              <span>Immediate attention req.</span>
              <span style={{ fontFamily: 'monospace', color: '#727783' }}>23.5% backlog</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#004d99' }} />
          </Paper>
        </Grid>

        {/* KPI 3: P1 Critical (Urgent Crimson Card) */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Paper
            elevation={0}
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
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(186, 26, 26, 0.12)' },
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
                02
              </Typography>
              <Chip
                icon={<CrisisAlertIcon sx={{ fontSize: 14, color: '#ffffff !important' }} />}
                label="Active War Room"
                size="small"
                sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: '#ba1a1a', color: '#ffffff' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#93000a', fontWeight: 500 }}>
              <span>Payment Gateway + Auth Svc</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>ETA: 24m</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#ba1a1a' }} />
          </Paper>
        </Grid>

        {/* KPI 4: SLA Violations */}
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
                SLA Violations
              </Typography>
              <VerifiedIcon sx={{ fontSize: 20, color: '#059669' }} />
            </Box>
            <Box sx={{ my: 1.5, display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#111c2d', letterSpacing: '-0.02em' }}>
                0
              </Typography>
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 14, color: '#0f1d25 !important' }} />}
                label="100% Preserved"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#d6e5ef', color: '#0f1d25' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
              <span>Zero breaches past 72h</span>
              <span style={{ fontFamily: 'monospace', color: '#727783' }}>STREAK: 9d</span>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, bgcolor: '#059669' }} />
          </Paper>
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
                99.2%
              </Typography>
              <Chip
                label=":>98%"
                size="small"
                sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: '#d9e2ff', color: '#001945' }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#425059' }}>
              <span>Safe margin +1.20%</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#004d99' }}>+0.3% w/w</span>
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
                  Inbound Incidents <span style={{ fontFamily: 'sans-serif', color: '#727783' }}>(Avg: 8.2/h)</span>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#759efd' }} />
                <Typography sx={{ fontSize: 12, color: '#111c2d', fontWeight: 500 }}>
                  Remediated <span style={{ fontFamily: 'sans-serif', color: '#727783' }}>(Avg: 9.1/h)</span>                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, ml: 'auto' }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ba1a1a' }} />
                <Typography sx={{ fontFamily: 'sans-serif', fontSize: 11, fontWeight: 700, color: '#ba1a1a' }}>
                  Current Net Deficit: 0
                </Typography>
              </Box>
            </Box>

            {/* Area Chart SVG (Pixel-perfect matching Stitch mock) */}
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
                {/* Horizontal grid lines */}
                <line x1="0" y1="40" x2="680" y2="40" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <line x1="0" y1="90" x2="680" y2="90" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <line x1="0" y1="140" x2="680" y2="140" stroke="#c2c6d4" strokeDasharray="3 3" strokeOpacity="0.3" />
                <line x1="0" y1="190" x2="680" y2="190" stroke="#c2c6d4" strokeOpacity="0.5" />

                {/* Area 1: Inbound (Primary) */}
                <path d="M 0,160 Q 60,140 120,110 T 240,70 T 360,115 T 480,50 T 600,90 L 680,80 L 680,190 L 0,190 Z" fill="url(#velocityPrimaryGrad)" />
                <path d="M 0,160 Q 60,140 120,110 T 240,70 T 360,115 T 480,50 T 600,90 L 680,80" fill="none" stroke="#004d99" strokeWidth="2.5" />

                {/* Area 2: Resolved (Secondary) */}
                <path d="M 0,175 Q 60,160 120,130 T 240,95 T 360,85 T 480,70 T 600,60 L 680,45 L 680,190 L 0,190 Z" fill="url(#resolvedSecondaryGrad)" />
                <path d="M 0,175 Q 60,160 120,130 T 240,95 T 360,85 T 480,70 T 600,60 L 680,45" fill="none" stroke="#759efd" strokeDasharray="4 2" strokeWidth="2" />

                {/* High alert hotspot ping at 13:15 */}
                <circle cx="480" cy="50" r="4.5" fill="#ba1a1a" />
                <circle cx="480" cy="50" r="10" fill="none" stroke="#ba1a1a" strokeWidth="1.5" opacity="0.6" />

                {/* Vertical Current Time Marker */}
                <line x1="680" y1="0" x2="680" y2="190" stroke="#004d99" strokeWidth="1.5" />
              </svg>

              {/* X-Axis Labels */}
              <Box sx={{ position: 'absolute', bottom: 4, left: 12, right: 12, display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: 10, color: '#727783' }}>
                <span>00:00</span>
                <span>04:00</span>
                <span>08:00</span>
                <span>12:00</span>
                <span style={{ color: '#004d99', fontWeight: 700 }}>16:00 (NOW)</span>
                <span>20:00</span>
                <span>23:59</span>
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
                  Spike detected at 13:15:
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#425059' }}>
                  DB pool exhaustion remediated in 14.2m
                </Typography>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForwardIcon fontSize="small" />}
                onClick={() => navigate('/admin/reports')}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#004d99' }}
              >
                Detailed RCA Drilldown
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
                  34 open tickets segmented by ITIL severity
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
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#dee8ff" strokeWidth="12" />
                  {/* P4: 11 (32.3%) -> dasharray ~77.1 */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#425059" strokeWidth="12" strokeDasharray="77.1 161.6" strokeDashoffset="0" />
                  {/* P3: 14 (41.2%) -> dasharray ~98.3 */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#2b5bb5" strokeWidth="12" strokeDasharray="98.3 140.4" strokeDashoffset="-77.1" />
                  {/* P2: 7 (20.6%) -> dasharray ~49.1 */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#759efd" strokeWidth="12" strokeDasharray="49.1 189.6" strokeDashoffset="-175.4" />
                  {/* P1: 2 (5.9%) -> dasharray ~14.1 */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#ba1a1a" strokeWidth="12" strokeDasharray="14.1 224.6" strokeDashoffset="-224.5" />
                </svg>
                <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#111c2d', lineHeight: 1 }}>
                    34
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
                  32m 40s
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#2b5bb5', fontSize: 12, fontWeight: 600 }}>
                  <SouthIcon sx={{ fontSize: 14 }} />
                  <span>-8.4m vs target</span>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: '#727783', textTransform: 'uppercase' }}>
                    Escalation Load
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>
                    Tier 3 (Lead SRE)
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
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 18m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#ba1a1a' }}>2</Typography>
                </Box>
              </Grid>

              {/* P2 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#759efd' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P2 High</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 45m target</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>7</Typography>
                </Box>
              </Grid>

              {/* P3 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#2b5bb5' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P3 Medium</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 2h 00m</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>14</Typography>
                </Box>
              </Grid>

              {/* P4 */}
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: '#f0f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#425059' }} />
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#111c2d' }}>P4 Low</Typography>
                      <Typography sx={{ fontFamily: 'sans-serif', fontSize: 10, color: '#727783' }}>MTTR: 8h 00m</Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#111c2d' }}>11</Typography>
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
                  On-duty SRE concurrency quotas (5 incidents max / engineer)
                </Typography>
              </Box>
              <Chip
                label="12/20 SLOTS (60%)"
                size="small"
                sx={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, bgcolor: '#dee8ff', color: '#004d99' }}
              />
            </Box>

            {/* Engineer list */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
              {engineers.map((tech) => {
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
                        <Avatar src={tech.avatar} sx={{ width: 32, height: 32 }} />
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
                          disabled={isAtCapacity}
                          startIcon={isAtCapacity ? <LockIcon fontSize="small" /> : undefined}
                          onClick={() => {
                            setEngineers((prev) =>
                              prev.map((eng) =>
                                eng.id === tech.id ? { ...eng, activeCount: eng.activeCount + 1 } : eng
                              )
                            );
                            toast(`Incident dispatched to ${tech.name}`, 'success');
                          }}
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
                          {isAtCapacity ? 'Locked' : tech.status === 'ready' ? 'Instant Dispatch' : 'Dispatch'}
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
                Automatic round-robin load distribution is currently active
              </Typography>
              <Button
                size="small"
                onClick={handleRebalance}
                sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#004d99' }}
              >
                Rebalance Workload(Just timepass)
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

              {/*//TODO have to attacth the real one WebSocket Status Indicator 
              // Use the WebSocket only for the server-to-browser*/}
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
                  {isStreamPaused ? 'Stream: Paused' : 'WebSocket: Connected'}
                </Typography>
              </Box>
            </Box>

            {/* Feed Stream Items Container */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, my: 1, maxHeight: 310, overflowY: 'auto', pr: 0.5 }}>
              {feedEvents.map((evt) => (
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
                            onClick={() => navigate('/admin/incidents')}
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
                {/* //TODO have to chnage the text so that doesn't look like AI */}
                <Typography sx={{ fontFamily: 'monospace', fontSize: 11, color: '#425059' }}>
                  3 events in the last hour
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

      {/* MODAL: Declare Incident Modal */}
      <Dialog
        open={declareOpen}
        onClose={() => setDeclareOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, color: '#ba1a1a' }}>
          <CrisisAlertIcon sx={{ color: '#ba1a1a' }} />
          Declare Critical Major Incident
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: '#f1f5f9' }}>
          <Typography sx={{ fontSize: 13, color: '#425059', mb: 2 }}>
            Declaring a major incident immediately notifies all on-call Lead SREs, creates a dedicated War Room bridge, and overrides default dispatch rules.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Incident Summary / Title"
              fullWidth
              size="small"
              placeholder="e.g., Ingress HTTP 504 spikes across edge clusters"
              value={incidentTitle}
              onChange={(e) => setIncidentTitle(e.target.value)}
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Severity Level"
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value)}
                >
                  <MenuItem value="P1">P1 Critical (War Room)</MenuItem>
                  <MenuItem value="P2">P2 High Outage</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Impacted Service"
                  value={incidentService}
                  onChange={(e) => setIncidentService(e.target.value)}
                >
                  <MenuItem value="Payment Gateway">Payment Gateway</MenuItem>
                  <MenuItem value="Identity & SSO">Identity &amp; SSO</MenuItem>
                  <MenuItem value="Global VPN Edge">Global VPN Edge</MenuItem>
                  <MenuItem value="Postgres Aurora DB">Postgres Aurora DB</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeclareOpen(false)} sx={{ textTransform: 'none', color: '#425059', fontWeight: 600 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeclareSubmit}
            sx={{ bgcolor: '#ba1a1a', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#93000a' } }}
          >
            Confirm &amp; Broadcast Alert
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
