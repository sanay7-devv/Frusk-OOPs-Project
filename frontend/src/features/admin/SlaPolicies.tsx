import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  IconButton,
  Chip,
  Tabs,
  Tab,
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
  Timer as TimerIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  CrisisAlert as CrisisAlertIcon,
  Policy as PolicyIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import {
  getAdminSlaPolicies,
  createAdminSlaPolicy,
  updateAdminSlaPolicy,
  deleteAdminSlaPolicy,
  getAdminEscalationPolicies,
  createAdminEscalationPolicy,
  deleteAdminEscalationPolicy,
  getAdminServices,
  AdminSlaPolicy,
  AdminEscalationPolicy,
  deriveServiceCode,
} from '../../api/admin';
import { listIncidents } from '../../api/incidents';
import PriorityBadge from '../../components/PriorityBadge';
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

export default function SlaPolicies() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'SLA' | 'ESCALATION'>('SLA');

  // SLA Modal States
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [editingSlaId, setEditingSlaId] = useState<number | null>(null);
  const [slaPriority, setSlaPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P1');
  const [slaServiceId, setSlaServiceId] = useState<string>('GLOBAL');
  const [responseMinutes, setResponseMinutes] = useState(15);
  const [resolutionMinutes, setResolutionMinutes] = useState(240);
  const [calendarType, setCalendarType] = useState<'ALWAYS' | 'BUSINESS_HOURS'>('ALWAYS');

  // Escalation Modal States
  const [escModalOpen, setEscModalOpen] = useState(false);
  const [escPriority, setEscPriority] = useState<'P1' | 'P2'>('P1');
  const [escLevel, setEscLevel] = useState<number>(1);
  const [escTimeout, setEscTimeout] = useState<number>(30);
  const [escAction, setEscAction] = useState<string>('Escalate to Lead & Page On-Call Manager');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query 1: SLA Policies
  const {
    data: policies = [],
    isLoading: isLoadingSla,
    refetch: refetchSla,
  } = useQuery({
    queryKey: ['admin-sla-policies-list'],
    queryFn: getAdminSlaPolicies,
    refetchInterval: 10000,
  });

  // Query 2: Escalation Policies
  const {
    data: escalations = [],
    isLoading: isLoadingEsc,
    refetch: refetchEsc,
  } = useQuery({
    queryKey: ['admin-escalation-policies-list'],
    queryFn: getAdminEscalationPolicies,
    refetchInterval: 10000,
  });

  // Query 3: Services Catalog
  const { data: services = [] } = useQuery({
    queryKey: ['admin-services-catalog-lookup'],
    queryFn: getAdminServices,
  });

  // Query 4: Real-time Incident Telemetry
  const { data: incidentPage, refetch: refetchIncidents } = useQuery({
    queryKey: ['admin-sla-telemetry'],
    queryFn: () => listIncidents({ size: 100 }),
    refetchInterval: 10000,
  });

  const allIncidents = incidentPage?.items || [];

  // Compute live SLA Compliance metrics from real incidents
  const slaMetrics = useMemo(() => {
    let metCount = 0;
    let breachedCount = 0;
    let warningCount = 0;
    let activeOkCount = 0;

    allIncidents.forEach((inc) => {
      if (inc.status === 'RESOLVED' || inc.status === 'CLOSED') {
        if (inc.slaState === 'MET' || inc.slaState === 'OK') {
          metCount++;
        } else if (inc.slaState === 'VIOLATED' || (inc.slaState as any) === 'BREACHED') {
          breachedCount++;
        } else {
          metCount++;
        }
      } else {
        if (inc.slaState === 'VIOLATED' || (inc.slaState as any) === 'BREACHED') {
          breachedCount++;
        } else if (inc.slaState === 'WARNING') {
          warningCount++;
        } else {
          activeOkCount++;
        }
      }
    });

    const totalEvaluated = metCount + breachedCount;
    const complianceRate = totalEvaluated > 0 ? ((metCount / totalEvaluated) * 100).toFixed(1) : '100.0';

    return {
      complianceRate,
      metCount,
      breachedCount,
      warningCount,
      activeOkCount,
      totalIncidents: allIncidents.length,
    };
  }, [allIncidents]);

  const handleOpenCreateSla = () => {
    setEditingSlaId(null);
    setSlaPriority('P1');
    setSlaServiceId('GLOBAL');
    setResponseMinutes(15);
    setResolutionMinutes(240);
    setCalendarType('ALWAYS');
    setSlaModalOpen(true);
  };

  const handleOpenEditSla = (pol: AdminSlaPolicy) => {
    setEditingSlaId(pol.id);
    setSlaPriority(pol.priority);
    setSlaServiceId(pol.serviceId ? String(pol.serviceId) : 'GLOBAL');
    setResponseMinutes(pol.responseMinutes);
    setResolutionMinutes(pol.resolutionMinutes);
    setCalendarType(pol.calendarType === 'BUSINESS_HOURS' ? 'BUSINESS_HOURS' : 'ALWAYS');
    setSlaModalOpen(true);
  };

  const handleSaveSlaPolicy = async () => {
    setIsSubmitting(true);
    const targetServiceId = slaServiceId === 'GLOBAL' ? null : Number(slaServiceId);
    const targetServiceName =
      targetServiceId !== null ? services.find((s) => s.id === targetServiceId)?.name || null : null;

    try {
      if (editingSlaId) {
        await updateAdminSlaPolicy(editingSlaId, {
          serviceId: targetServiceId,
          serviceName: targetServiceName,
          priority: slaPriority,
          responseMinutes: Number(responseMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          calendarType,
        });
        toast(`SLA Policy for ${slaPriority} updated successfully`, 'success');
      } else {
        await createAdminSlaPolicy({
          serviceId: targetServiceId,
          serviceName: targetServiceName,
          priority: slaPriority,
          responseMinutes: Number(responseMinutes),
          resolutionMinutes: Number(resolutionMinutes),
          calendarType,
        });
        toast(`SLA Policy for ${slaPriority} created successfully`, 'success');
      }
      setSlaModalOpen(false);
      refetchSla();
    } catch (e: any) {
      toast(e.message || 'Failed to save SLA policy', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [deleteSlaTarget, setDeleteSlaTarget] = useState<{ id: number; priority: string } | null>(null);
  const [deleteEscTarget, setDeleteEscTarget] = useState<{ id: number; priority: string; level: number } | null>(null);

  const handleDeleteSlaPolicy = (id: number, p: string) => {
    setDeleteSlaTarget({ id, priority: p });
  };

  const handleConfirmDeleteSla = async () => {
    if (!deleteSlaTarget) return;
    try {
      await deleteAdminSlaPolicy(deleteSlaTarget.id);
      toast(`Deleted policy for ${deleteSlaTarget.priority}`, 'info');
      refetchSla();
    } catch (e: any) {
      toast(e.message || 'Failed to delete policy', 'error');
    } finally {
      setDeleteSlaTarget(null);
    }
  };

  const handleSaveEscalationPolicy = async () => {
    setIsSubmitting(true);
    try {
      await createAdminEscalationPolicy({
        priority: escPriority,
        level: escLevel,
        timeoutMinutes: Number(escTimeout),
        action: escAction,
      });
      toast(`Escalation rule for ${escPriority} Level ${escLevel} created`, 'success');
      setEscModalOpen(false);
      refetchEsc();
    } catch (e: any) {
      toast(e.message || 'Failed to create escalation policy', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEscalation = (id: number, priority: string, level: number) => {
    setDeleteEscTarget({ id, priority, level });
  };

  const handleConfirmDeleteEsc = async () => {
    if (!deleteEscTarget) return;
    try {
      await deleteAdminEscalationPolicy(deleteEscTarget.id);
      toast(`Deleted escalation policy`, 'info');
      refetchEsc();
    } catch (e: any) {
      toast(e.message || 'Failed to delete escalation policy', 'error');
    } finally {
      setDeleteEscTarget(null);
    }
  };

  const handleRefreshAll = () => {
    refetchSla();
    refetchEsc();
    refetchIncidents();
    toast('SLA matrix and escalation telemetry refreshed', 'info');
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} mins`;
    const hrs = mins / 60;
    if (hrs < 24) {
      return hrs % 1 === 0 ? `${hrs} hrs (${mins}m)` : `${hrs.toFixed(1)} hrs (${mins}m)`;
    }
    const days = (hrs / 24).toFixed(1);
    return `${days} days (${mins}m)`;
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
              <PolicyIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              SLA Policy Matrix &amp; Escalation Engine
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ color: COLORS.onSurfaceVariant }}>
            Enforce contractual response and resolution deadlines, define service-specific overrides, and automate on-call escalation
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
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
          {activeTab === 'SLA' ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateSla}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: COLORS.primary,
                color: '#ffffff',
                '&:hover': { bgcolor: '#4f46e5' },
              }}
            >
              Add SLA Target Rule
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEscModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 700,
                borderRadius: 2,
                bgcolor: COLORS.secondary,
                color: '#000000',
                '&:hover': { bgcolor: '#0891b2' },
              }}
            >
              Add Escalation Trigger
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Top Real-time SLA KPI Metrics */}
      <Grid container spacing={2.5} mb={3}>
        {/* Card 1: Live SLA Compliance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Live SLA Compliance Rate
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: Number(slaMetrics.complianceRate) >= 95 ? COLORS.success : COLORS.warning,
                    boxShadow: Number(slaMetrics.complianceRate) >= 95 ? `0 0 8px ${COLORS.success}` : `0 0 8px ${COLORS.warning}`,
                  }}
                />
                <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
                  {slaMetrics.complianceRate}%
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                {slaMetrics.metCount} Met SLA • {slaMetrics.breachedCount} Breached in live telemetry
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Active SLA Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Active Incident Clocks
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.onSurface, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {slaMetrics.activeOkCount + slaMetrics.warningCount} Open Clocks
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                {slaMetrics.warningCount > 0 ? (
                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>
                    ⚠️ {slaMetrics.warningCount} tickets approaching breach threshold
                  </span>
                ) : (
                  'All active clocks within acceptable buffer'
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Active Policies */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Configured SLA Rules
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.primary, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {policies.length} Policies
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                {policies.filter((p) => !p.serviceId).length} Global Defaults • {policies.filter((p) => p.serviceId).length} Overrides
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Escalation Ladder */}
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: 'JetBrains Mono, monospace' }}>
                Automated Escalation Steps
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: COLORS.secondary, mt: 0.5, fontFamily: 'Sora, sans-serif' }}>
                {escalations.length} Triggers
              </Typography>
              <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant, display: 'block', mt: 0.5 }}>
                Auto-page team lead &amp; manager on unacknowledged alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs navigation */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${COLORS.border}`, bgcolor: COLORS.surfaceContainer, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 2,
            borderBottom: `1px solid ${COLORS.border}`,
            bgcolor: COLORS.surfaceContainerLow,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              py: 2,
              color: COLORS.onSurfaceVariant,
              '&.Mui-selected': { color: COLORS.primary },
            },
            '& .MuiTabs-indicator': { backgroundColor: COLORS.primary },
          }}
        >
          <Tab
            value="SLA"
            icon={<TimerIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`SLA Response & Resolution Targets (${policies.length})`}
          />
          <Tab
            value="ESCALATION"
            icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={`On-Call Escalation Ladder (${escalations.length})`}
          />
        </Tabs>

        {/* Tab 1 Content: SLA Policies Table */}
        {activeTab === 'SLA' && (
          <TableContainer>
            {isLoadingSla ? (
              <Box p={6} display="flex" justifyContent="center">
                <CircularProgress size={32} sx={{ color: COLORS.primary }} />
              </Box>
            ) : policies.length === 0 ? (
              <Box p={6} textAlign="center">
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: COLORS.onSurface }}>
                  No SLA policies configured yet
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow, borderBottom: `1px solid ${COLORS.border}` }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      PRIORITY TIER
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      APPLICATION SCOPE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      RESPONSE TARGET (ACK)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      RESOLUTION TARGET (FIX)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      OPERATING CALENDAR
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {policies.map((pol) => {
                    const matchedService = pol.serviceId ? services.find((s) => s.id === pol.serviceId) : null;
                    const scopeName = matchedService
                      ? `${matchedService.code || deriveServiceCode(matchedService.name, matchedService.id)}: ${matchedService.name}`
                      : pol.serviceName
                      ? `Service: ${pol.serviceName}`
                      : 'Global Enterprise Default (All Services)';

                    const isGlobal = !pol.serviceId;

                    return (
                      <TableRow key={pol.id} hover sx={{ '& td': { borderBottom: `1px solid ${COLORS.border}` }, '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' } }}>
                        {/* Priority Badge */}
                        <TableCell sx={{ py: 2 }}>
                          <PriorityBadge priority={pol.priority} />
                        </TableCell>

                        {/* Scope */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={isGlobal ? 700 : 600} sx={{ color: isGlobal ? COLORS.onSurface : COLORS.secondary }}>
                              {scopeName}
                            </Typography>
                            {isGlobal ? (
                              <Chip label="Default Fallback" size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: COLORS.surfaceContainerHighest, color: COLORS.onSurfaceVariant }} />
                            ) : (
                              <Chip label="Override" size="small" sx={{ fontSize: '0.68rem', height: 20, bgcolor: 'rgba(6, 182, 212, 0.2)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }} />
                            )}
                          </Stack>
                        </TableCell>

                        {/* Response Target */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AccessTimeIcon sx={{ fontSize: 16, color: COLORS.onSurfaceVariant }} />
                            <Typography variant="body2" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                              {formatDuration(pol.responseMinutes)}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                            Time to engineer triage
                          </Typography>
                        </TableCell>

                        {/* Resolution Target */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TimerIcon sx={{ fontSize: 16, color: COLORS.onSurfaceVariant }} />
                            <Typography variant="body2" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                              {formatDuration(pol.resolutionMinutes)}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                            Time to full system restoration
                          </Typography>
                        </TableCell>

                        {/* Operating Calendar */}
                        <TableCell sx={{ py: 2 }}>
                          {pol.calendarType === 'ALWAYS' || pol.calendarType === '24x7' ? (
                            <Chip
                              label="24x7 Continuous (Uninterrupted)"
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: 'rgba(99, 102, 241, 0.2)',
                                color: COLORS.primary,
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            />
                          ) : (
                            <Chip
                              label="Business Hours (09:00 - 18:00 M-F)"
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.72rem', borderColor: COLORS.border, color: COLORS.onSurfaceVariant }}
                            />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={{ py: 2, textAlign: 'right' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit Policy Target">
                              <IconButton size="small" onClick={() => handleOpenEditSla(pol)} sx={{ color: COLORS.secondary }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Policy">
                              <IconButton size="small" onClick={() => handleDeleteSlaPolicy(pol.id, pol.priority)} sx={{ color: COLORS.error }}>
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
        )}

        {/* Tab 2 Content: Escalation Ladder Table */}
        {activeTab === 'ESCALATION' && (
          <TableContainer>
            {isLoadingEsc ? (
              <Box p={6} display="flex" justifyContent="center">
                <CircularProgress size={32} sx={{ color: COLORS.primary }} />
              </Box>
            ) : escalations.length === 0 ? (
              <Box p={6} textAlign="center">
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: COLORS.onSurface }}>
                  No escalation policies configured yet
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: COLORS.surfaceContainerLow, borderBottom: `1px solid ${COLORS.border}` }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      TRIGGER PRIORITY
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      ESCALATION TIER LEVEL
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      TIMEOUT THRESHOLD
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      AUTOMATED ACTION &amp; DISPATCH
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: COLORS.onSurfaceVariant, fontSize: '0.75rem', py: 2, textAlign: 'right', fontFamily: 'JetBrains Mono, monospace' }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {escalations.map((p) => {
                    const level = p.level || p.targetLevel || 1;
                    const timeout = p.timeoutMinutes || p.triggerMinutes || 30;

                    return (
                      <TableRow key={p.id} hover sx={{ '& td': { borderBottom: `1px solid ${COLORS.border}` }, '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.05) !important' } }}>
                        <TableCell sx={{ py: 2 }}>
                          <PriorityBadge priority={p.priority} />
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={`Level ${level}: ${level >= 2 ? 'SRE Incident Commander' : 'Team Lead'}`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: level >= 2 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                              color: level >= 2 ? '#fb7185' : COLORS.primary,
                              border: `1px solid ${level >= 2 ? 'rgba(244, 63, 94, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`,
                            }}
                          />
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TimerIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                            <Typography variant="body2" fontWeight={800} sx={{ color: COLORS.onSurface, fontFamily: 'JetBrains Mono, monospace' }}>
                              {timeout} minutes unacknowledged
                            </Typography>
                          </Stack>
                          <Typography variant="caption" sx={{ color: COLORS.onSurfaceVariant }}>
                            Triggered automatically by SLA daemon
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ color: COLORS.onSurface }}>
                            {p.action || `Auto-escalate to Tier ${level} On-Call Queue & Page Duty Engineer`}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 2, textAlign: 'right' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteEscalation(p.id, p.priority, level)}
                            sx={{ color: COLORS.error }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TableContainer>
        )}
      </Paper>

      {/* Dialog 1: Add / Edit SLA Policy */}
      <Dialog
        open={slaModalOpen}
        onClose={() => setSlaModalOpen(false)}
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
          {editingSlaId ? 'Edit SLA Target Rule' : 'Configure New SLA Policy Target'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2.5} mt={1}>
            <TextField
              select
              label="Incident Priority Level"
              fullWidth
              value={slaPriority}
              onChange={(e) => setSlaPriority(e.target.value as any)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="P1">P1 - Critical Priority</MenuItem>
              <MenuItem value="P2">P2 - High Priority</MenuItem>
              <MenuItem value="P3">P3 - Medium Priority</MenuItem>
              <MenuItem value="P4">P4 - Low Priority</MenuItem>
            </TextField>

            <TextField
              select
              label="Application Scope"
              fullWidth
              value={slaServiceId}
              onChange={(e) => setSlaServiceId(e.target.value)}
              helperText="Global default applies across all services unless overridden by a service-specific rule"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
                '& .MuiFormHelperText-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="GLOBAL">Global Enterprise Default (All Services)</MenuItem>
              {services.map((svc) => (
                <MenuItem key={svc.id} value={String(svc.id)}>
                  Specific Service: {svc.code || deriveServiceCode(svc.name, svc.id)} - {svc.name}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Response Target (Minutes to Ack)"
                type="number"
                fullWidth
                value={responseMinutes}
                onChange={(e) => setResponseMinutes(Number(e.target.value))}
                helperText="Maximum time allowed for on-call triage"
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
                label="Resolution Target (Minutes to Fix)"
                type="number"
                fullWidth
                value={resolutionMinutes}
                onChange={(e) => setResolutionMinutes(Number(e.target.value))}
                helperText="Maximum allowed time to resolve"
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
            </Stack>

            <TextField
              select
              label="Operating Calendar Schedule"
              fullWidth
              value={calendarType}
              onChange={(e) => setCalendarType(e.target.value as any)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="ALWAYS">24x7 Continuous (Uninterrupted 24/7)</MenuItem>
              <MenuItem value="BUSINESS_HOURS">Business Hours Only (Mon-Fri 09:00 - 18:00)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setSlaModalOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSlaPolicy}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.primary, color: '#ffffff', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isSubmitting ? 'Saving...' : editingSlaId ? 'Update Policy' : 'Save Policy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Add Escalation Trigger */}
      <Dialog
        open={escModalOpen}
        onClose={() => setEscModalOpen(false)}
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
          Configure Escalation Trigger Rule
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Stack spacing={2.5} mt={1}>
            <TextField
              select
              label="Incident Priority"
              fullWidth
              value={escPriority}
              onChange={(e) => setEscPriority(e.target.value as any)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value="P1">P1 - Critical Priority</MenuItem>
              <MenuItem value="P2">P2 - High Priority</MenuItem>
            </TextField>

            <TextField
              select
              label="Escalation Target Level"
              fullWidth
              value={escLevel}
              onChange={(e) => setEscLevel(Number(e.target.value))}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            >
              <MenuItem value={1}>Level 1: Team Lead Escalation</MenuItem>
              <MenuItem value={2}>Level 2: SRE Incident Commander &amp; War Room</MenuItem>
            </TextField>

            <TextField
              label="Timeout Threshold (Minutes Unacknowledged)"
              type="number"
              fullWidth
              value={escTimeout}
              onChange={(e) => setEscTimeout(Number(e.target.value))}
              helperText="Trigger alert if ticket remains unacknowledged after this duration"
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
              label="Automated Paging / Dispatch Action"
              fullWidth
              value={escAction}
              onChange={(e) => setEscAction(e.target.value)}
              placeholder="e.g. Escalate to Lead & Page On-Call Manager"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: COLORS.surfaceContainerLowest,
                  color: COLORS.onSurface,
                  '& fieldset': { borderColor: COLORS.border },
                },
                '& .MuiInputLabel-root': { color: COLORS.onSurfaceVariant },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderColor: COLORS.border }}>
          <Button onClick={() => setEscModalOpen(false)} sx={{ textTransform: 'none', color: COLORS.onSurfaceVariant }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEscalationPolicy}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: COLORS.secondary, color: '#000000', '&:hover': { bgcolor: '#0891b2' } }}
          >
            {isSubmitting ? 'Saving...' : 'Add Escalation Trigger'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete SLA Policy Dialog */}
      <ConfirmDialog
        open={Boolean(deleteSlaTarget)}
        onClose={() => setDeleteSlaTarget(null)}
        onConfirm={handleConfirmDeleteSla}
        title="Delete SLA Policy"
        description={`Are you sure you want to delete this SLA policy for ${deleteSlaTarget?.priority}?`}
        confirmColor="error"
        confirmLabel="Delete Policy"
      />

      {/* Confirm Delete Escalation Policy Dialog */}
      <ConfirmDialog
        open={Boolean(deleteEscTarget)}
        onClose={() => setDeleteEscTarget(null)}
        onConfirm={handleConfirmDeleteEsc}
        title="Delete Escalation Policy"
        description={`Are you sure you want to delete the escalation policy for ${deleteEscTarget?.priority} Level ${deleteEscTarget?.level}?`}
        confirmColor="error"
        confirmLabel="Delete Policy"
      />
    </Box>
  );
}
