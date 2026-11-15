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
import { useToast } from '../../components/Toast';

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

  // Query 3: Services Catalog (for service-specific SLA targets)
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
        // Active tickets
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

  // Handle Open Create SLA Modal
  const handleOpenCreateSla = () => {
    setEditingSlaId(null);
    setSlaPriority('P1');
    setSlaServiceId('GLOBAL');
    setResponseMinutes(15);
    setResolutionMinutes(240);
    setCalendarType('ALWAYS');
    setSlaModalOpen(true);
  };

  // Handle Open Edit SLA Modal
  const handleOpenEditSla = (pol: AdminSlaPolicy) => {
    setEditingSlaId(pol.id);
    setSlaPriority(pol.priority);
    setSlaServiceId(pol.serviceId ? String(pol.serviceId) : 'GLOBAL');
    setResponseMinutes(pol.responseMinutes);
    setResolutionMinutes(pol.resolutionMinutes);
    setCalendarType(pol.calendarType === 'BUSINESS_HOURS' ? 'BUSINESS_HOURS' : 'ALWAYS');
    setSlaModalOpen(true);
  };

  // Save SLA Policy (Create or Update)
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

  // Delete SLA Policy
  const handleDeleteSlaPolicy = async (id: number, p: string) => {
    if (!window.confirm(`Are you sure you want to delete this SLA policy for ${p}?`)) return;
    try {
      await deleteAdminSlaPolicy(id);
      toast(`Deleted policy for ${p}`, 'info');
      refetchSla();
    } catch (e: any) {
      toast(e.message || 'Failed to delete policy', 'error');
    }
  };

  // Save Escalation Policy
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

  // Delete Escalation Policy
  const handleDeleteEscalation = async (id: number, priority: string, level: number) => {
    if (!window.confirm(`Delete escalation policy for ${priority} Level ${level}?`)) return;
    try {
      await deleteAdminEscalationPolicy(id);
      toast(`Deleted escalation policy`, 'info');
      refetchEsc();
    } catch (e: any) {
      toast(e.message || 'Failed to delete escalation policy', 'error');
    }
  };

  const handleRefreshAll = () => {
    refetchSla();
    refetchEsc();
    refetchIncidents();
    toast('SLA matrix and escalation telemetry refreshed', 'info');
  };

  // Helper to format minutes into human readable duration
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
                bgcolor: '#f5f3ff',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PolicyIcon />
            </Box>
            <Typography variant="h5" fontWeight={800} color="#172b4d">
              SLA Policy Matrix & Escalation Engine
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Enforce contractual response and resolution deadlines, define service-specific overrides, and automate on-call escalation
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshAll}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            Refresh
          </Button>
          {activeTab === 'SLA' ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateSla}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#7c3aed' }}
            >
              Add SLA Target Rule
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEscModalOpen(true)}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, bgcolor: '#0284c7' }}
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
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Live SLA Compliance Rate
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: Number(slaMetrics.complianceRate) >= 95 ? '#10b981' : '#f59e0b',
                    boxShadow: Number(slaMetrics.complianceRate) >= 95 ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                  }}
                />
                <Typography variant="h4" fontWeight={800} color="#172b4d">
                  {slaMetrics.complianceRate}%
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {slaMetrics.metCount} Met SLA • {slaMetrics.breachedCount} Breached in live telemetry
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: Active SLA Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Active Incident Clocks
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#172b4d" mt={0.5}>
                {slaMetrics.activeOkCount + slaMetrics.warningCount} Open Clocks
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {slaMetrics.warningCount > 0 ? (
                  <span style={{ color: '#d97706', fontWeight: 700 }}>
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
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Configured SLA Rules
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#7c3aed" mt={0.5}>
                {policies.length} Policies
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {policies.filter((p) => !p.serviceId).length} Global Defaults • {policies.filter((p) => p.serviceId).length} Service Overrides
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Escalation Ladder */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2.5, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
                Automated Escalation Steps
              </Typography>
              <Typography variant="h4" fontWeight={800} color="#0284c7" mt={0.5}>
                {escalations.length} Triggers
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Auto-page team lead & manager on unacknowledged alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs navigation */}
      <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            px: 2,
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.9rem', py: 2 },
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
                <CircularProgress size={32} />
              </Box>
            ) : policies.length === 0 ? (
              <Box p={6} textAlign="center">
                <Typography variant="subtitle1" fontWeight={700} color="#334155">
                  No SLA policies configured yet
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: '#f5f7fa', borderBottom: '2px solid #e2e8f0' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      PRIORITY TIER
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      APPLICATION SCOPE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      RESPONSE TARGET (ACK)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      RESOLUTION TARGET (FIX)
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      OPERATING CALENDAR
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2, textAlign: 'right' }}>
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
                      <TableRow key={pol.id} hover sx={{ '&:hover': { bgcolor: '#f5f7fa !important' } }}>
                        {/* Priority Badge */}
                        <TableCell sx={{ py: 2 }}>
                          <PriorityBadge priority={pol.priority} />
                        </TableCell>

                        {/* Scope */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={isGlobal ? 700 : 600} color={isGlobal ? '#172b4d' : '#1d4ed8'}>
                              {scopeName}
                            </Typography>
                            {isGlobal ? (
                              <Chip label="Default Fallback" size="small" sx={{ fontSize: '0.68rem', height: 20 }} />
                            ) : (
                              <Chip label="Override" size="small" color="primary" sx={{ fontSize: '0.68rem', height: 20 }} />
                            )}
                          </Stack>
                        </TableCell>

                        {/* Response Target */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AccessTimeIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" fontWeight={800} color="#172b4d">
                              {formatDuration(pol.responseMinutes)}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Time to engineer triage
                          </Typography>
                        </TableCell>

                        {/* Resolution Target */}
                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TimerIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" fontWeight={800} color="#172b4d">
                              {formatDuration(pol.resolutionMinutes)}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
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
                                bgcolor: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                              }}
                            />
                          ) : (
                            <Chip
                              label="Business Hours (09:00 - 18:00 M-F)"
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.72rem' }}
                            />
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell sx={{ py: 2, textAlign: 'right' }}>
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="Edit Policy Target">
                              <IconButton size="small" color="default" onClick={() => handleOpenEditSla(pol)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Policy">
                              <IconButton size="small" color="error" onClick={() => handleDeleteSlaPolicy(pol.id, pol.priority)}>
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
                <CircularProgress size={32} />
              </Box>
            ) : escalations.length === 0 ? (
              <Box p={6} textAlign="center">
                <Typography variant="subtitle1" fontWeight={700} color="#334155">
                  No escalation policies configured yet
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead sx={{ bgcolor: '#f5f7fa', borderBottom: '2px solid #e2e8f0' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      TRIGGER PRIORITY
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      ESCALATION TIER LEVEL
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      TIMEOUT THRESHOLD
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2 }}>
                      AUTOMATED ACTION & DISPATCH
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', fontSize: '0.82rem', py: 2, textAlign: 'right' }}>
                      ACTIONS
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {escalations.map((p) => {
                    const level = p.level || p.targetLevel || 1;
                    const timeout = p.timeoutMinutes || p.triggerMinutes || 30;

                    return (
                      <TableRow key={p.id} hover sx={{ '&:hover': { bgcolor: '#f5f7fa !important' } }}>
                        <TableCell sx={{ py: 2 }}>
                          <PriorityBadge priority={p.priority} />
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Chip
                            label={`Level ${level}: ${level >= 2 ? 'SRE Incident Commander' : 'Team Lead'}`}
                            size="small"
                            color={level >= 2 ? 'error' : 'primary'}
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <TimerIcon sx={{ fontSize: 16, color: '#d97706' }} />
                            <Typography variant="body2" fontWeight={800} color="#172b4d">
                              {timeout} minutes unacknowledged
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Triggered automatically by SLA daemon
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" fontWeight={600} color="#172b4d">
                            {p.action || `Auto-escalate to Tier ${level} On-Call Queue & Page Duty Engineer`}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ py: 2, textAlign: 'right' }}>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteEscalation(p.id, p.priority, level)}
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
      <Dialog open={slaModalOpen} onClose={() => setSlaModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#172b4d' }}>
          {editingSlaId ? 'Edit SLA Target Rule' : 'Configure New SLA Policy Target'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <TextField
              select
              label="Incident Priority Level"
              fullWidth
              value={slaPriority}
              onChange={(e) => setSlaPriority(e.target.value as any)}
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
              />
              <TextField
                label="Resolution Target (Minutes to Fix)"
                type="number"
                fullWidth
                value={resolutionMinutes}
                onChange={(e) => setResolutionMinutes(Number(e.target.value))}
                helperText="Maximum allowed time to resolve"
              />
            </Stack>

            <TextField
              select
              label="Operating Calendar Schedule"
              fullWidth
              value={calendarType}
              onChange={(e) => setCalendarType(e.target.value as any)}
            >
              <MenuItem value="ALWAYS">24x7 Continuous (Uninterrupted 24/7)</MenuItem>
              <MenuItem value="BUSINESS_HOURS">Business Hours Only (Mon-Fri 09:00 - 18:00)</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSlaModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSlaPolicy}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#7c3aed' }}
          >
            {isSubmitting ? 'Saving...' : editingSlaId ? 'Update Policy' : 'Save Policy'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog 2: Add Escalation Trigger */}
      <Dialog open={escModalOpen} onClose={() => setEscModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#172b4d' }}>
          Configure Escalation Trigger Rule
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} mt={1}>
            <TextField
              select
              label="Incident Priority"
              fullWidth
              value={escPriority}
              onChange={(e) => setEscPriority(e.target.value as any)}
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
            >
              <MenuItem value={1}>Level 1: Team Lead Escalation</MenuItem>
              <MenuItem value={2}>Level 2: SRE Incident Commander & War Room</MenuItem>
            </TextField>

            <TextField
              label="Timeout Threshold (Minutes Unacknowledged)"
              type="number"
              fullWidth
              value={escTimeout}
              onChange={(e) => setEscTimeout(Number(e.target.value))}
              helperText="Trigger alert if ticket remains unacknowledged after this duration"
            />

            <TextField
              label="Automated Paging / Dispatch Action"
              fullWidth
              value={escAction}
              onChange={(e) => setEscAction(e.target.value)}
              placeholder="e.g. Escalate to Lead & Page On-Call Manager"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEscModalOpen(false)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEscalationPolicy}
            disabled={isSubmitting}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#0284c7' }}
          >
            {isSubmitting ? 'Saving...' : 'Add Escalation Trigger'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

