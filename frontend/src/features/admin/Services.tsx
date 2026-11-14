import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  Button,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as ActiveIcon,
  Star as StarIcon,
  AccountTree as AccountTreeIcon,
  WarningAmber as WarningIcon,
  CrisisAlert as CrisisAlertIcon,
  Search as SearchIcon,
  Hub as HubIcon,
  Dns as DnsIcon,
} from '@mui/icons-material';
import {
  getAdminServices,
  createAdminService,
  updateAdminService,
  replaceAdminServiceDependencies,
  deleteAdminService,
  AdminService,
  deriveServiceCode,
  deriveServiceTier,
} from '../../api/admin';
import { listIncidents } from '../../api/incidents';
import { useToast } from '../../components/Toast';

export default function Services() {
  const toast = useToast();
  const navigate = useNavigate();

  // Dialog States
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [depsOpen, setDepsOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<AdminService | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3'>('ALL');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'OUTAGE'>('ALL');

  // Service form state (Create / Edit)
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formOwner, setFormOwner] = useState('Platform Team');
  const [formDescription, setFormDescription] = useState('');
  const [formTier, setFormTier] = useState<'TIER_1' | 'TIER_2' | 'TIER_3'>('TIER_1');
  const [formCriticality, setFormCriticality] = useState(5);
  const [formAlwaysP1, setFormAlwaysP1] = useState(false);
  const [formDeps, setFormDeps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query 1: Admin Services list
  const {
    data: services = [],
    isLoading: isLoadingServices,
    refetch: refetchServices,
  } = useQuery({
    queryKey: ['admin-services-list'],
    queryFn: getAdminServices,
    refetchInterval: 10000,
  });

  // Query 2: Real-time Live Incidents Telemetry
  const {
    data: incidentPage,
    isLoading: isLoadingIncidents,
    refetch: refetchIncidents,
  } = useQuery({
    queryKey: ['admin-services-telemetry'],
    queryFn: () => listIncidents({ size: 100 }),
    refetchInterval: 10000,
  });

  const allIncidents = incidentPage?.items || [];

  // Map service ID to unresolved tickets
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

  // Derived KPI Metrics
  const totalServices = services.length;
  const tier1Count = services.filter((s) => s.tier === 'TIER_1').length;
  const tier2Count = services.filter((s) => s.tier === 'TIER_2').length;
  const tier3Count = services.filter((s) => s.tier === 'TIER_3').length;
  const alwaysP1Count = services.filter((s) => s.alwaysP1).length;

  const servicesWithOutages = useMemo(() => {
    return services.filter((s) => (activeIncidentsByService.get(s.id)?.length || 0) > 0);
  }, [services, activeIncidentsByService]);

  const totalOpenOutages = useMemo(() => {
    let count = 0;
    activeIncidentsByService.forEach((list) => {
      count += list.length;
    });
    return count;
  }, [activeIncidentsByService]);

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.owner && s.owner.toLowerCase().includes(q)) ||
          s.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Tier filter
      if (tierFilter !== 'ALL' && s.tier !== tierFilter) {
        return false;
      }

      // Health filter
      if (healthFilter === 'OUTAGE') {
        const hasOutage = (activeIncidentsByService.get(s.id)?.length || 0) > 0;
        if (!hasOutage) return false;
      }

      return true;
    });
  }, [services, searchQuery, tierFilter, healthFilter, activeIncidentsByService]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setFormCode('');
    setFormName('');
    setFormOwner('Site Reliability Engineering');
    setFormDescription('');
    setFormTier('TIER_1');
    setFormCriticality(5);
    setFormAlwaysP1(true);
    setFormDeps([]);
    setCreateOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (svc: AdminService) => {
    setSelectedService(svc);
    setFormCode(svc.code);
    setFormName(svc.name);
    setFormOwner(svc.owner || 'Platform Team');
    setFormDescription(svc.description || '');
    setFormTier((svc.tier as any) || deriveServiceTier(svc.criticality, svc.alwaysP1));
    setFormCriticality(svc.criticality);
    setFormAlwaysP1(svc.alwaysP1);
    setFormDeps(svc.dependencyIds || svc.directDependencyIds || []);
    setEditOpen(true);
  };

  // Open Manage Dependencies Dialog
  const handleOpenDeps = (svc: AdminService) => {
    setSelectedService(svc);
    setFormDeps(svc.dependencyIds || svc.directDependencyIds || []);
    setDepsOpen(true);
  };

  // Submit Create
  const handleCreateService = async () => {
    if (!formName.trim()) {
      toast('Please enter a service name', 'error');
      return;
    }
    const finalCode = formCode.trim() ? formCode.trim().toUpperCase() : deriveServiceCode(formName, Date.now());
    setIsSubmitting(true);
    try {
      await createAdminService({
        code: finalCode,
        name: formName.trim(),
        owner: formOwner.trim(),
        description: formDescription.trim(),
        tier: formTier,
        criticality: formCriticality,
        alwaysP1: formAlwaysP1,
        active: true,
        directDependencyIds: formDeps,
      });
      toast(`Service ${formName} registered successfully`, 'success');
      setCreateOpen(false);
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to create service', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit
  const handleUpdateService = async () => {
    if (!selectedService || !formName.trim()) return;
    setIsSubmitting(true);
    try {
      await updateAdminService(selectedService.id, {
        code: formCode.trim().toUpperCase() || selectedService.code,
        name: formName.trim(),
        owner: formOwner.trim(),
        description: formDescription.trim(),
        tier: formTier,
        criticality: formCriticality,
        alwaysP1: formAlwaysP1,
        active: selectedService.active,
        directDependencyIds: formDeps,
      });
      toast(`Service ${formName} updated successfully`, 'success');
      setEditOpen(false);
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to update service', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Dependencies
  const handleSaveDependencies = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      await replaceAdminServiceDependencies(selectedService.id, formDeps);
      toast(`Dependencies updated for ${selectedService.name}`, 'success');
      setDepsOpen(false);
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to update dependencies', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate / Delete Service
  const handleDeleteService = async (id: number, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to retire and deactivate service "${serviceName}"?`)) return;
    try {
      await deleteAdminService(id);
      toast(`Service ${serviceName} retired successfully`, 'info');
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to retire service', 'error');
    }
  };

  const handleRefresh = () => {
    refetchServices();
    refetchIncidents();
    toast('Service catalog synchronized with live cluster', 'info');
  };

  // Render Service Tier Badge
  const renderTierBadge = (tier: string, criticality: number, alwaysP1: boolean) => {
    const effectiveTier = tier || deriveServiceTier(criticality, alwaysP1);
    switch (effectiveTier) {
      case 'TIER_1':
        return (
          <Chip
            label="Tier 1 (Mission Critical)"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
            }}
          />
        );
      case 'TIER_2':
        return (
          <Chip
            label="Tier 2 (Business Critical)"
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #7dd3fc',
            }}
          />
        );
      case 'TIER_3':
      default:
        return (
          <Chip
            label="Tier 3 (Supporting)"
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
            }}
          />
        );
    }
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
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <DnsIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              IT Service Catalog & Registry
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Manage enterprise critical services, impact tiers, automatic P1 classifications, and live telemetry
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/admin/services/graph')}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Topology Graph
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#0284c7' }}
          >
            Register Service
          </Button>
        </Stack>
      </Stack>

      {/* Top Stat Metric KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        {/* Card 1: Total Services */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Total Managed Services
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#0f172a" mt={0.5}>
                {totalServices}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {tier1Count} Tier-1 Mission Critical • {tier2Count} Tier-2 • {tier3Count} Tier-3
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Infrastructure Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Live Catalog Health
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: servicesWithOutages.length > 0 ? '#ef4444' : '#10b981',
                    boxShadow: servicesWithOutages.length > 0 ? '0 0 8px #ef4444' : '0 0 8px #10b981',
                  }}
                />
                <Typography variant="h4" fontWeight={800} color={servicesWithOutages.length > 0 ? '#b91c1c' : '#047857'}>
                  {servicesWithOutages.length > 0 ? `${servicesWithOutages.length} Degraded` : '100% Nominal'}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {totalServices - servicesWithOutages.length} of {totalServices} services operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Always P1 Policy */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Always P1 Critical Overrides
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#dc2626" mt={0.5}>
                {alwaysP1Count}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Mandatory P1 classification on any declared outage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Open Active Outage Tickets */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Active Service Incidents
              </Typography>
              <Typography variant="h4" fontWeight={800} color={totalOpenOutages > 0 ? '#d97706' : '#0f172a'} mt={0.5}>
                {totalOpenOutages}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {totalOpenOutages > 0 ? 'Engineering response teams engaged' : 'Zero active outages detected'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
        }}
      >
        <TextField
          placeholder="Search services by name, code, owner, description..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: { xs: '100%', md: 360 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8' }} />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" fontWeight={700} color="text.secondary" mr={0.5}>
            TIER:
          </Typography>
          <Chip
            label={`All Tiers (${totalServices})`}
            size="small"
            clickable
            color={tierFilter === 'ALL' ? 'primary' : 'default'}
            onClick={() => setTierFilter('ALL')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Tier 1 (${tier1Count})`}
            size="small"
            clickable
            color={tierFilter === 'TIER_1' ? 'error' : 'default'}
            onClick={() => setTierFilter('TIER_1')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Tier 2 (${tier2Count})`}
            size="small"
            clickable
            color={tierFilter === 'TIER_2' ? 'primary' : 'default'}
            onClick={() => setTierFilter('TIER_2')}
            sx={{ fontWeight: 600 }}
          />
          <Chip
            label={`Tier 3 (${tier3Count})`}
            size="small"
            clickable
            color={tierFilter === 'TIER_3' ? 'default' : 'default'}
            onClick={() => setTierFilter('TIER_3')}
            sx={{ fontWeight: 600 }}
          />

          {servicesWithOutages.length > 0 && (
            <Chip
              icon={<WarningIcon fontSize="small" />}
              label={`Outage / Impacted (${servicesWithOutages.length})`}
              size="small"
              clickable
              color={healthFilter === 'OUTAGE' ? 'warning' : 'default'}
              onClick={() => setHealthFilter(healthFilter === 'OUTAGE' ? 'ALL' : 'OUTAGE')}
              sx={{ fontWeight: 700 }}
            />
          )}
        </Stack>
      </Paper>

      {/* Main Service Catalog Table */}
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {isLoadingServices || isLoadingIncidents ? (
          <Box p={8} display="flex" justifyContent="center" alignItems="center">
            <CircularProgress size={36} />
          </Box>
        ) : filteredServices.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="subtitle1" fontWeight={700} color="#334155">
              No services match your search filter
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Try adjusting your search terms or tier selection
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  CODE
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  SERVICE NAME & SUMMARY
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  TIER
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  CRITICALITY (1-5)
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  ALWAYS P1 POLICY
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  DEPENDENCIES
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2, textAlign: 'right' }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredServices.map((svc) => {
                const activeTickets = activeIncidentsByService.get(svc.id) || [];
                const hasActiveOutage = activeTickets.length > 0;
                const depIds = svc.dependencyIds || svc.directDependencyIds || [];
                const upstreamServices = services.filter((s) => depIds.includes(s.id));

                return (
                  <TableRow
                    key={svc.id}
                    hover
                    sx={{
                      bgcolor: hasActiveOutage ? 'rgba(254, 242, 242, 0.45)' : 'inherit',
                      '&:hover': { bgcolor: hasActiveOutage ? '#fef2f2 !important' : '#f8fafc !important' },
                    }}
                  >
                    {/* Column 1: Monospace Service Code */}
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={svc.code || deriveServiceCode(svc.name, svc.id)}
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          bgcolor: '#f1f5f9',
                          color: '#0f172a',
                          border: '1px solid #cbd5e1',
                          letterSpacing: 0.5,
                        }}
                      />
                    </TableCell>

                    {/* Column 2: Name & Description & Live Impact Indicator */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={700} color="#0f172a">
                            {svc.name}
                          </Typography>
                          {svc.owner && (
                            <Typography variant="caption" sx={{ color: '#64748b', bgcolor: '#f8fafc', px: 1, py: 0.2, borderRadius: 1, border: '1px solid #e2e8f0' }}>
                              {svc.owner}
                            </Typography>
                          )}
                        </Stack>

                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 420, display: 'block' }}>
                          {svc.description || 'Enterprise platform infrastructure component'}
                        </Typography>

                        {/* Live Telemetry Impact Indicator */}
                        {hasActiveOutage ? (
                          <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                            <Chip
                              icon={<WarningIcon fontSize="small" />}
                              label={`${activeTickets.length} Active Incident: ${activeTickets[0].code} (${activeTickets[0].priority})`}
                              size="small"
                              color="error"
                              sx={{ fontWeight: 700, fontSize: '0.72rem', height: 22 }}
                            />
                            <Typography variant="caption" color="#b91c1c" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                              {activeTickets[0].title}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={0.75} mt={0.25}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#10b981' }} />
                            <Typography variant="caption" color="#059669" fontWeight={600}>
                              Operational • 100% telemetry nominal
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Column 3: Tier Badge (No empty pills!) */}
                    <TableCell sx={{ py: 2 }}>
                      {renderTierBadge(svc.tier, svc.criticality, svc.alwaysP1)}
                    </TableCell>

                    {/* Column 4: Criticality (1-5) */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <StarIcon fontSize="small" sx={{ color: '#f59e0b', fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          {svc.criticality} / 5
                        </Typography>
                        <Typography variant="caption" color="text.secondary" ml={0.5}>
                          {svc.criticality >= 5 ? '(Critical)' : svc.criticality >= 4 ? '(High)' : '(Medium)'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Column 5: Always P1 Policy */}
                    <TableCell sx={{ py: 2 }}>
                      {svc.alwaysP1 ? (
                        <Chip
                          icon={<CrisisAlertIcon fontSize="small" sx={{ color: '#ffffff !important' }} />}
                          label="Always P1"
                          size="small"
                          sx={{
                            bgcolor: '#dc2626',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          Matrix Calculated
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 6: Upstream Dependencies */}
                    <TableCell sx={{ py: 2 }}>
                      {upstreamServices.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {upstreamServices.map((u) => (
                            <Tooltip key={u.id} title={`Depends on ${u.name}`}>
                              <Chip
                                label={u.code || deriveServiceCode(u.name, u.id)}
                                size="small"
                                variant="outlined"
                                sx={{
                                  fontFamily: 'monospace',
                                  fontSize: '0.7rem',
                                  height: 20,
                                  borderColor: '#94a3b8',
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Root Platform
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 7: Operational Status */}
                    <TableCell sx={{ py: 2 }}>
                      {svc.active ? (
                        <Chip
                          icon={<ActiveIcon fontSize="small" />}
                          label="Online"
                          size="small"
                          color="success"
                          variant="filled"
                          sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      ) : (
                        <Chip label="Retired" color="default" size="small" variant="outlined" />
                      )}
                    </TableCell>

                    {/* Column 8: Actions */}
                    <TableCell sx={{ py: 2, textAlign: 'right' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Manage Dependencies">
                          <IconButton size="small" color="primary" onClick={() => handleOpenDeps(svc)}>
                            <HubIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Service">
                          <IconButton size="small" color="default" onClick={() => handleOpenEdit(svc)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate / Retire Service">
                          <IconButton size="small" color="error" onClick={() => handleDeleteService(svc.id, svc.name)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Dialog 1: Register New Service */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Register New IT Service</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Service Code"
                placeholder="e.g. SVC-K8S"
                fullWidth
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                helperText="Monospace unique identifier"
              />
              <TextField
                select
                label="Impact Tier"
                fullWidth
                value={formTier}
                onChange={(e) => setFormTier(e.target.value as any)}
              >
                <MenuItem value="TIER_1">Tier 1 - Mission Critical</MenuItem>
                <MenuItem value="TIER_2">Tier 2 - Business Critical</MenuItem>
                <MenuItem value="TIER_3">Tier 3 - Internal Support</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Service Name"
              placeholder="e.g. Kubernetes Cluster Fleet"
              fullWidth
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <TextField
              label="Engineering Owner / Team"
              placeholder="e.g. Platform SRE Team"
              fullWidth
              value={formOwner}
              onChange={(e) => setFormOwner(e.target.value)}
            />

            <TextField
              label="Summary Description"
              multiline
              rows={2}
              fullWidth
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe service role in enterprise architecture..."
            />

            <TextField
              select
              label="Criticality Level (1 to 5)"
              fullWidth
              value={formCriticality}
              onChange={(e) => setFormCriticality(Number(e.target.value))}
            >
              <MenuItem value={1}>1 - Low / Non-essential</MenuItem>
              <MenuItem value={2}>2 - Minor internal tool</MenuItem>
              <MenuItem value={3}>3 - Moderate business impact</MenuItem>
              <MenuItem value={4}>4 - High criticality</MenuItem>
              <MenuItem value={5}>5 - Highest / Zero Downtime SLA</MenuItem>
            </TextField>

            <FormControlLabel
              control={<Checkbox checked={formAlwaysP1} onChange={(e) => setFormAlwaysP1(e.target.checked)} color="error" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={700}>
                    Always P1 Policy Override
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Any incident declared against this service immediately escalates to P1 Critical severity
                  </Typography>
                </Box>
              }
            />

            {/* Direct Upstream Dependencies Selector */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" mb={1}>
                Upstream Dependencies (This service depends on)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {services.map((svc) => (
                  <Chip
                    key={svc.id}
                    label={`${svc.code || deriveServiceCode(svc.name, svc.id)} - ${svc.name}`}
                    size="small"
                    clickable
                    color={formDeps.includes(svc.id) ? 'primary' : 'default'}
                    onClick={() => {
                      if (formDeps.includes(svc.id)) {
                        setFormDeps(formDeps.filter((id) => id !== svc.id));
                      } else {
                        setFormDeps([...formDeps, svc.id]);
                      }
                    }}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateService}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0284c7' }}
          >
            {isSubmitting ? 'Registering...' : 'Register Service'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Edit Service */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Edit IT Service: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Service Code"
                fullWidth
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
              <TextField
                select
                label="Impact Tier"
                fullWidth
                value={formTier}
                onChange={(e) => setFormTier(e.target.value as any)}
              >
                <MenuItem value="TIER_1">Tier 1 - Mission Critical</MenuItem>
                <MenuItem value="TIER_2">Tier 2 - Business Critical</MenuItem>
                <MenuItem value="TIER_3">Tier 3 - Internal Support</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Service Name"
              fullWidth
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />

            <TextField
              label="Engineering Owner / Team"
              fullWidth
              value={formOwner}
              onChange={(e) => setFormOwner(e.target.value)}
            />

            <TextField
              label="Summary Description"
              multiline
              rows={2}
              fullWidth
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />

            <TextField
              select
              label="Criticality Level (1 to 5)"
              fullWidth
              value={formCriticality}
              onChange={(e) => setFormCriticality(Number(e.target.value))}
            >
              <MenuItem value={1}>1 - Low</MenuItem>
              <MenuItem value={2}>2 - Minor</MenuItem>
              <MenuItem value={3}>3 - Moderate</MenuItem>
              <MenuItem value={4}>4 - High</MenuItem>
              <MenuItem value={5}>5 - Highest</MenuItem>
            </TextField>

            <FormControlLabel
              control={<Checkbox checked={formAlwaysP1} onChange={(e) => setFormAlwaysP1(e.target.checked)} color="error" />}
              label="Always P1: Auto-escalate incidents to P1 Critical severity"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateService}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Manage Service Dependencies */}
      <Dialog open={depsOpen} onClose={() => setDepsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>
          Configure Dependencies: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Select the upstream services that <b>{selectedService?.name}</b> relies on. If an upstream service
            experiences an outage, this service may suffer cascade degradation.
          </Typography>

          <Stack spacing={1.5}>
            {services
              .filter((s) => s.id !== selectedService?.id)
              .map((svc) => {
                const isSelected = formDeps.includes(svc.id);
                return (
                  <Paper
                    key={svc.id}
                    elevation={0}
                    onClick={() => {
                      if (isSelected) {
                        setFormDeps(formDeps.filter((id) => id !== svc.id));
                      } else {
                        setFormDeps([...formDeps, svc.id]);
                      }
                    }}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#3b82f6' : '#e2e8f0',
                      bgcolor: isSelected ? '#eff6ff' : '#ffffff',
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
                        <Typography variant="body2" fontWeight={700} color="#0f172a">
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
          <Button onClick={() => setDepsOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDependencies}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {isSubmitting ? 'Updating...' : 'Save Dependencies'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
