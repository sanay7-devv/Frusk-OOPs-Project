import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tooltip,
  IconButton,
  InputBase,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  AccountTree as AccountTreeIcon,
  Dns as DnsIcon,
  Hub as HubIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
  CrisisAlert as CrisisAlertIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  FilterCenterFocus as FilterCenterFocusIcon,
  Radar as RadarIcon,
  Close as CloseIcon,
  Bolt as BoltIcon,
  TrendingDown as TrendingDownIcon,
  Storefront as StorefrontIcon,
  PhoneAndroid as PhoneAndroidIcon,
  Storage as StorageIcon,
  Cloud as CloudIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  OpenInNew as OpenInNewIcon,
  Timer as TimerIcon,
  Public as PublicIcon,
  Lan as LanIcon,
} from '@mui/icons-material';
import {
  getAdminServices,
  replaceAdminServiceDependencies,
  AdminService,
  deriveServiceCode,
  deriveServiceTier,
} from '../../api/admin';
import { listIncidents } from '../../api/incidents';
import { useToast } from '../../components/Toast';

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
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#6366f1',
  primaryContainer: '#4f46e5',
  secondary: '#06b6d4',
  secondaryContainer: 'rgba(6, 182, 212, 0.2)',
  error: '#f43f5e',
  errorContainer: 'rgba(244, 63, 94, 0.15)',
  success: '#10b981',
  successContainer: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningContainer: 'rgba(245, 158, 11, 0.15)',
};

