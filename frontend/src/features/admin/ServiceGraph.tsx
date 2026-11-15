import { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Hub as HubIcon,
  AccountTree as AccountTreeIcon,
  WarningAmber as WarningIcon,
  CheckCircle as CheckCircleIcon,
  CrisisAlert as CrisisAlertIcon,
  Dns as DnsIcon,
  Star as StarIcon,
  ArrowForward as ArrowForwardIcon,
  FilterList as FilterListIcon,
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

export default function ServiceGraph() {
  const toast = useToast();
  const navigate = useNavigate();

  // State
  const [selectedService, setSelectedService] = useState<AdminService | null>(null);
  const [depsModalOpen, setDepsModalOpen] = useState(false);
  const [activeDeps, setActiveDeps] = useState<number[]>([]);
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3'>('ALL');
  const [highlightServiceId, setHighlightServiceId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query 1: Services List
  const {
    data: services = [],
    isLoading: isLoadingServices,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['admin-service-graph'],
    queryFn: getAdminServices,
    refetchInterval: 10000,
  });

  // Query 2: Live Incident Telemetry
  const {
    data: incidentPage,
    isLoading: isLoadingIncidents,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ['admin-service-graph-telemetry'],
    queryFn: () => listIncidents({ size: 100 }),
    refetchInterval: 10000,
  });

  const allIncidents = incidentPage?.items || [];

  // Active Unresolved Incidents mapped by service ID
  const activeIncidentsByService = useMemo(() => {
    const map = new Map<number, typeof allIncidents>();
    allIncidents.forEach((inc) => {
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

  // Check if a service has direct or upstream cascade outage
  const getOutageStatus = (svc: AdminService) => {
    const directTickets = activeIncidentsByService.get(svc.id) || [];
    if (directTickets.length > 0) {
      return {
        status: 'DIRECT_OUTAGE',
        ticket: directTickets[0],
        count: directTickets.length,
      };
    }

    // Check upstream dependencies
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
  };

  // Group services into architectural topology layers
  const topologyLayers = useMemo(() => {
    // Layer 1: Foundational Roots (services with 0 upstream dependencies, e.g. Core DB, Identity SSO)
    // Layer 2: Platform Middleware & Core Engines (services that depend on Layer 1)
    // Layer 3: Edge & Client Gateways (external-facing or top-level tools)
    const layer1: AdminService[] = [];
    const layer2: AdminService[] = [];
    const layer3: AdminService[] = [];

    services.forEach((s) => {
      const deps = s.dependencyIds || s.directDependencyIds || [];
      const code = s.code || deriveServiceCode(s.name, s.id);
      const isRoot = deps.length === 0;

      if (isRoot || code === 'SVC-DB' || code === 'SVC-IDP') {
        layer1.push(s);
      } else if (code === 'SVC-PAY' || s.tier === 'TIER_1' || deps.length >= 2) {
        layer2.push(s);
      } else {
        layer3.push(s);
      }
    });

    return { layer1, layer2, layer3 };
  }, [services]);

  // Count total dependency edges
  const totalDependencyLinks = useMemo(() => {
    return services.reduce((acc, s) => acc + (s.dependencyIds?.length || s.directDependencyIds?.length || 0), 0);
  }, [services]);

  // Outage impacted services count
  const cascadeAffectedCount = useMemo(() => {
    return services.filter((s) => {
      const res = getOutageStatus(s);
      return res.status === 'CASCADE_RISK';
    }).length;
  }, [services, activeIncidentsByService]);

  const directOutageCount = useMemo(() => {
    return services.filter((s) => {
      const res = getOutageStatus(s);
      return res.status === 'DIRECT_OUTAGE';
    }).length;
  }, [services, activeIncidentsByService]);

  // Handle Edit Dependencies
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

  // Render Service Tier Badge
  const renderTierBadge = (tier: string, criticality: number, alwaysP1: boolean) => {
    const effectiveTier = tier || deriveServiceTier(criticality, alwaysP1);
    switch (effectiveTier) {
      case 'TIER_1':
        return (
          <Chip
            label="Tier 1"
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}
          />
        );
      case 'TIER_2':
        return (
          <Chip
            label="Tier 2"
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.7rem', bgcolor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc' }}
          />
        );
      case 'TIER_3':
      default:
        return (
          <Chip
            label="Tier 3"
            size="small"
            sx={{ fontWeight: 600, fontSize: '0.7rem', bgcolor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}
          />
        );
    }
  };

  // Helper to render an architectural layer
  const renderLayerCard = (svc: AdminService) => {
    const svcCode = svc.code || deriveServiceCode(svc.name, svc.id);
    const outageInfo = getOutageStatus(svc);
    const isDirectOutage = outageInfo.status === 'DIRECT_OUTAGE';
    const isCascadeRisk = outageInfo.status === 'CASCADE_RISK';
    const isHighlighted = highlightServiceId === svc.id;

    const depIds = svc.dependencyIds || svc.directDependencyIds || [];
    const upstreamServices = services.filter((s) => depIds.includes(s.id));
    const downstreamServices = downstreamMap.get(svc.id) || [];

    return (
      <Grid item xs={12} sm={6} lg={4} key={svc.id}>
        <Card
          onMouseEnter={() => setHighlightServiceId(svc.id)}
          onMouseLeave={() => setHighlightServiceId(null)}
          sx={{
            borderRadius: 3,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.2s ease',
            border: '2px solid',
            borderColor: isDirectOutage
              ? '#ef4444'
              : isCascadeRisk
              ? '#f59e0b'
              : isHighlighted
              ? '#3b82f6'
              : '#d6d0c3',
            boxShadow: isDirectOutage
              ? '0 0 16px rgba(239, 68, 68, 0.2)'
              : isCascadeRisk
              ? '0 0 16px rgba(245, 158, 11, 0.15)'
              : isHighlighted
              ? '0 8px 24px rgba(59, 130, 246, 0.15)'
              : '0 1px 3px rgba(0,0,0,0.05)',
            bgcolor: isDirectOutage ? '#fff5f5' : isCascadeRisk ? '#fffbeb' : '#fffcf5',
          }}
        >
          <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Header: Code + Tier + Criticality */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={svcCode}
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    bgcolor: isDirectOutage ? '#fecaca' : '#f1f5f9',
                    color: isDirectOutage ? '#991b1b' : '#20211f',
                    border: '1px solid',
                    borderColor: isDirectOutage ? '#f87171' : '#cbd5e1',
                  }}
                />
                {renderTierBadge(svc.tier, svc.criticality, svc.alwaysP1)}
              </Stack>

              <Stack direction="row" alignItems="center" spacing={0.5}>
                <StarIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                <Typography variant="caption" fontWeight={800} color="#20211f">
                  {svc.criticality}/5
                </Typography>
              </Stack>
            </Stack>

            {/* Service Title & Owner */}
            <Typography variant="subtitle1" fontWeight={800} color="#20211f" lineHeight={1.3} mb={0.5}>
              {svc.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" mb={1.5} display="block">
              Owner: <b>{svc.owner || 'Platform Engineering'}</b>
            </Typography>

            <Typography variant="body2" color="#475569" sx={{ fontSize: '0.82rem', mb: 2, flexGrow: 1 }}>
              {svc.description || 'Enterprise platform operational service'}
            </Typography>

            {/* Health & Live Incident Banner */}
            <Box
              sx={{
                p: 1.25,
                borderRadius: 2,
                mb: 2,
                bgcolor: isDirectOutage
                  ? '#fee2e2'
                  : isCascadeRisk
                  ? '#fef3c7'
                  : '#ecfdf5',
                border: '1px solid',
                borderColor: isDirectOutage
                  ? '#fca5a5'
                  : isCascadeRisk
                  ? '#fde68a'
                  : '#a7f3d0',
              }}
            >
              {isDirectOutage ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
                  <Box>
                    <Typography variant="caption" fontWeight={800} color="#991b1b" display="block">
                      ACTIVE OUTAGE ({outageInfo.ticket?.priority})
                    </Typography>
                    <Typography variant="caption" color="#7f1d1d" noWrap sx={{ maxWidth: 240, display: 'block' }}>
                      {outageInfo.ticket?.code}: {outageInfo.ticket?.title}
                    </Typography>
                  </Box>
                </Stack>
              ) : isCascadeRisk ? (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
                  <Box>
                    <Typography variant="caption" fontWeight={800} color="#92400e" display="block">
                      CASCADE RISK: Upstream Degraded
                    </Typography>
                    <Typography variant="caption" color="#78350f" noWrap sx={{ maxWidth: 240, display: 'block' }}>
                      Upstream {outageInfo.upstreamService?.name} has open incident
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  <Typography variant="caption" fontWeight={700} color="#065f46">
                    Operational • Telemetry Nominal
                  </Typography>
                </Stack>
              )}
            </Box>

            {/* Topology Relationship Badges */}
            <Stack spacing={1} mb={2}>
              {/* Upstream dependencies */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" mb={0.5}>
                  Depends On (Upstream):
                </Typography>
                {upstreamServices.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {upstreamServices.map((u) => {
                      const uCode = u.code || deriveServiceCode(u.name, u.id);
                      const isUpstreamOutage = (activeIncidentsByService.get(u.id)?.length || 0) > 0;
                      return (
                        <Tooltip key={u.id} title={`${u.name} ${isUpstreamOutage ? '(Outage Detected)' : ''}`}>
                          <Chip
                            label={uCode}
                            size="small"
                            color={isUpstreamOutage ? 'error' : 'default'}
                            sx={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              height: 22,
                              border: isUpstreamOutage ? '1px solid #ef4444' : '1px solid #cbd5e1',
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    Root Platform (Zero upstream dependencies)
                  </Typography>
                )}
              </Box>

              {/* Downstream Consumers */}
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" mb={0.5}>
                  Depended on by (Downstream):
                </Typography>
                {downstreamServices.length > 0 ? (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {downstreamServices.map((d) => {
                      const dCode = d.code || deriveServiceCode(d.name, d.id);
                      return (
                        <Chip
                          key={d.id}
                          label={dCode}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            height: 22,
                            borderColor: '#94a3b8',
                          }}
                        />
                      );
                    })}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary" fontStyle="italic">
                    Edge Service (End-user tier)
                  </Typography>
                )}
              </Box>
            </Stack>

            {/* Quick Actions Footer */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" pt={1.5} borderTop="1px solid #f1f5f9">
              {svc.alwaysP1 ? (
                <Chip
                  icon={<CrisisAlertIcon fontSize="small" sx={{ color: '#dc2626 !important' }} />}
                  label="Always P1"
                  size="small"
                  variant="outlined"
                  color="error"
                  sx={{ fontWeight: 800, fontSize: '0.68rem', height: 22 }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Matrix SLA Policy
                </Typography>
              )}

              <Button
                size="small"
                startIcon={<HubIcon sx={{ fontSize: 16 }} />}
                onClick={() => handleOpenDepsModal(svc)}
                sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem' }}
              >
                Edit Links
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1440, mx: 'auto' }}>
      {/* Header Banner */}
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
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountTreeIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#20211f">
              Service Topology & Architectural Dependency Graph
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Multi-tier infrastructure visualization, live incident cascade analysis, and real-time dependency telemetry
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<DnsIcon />}
            onClick={() => navigate('/admin/services')}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Catalog View
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Refresh Graph
          </Button>
        </Stack>
      </Stack>

      {/* Top Topology Summary KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        {/* Card 1: Monitored Nodes */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #d6d0c3' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Architecture Nodes
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#20211f" mt={0.5}>
                {services.length}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {topologyLayers.layer1.length} Roots • {topologyLayers.layer2.length} Platform • {topologyLayers.layer3.length} Edge
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Dependency Connectors */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #d6d0c3' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Inter-Service Links
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#2563eb" mt={0.5}>
                {totalDependencyLinks}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Direct dependency flow relationships mapped
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Active Outages */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #d6d0c3' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Direct Node Outages
              </Typography>
              <Typography variant="h4" fontWeight={800} color={directOutageCount > 0 ? '#dc2626' : '#059669'} mt={0.5}>
                {directOutageCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {directOutageCount > 0 ? 'Active ticket logged on node' : 'Zero primary service outages'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Cascade Risks */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #d6d0c3' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Downstream Cascade Risk
              </Typography>
              <Typography variant="h4" fontWeight={800} color={cascadeAffectedCount > 0 ? '#d97706' : '#059669'} mt={0.5}>
                {cascadeAffectedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {cascadeAffectedCount > 0 ? 'Services exposed to upstream failures' : 'Zero cascade vulnerabilities'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Layer Controls */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #d6d0c3',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <FilterListIcon sx={{ color: '#64748b', fontSize: 20 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" mr={0.5}>
            FILTER TIERS:
          </Typography>
          <Chip
            label="All Tiers"
            size="small"
            clickable
            color={tierFilter === 'ALL' ? 'primary' : 'default'}
            onClick={() => setTierFilter('ALL')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="Tier 1 (Mission Critical)"
            size="small"
            clickable
            color={tierFilter === 'TIER_1' ? 'error' : 'default'}
            onClick={() => setTierFilter('TIER_1')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="Tier 2 (Business Critical)"
            size="small"
            clickable
            color={tierFilter === 'TIER_2' ? 'primary' : 'default'}
            onClick={() => setTierFilter('TIER_2')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label="Tier 3 (Supporting)"
            size="small"
            clickable
            color={tierFilter === 'TIER_3' ? 'default' : 'default'}
            onClick={() => setTierFilter('TIER_3')}
            sx={{ fontWeight: 600 }}
          />
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Hover over any node to highlight topology dependencies and cascade paths
        </Typography>
      </Paper>

      {isLoadingServices || isLoadingIncidents ? (
        <Box p={8} display="flex" justifyContent="center" alignItems="center">
          <CircularProgress size={36} />
        </Box>
      ) : (
        <Stack spacing={4}>
          {/* Layer 1: Foundational Infrastructure & Data (Roots) */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  bgcolor: '#fee2e2',
                  color: '#991b1b',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                }}
              >
                LAYER 1 • FOUNDATIONAL INFRASTRUCTURE & DATA
              </Box>
              <Typography variant="caption" color="text.secondary">
                Root services with zero upstream dependencies. An outage here directly cascades downstream to Platform and Edge tiers.
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {topologyLayers.layer1
                .filter((s) => tierFilter === 'ALL' || s.tier === tierFilter)
                .map((svc) => renderLayerCard(svc))}
            </Grid>
          </Box>

          {/* Directed Dependency Flow Banner */}
          <Box display="flex" justifyContent="center" alignItems="center" my={-1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: '#f1f5f9', px: 2, py: 0.5, borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={700} color="#475569">
                ▲ DOWNSTREAM FLOW: Platform Middleware depends on Layer 1 Data & Authentication
              </Typography>
            </Stack>
          </Box>

          {/* Layer 2: Platform Middleware & Core Engines */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  bgcolor: '#eff6ff',
                  color: '#1d4ed8',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                }}
              >
                LAYER 2 • PLATFORM ENGINES & MIDDLEWARE
              </Box>
              <Typography variant="caption" color="text.secondary">
                Core transactional engines relying on database and identity infrastructure.
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {topologyLayers.layer2
                .filter((s) => tierFilter === 'ALL' || s.tier === tierFilter)
                .map((svc) => renderLayerCard(svc))}
            </Grid>
          </Box>

          {/* Directed Dependency Flow Banner */}
          <Box display="flex" justifyContent="center" alignItems="center" my={-1}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ bgcolor: '#f1f5f9', px: 2, py: 0.5, borderRadius: 2 }}>
              <Typography variant="caption" fontWeight={700} color="#475569">
                ▲ DOWNSTREAM FLOW: Edge Endpoints depend on Core Identity & Network Infrastructure
              </Typography>
            </Stack>
          </Box>

          {/* Layer 3: Enterprise Edge & Client Gateways */}
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1.5,
                  bgcolor: '#f5f0e5',
                  color: '#334155',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  border: '1px solid #cbd5e1',
                }}
              >
                LAYER 3 • ENTERPRISE EDGE & CLIENT GATEWAYS
              </Box>
              <Typography variant="caption" color="text.secondary">
                Customer, employee, and partner-facing entryways into the enterprise mesh.
              </Typography>
            </Stack>

            <Grid container spacing={3}>
              {topologyLayers.layer3
                .filter((s) => tierFilter === 'ALL' || s.tier === tierFilter)
                .map((svc) => renderLayerCard(svc))}
            </Grid>
          </Box>
        </Stack>
      )}

      {/* Dependency Link Editor Modal */}
      <Dialog open={depsModalOpen} onClose={() => setDepsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#20211f' }}>
          Topology Links: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
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
                      borderColor: isSelected ? '#3b82f6' : '#d6d0c3',
                      bgcolor: isSelected ? '#eff6ff' : '#fffcf5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                          label={svc.code || deriveServiceCode(svc.name, svc.id)}
                          size="small"
                          sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.72rem' }}
                        />
                        <Typography variant="body2" fontWeight={700} color="#20211f">
                          {svc.name}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {svc.description}
                      </Typography>
                    </Box>
                    <Checkbox checked={isSelected} color="primary" />
                  </Paper>
                );
              })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDepsModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDependencies}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {isSubmitting ? 'Updating...' : 'Save Topology Links'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

