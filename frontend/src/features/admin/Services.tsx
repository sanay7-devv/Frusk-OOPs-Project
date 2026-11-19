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
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

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
  secondary: '#06b6d4',
  error: '#f43f5e',
  success: '#10b981',
  warning: '#f59e0b',
};

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.owner && s.owner.toLowerCase().includes(q)) ||
          s.description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (tierFilter !== 'ALL' && s.tier !== tierFilter) {
        return false;
      }

      if (healthFilter === 'OUTAGE') {
        const hasOutage = (activeIncidentsByService.get(s.id)?.length || 0) > 0;
        if (!hasOutage) return false;
      }

      return true;
    });
  }, [services, searchQuery, tierFilter, healthFilter, activeIncidentsByService]);

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

  const handleOpenDeps = (svc: AdminService) => {
    setSelectedService(svc);
    setFormDeps(svc.dependencyIds || svc.directDependencyIds || []);
    setDepsOpen(true);
  };

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

  const [retireServiceTarget, setRetireServiceTarget] = useState<{ id: number; name: string } | null>(null);

  const handleDeleteService = (id: number, serviceName: string) => {
    setRetireServiceTarget({ id, name: serviceName });
  };

  const handleConfirmRetire = async () => {
    if (!retireServiceTarget) return;
    try {
      await deleteAdminService(retireServiceTarget.id);
      toast(`Service ${retireServiceTarget.name} retired successfully`, 'info');
      refetchServices();
    } catch (e: any) {
      toast(e.message || 'Failed to retire service', 'error');
    } finally {
      setRetireServiceTarget(null);
    }
  };

  const handleRefresh = () => {
    refetchServices();
    refetchIncidents();
    toast('Service catalog synchronized with live cluster', 'info');
  };

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
              bgcolor: 'rgba(244, 63, 94, 0.2)',
              color: '#fb7185',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              fontFamily: 'JetBrains Mono, monospace',
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
              bgcolor: 'rgba(6, 182, 212, 0.2)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              fontFamily: 'JetBrains Mono, monospace',
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
              bgcolor: COLORS.surfaceContainerHighest,
              color: COLORS.onSurfaceVariant,
              border: `1px solid ${COLORS.border}`,
              fontFamily: 'JetBrains Mono, monospace',
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
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: COLORS.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <DnsIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              IT Service Catalog &amp; Registry
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant }}>
            Manage enterprise critical services, impact tiers, automatic P1 classifications, and live telemetry
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/admin/services/graph')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 2,
              borderColor: COLORS.border,
              color: COLORS.onSurfaceVariant,
              '&:hover': { borderColor: COLORS.secondary, color: COLORS.secondary, bgcolor: 'rgba(6, 182, 212, 0.05)' },
            }}
          >
            Topology Graph
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
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 2,
              bgcolor: COLORS.primary,
              color: '#ffffff',
              '&:hover': { bgcolor: '#4f46e5' },
            }}
          >
            Register Service
          </Button>
        </Stack>
      </Stack>

      {/* Top Stat Metric KPI Cards */}
      <Grid container spacing={2.5} mb={3}>
        {/* Card 1: Total Services */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Total Managed Services
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.onSurface, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {totalServices}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                {tier1Count} Tier-1 • {tier2Count} Tier-2 • {tier3Count} Tier-3
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Infrastructure Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Live Catalog Health
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: servicesWithOutages.length > 0 ? COLORS.error : COLORS.success,
                    boxShadow: servicesWithOutages.length > 0 ? `0 0 10px ${COLORS.error}` : `0 0 10px ${COLORS.success}`,
                  }}
                />
                <Typography variant="h4" fontWeight={800} sx={{ color: servicesWithOutages.length > 0 ? '#fb7185' : '#34d399', fontFamily: 'Sora, sans-serif' }}>
                  {servicesWithOutages.length > 0 ? `${servicesWithOutages.length} Degraded` : '100% Nominal'}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                {totalServices - servicesWithOutages.length} of {totalServices} services operational
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Always P1 Policy */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Always P1 Critical Overrides
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#fb7185', mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {alwaysP1Count}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                Mandatory P1 classification on declared outage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Open Active Outage Tickets */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Active Service Incidents
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: totalOpenOutages > 0 ? '#f59e0b' : COLORS.onSurface, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {totalOpenOutages}
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
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
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
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
          sx={{
            minWidth: { xs: '100%', md: 360 },
            '& .MuiOutlinedInput-root': {
              bgcolor: COLORS.surfaceContainerLowest,
              color: COLORS.onSurface,
              borderRadius: 2,
              '& fieldset': { borderColor: COLORS.border },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: COLORS.onSurfaceVariant }} />
              </InputAdornment>
            ),
          }}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <Typography variant="caption" fontWeight={700} sx={{ color: COLORS.onSurfaceVariant, mr: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
            TIER:
          </Typography>
          <Chip
            label={`All Tiers (${totalServices})`}
            size="small"
            clickable
            onClick={() => setTierFilter('ALL')}
            sx={{
              fontWeight: 600,
              bgcolor: tierFilter === 'ALL' ? 'rgba(99, 102, 241, 0.2)' : COLORS.surfaceContainerHighest,
              color: tierFilter === 'ALL' ? COLORS.primary : COLORS.onSurfaceVariant,
              border: `1px solid ${tierFilter === 'ALL' ? 'rgba(99, 102, 241, 0.4)' : COLORS.border}`,
            }}
          />
          <Chip
            label={`Tier 1 (${tier1Count})`}
            size="small"
            clickable
            onClick={() => setTierFilter('TIER_1')}
            sx={{
              fontWeight: 600,
              bgcolor: tierFilter === 'TIER_1' ? 'rgba(244, 63, 94, 0.2)' : COLORS.surfaceContainerHighest,
              color: tierFilter === 'TIER_1' ? '#fb7185' : COLORS.onSurfaceVariant,
              border: `1px solid ${tierFilter === 'TIER_1' ? 'rgba(244, 63, 94, 0.4)' : COLORS.border}`,
            }}
          />
          <Chip
            label={`Tier 2 (${tier2Count})`}
            size="small"
            clickable
            onClick={() => setTierFilter('TIER_2')}
            sx={{
              fontWeight: 600,
              bgcolor: tierFilter === 'TIER_2' ? 'rgba(6, 182, 212, 0.2)' : COLORS.surfaceContainerHighest,
              color: tierFilter === 'TIER_2' ? '#22d3ee' : COLORS.onSurfaceVariant,
              border: `1px solid ${tierFilter === 'TIER_2' ? 'rgba(6, 182, 212, 0.4)' : COLORS.border}`,
            }}
          />
          <Chip
            label={`Tier 3 (${tier3Count})`}
            size="small"
            clickable
            onClick={() => setTierFilter('TIER_3')}
            sx={{
              fontWeight: 600,
              bgcolor: tierFilter === 'TIER_3' ? 'rgba(99, 102, 241, 0.2)' : COLORS.surfaceContainerHighest,
              color: tierFilter === 'TIER_3' ? COLORS.primary : COLORS.onSurfaceVariant,
              border: `1px solid ${tierFilter === 'TIER_3' ? 'rgba(99, 102, 241, 0.4)' : COLORS.border}`,
            }}
          />

          {servicesWithOutages.length > 0 && (
            <Chip
              icon={<WarningIcon fontSize="small" sx={{ color: '#fbbf24 !important' }} />}
              label={`Outage / Impacted (${servicesWithOutages.length})`}
              size="small"
              clickable
              onClick={() => setHealthFilter(healthFilter === 'OUTAGE' ? 'ALL' : 'OUTAGE')}
              sx={{
                fontWeight: 700,
                bgcolor: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}
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
          border: `1px solid ${COLORS.border}`,
          bgcolor: COLORS.surfaceContainer,
          overflow: 'hidden',
        }}
      >
        {isLoadingServices || isLoadingIncidents ? (
          <Box p={8} display="flex" justifyContent="center" alignItems="center">
            <CircularProgress size={36} sx={{ color: COLORS.primary }} />
          </Box>
        ) : filteredServices.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: COLORS.onSurface }}>
              No services match your search filter
            </Typography>
            <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mt: 0.5 }}>
              Try adjusting your search terms or tier selection
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow, borderBottom: `1px solid ${COLORS.border}` }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  CODE
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  SERVICE NAME &amp; SUMMARY
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  TIER
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  CRITICALITY (1-5)
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  ALWAYS P1 POLICY
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  DEPENDENCIES
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  STATUS
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
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
                      bgcolor: hasActiveOutage ? 'rgba(244, 63, 94, 0.08)' : 'inherit',
                      '& td': { borderBottom: `1px solid ${COLORS.border}` },
                      '&:hover': { bgcolor: hasActiveOutage ? 'rgba(244, 63, 94, 0.12) !important' : 'rgba(99, 102, 241, 0.05) !important' },
                    }}
                  >
                    {/* Column 1: Monospace Service Code */}
                    <TableCell sx={{ py: 2 }}>
                      <Chip
                        label={svc.code || deriveServiceCode(svc.name, svc.id)}
                        size="small"
                        sx={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          bgcolor: COLORS.surfaceContainerHighest,
                          color: COLORS.primary,
                          border: `1px solid ${COLORS.border}`,
                          letterSpacing: 0.5,
                        }}
                      />
                    </TableCell>

                    {/* Column 2: Name & Description & Live Impact Indicator */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: COLORS.onSurface }}>
                            {svc.name}
                          </Typography>
                          {svc.owner && (
                            <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, bgcolor: COLORS.surfaceContainerHighest, px: 1, py: 0.2, borderRadius: 1, border: `1px solid ${COLORS.border}` }}>
                              {svc.owner}
                            </Typography>
                          )}
                        </Stack>

                        <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, maxWidth: 420, display: 'block' }}>
                          {svc.description || 'Enterprise platform infrastructure component'}
                        </Typography>

                        {/* Live Telemetry Impact Indicator */}
                        {hasActiveOutage ? (
                          <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                            <Chip
                              icon={<WarningIcon fontSize="small" sx={{ color: '#fb7185 !important' }} />}
                              label={`${activeTickets.length} Active Incident: ${activeTickets[0].code} (${activeTickets[0].priority})`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                height: 22,
                                bgcolor: 'rgba(244, 63, 94, 0.2)',
                                color: '#fb7185',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                              }}
                            />
                            <Typography variant="caption" sx={{ color: '#fb7185', fontWeight: 600, maxWidth: 220 }} noWrap>
                              {activeTickets[0].title}
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={0.75} mt={0.25}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: COLORS.success }} />
                            <Typography variant="caption" sx={{ color: COLORS.success, fontWeight: 600 }}>
                              Operational • 100% telemetry nominal
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Column 3: Tier Badge */}
                    <TableCell sx={{ py: 2 }}>
                      {renderTierBadge(svc.tier, svc.criticality, svc.alwaysP1)}
                    </TableCell>

                    {/* Column 4: Criticality (1-5) */}
                    <TableCell sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <StarIcon fontSize="small" sx={{ color: '#f59e0b', fontSize: 18 }} />
                        <Typography variant="body2" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                          {svc.criticality} / 5
                        </Typography>
                        <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, ml: 0.5 }}>
                          {svc.criticality >= 5 ? '(Critical)' : svc.criticality >= 4 ? '(High)' : '(Medium)'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    {/* Column 5: Always P1 Policy */}
                    <TableCell sx={{ py: 2 }}>
                      {svc.alwaysP1 ? (
                        <Chip
                          icon={<CrisisAlertIcon fontSize="small" sx={{ color: '#fb7185 !important' }} />}
                          label="Always P1"
                          size="small"
                          sx={{
                            bgcolor: 'rgba(244, 63, 94, 0.2)',
                            color: '#fb7185',
                            border: '1px solid rgba(244, 63, 94, 0.3)',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, fontWeight: 500 }}>
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
                                sx={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  fontSize: '0.7rem',
                                  height: 20,
                                  bgcolor: COLORS.surfaceContainerHighest,
                                  color: COLORS.onSurfaceVariant,
                                  borderColor: COLORS.border,
                                  border: '1px solid',
                                }}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                          Root Platform
                        </Typography>
                      )}
                    </TableCell>

                    {/* Column 7: Operational Status */}
                    <TableCell sx={{ py: 2 }}>
                      {svc.active ? (
                        <Chip
                          icon={<ActiveIcon fontSize="small" sx={{ color: '#34d399 !important' }} />}
                          label="Online"
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            bgcolor: 'rgba(16, 185, 129, 0.15)',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                          }}
                        />
                      ) : (
                        <Chip label="Retired" size="small" sx={{ bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant }} />
                      )}
                    </TableCell>

                    {/* Column 8: Actions */}
                    <TableCell sx={{ py: 2, textAlign: 'right' }}>
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Tooltip title="Manage Dependencies">
                          <IconButton size="small" onClick={() => handleOpenDeps(svc)} sx={{ color: COLORS.primary }}>
                            <HubIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Service">
                          <IconButton size="small" onClick={() => handleOpenEdit(svc)} sx={{ color: COLORS.secondary }}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deactivate / Retire Service">
                          <IconButton size="small" onClick={() => handleDeleteService(svc.id, svc.name)} sx={{ color: COLORS.error }}>
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
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>Register New IT Service</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2.5} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Service Code"
                placeholder="e.g. SVC-K8S"
                fullWidth
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                helperText="Monospace unique identifier"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: COLORS.surfaceContainerLowest,
                    color: COLORS.onSurface,
                    '& fieldset': { borderColor: COLORS.border },
                  },
                  '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                  '& .MuiFormHelperText-root': { color: COLORS.onSurfaceVariant },
                }}
              />
              <TextField
                select
                label="Impact Tier"
                fullWidth
                value={formTier}
                onChange={(e) => setFormTier(e.target.value as any)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: COLORS.surfaceContainerLowest,
                    color: COLORS.onSurface,
                    '& fieldset': { borderColor: COLORS.border },
                  },
                  '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              label="Engineering Owner / Team"
              placeholder="e.g. Platform SRE Team"
              fullWidth
              value={formOwner}
              onChange={(e) => setFormOwner(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              label="Summary Description"
              multiline
              rows={2}
              fullWidth
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe service role in enterprise architecture..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              select
              label="Criticality Level (1 to 5)"
              fullWidth
              value={formCriticality}
              onChange={(e) => setFormCriticality(Number(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
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
                  <Typography variant="body2" fontWeight={700} sx={{ color: COLORS.onSurface }}>
                    Always P1 Policy Override
                  </Typography>
                  <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                    Any incident declared against this service immediately escalates to P1 Critical severity
                  </Typography>
                </Box>
              }
            />

            {/* Direct Upstream Dependencies Selector */}
            <Box>
              <Typography variant="caption" fontWeight={700} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'uppercase', display: 'block', mb: 1, fontFamily: 'JetBrains Mono, monospace' }}>
                Upstream Dependencies (This service depends on)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {services.map((svc) => (
                  <Chip
                    key={svc.id}
                    label={`${svc.code || deriveServiceCode(svc.name, svc.id)} - ${svc.name}`}
                    size="small"
                    clickable
                    onClick={() => {
                      if (formDeps.includes(svc.id)) {
                        setFormDeps(formDeps.filter((id) => id !== svc.id));
                      } else {
                        setFormDeps([...formDeps, svc.id]);
                      }
                    }}
                    sx={{
                      mb: 1,
                      bgcolor: formDeps.includes(svc.id) ? 'rgba(99, 102, 241, 0.2)' : COLORS.surfaceContainerHighest,
                      color: formDeps.includes(svc.id) ? COLORS.primary : COLORS.onSurfaceVariant,
                      border: `1px solid ${formDeps.includes(svc.id) ? 'rgba(99, 102, 241, 0.4)' : COLORS.border}`,
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateService}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary, color: '#ffffff', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Registering...' : 'Register Service'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Edit Service */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
          Edit IT Service: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2.5} mt={1}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Service Code"
                fullWidth
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: COLORS.surfaceContainerLowest,
                    color: COLORS.onSurface,
                    '& fieldset': { borderColor: COLORS.border },
                  },
                  '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                }}
              />
              <TextField
                select
                label="Impact Tier"
                fullWidth
                value={formTier}
                onChange={(e) => setFormTier(e.target.value as any)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: COLORS.surfaceContainerLowest,
                    color: COLORS.onSurface,
                    '& fieldset': { borderColor: COLORS.border },
                  },
                  '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              label="Engineering Owner / Team"
              fullWidth
              value={formOwner}
              onChange={(e) => setFormOwner(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              label="Summary Description"
              multiline
              rows={2}
              fullWidth
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />

            <TextField
              select
              label="Criticality Level (1 to 5)"
              fullWidth
              value={formCriticality}
              onChange={(e) => setFormCriticality(Number(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value={1}>1 - Low</MenuItem>
              <MenuItem value={2}>2 - Minor</MenuItem>
              <MenuItem value={3}>3 - Moderate</MenuItem>
              <MenuItem value={4}>4 - High</MenuItem>
              <MenuItem value={5}>5 - Highest</MenuItem>
            </TextField>

            <FormControlLabel
              control={<Checkbox checked={formAlwaysP1} onChange={(e) => setFormAlwaysP1(e.target.checked)} color="error" />}
              label={<Typography variant="body2" sx={{ color: COLORS.onSurface }}>Always P1: Auto-escalate incidents to P1 Critical severity</Typography>}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setEditOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUpdateService}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary, color: '#ffffff', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 3: Manage Service Dependencies */}
      <Dialog
        open={depsOpen}
        onClose={() => setDepsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: COLORS.surfaceContainer,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 3,
            color: COLORS.onSurface,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
          Configure Dependencies: {selectedService?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant, mb: 2 }}>
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
                      borderColor: isSelected ? COLORS.primary : COLORS.border,
                      bgcolor: isSelected ? 'rgba(99, 102, 241, 0.15)' : COLORS.surfaceContainerLowest,
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
          <Button onClick={() => setDepsOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveDependencies}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary, color: '#ffffff', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Updating...' : 'Save Dependencies'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Retire Service Dialog */}
      <ConfirmDialog
        open={Boolean(retireServiceTarget)}
        onClose={() => setRetireServiceTarget(null)}
        onConfirm={handleConfirmRetire}
        title="Retire and Deactivate Service"
        description={`Are you sure you want to retire and deactivate service "${retireServiceTarget?.name}"? Dependent services will be impacted.`}
        confirmColor="error"
        confirmLabel="Retire Service"
      />
    </Box>
  );
}