export default function ServiceGraph() {
  const toast = useToast();
  const navigate = useNavigate();

  // Canvas View & Selection State
  const [selectedService, setSelectedService] = useState<AdminService | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [depsModalOpen, setDepsModalOpen] = useState(false);
  const [activeDeps, setActiveDeps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'degraded' | 'outage'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [blastRadiusMode, setBlastRadiusMode] = useState(true);
  const [hoveredServiceId, setHoveredServiceId] = useState<number | null>(null);

  // Canvas Pan & Zoom
  const [scale, setScale] = useState(0.96);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Query 1: Services List from Backend
  const {
    data: services = [],
    isLoading: isLoadingServices,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['admin-service-graph'],
    queryFn: getAdminServices,
    refetchInterval: 10000,
  });

  // Query 2: Live Incident Telemetry from Backend
  const {
    data: incidentPage,
    isLoading: isLoadingIncidents,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ['admin-service-graph-telemetry'],
    queryFn: () => listIncidents({ size: 100 }),
    refetchInterval: 10000,
  });

  const allIncidents = (incidentPage as any)?.items || (incidentPage as any)?.content || [];

  // Active Unresolved Incidents mapped by service ID
  const activeIncidentsByService = useMemo(() => {
    const map = new Map<number, any[]>();
    allIncidents.forEach((inc: any) => {
      if (inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' && inc.service?.id) {
        const existing = map.get(inc.service.id) || [];
        existing.push(inc);
        map.set(inc.service.id, existing);
      }
    });
    return map;
  }, [allIncidents]);

  // Downstream consumers mapping (who depends on service X)
  const downstreamMap = useMemo(() => {
    const map = new Map<number, AdminService[]>();
    services.forEach((svc) => {
      const deps = svc.dependencyIds || svc.directDependencyIds || [];
      deps.forEach((parentDepId) => {
        const list = map.get(parentDepId) || [];
        list.push(svc);
        map.set(parentDepId, list);
      });
    });
    return map;
  }, [services]);

  // Transitive Downstream Cascade Calculation for Blast Radius Mode
  const getTransitiveDownstream = useCallback(
    (svcId: number): Set<number> => {
      const visited = new Set<number>();
      const queue = [svcId];
      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = downstreamMap.get(current) || [];
        for (const child of children) {
          if (!visited.has(child.id)) {
            visited.add(child.id);
            queue.push(child.id);
          }
        }
      }
      return visited;
    },
    [downstreamMap]
  );

  // Check if a service has direct outage or cascade risk
  const getOutageStatus = useCallback(
    (svc: AdminService) => {
      const directTickets = activeIncidentsByService.get(svc.id) || [];
      if (directTickets.length > 0) {
        return {
          status: 'DIRECT_OUTAGE',
          ticket: directTickets[0],
          count: directTickets.length,
        };
      }

      const deps = svc.dependencyIds || svc.directDependencyIds || [];
      for (const depId of deps) {
        const upstreamTickets = activeIncidentsByService.get(depId) || [];
        if (upstreamTickets.length > 0) {
          const upstreamSvc = services.find((s) => s.id === depId);
          return {
            status: 'CASCADE_RISK',
            ticket: upstreamTickets[0],
            upstreamService: upstreamSvc,
            count: upstreamTickets.length,
          };
        }
      }

      return { status: 'HEALTHY' };
    },
    [activeIncidentsByService, services]
  );

  // Counts & Aggregates
  const totalDependencyLinks = useMemo(() => {
    return services.reduce((acc, s) => acc + (s.dependencyIds?.length || s.directDependencyIds?.length || 0), 0);
  }, [services]);

  const directOutageCount = useMemo(() => {
    return services.filter((s) => getOutageStatus(s).status === 'DIRECT_OUTAGE').length;
  }, [services, getOutageStatus]);

  const cascadeAffectedCount = useMemo(() => {
    return services.filter((s) => getOutageStatus(s).status === 'CASCADE_RISK').length;
  }, [services, getOutageStatus]);

  const healthyCount = useMemo(() => {
    return services.filter((s) => getOutageStatus(s).status === 'HEALTHY').length;
  }, [services, getOutageStatus]);

  const maxBlastRadius = useMemo(() => {
    if (services.length === 0) return 0;
    return Math.max(0, ...services.map((s) => getTransitiveDownstream(s.id).size));
  }, [services, getTransitiveDownstream]);

  const compliancePercent = useMemo(() => {
    if (services.length === 0) return 100;
    return Math.round((healthyCount / services.length) * 100);
  }, [services.length, healthyCount]);

  // Classify services into 3 Architectural Layers for topology layout
  const topologyLayers = useMemo(() => {
    const layer1: AdminService[] = []; // Ingress & Gateways (Top)
    const layer2: AdminService[] = []; // Business Domain & Platform Middleware (Middle)
    const layer3: AdminService[] = []; // Persistence & Cloud Infrastructure (Bottom)

    services.forEach((s) => {
      const deps = s.dependencyIds || s.directDependencyIds || [];
      const code = s.code || deriveServiceCode(s.name, s.id);
      const nameLower = (s.name || '').toLowerCase();

      if (
        code === 'SVC-DB' ||
        code === 'SVC-CLOUD' ||
        nameLower.includes('database') ||
        nameLower.includes('postgres') ||
        nameLower.includes('redis') ||
        nameLower.includes('cache') ||
        nameLower.includes('vpc') ||
        nameLower.includes('aws') ||
        nameLower.includes('kafka')
      ) {
        layer3.push(s);
      } else if (
        code === 'SVC-PAY' ||
        code === 'SVC-IDP' ||
        nameLower.includes('payment') ||
        nameLower.includes('auth') ||
        nameLower.includes('sso') ||
        nameLower.includes('catalog') ||
        s.tier === 'TIER_1' ||
        deps.length >= 1
      ) {
        layer2.push(s);
      } else {
        layer1.push(s);
      }
    });

    // Fallback distribution if all ended up in one layer
    if (layer1.length === 0 && layer2.length > 2) {
      layer1.push(...layer2.splice(0, Math.ceil(layer2.length / 2)));
    }
    if (layer3.length === 0 && layer2.length > 2) {
      layer3.push(...layer2.splice(Math.floor(layer2.length / 2)));
    }

    return { layer1, layer2, layer3 };
  }, [services]);

  // Tier counts
  const tier1Count = useMemo(() => services.filter((s) => s.tier === 'TIER_1').length, [services]);
  const tier2Count = useMemo(() => services.filter((s) => s.tier === 'TIER_2').length, [services]);
  const tier3Count = useMemo(() => services.filter((s) => s.tier === 'TIER_3').length, [services]);

  // Compute 2D Canvas Node Coordinates based on 3 Layers
  const nodePositions = useMemo(() => {
    const positions = new Map<number, { x: number; y: number; width: number; height: number; layer: number }>();
    const cardWidth = 240;
    const cardHeight = 118;
    const canvasWidth = 1260;

    const placeLayerNodes = (layerNodes: AdminService[], yPos: number, layerNum: number) => {
      const count = layerNodes.length;
      if (count === 0) return;
      const step = canvasWidth / (count + 1);
      layerNodes.forEach((node, idx) => {
        const xPos = Math.round(step * (idx + 1) - cardWidth / 2);
        positions.set(node.id, {
          x: xPos,
          y: yPos,
          width: cardWidth,
          height: cardHeight,
          layer: layerNum,
        });
      });
    };

    placeLayerNodes(topologyLayers.layer1, 65, 1);
    placeLayerNodes(topologyLayers.layer2, 275, 2);
    placeLayerNodes(topologyLayers.layer3, 495, 3);

    return positions;
  }, [topologyLayers]);

  // Downstream affected nodes when a node is selected in Blast Radius Mode
  const activeBlastDownstream = useMemo(() => {
    if (!blastRadiusMode || !selectedService) return new Set<number>();
    return getTransitiveDownstream(selectedService.id);
  }, [blastRadiusMode, selectedService, getTransitiveDownstream]);

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.topology-node') || (e.target as HTMLElement).closest('#inspector-panel')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom Handlers
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 1.6));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.5));
  const handleResetView = () => {
    setScale(0.96);
    setPan({ x: 20, y: 20 });
  };

  // Node Selection
  const handleNodeClick = (svc: AdminService) => {
    setSelectedService(svc);
    setInspectorOpen(true);
  };

  // Dependency Editor Modal Handlers
  const handleOpenDepsModal = (svc: AdminService) => {
    setSelectedService(svc);
    setActiveDeps(svc.dependencyIds || svc.directDependencyIds || []);
    setDepsModalOpen(true);
  };

  const handleSaveDependencies = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      await replaceAdminServiceDependencies(selectedService.id, activeDeps);
      toast(`Topology dependencies updated for ${selectedService.name}`, 'success');
      setDepsModalOpen(false);
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to update dependencies', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    refetchServices();
    refetchIncidents();
    toast('Topology graph synchronized with live infrastructure', 'info');
  };

  // Helper to filter nodes
  const isNodeVisible = (svc: AdminService) => {
    if (tierFilter !== 'ALL' && svc.tier !== tierFilter) return false;
    const outageInfo = getOutageStatus(svc);
    if (statusFilter === 'healthy' && outageInfo.status !== 'HEALTHY') return false;
    if (statusFilter === 'degraded' && outageInfo.status !== 'CASCADE_RISK') return false;
    if (statusFilter === 'outage' && outageInfo.status !== 'DIRECT_OUTAGE') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const code = (svc.code || deriveServiceCode(svc.name, svc.id)).toLowerCase();
      const name = (svc.name || '').toLowerCase();
      const desc = (svc.description || '').toLowerCase();
      if (!code.includes(q) && !name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  };

  // Selected Service Detailed Calculations for Inspector
  const selectedOutage = selectedService ? getOutageStatus(selectedService) : null;
  const selectedUpstream = selectedService
    ? services.filter((s) => (selectedService.dependencyIds || []).includes(s.id))
    : [];
  const selectedDownstream = selectedService ? downstreamMap.get(selectedService.id) || [] : [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1440, mx: 'auto', pb: 8 }}>
      {/* 1. TOP HEADER BANNER */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        mb={3}
        spacing={2}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                color: COLORS.success,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.2)',
              }}
            >
              <AccountTreeIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              Service Topology &amp; Architectural Dependency Graph
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant }}>
            Multi-tier infrastructure visualization, live incident cascade analysis, and real-time dependency telemetry
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<DnsIcon />}
            onClick={() => navigate('/admin/services')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.15)', borderColor: COLORS.primary, color: '#ffffff' },
            }}
          >
            Catalog View
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              bgcolor: 'rgba(18, 22, 34, 0.7)',
              backdropFilter: 'blur(10px)',
              '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.15)', borderColor: COLORS.secondary, color: '#ffffff' },
            }}
          >
            Refresh Graph
          </Button>
        </Stack>
      </Stack>

      {/* 2. TOP METRICS KPI CARDS (Matching user image structure) */}
      <Grid container spacing={2.5} mb={3}>
        {/* Card 1: ARCHITECTURE NODES */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: 'rgba(255, 255, 255, 0.18)' },
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>
                ARCHITECTURE NODES
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.onSurface, mt: 0.8, fontFamily: 'Sora, sans-serif' }}>
                {services.length}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.8, fontFamily: 'JetBrains Mono, monospace' }}>
                {topologyLayers.layer1.length} Roots • {topologyLayers.layer2.length} Platform • {topologyLayers.layer3.length} Edge
              </Typography>
            </CardContent>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366f1, #06b6d4)' }} />
          </Card>
        </Grid>

        {/* Card 2: INTER-SERVICE LINKS */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: COLORS.secondary },
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>
                INTER-SERVICE LINKS
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#818cf8', mt: 0.8, fontFamily: 'Sora, sans-serif' }}>
                {totalDependencyLinks}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.8 }}>
                Direct dependency flow relationships mapped
              </Typography>
            </CardContent>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: '#818cf8' }} />
          </Card>
        </Grid>

        {/* Card 3: DIRECT NODE OUTAGES */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${directOutageCount > 0 ? 'rgba(244, 63, 94, 0.4)' : COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: directOutageCount > 0 ? COLORS.error : COLORS.success },
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>
                DIRECT NODE OUTAGES
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: directOutageCount > 0 ? '#fb7185' : '#34d399', mt: 0.8, fontFamily: 'Sora, sans-serif' }}>
                {directOutageCount}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.8 }}>
                {directOutageCount > 0 ? 'Active ticket logged on node' : 'Zero primary service outages'}
              </Typography>
            </CardContent>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: directOutageCount > 0 ? COLORS.error : COLORS.success }} />
          </Card>
        </Grid>

        {/* Card 4: DOWNSTREAM CASCADE RISK */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: `1px solid ${cascadeAffectedCount > 0 ? 'rgba(245, 158, 11, 0.4)' : COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', borderColor: cascadeAffectedCount > 0 ? COLORS.warning : COLORS.success },
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono, monospace' }}>
                DOWNSTREAM CASCADE RISK
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: cascadeAffectedCount > 0 ? '#fbbf24' : '#34d399', mt: 0.8, fontFamily: 'Sora, sans-serif' }}>
                {cascadeAffectedCount}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.8 }}>
                {cascadeAffectedCount > 0 ? 'Services exposed to upstream failures' : 'Zero cascade vulnerabilities'}
              </Typography>
            </CardContent>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, bgcolor: cascadeAffectedCount > 0 ? COLORS.warning : COLORS.success }} />
          </Card>
        </Grid>
      </Grid>

      {/* 3. COMMAND CONTROL & FILTER BAR */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.8,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          {/* Left: Tier Filter Pills (From image) */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <FilterListIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 20 }} />
            <Typography variant="caption" fontWeight={700} sx={{ color: COLORS.onSurfaceVariant, mr: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
              FILTER TIERS:
            </Typography>
            <Chip
              label={`All Tiers (${services.length})`}
              size="small"
              clickable
              onClick={() => setTierFilter('ALL')}
              sx={{
                fontWeight: 600,
                fontSize: 12,
                bgcolor: tierFilter === 'ALL' ? 'rgba(99, 102, 241, 0.25)' : COLORS.surfaceContainerHighest,
                color: tierFilter === 'ALL' ? '#c0c1ff' : COLORS.onSurfaceVariant,
                border: `1px solid ${tierFilter === 'ALL' ? 'rgba(99, 102, 241, 0.5)' : COLORS.border}`,
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              }}
            />
            <Chip
              label={`Tier 1 (Mission Critical)`}
              size="small"
              clickable
              onClick={() => setTierFilter('TIER_1')}
              sx={{
                fontWeight: 600,
                fontSize: 12,
                bgcolor: tierFilter === 'TIER_1' ? 'rgba(244, 63, 94, 0.25)' : COLORS.surfaceContainerHighest,
                color: tierFilter === 'TIER_1' ? '#fca5a5' : COLORS.onSurfaceVariant,
                border: `1px solid ${tierFilter === 'TIER_1' ? 'rgba(244, 63, 94, 0.5)' : COLORS.border}`,
                '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.2)' },
              }}
            />
            <Chip
              label={`Tier 2 (Business Critical)`}
              size="small"
              clickable
              onClick={() => setTierFilter('TIER_2')}
              sx={{
                fontWeight: 600,
                fontSize: 12,
                bgcolor: tierFilter === 'TIER_2' ? 'rgba(6, 182, 212, 0.25)' : COLORS.surfaceContainerHighest,
                color: tierFilter === 'TIER_2' ? '#67e8f9' : COLORS.onSurfaceVariant,
                border: `1px solid ${tierFilter === 'TIER_2' ? 'rgba(6, 182, 212, 0.5)' : COLORS.border}`,
                '&:hover': { bgcolor: 'rgba(6, 182, 212, 0.2)' },
              }}
            />
            <Chip
              label={`Tier 3 (Supporting)`}
              size="small"
              clickable
              onClick={() => setTierFilter('TIER_3')}
              sx={{
                fontWeight: 600,
                fontSize: 12,
                bgcolor: tierFilter === 'TIER_3' ? 'rgba(99, 102, 241, 0.25)' : COLORS.surfaceContainerHighest,
                color: tierFilter === 'TIER_3' ? '#c0c1ff' : COLORS.onSurfaceVariant,
                border: `1px solid ${tierFilter === 'TIER_3' ? 'rgba(99, 102, 241, 0.5)' : COLORS.border}`,
                '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)' },
              }}
            />
          </Stack>

          {/* Right: Quick Search + Blast Radius Toggle + Zoom Tools */}
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            {/* Search Input */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: COLORS.surfaceContainerLow,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                px: 1.5,
                py: 0.4,
                width: { xs: 200, sm: 240 },
                transition: 'all 0.2s',
                '&:focus-within': { borderColor: COLORS.secondary, boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' },
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: '#94a3b8' }} />
              <InputBase
                placeholder="Search service, code, cluster..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  color: COLORS.onSurface,
                  fontSize: 12.5,
                  width: '100%',
                  '& input::placeholder': { color: '#64748b', opacity: 1 },
                }}
              />
              <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.06)', borderRadius: '4px', px: 0.8, py: 0.1 }}>
                <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#94a3b8' }}>⌘K</Typography>
              </Box>
            </Box>

            {/* Blast Radius Mode Toggle */}
            <Button
              variant={blastRadiusMode ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setBlastRadiusMode((b) => !b)}
              startIcon={<RadarIcon sx={{ fontSize: 17, color: blastRadiusMode ? '#ffffff' : '#f43f5e' }} />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 12,
                px: 1.6,
                py: 0.6,
                bgcolor: blastRadiusMode ? 'rgba(244, 63, 94, 0.25)' : 'transparent',
                borderColor: blastRadiusMode ? 'rgba(244, 63, 94, 0.5)' : COLORS.border,
                color: blastRadiusMode ? '#fca5a5' : COLORS.onSurfaceVariant,
                boxShadow: blastRadiusMode ? '0 0 16px rgba(244, 63, 94, 0.3)' : 'none',
                '&:hover': {
                  bgcolor: 'rgba(244, 63, 94, 0.35)',
                  borderColor: COLORS.error,
                  color: '#ffffff',
                },
              }}
            >
              Blast Radius Mode
              <Box
                component="span"
                sx={{
                  ml: 1,
                  px: 0.8,
                  py: 0.1,
                  borderRadius: '9999px',
                  bgcolor: blastRadiusMode ? '#f43f5e' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  fontSize: 9.5,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 800,
                }}
              >
                {blastRadiusMode ? 'ACTIVE' : 'OFF'}
              </Box>
            </Button>

            {/* Pan & Zoom Controls */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                bgcolor: COLORS.surfaceContainerLow,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 2,
                p: 0.3,
              }}
            >
              <Tooltip title="Zoom In" arrow>
                <IconButton size="small" onClick={handleZoomIn} sx={{ color: COLORS.onSurfaceVariant, '&:hover': { color: '#ffffff' } }}>
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out" arrow>
                <IconButton size="small" onClick={handleZoomOut} sx={{ color: COLORS.onSurfaceVariant, '&:hover': { color: '#ffffff' } }}>
                  <RemoveIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset View & Recenter" arrow>
                <Button
                  size="small"
                  onClick={handleResetView}
                  startIcon={<FilterCenterFocusIcon sx={{ fontSize: 15 }} />}
                  sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant, fontSize: 11, fontWeight: 700, px: 1, '&:hover': { color: '#ffffff' } }}
                >
                  Reset
                </Button>
              </Tooltip>
            </Box>
          </Stack>
        </Box>

        {/* Status Filters + Hover Instruction */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, pt: 1, borderTop: `1px solid ${COLORS.border}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              STATUS:
            </Typography>
            <Chip
              label={`All (${services.length})`}
              size="small"
              clickable
              onClick={() => setStatusFilter('all')}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: statusFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: statusFilter === 'all' ? '#ffffff' : '#94a3b8',
              }}
            />
            <Chip
              icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981', mr: -0.5 }} />}
              label={`Healthy (${healthyCount})`}
              size="small"
              clickable
              onClick={() => setStatusFilter('healthy')}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: statusFilter === 'healthy' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: statusFilter === 'healthy' ? '#34d399' : '#94a3b8',
              }}
            />
            <Chip
              icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f59e0b', mr: -0.5 }} />}
              label={`Degraded (${cascadeAffectedCount})`}
              size="small"
              clickable
              onClick={() => setStatusFilter('degraded')}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: statusFilter === 'degraded' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                color: statusFilter === 'degraded' ? '#fbbf24' : '#94a3b8',
              }}
            />
            <Chip
              icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#f43f5e', mr: -0.5 }} />}
              label={`Outage (${directOutageCount})`}
              size="small"
              clickable
              onClick={() => setStatusFilter('outage')}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: statusFilter === 'outage' ? 'rgba(244, 63, 94, 0.2)' : 'transparent',
                color: statusFilter === 'outage' ? '#fb7185' : '#94a3b8',
              }}
            />
          </Stack>

          <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontSize: 11.5 }}>
            Hover over any node to highlight topology dependencies and cascade paths
          </Typography>
        </Box>
      </Paper>

      {/* 4. MAIN INTERACTIVE TOPOLOGY GRAPH CANVAS STAGE */}
      <Box
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        sx={{
          position: 'relative',
          width: '100%',
          height: 740,
          borderRadius: 3,
          overflow: 'hidden',
          bgcolor: COLORS.surfaceContainerLow,
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        {/* Subtle Infrastructure SVG Grid Texture */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: 0.25,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="infra-blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.8" strokeDasharray="2 4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#infra-blueprint-grid)" />
        </svg>

        {/* Dynamic Topology Pan & Zoom Transform Stage */}
        <Box
          sx={{
            position: 'relative',
            width: 1260,
            height: 720,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Layer Background Taxonomy Banners */}
          <Box
            sx={{
              position: 'absolute',
              left: 16,
              top: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(18, 22, 34, 0.85)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 1.5,
              px: 1.5,
              py: 0.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <PublicIcon sx={{ fontSize: 15, color: COLORS.secondary }} />
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tier 1 · User-Facing Ingress &amp; Gateways
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              left: 16,
              top: 224,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(18, 22, 34, 0.85)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 1.5,
              px: 1.5,
              py: 0.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <LanIcon sx={{ fontSize: 15, color: COLORS.primary }} />
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tier 2 · Core Business Domain Services &amp; Middleware
            </Typography>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              left: 16,
              top: 444,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'rgba(18, 22, 34, 0.85)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 1.5,
              px: 1.5,
              py: 0.6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <StorageIcon sx={{ fontSize: 15, color: '#10b981' }} />
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Tier 3 · Persistence &amp; Cloud Infrastructure
            </Typography>
          </Box>

          {/* SVG Directed Dependency Flowlines Layer */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Directed Markers */}
              <marker id="arrow-default" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker id="arrow-critical" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f43f5e" />
              </marker>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Render directed bezier paths between connected services */}
            {services.map((svc) => {
              const deps = svc.dependencyIds || svc.directDependencyIds || [];
              const childPos = nodePositions.get(svc.id);
              if (!childPos) return null;

              return deps.map((parentId) => {
                const parentPos = nodePositions.get(parentId);
                if (!parentPos) return null;

                const parentOutage = getOutageStatus(services.find((s) => s.id === parentId) || ({} as any));
                const isParentCritical = parentOutage.status === 'DIRECT_OUTAGE';
                const isParentAmber = parentOutage.status === 'CASCADE_RISK';
                const isSelectedEdge =
                  selectedService?.id === parentId ||
                  selectedService?.id === svc.id ||
                  hoveredServiceId === parentId ||
                  hoveredServiceId === svc.id;

                const isBlastImpacted =
                  blastRadiusMode &&
                  selectedService &&
                  (selectedService.id === parentId || activeBlastDownstream.has(parentId)) &&
                  activeBlastDownstream.has(svc.id);

                // Coordinates for smooth orthogonal / bezier curve
                const startX = parentPos.x + parentPos.width / 2;
                const startY = parentPos.y + (parentPos.y < childPos.y ? parentPos.height : 0);
                const endX = childPos.x + childPos.width / 2;
                const endY = childPos.y + (parentPos.y < childPos.y ? 0 : childPos.height);
                const midY = (startY + endY) / 2;

                const pathData = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

                let strokeColor = 'rgba(148, 163, 184, 0.35)';
                let strokeWidth = 1.6;
                let marker = 'url(#arrow-default)';
                let strokeDash = '4 4';

                if (isBlastImpacted || isParentCritical) {
                  strokeColor = '#f43f5e';
                  strokeWidth = 2.8;
                  marker = 'url(#arrow-critical)';
                  strokeDash = '6 3';
                } else if (isParentAmber) {
                  strokeColor = '#f59e0b';
                  strokeWidth = 2.2;
                  marker = 'url(#arrow-amber)';
                  strokeDash = '5 3';
                } else if (isSelectedEdge) {
                  strokeColor = '#6366f1';
                  strokeWidth = 2.4;
                  marker = 'url(#arrow-active)';
                  strokeDash = 'none';
                }

                return (
                  <path
                    key={`edge-${parentId}->${svc.id}`}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    markerEnd={marker}
                    style={{
                      transition: 'stroke 0.2s, stroke-width 0.2s',
                    }}
                  />
                );
              });
            })}
          </svg>

          {/* Service Topology Nodes (Rendered in 2D Space) */}
          {services.map((svc) => {
            const pos = nodePositions.get(svc.id);
            if (!pos) return null;

            const isVisible = isNodeVisible(svc);
            const outage = getOutageStatus(svc);
            const isDirectOutage = outage.status === 'DIRECT_OUTAGE';
            const isCascadeRisk = outage.status === 'CASCADE_RISK';
            const isSelected = selectedService?.id === svc.id;
            const isHovered = hoveredServiceId === svc.id;

            const isBlastTarget = blastRadiusMode && isSelected;
            const isBlastVictim = blastRadiusMode && activeBlastDownstream.has(svc.id);

            const svcCode = svc.code || deriveServiceCode(svc.name, svc.id);

            // Dim node if filtered or not in search
            const opacity = !isVisible ? 0.2 : blastRadiusMode && selectedService && !isBlastTarget && !isBlastVictim ? 0.35 : 1;

            return (
              <Box
                key={svc.id}
                className="topology-node"
                onClick={() => handleNodeClick(svc)}
                onMouseEnter={() => setHoveredServiceId(svc.id)}
                onMouseLeave={() => setHoveredServiceId(null)}
                sx={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  width: pos.width,
                  minHeight: pos.height,
                  borderRadius: 2.5,
                  p: 1.6,
                  bgcolor: isDirectOutage
                    ? 'rgba(244, 63, 94, 0.12)'
                    : isCascadeRisk
                    ? 'rgba(245, 158, 11, 0.1)'
                    : isSelected
                    ? 'rgba(99, 102, 241, 0.16)'
                    : 'rgba(18, 22, 34, 0.88)',
                  backdropFilter: 'blur(16px)',
                  border: '1.5px solid',
                  borderColor: isDirectOutage
                    ? '#f43f5e'
                    : isCascadeRisk
                    ? '#f59e0b'
                    : isSelected
                    ? '#6366f1'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(255, 255, 255, 0.08)',
                  boxShadow: isDirectOutage
                    ? '0 0 24px rgba(244, 63, 94, 0.35), 0 8px 16px rgba(0,0,0,0.6)'
                    : isCascadeRisk
                    ? '0 0 20px rgba(245, 158, 11, 0.3), 0 8px 16px rgba(0,0,0,0.6)'
                    : isSelected
                    ? '0 0 20px rgba(99, 102, 241, 0.35), 0 8px 16px rgba(0,0,0,0.6)'
                    : '0 4px 16px rgba(0, 0, 0, 0.4)',
                  cursor: 'pointer',
                  zIndex: isSelected ? 20 : isDirectOutage ? 15 : 10,
                  opacity,
                  transition: 'all 0.22s ease-in-out',
                  transform: isHovered || isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Node Top Strip: Code + Health Beacon */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
                  <Chip
                    label={svcCode}
                    size="small"
                    sx={{
                      height: 19,
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      bgcolor: isDirectOutage ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      color: isDirectOutage ? '#f43f5e' : '#dfe2ef',
                      border: `1px solid ${isDirectOutage ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                    }}
                  />

                  {/* Status Indicator Pill */}
                  {isDirectOutage ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, color: '#f43f5e' }}>
                        P1 OUTAGE
                      </Typography>
                    </Box>
                  ) : isCascadeRisk ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 800, color: '#f59e0b' }}>
                        IMPACTED
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10b981' }} />
                      <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 600, color: '#34d399' }}>
                        NOMINAL
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Service Name */}
                <Typography
                  sx={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 13,
                    fontWeight: 700,
                    color: isDirectOutage ? '#fca5a5' : '#ffffff',
                    lineHeight: 1.25,
                    mb: 0.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {svc.name}
                </Typography>

                {/* Subtext: Live Telemetry or Description */}
                <Typography
                  sx={{
                    fontSize: 11,
                    color: isDirectOutage ? '#f43f5e' : isCascadeRisk ? '#fbbf24' : '#94a3b8',
                    fontWeight: isDirectOutage || isCascadeRisk ? 600 : 400,
                    lineHeight: 1.2,
                    mb: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isDirectOutage
                    ? `${outage.ticket?.code}: ${outage.ticket?.title}`
                    : isCascadeRisk
                    ? `Upstream ${outage.upstreamService?.name || 'node'} degraded`
                    : svc.description || 'Enterprise platform service'}
                </Typography>

                {/* Bottom Row: Tier Badge + Telemetry Stat */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.6, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#64748b' }}>
                    {svc.tier === 'TIER_1' ? 'Tier-1 Crit' : svc.tier === 'TIER_2' ? 'Tier-2 Core' : 'Tier-3 Base'}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      color: isDirectOutage ? '#f43f5e' : isCascadeRisk ? '#f59e0b' : '#38bdf8',
                    }}
                  >
                    {isDirectOutage ? 'ERR: 34%' : isCascadeRisk ? 'p99: 890ms' : 'p99: 38ms'}
                  </Typography>
                </Box>

                {/* Active Selection Indicator */}
                {isSelected && (
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, bgcolor: '#6366f1' }} />
                )}
              </Box>
            );
          })}
        </Box>

        {/* Canvas Bottom-Left Status Pill Bar */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            bgcolor: 'rgba(18, 22, 34, 0.88)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${COLORS.border}`,
            px: 2,
            py: 0.8,
            borderRadius: '9999px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HubIcon sx={{ fontSize: 15, color: COLORS.secondary }} />
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurface, fontFamily: 'Geist, sans-serif' }}>
              Topology Engine:
            </Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
              Deterministic Orthogonal Hierarchical Layout
            </Typography>
          </Box>
          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(255, 255, 255, 0.2)' }} />
          <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant }}>
            Mesh Telemetry Sync: <strong style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>Real-time (10s sync)</strong>
          </Typography>
        </Box>

        {/* 5. FLOATING SLIDE-IN TRIAGE INSPECTOR DRAWER (380px) */}
        {inspectorOpen && selectedService && (
          <Paper
            id="inspector-panel"
            elevation={0}
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              bottom: 14,
              width: { xs: 320, sm: 380 },
              bgcolor: 'rgba(15, 19, 29, 0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${selectedOutage?.status === 'DIRECT_OUTAGE' ? 'rgba(244, 63, 94, 0.45)' : 'rgba(255, 255, 255, 0.12)'}`,
              borderRadius: 3,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.15)',
              zIndex: 35,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'drawerSlide 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
              '@keyframes drawerSlide': {
                '0%': { transform: 'translateX(20px)', opacity: 0 },
                '100%': { transform: 'translateX(0)', opacity: 1 },
              },
            }}
          >
            {/* Drawer Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: 'rgba(18, 22, 34, 0.85)',
                borderBottom: `1px solid ${COLORS.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CrisisAlertIcon sx={{ fontSize: 20, color: selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : COLORS.primary }} />
                <Typography sx={{ fontWeight: 800, fontSize: 14, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  Triage Inspector
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={selectedOutage?.status === 'DIRECT_OUTAGE' ? 'SEV-1 ACTIVE' : selectedOutage?.status === 'CASCADE_RISK' ? 'DEGRADED' : 'HEALTHY'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    fontFamily: 'JetBrains Mono, monospace',
                    bgcolor: selectedOutage?.status === 'DIRECT_OUTAGE' ? 'rgba(244, 63, 94, 0.25)' : selectedOutage?.status === 'CASCADE_RISK' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                    color: selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : selectedOutage?.status === 'CASCADE_RISK' ? '#fbbf24' : '#10b981',
                  }}
                />
                <IconButton size="small" onClick={() => setInspectorOpen(false)} sx={{ color: '#94a3b8', '&:hover': { color: '#ffffff' } }}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>

            {/* Drawer Scrollable Body */}
            <Box sx={{ p: 2.2, flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Selected Target Header */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    SELECTED NODE
                  </Typography>
                  <Chip
                    label={`CRITICALITY ${selectedService.criticality}/5`}
                    size="small"
                    sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: 'rgba(255, 255, 255, 0.06)', color: '#dfe2ef', fontFamily: 'JetBrains Mono, monospace' }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={800} sx={{ color: '#ffffff', fontFamily: 'Sora, sans-serif', lineHeight: 1.2 }}>
                  {selectedService.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.4 }}>
                  Owner: <b style={{ color: '#dfe2ef' }}>{selectedService.owner || 'Platform Core'}</b> • Tier: <b style={{ color: '#38bdf8' }}>{selectedService.tier}</b>
                </Typography>
              </Box>

              {/* Outage Incident Alert Card */}
              {selectedOutage?.status === 'DIRECT_OUTAGE' ? (
                <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.35)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 800, color: '#f43f5e' }}>
                      {selectedOutage.ticket?.code || 'ACTIVE INCIDENT'}
                    </Typography>
                    <Chip label={selectedOutage.ticket?.priority || 'P1'} size="small" sx={{ height: 18, fontSize: 10, fontWeight: 800, bgcolor: '#f43f5e', color: '#ffffff' }} />
                  </Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff', mb: 0.4 }}>
                    {selectedOutage.ticket?.title}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: '#fca5a5', lineHeight: 1.3 }}>
                    {selectedOutage.ticket?.description || 'Active service failure disrupting dependency mesh.'}
                  </Typography>
                </Box>
              ) : selectedOutage?.status === 'CASCADE_RISK' ? (
                <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 800, color: '#fbbf24', mb: 0.4 }}>
                    CASCADE IMPACT WARNING
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#fde68a', lineHeight: 1.3 }}>
                    Upstream service <b>{selectedOutage.upstreamService?.name}</b> is degraded. Downstream ingress traffic may experience elevated latencies.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <CheckCircleIcon sx={{ fontSize: 20, color: '#10b981' }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#a7f3d0' }}>
                    100% Operational • Zero Active Incidents
                  </Typography>
                </Box>
              )}

              {/* Financial & Operational Blast Radius */}
              <Box sx={{ p: 1.8, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                    ESTIMATED BLAST RADIUS
                  </Typography>
                  <Typography variant="h6" fontWeight={800} sx={{ color: selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#ffffff', fontFamily: 'Sora, sans-serif' }}>
                    {selectedOutage?.status === 'DIRECT_OUTAGE' ? `$${(selectedService.criticality * 3680).toLocaleString()}` : '$0'}
                    <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8' }}> / hr</span>
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: selectedOutage?.status === 'DIRECT_OUTAGE' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)', color: selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#94a3b8' }}>
                  <TrendingDownIcon sx={{ fontSize: 22 }} />
                </Box>
              </Box>

              {/* Cascade Impact Analysis: Downstream Consumers */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>
                    Cascade Impact Analysis
                  </Typography>
                  <Chip
                    label={`${selectedDownstream.length} Downstream`}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      fontWeight: 800,
                      fontFamily: 'JetBrains Mono, monospace',
                      bgcolor: selectedDownstream.length > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                      color: selectedDownstream.length > 0 ? '#f43f5e' : '#94a3b8',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 11, color: '#94a3b8', mb: 1 }}>
                  Services directly or transitively reliant on this node:
                </Typography>

                {selectedDownstream.length > 0 ? (
                  <Stack spacing={0.8}>
                    {selectedDownstream.map((d) => {
                      const dOutage = getOutageStatus(d);
                      return (
                        <Box
                          key={d.id}
                          onClick={() => handleNodeClick(d)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 1.5,
                            bgcolor: COLORS.surfaceContainerLow,
                            border: `1px solid ${COLORS.border}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.06)', borderColor: COLORS.secondary },
                          }}
                        >
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#ffffff' }}>
                            {d.name}
                          </Typography>
                          <Typography sx={{ fontSize: 10.5, fontFamily: 'JetBrains Mono, monospace', color: dOutage.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#38bdf8' }}>
                            {dOutage.status === 'DIRECT_OUTAGE' ? 'OUTAGE' : 'DEP LINK'}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                    Edge Service — No downstream dependencies registered.
                  </Typography>
                )}
              </Box>

              {/* Upstream Dependencies */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ffffff', mb: 1 }}>
                  Upstream Dependencies ({selectedUpstream.length})
                </Typography>
                {selectedUpstream.length > 0 ? (
                  <Stack direction="row" spacing={0.8} flexWrap="wrap">
                    {selectedUpstream.map((u) => (
                      <Chip
                        key={u.id}
                        label={u.name}
                        size="small"
                        clickable
                        onClick={() => handleNodeClick(u)}
                        sx={{
                          fontSize: 11,
                          fontWeight: 600,
                          bgcolor: COLORS.surfaceContainerLow,
                          color: '#dfe2ef',
                          border: `1px solid ${COLORS.border}`,
                          '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.2)', borderColor: COLORS.primary },
                        }}
                      />
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 11.5, color: '#64748b', fontStyle: 'italic' }}>
                    Root Platform — Zero upstream dependencies.
                  </Typography>
                )}
              </Box>

              {/* Mini Sparkline Failure Rate Chart */}
              <Box sx={{ p: 1.6, borderRadius: 2, bgcolor: COLORS.surfaceContainerLow, border: `1px solid ${COLORS.border}` }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#dfe2ef' }}>
                    Response Failure Rate (Last 30m)
                  </Typography>
                  <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, fontWeight: 800, color: selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#10b981' }}>
                    {selectedOutage?.status === 'DIRECT_OUTAGE' ? '+95.8% SPIKE' : '0.02% NOMINAL'}
                  </Typography>
                </Box>

                <svg style={{ width: '100%', height: 44, overflow: 'visible' }} preserveAspectRatio="none" viewBox="0 0 300 44">
                  <defs>
                    <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#10b981'} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={selectedOutage?.status === 'DIRECT_OUTAGE' ? '#f43f5e' : '#10b981'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {selectedOutage?.status === 'DIRECT_OUTAGE' ? (
                    <>
                      <path d="M 0 40 Q 60 39, 120 38 T 190 35 T 220 18 T 260 6 T 300 3 L 300 44 L 0 44 Z" fill="url(#spark-grad)" />
                      <path d="M 0 40 Q 60 39, 120 38 T 190 35 T 220 18 T 260 6 T 300 3" fill="none" stroke="#f43f5e" strokeWidth="2.5" />
                      <circle cx="220" cy="18" r="3.5" fill="#f43f5e" />
                    </>
                  ) : (
                    <>
                      <path d="M 0 38 Q 75 37, 150 38 T 225 37 T 300 38 L 300 44 L 0 44 Z" fill="url(#spark-grad)" />
                      <path d="M 0 38 Q 75 37, 150 38 T 225 37 T 300 38" fill="none" stroke="#10b981" strokeWidth="2" />
                    </>
                  )}
                </svg>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 9.5, fontFamily: 'JetBrains Mono, monospace', mt: 0.5 }}>
                  <span>-30m</span>
                  <span>-15m</span>
                  <span>Live</span>
                </Box>
              </Box>
            </Box>

            {/* Action Footer Buttons */}
            <Box sx={{ p: 2, bgcolor: 'rgba(18, 22, 34, 0.95)', borderTop: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<HubIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleOpenDepsModal(selectedService)}
                sx={{
                  bgcolor: COLORS.primary,
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: 'none',
                  borderRadius: 2,
                  py: 0.8,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  '&:hover': { bgcolor: '#4f46e5' },
                }}
              >
                Edit Topology Links
              </Button>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/admin/services')}
                  startIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderColor: COLORS.border,
                    color: COLORS.onSurfaceVariant,
                    textTransform: 'none',
                    fontSize: 11.5,
                    borderRadius: 1.5,
                    '&:hover': { color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' },
                  }}
                >
                  View Catalog
                </Button>

                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/admin/tickets?tab=all')}
                  startIcon={<CrisisAlertIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderColor: COLORS.border,
                    color: COLORS.onSurfaceVariant,
                    textTransform: 'none',
                    fontSize: 11.5,
                    borderRadius: 1.5,
                    '&:hover': { color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' },
                  }}
                >
                  Tickets Hub
                </Button>
              </Box>
            </Box>
          </Paper>
        )}
      </Box>

      {/* 6. BOTTOM GLOBAL METRICS SUMMARY GRID (From reference code) */}
      <Grid container spacing={2.5} mt={1}>
        {/* Stat 1 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.15)', color: COLORS.primary }}>
              <AccountTreeIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                Mapped Dependencies
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                {totalDependencyLinks} Active Directed Edges
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Stat 2 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(244, 63, 94, 0.15)', color: COLORS.error }}>
              <RadarIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                Max Blast Radius
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.error, fontFamily: 'Sora, sans-serif' }}>
                {maxBlastRadius} Microservices Chain
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Stat 3 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(6, 182, 212, 0.15)', color: COLORS.secondary }}>
              <TimerIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                SLA Breach Window
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                {directOutageCount > 0 ? 'P1 Active Escalation' : '100% Target Met'}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Stat 4 */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${COLORS.border}`,
              bgcolor: COLORS.surfaceContainer,
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.15)', color: COLORS.success }}>
              <CheckCircleIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: COLORS.onSurfaceVariant, fontFamily: 'JetBrains Mono, monospace' }}>
                Mesh Health &amp; Compliance
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 800, color: COLORS.success, fontFamily: 'Sora, sans-serif' }}>
                {compliancePercent}% In Nominal Compliance
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 7. DEPENDENCY LINK EDITOR MODAL */}
      <Dialog
        open={depsModalOpen}
        onClose={() => setDepsModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(18, 22, 34, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
          Topology Links: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mb: 2 }}>
            Select all upstream dependencies for <b>{selectedService?.name}</b>. The graph will immediately update
            its directed dependency flowlines and cascade analysis.
          </Typography>

          <Stack spacing={1.5}>
            {services
              .filter((s) => s.id !== selectedService?.id)
              .map((svc) => {
                const isSelected = activeDeps.includes(svc.id);
                return (
                  <Paper
                    key={svc.id}
                    elevation={0}
                    onClick={() => {
                      if (isSelected) {
                        setActiveDeps(activeDeps.filter((id) => id !== svc.id));
                      } else {
                        setActiveDeps([...activeDeps, svc.id]);
                      }
                    }}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      bgcolor: isSelected ? 'rgba(99, 102, 241, 0.15)' : COLORS.surfaceContainerLowest,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        borderColor: isSelected ? COLORS.primary : 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={svc.code || deriveServiceCode(svc.name, svc.id)}
                          size="small"
                          sx={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.72rem', bgcolor: COLORS.surfaceContainerHighest, color: COLORS.primary }}
                        />
                        <Typography variant="body2" fontWeight={700} sx={{ color: COLORS.onSurface }}>
                          {svc.name}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                        {svc.description}
                      </Typography>
                    </Box>
                    <Checkbox checked={isSelected} sx={{ color: COLORS.primary, '&.Mui-checked': { color: COLORS.primary } }} />
                  </Paper>
                );
              })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setDepsModalOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDependencies}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary, color: '#ffffff', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Updating...' : 'Save Topology Links'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
