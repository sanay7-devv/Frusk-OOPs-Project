import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Alert,
  Grid,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  TimerOff as TimerOffIcon,
  CrisisAlert as EmergencyIcon,
  Search as SearchIcon,
  Sync as SyncIcon,
  ArrowForward as ArrowForwardIcon,
  AssignmentTurnedIn as AssignIcon,
  Warning as WarningIcon,
  Download as DownloadIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';

import { Link as LinkIcon } from '@mui/icons-material';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../auth/AuthContext';
import { listIncidents, getIncident, getSlaViolations } from '../../api/incidents';
import { reassignIncident } from '../../api/technicians';
import type { IncidentSummary, IncidentDetail, IncidentStatus, IncidentAction, SlaViolationView } from '../../api/types';
import ActionButtons from '../../components/ActionButtons';
import { useLiveRefresh } from '../shared/useLiveRefresh';
import { LinkProblemDialog } from '../technician/WorkbenchDialogs';
import { useProblemBasePath } from '../problems/problemAccess';
import PriorityBadge from '../../components/PriorityBadge';
import StatusChip from '../../components/StatusChip';
import SlaCountdown from '../../components/SlaCountdown';
import ConfirmDialog from '../../components/ConfirmDialog';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { apiErrorMessage } from '../../utils/errors';
import { COLORS, MAX_REASON, MIN_REASON, MONO, dialogPaperSx, fieldSx, fmtDateTime, invalidateIncidentCaches } from './shared/ui';
import IntelligencePanel, { SlaRiskCard } from './shared/IntelligencePanel';
import WhyAssignee from './shared/WhyAssignee';
import SlaClockPair from './shared/SlaClockPair';
import { CandidatePicker, EscalationTimeline } from './shared/TeamComponents';
import {
  EscalateDialog,
  InternalNoteDialog,
  MarkDuplicateDialog,
  OverridePriorityDialog,
} from './shared/IncidentActionDialogs';
import { violationsToCsv } from './shared/violationsCsv';
import { alpha, BRAND_GRADIENT } from '../technician/staffStyle';
import { tokens, slaStateColor } from '../../theme/theme';

/** Every status an escalated ticket can still be in, apart from the finished ones (CLOSED, VERIFIED). */
const OPEN_STATUSES: IncidentStatus[] = ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'RESOLVED', 'REOPENED'];
/** Statuses where the work is still going on; RESOLVED is shown apart, waiting for the reporter to verify. */
const WORKING_STATUSES: IncidentStatus[] = OPEN_STATUSES.filter((s) => s !== 'RESOLVED');

/** Lifecycle actions that are not supervisory (the assignee works them from the workbench). */
const ESC_EXCLUDED: IncidentAction[] = ['ACKNOWLEDGE', 'START_WORK', 'REQUEST_INFO', 'RESOLVE', 'VERIFY', 'CLOSE', 'REOPEN', 'ASSIGN', 'EDIT', 'PROVIDE_INFO', 'GIVE_FEEDBACK', 'WITHDRAW'];
const ESC_LABELS: Partial<Record<IncidentAction, string>> = { ESCALATE: 'Escalate now', COMMENT: 'Add internal note' };
const ESC_ICONS: Partial<Record<IncidentAction, ReactNode>> = {
  ESCALATE: <UpgradeIcon sx={{ fontSize: 16 }} />,
  REASSIGN: <AssignIcon sx={{ fontSize: 16 }} />,
};

type Tab = 'escalations' | 'at-risk' | 'violations';

const headCell = {
  color: COLORS.onSurfaceVariant,
  fontWeight: 700,
  fontSize: 12,
  fontFamily: MONO,
  textTransform: 'uppercase',
} as const;

/** The date-time-local input value as an ISO instant, or undefined when empty. */
const toIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

export default function Escalations() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('escalations');
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [targetTechId, setTargetTechId] = useState<number | null>(null);
  const [reassignReason, setReassignReason] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  // Server pushes (STOMP via realtime/useRealtime) reload every list and the open dossier.
  useLiveRefresh(() => invalidateIncidentCaches(queryClient));
  const [problemOpen, setProblemOpen] = useState(false);
  const problemBase = useProblemBasePath();
  const [takeOverOpen, setTakeOverOpen] = useState(false);

  // Violations filters
  const [vFrom, setVFrom] = useState('');
  const [vTo, setVTo] = useState('');
  const [vType, setVType] = useState('');
  const [vPage, setVPage] = useState(0);
  const vSize = 25;

  // 1. Escalated incidents: server-side minEscalationLevel and status filters
  const {
    data: incidentsData,
    isLoading: isIncidentsLoading,
    error: incidentsError,
    refetch: refetchIncidents,
    isFetching: isIncidentsFetching,
  } = useQuery({
    queryKey: ['lead-escalated-incidents'],
    queryFn: () => listIncidents({ minEscalationLevel: 1, status: OPEN_STATUSES, size: 100, sort: 'priority,asc' }),
    refetchInterval: 10000,
  });
  const escalatedIncidents: IncidentSummary[] = incidentsData?.items ?? [];

  // 2. Tickets whose SLA is close to breaching, from the server's own slaState
  const {
    data: atRisk = [],
    isLoading: isAtRiskLoading,
    error: atRiskError,
    refetch: refetchAtRisk,
  } = useQuery({
    queryKey: ['lead-at-risk'],
    queryFn: async () => {
      const [risk, warning] = await Promise.all([
        listIncidents({ slaState: 'AT_RISK', status: WORKING_STATUSES, size: 50, sort: 'resolutionDue,asc' }),
        listIncidents({ slaState: 'WARNING', status: WORKING_STATUSES, size: 50, sort: 'resolutionDue,asc' }),
      ]);
      return [...risk.items, ...warning.items];
    },
    refetchInterval: 15000,
  });

  // 3. Recorded SLA violations, filtered and paged on the server
  const {
    data: violationsData,
    isLoading: isViolationsLoading,
    error: violationsError,
    refetch: refetchViolations,
  } = useQuery({
    queryKey: ['lead-sla-violations', vFrom, vTo, vPage],
    queryFn: () => getSlaViolations({ from: toIso(vFrom), to: toIso(vTo), page: vPage, size: vSize }),
    refetchInterval: 10000,
    placeholderData: (prev) => prev,
  });
  const allViolations: SlaViolationView[] = violationsData?.items ?? [];
  const violations = vType ? allViolations.filter((v) => v.type === vType) : allViolations;
  const violationTypes = Array.from(new Set(allViolations.map((v) => v.type))).sort();
  const vTotalPages = violationsData?.totalPages ?? 1;

  useEffect(() => {
    setVPage(0);
  }, [vFrom, vTo]);

  // 4. Detail of the selected escalated incident
  const {
    data: incidentDetail,
    isLoading: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery<IncidentDetail>({
    queryKey: ['lead-escalated-detail', selectedIncidentId],
    queryFn: () => getIncident(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  const closeReassign = () => {
    setReassignModalOpen(false);
    setTargetTechId(null);
    setReassignReason('');
  };

  // Reassign (also used by "Take over", which reassigns to the signed-in lead)
  const reassignMutation = useMutation({
    mutationFn: ({ incidentId, technicianId, reason }: { incidentId: number; technicianId: number; reason: string }) =>
      reassignIncident(incidentId, technicianId, reason),
    onSuccess: (_res, vars) => {
      invalidateIncidentCaches(queryClient);
      toast(vars.technicianId === user?.id ? 'You have taken over this ticket.' : 'Escalated ticket reassigned to new engineer.', 'success');
      closeReassign();
      setTakeOverOpen(false);
    },
    onError: (err) => toast(apiErrorMessage(err), 'error'),
  });

  const matches = (inc: IncidentSummary) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.code.toLowerCase().includes(q) ||
      inc.title.toLowerCase().includes(q) ||
      inc.service.name.toLowerCase().includes(q) ||
      (inc.assignee?.name ?? '').toLowerCase().includes(q)
    );
  };
  const filtered = escalatedIncidents.filter(matches);
  const workingList = filtered.filter((i) => i.status !== 'RESOLVED');
  const resolvedList = filtered.filter((i) => i.status === 'RESOLVED');
  const orderedList = [...workingList, ...resolvedList];

  useEffect(() => {
    if (orderedList.length > 0) {
      if (!selectedIncidentId || !orderedList.some((i) => i.id === selectedIncidentId)) {
        setSelectedIncidentId(orderedList[0].id);
      }
    } else {
      setSelectedIncidentId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalatedIncidents, searchQuery, selectedIncidentId]);

  const exportViolations = () => {
    const blob = new Blob([violationsToCsv(violations)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sla-violations-page-${vPage + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${violations.length} violation${violations.length === 1 ? '' : 's'} from this page.`, 'success');
  };

  const allowed = incidentDetail?.allowedActions ?? [];
  const canReassign = allowed.includes('REASSIGN');
  const canEscalate = allowed.includes('ESCALATE');
  const reasonLen = reassignReason.trim().length;
  const reasonBad = reassignReason.length > 0 && reasonLen < MIN_REASON;
  const reasonValid = reasonLen >= MIN_REASON && reassignReason.length <= MAX_REASON;
  /** One place that turns an allowedActions key into the dialog it opens. */
  const onSupervisorAction = (a: IncidentAction) => {
    switch (a) {
      case 'ESCALATE': return setEscalateOpen(true);
      case 'REASSIGN': return setReassignModalOpen(true);
      case 'OVERRIDE_PRIORITY': return setOverrideOpen(true);
      case 'MARK_DUPLICATE': return setDuplicateOpen(true);
      case 'COMMENT': return setNoteOpen(true);
      default: return undefined;
    }
  };
  const blocked = (action: string) => (incidentDetail ? `${action} is not allowed while the incident is ${incidentDetail.status}.` : '');

  const renderRow = (inc: IncidentSummary) => {
    const isSelected = inc.id === selectedIncidentId;
    return (
      <Paper
        key={inc.id}
        elevation={0}
        onClick={() => setSelectedIncidentId(inc.id)}
        sx={{
          p: 2,
          borderRadius: 2.5,
          bgcolor: isSelected ? alpha(tokens.danger, 0.12) : COLORS.surfaceContainer,
          border: `1px solid ${isSelected ? COLORS.error : COLORS.border}`,
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': { borderColor: COLORS.error },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 12, fontWeight: 800, color: COLORS.secondary, whiteSpace: 'nowrap' }}>{inc.code}</Typography>
            <PriorityBadge priority={inc.priority} />
            {inc.major && (
              <Chip
                label="MAJOR"
                size="small"
                sx={{
                  height: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: MONO,
                  bgcolor: alpha(tokens.danger, 0.25),
                  color: tokens.tertiaryLight,
                  border: `1px solid ${alpha(tokens.danger, 0.5)}`,
                }}
              />
            )}
            <Chip
              label={`LEVEL ${inc.escalationLevel}`}
              size="small"
              sx={{
                height: 20,
                fontSize: 12,
                fontWeight: 800,
                fontFamily: MONO,
                bgcolor: alpha(tokens.danger, 0.2),
                color: COLORS.error,
                border: `1px solid ${alpha(tokens.danger, 0.4)}`,
              }}
            />
          </Box>
          <SlaCountdown due={inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
        </Box>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: COLORS.onSurface, mb: 0.75 }}>{inc.title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant }}>Assignee: {inc.assignee?.name ?? 'Not assigned'}</Typography>
          <StatusChip status={inc.status} />
        </Box>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: COLORS.surface, minHeight: '100vh' }}>
      {/* Top Header Bar */}
      <Box sx={{ mb: 3 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography component="h1" variant="h4" sx={{ fontWeight: 800, color: COLORS.onSurface, fontFamily: 'Sora, sans-serif' }}>
              Escalations and SLA breaches
            </Typography>
            <Typography sx={{ color: COLORS.onSurfaceVariant, fontSize: 13.5, mt: 0.5 }}>
              Incidents that are overdue, escalated, or have breached their SLA.
            </Typography>
          </Box>

          <Button
            size="small"
            onClick={() => {
              refetchIncidents();
              refetchViolations();
              refetchAtRisk();
            }}
            disabled={isIncidentsFetching}
            startIcon={isIncidentsFetching ? <CircularProgress size={14} color="inherit" /> : <SyncIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: COLORS.surfaceContainer,
              color: COLORS.onSurfaceVariant,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 2,
              px: 2,
              py: 0.8,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: COLORS.surfaceContainerHigh },
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Tabs Switcher */}
      <Paper
        elevation={0}
        sx={{ mb: 3, p: 0.5, borderRadius: 2.5, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, display: 'inline-flex', maxWidth: '100%' }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 2,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 12.5,
              color: COLORS.onSurfaceVariant,
              '&.Mui-selected': { color: tokens.onSurface, bgcolor: COLORS.surfaceContainerHighest },
            },
            '& .MuiTabs-indicator': { display: 'none' },
          }}
        >
          <Tab
            value="escalations"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmergencyIcon sx={{ fontSize: 16, color: COLORS.error }} />
                <span>Active Escalations ({escalatedIncidents.length})</span>
              </Box>
            }
          />
          <Tab
            value="at-risk"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ fontSize: 16, color: COLORS.warning }} />
                <span>SLA at risk ({atRisk.length})</span>
              </Box>
            }
          />
          <Tab
            value="violations"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TimerOffIcon sx={{ fontSize: 16, color: COLORS.warning }} />
                <span>SLA Violations ({violationsData?.totalItems ?? allViolations.length})</span>
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {activeTab === 'escalations' && (
        <Grid container spacing={3}>
          {/* List of Escalated Tickets */}
          <Grid item xs={12} lg={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search escalated tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: COLORS.onSurfaceVariant, fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2, ...fieldSx }}
            />

            {isIncidentsLoading ? (
              <LoadingState />
            ) : incidentsError ? (
              <ErrorState onRetry={() => refetchIncidents()} message={apiErrorMessage(incidentsError)} />
            ) : orderedList.length === 0 ? (
              <EmptyState message="No active escalations. All open incidents are at Level 0." />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {workingList.map(renderRow)}
                {resolvedList.length > 0 && (
                  <>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: MONO, color: COLORS.onSurfaceVariant, textTransform: 'uppercase', mt: 1 }}>
                      Resolved, waiting for the reporter to verify ({resolvedList.length})
                    </Typography>
                    {resolvedList.map(renderRow)}
                  </>
                )}
              </Box>
            )}
          </Grid>

          {/* Escalation Inspector Workbench */}
          <Grid item xs={12} lg={7}>
            {selectedIncidentId && isDetailLoading ? (
              <LoadingState />
            ) : selectedIncidentId && detailError ? (
              <ErrorState onRetry={() => refetchDetail()} message={apiErrorMessage(detailError)} />
            ) : selectedIncidentId && incidentDetail ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    bgcolor: COLORS.surfaceContainer,
                    border: `1px solid ${alpha(tokens.danger, 0.3)}`,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, bgcolor: COLORS.error }} />

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: COLORS.secondary, whiteSpace: 'nowrap' }}>{incidentDetail.code}</Typography>
                      <Chip
                        label={`ESCALATION LEVEL ${incidentDetail.escalationLevel}`}
                        size="small"
                        sx={{ bgcolor: COLORS.error, color: tokens.onSurface, fontWeight: 800, fontSize: 12, fontFamily: MONO }}
                      />
                      <StatusChip status={incidentDetail.status} />
                    </Box>
                    <Button
                      size="small"
                      onClick={() => navigate(`/tech/incidents/${incidentDetail.id}`)}
                      sx={{ color: COLORS.secondary, fontSize: 12.5, textTransform: 'none' }}
                    >
                      Diagnose in Workbench
                    </Button>
                  </Box>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.onSurface, mb: 1 }}>
                    {incidentDetail.title}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, lineHeight: 1.6, mb: 2 }}>{incidentDetail.description}</Typography>

                  {/* Assignee and acknowledgement */}
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Assignee</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>{incidentDetail.assignee?.name ?? 'Unassigned'}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Acknowledged</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: incidentDetail.acknowledgedAt ? COLORS.success : COLORS.warning }}>
                        {incidentDetail.acknowledgedAt ? fmtDateTime(incidentDetail.acknowledgedAt) : 'Not yet'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <SlaClockPair incident={incidentDetail} fontSize={14} />
                    </Grid>
                  </Grid>

                  <Divider sx={{ borderColor: COLORS.border, mb: 2 }} />

                  {/* Escalation preview from the server */}
                  {incidentDetail.escalationPreview ? (
                    <Box sx={{ p: 2, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, mb: 2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: COLORS.secondary, textTransform: 'uppercase', fontFamily: MONO, mb: 1 }}>
                        Next Escalation Target &amp; Countdown
                      </Typography>
                      <Grid container spacing={2}>
                        {incidentDetail.escalationPreview.kind === 'EXHAUSTED' ? (
                          <Grid item xs={12}>
                            <Alert
                              severity="warning"
                              sx={{ bgcolor: alpha(tokens.warning, 0.1), color: slaStateColor.WARNING, border: `1px solid ${alpha(tokens.warning, 0.3)}`, fontSize: 12.5, py: 0.5 }}
                            >
                              Escalation Exhausted: All supervisory tiers notified. Top supervisory tier reached.
                            </Alert>
                          </Grid>
                        ) : (
                          <>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Next Level</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.error, fontFamily: MONO }}>
                                Level {incidentDetail.escalationPreview.toLevel}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Target Role</Typography>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.onSurface }}>{incidentDetail.escalationPreview.targetRole}</Typography>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Time Left</Typography>
                              <Box sx={{ pt: 0.2 }}>
                                <SlaCountdown
                                  due={incidentDetail.escalationPreview.dueAt}
                                  remainingSeconds={incidentDetail.escalationPreview.secondsRemaining}
                                  slaState={incidentDetail.slaState}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, textTransform: 'uppercase' }}>Recipients</Typography>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: COLORS.onSurface }}>
                                {incidentDetail.escalationPreview.recipients.map((r) => r.name).join(', ')}
                              </Typography>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Box>
                  ) : (
                    <Box sx={{ p: 1.5, bgcolor: COLORS.surfaceContainerLow, borderRadius: 2, border: `1px solid ${COLORS.border}`, mb: 2 }}>
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant }}>
                        No further escalation step is scheduled. This incident is already at the top level.
                      </Typography>
                    </Box>
                  )}

                  {/* Supervisory Actions, driven by allowedActions */}
                  <Box sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', '& .MuiButton-root': { whiteSpace: 'nowrap' } }}>
                    <ActionButtons
                      allowed={allowed}
                      exclude={ESC_EXCLUDED}
                      onAction={onSupervisorAction}
                      labels={ESC_LABELS}
                      icons={ESC_ICONS}
                    />
                    {!canEscalate && !canReassign && (
                      <Typography sx={{ fontSize: 12.5, color: COLORS.onSurfaceVariant, alignSelf: 'center' }}>
                        {blocked('Escalating or reassigning')}
                      </Typography>
                    )}
                    {canReassign && user && incidentDetail.assignee?.id !== user.id && (
                      <Button
                        variant="outlined"
                        onClick={() => setTakeOverOpen(true)}
                        sx={{ borderColor: COLORS.border, color: COLORS.onSurface, fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: 2 }}
                      >
                        Take over
                      </Button>
                    )}
                    {incidentDetail.problemId ? (
                      problemBase && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`${problemBase}/${incidentDetail.problemId}`)}
                          sx={{ borderColor: COLORS.border, color: COLORS.onSurface, fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: 2 }}
                        >
                          Problem #{incidentDetail.problemId}
                        </Button>
                      )
                    ) : (
                      problemBase && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<LinkIcon sx={{ fontSize: 16 }} />}
                          onClick={() => setProblemOpen(true)}
                          sx={{ borderColor: COLORS.border, color: COLORS.onSurface, fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: 2 }}
                        >
                          Open problem
                        </Button>
                      )
                    )}
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/tech/incidents/${incidentDetail.id}`)}
                      startIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                      sx={{ borderColor: COLORS.border, color: COLORS.onSurface, fontWeight: 600, fontSize: 12.5, textTransform: 'none', borderRadius: 2 }}
                    >
                      Open Tech Workbench
                    </Button>
                  </Box>
                </Paper>

                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}` }}>
                  <Typography sx={{ fontWeight: 800, color: COLORS.onSurface, mb: 1.5 }}>Escalation timeline</Typography>
                  <EscalationTimeline incidentId={incidentDetail.id} />
                  <Typography sx={{ fontWeight: 800, color: COLORS.onSurface, mt: 3, mb: 1.5 }}>SLA risk</Typography>
                  <SlaRiskCard incidentId={incidentDetail.id} />
                </Paper>

                <WhyAssignee incidentId={incidentDetail.id} assignee={incidentDetail.assignee} />

                <IntelligencePanel incidentId={incidentDetail.id} showSlaRisk={false} onOpenIncident={(id) => navigate(`/tech/incidents/${id}`)} />
              </Box>
            ) : (
              <EmptyState message="Select an escalated incident to inspect supervisor telemetry and next escalation targets." />
            )}
          </Grid>
        </Grid>
      )}

      {activeTab === 'at-risk' && (
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, p: 2 }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Open tickets the server marks AT_RISK or WARNING, soonest resolution deadline first. Act before they breach.
          </Typography>
          {isAtRiskLoading ? (
            <LoadingState />
          ) : atRiskError ? (
            <ErrorState onRetry={() => refetchAtRisk()} message={apiErrorMessage(atRiskError)} />
          ) : atRisk.length === 0 ? (
            <EmptyState message="No open ticket is close to breaching its SLA." />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                    <TableCell sx={headCell}>Ticket</TableCell>
                    <TableCell sx={headCell}>Priority</TableCell>
                    <TableCell sx={headCell}>State</TableCell>
                    <TableCell sx={headCell}>Assignee</TableCell>
                    <TableCell sx={headCell}>Resolution due</TableCell>
                    <TableCell align="right" sx={headCell}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {atRisk.map((inc) => (
                    <TableRow key={inc.id} hover>
                      <TableCell sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: COLORS.secondary, whiteSpace: 'nowrap' }}>{inc.code}</TableCell>
                      <TableCell>
                        <PriorityBadge priority={inc.priority} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={inc.slaState} sx={{ fontSize: 12, height: 20, color: inc.slaState === 'AT_RISK' ? COLORS.error : COLORS.warning }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: COLORS.onSurface }}>{inc.assignee?.name ?? 'Unassigned'}</TableCell>
                      <TableCell>
                        <SlaCountdown due={inc.resolutionDue} createdAt={inc.createdAt} slaState={inc.slaState} />
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => navigate(`/tech/incidents/${inc.id}`)}
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                          sx={{ color: COLORS.secondary, fontSize: 12.5, fontWeight: 700, textTransform: 'none' }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {activeTab === 'violations' && (
        <Paper elevation={0} sx={{ borderRadius: 3, bgcolor: COLORS.surfaceContainer, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              type="datetime-local"
              label="From"
              value={vFrom}
              onChange={(e) => setVFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 210, ...fieldSx }}
            />
            <TextField
              size="small"
              type="datetime-local"
              label="To"
              value={vTo}
              onChange={(e) => setVTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!vFrom && !!vTo && new Date(vTo) < new Date(vFrom)}
              helperText={!!vFrom && !!vTo && new Date(vTo) < new Date(vFrom) ? 'To is before From' : undefined}
              sx={{ minWidth: 210, ...fieldSx }}
            />
            <TextField select size="small" label="Breach type" value={vType} onChange={(e) => setVType(e.target.value)} sx={{ minWidth: 160, ...fieldSx }}>
              <MenuItem value="">All types</MenuItem>
              {violationTypes.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            {(vFrom || vTo || vType) && (
              <Button
                size="small"
                onClick={() => {
                  setVFrom('');
                  setVTo('');
                  setVType('');
                }}
                sx={{ textTransform: 'none', fontSize: 12.5 }}
              >
                Clear filters
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="outlined"
              disabled={violations.length === 0}
              onClick={exportViolations}
              startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
              sx={{ textTransform: 'none', fontSize: 12.5, borderColor: COLORS.border, color: COLORS.onSurface }}
            >
              Export this page (CSV)
            </Button>
          </Box>

          {isViolationsLoading ? (
            <Box sx={{ p: 2 }}>
              <LoadingState />
            </Box>
          ) : violationsError ? (
            <Box sx={{ p: 2 }}>
              <ErrorState onRetry={() => refetchViolations()} message={apiErrorMessage(violationsError)} />
            </Box>
          ) : violations.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <EmptyState message={vFrom || vTo || vType ? 'No SLA violations match these filters.' : 'No SLA violations recorded.'} />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: COLORS.surfaceContainerLow }}>
                    <TableCell sx={headCell}>Ticket Code</TableCell>
                    <TableCell sx={headCell}>Breach Type</TableCell>
                    <TableCell sx={headCell}>Overdue Duration</TableCell>
                    <TableCell sx={headCell}>Technician Assigned</TableCell>
                    <TableCell sx={headCell}>Timestamp</TableCell>
                    <TableCell align="right" sx={headCell}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violations.map((v) => (
                    <TableRow key={v.id} hover sx={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <TableCell sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 800, color: COLORS.secondary }}>{v.incidentCode}</TableCell>
                      <TableCell>
                        <Chip
                          label={v.type}
                          size="small"
                          sx={{
                            fontFamily: MONO,
                            fontWeight: 800,
                            fontSize: 12,
                            bgcolor: alpha(tokens.danger, 0.15),
                            color: COLORS.error,
                            border: `1px solid ${alpha(tokens.danger, 0.3)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: COLORS.warning }}>
                        {(() => {
                          const totalMinutes = Math.round(v.overdueSeconds / 60);
                          const h = Math.floor(totalMinutes / 60);
                          const m = totalMinutes % 60;
                          return h > 0 ? `${h}h ${m}m overdue` : `${m}m overdue`;
                        })()}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: COLORS.onSurface }}>{v.technician?.name ?? 'Unassigned'}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>{fmtDateTime(v.createdAt)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => navigate(`/tech/incidents/${v.incidentId}`)}
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                          sx={{ color: COLORS.secondary, fontSize: 12.5, fontWeight: 700, textTransform: 'none' }}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderTop: `1px solid ${COLORS.border}` }}>
            <Button size="small" disabled={vPage === 0} onClick={() => setVPage((p) => Math.max(0, p - 1))} sx={{ textTransform: 'none', color: COLORS.onSurface, fontSize: 12.5 }}>
              Prev
            </Button>
            <Typography sx={{ fontSize: 12, color: COLORS.onSurfaceVariant, fontFamily: MONO }}>
              Page {vPage + 1} of {Math.max(1, vTotalPages)} ({violationsData?.totalItems ?? 0} total)
            </Typography>
            <Button
              size="small"
              disabled={vPage + 1 >= vTotalPages}
              onClick={() => setVPage((p) => p + 1)}
              sx={{ textTransform: 'none', color: COLORS.onSurface, fontSize: 12.5 }}
            >
              Next
            </Button>
          </Box>
        </Paper>
      )}

      {/* REASSIGNMENT DIALOG */}
      <Dialog open={reassignModalOpen} onClose={reassignMutation.isPending ? undefined : closeReassign} maxWidth="sm" fullWidth PaperProps={{ sx: dialogPaperSx }}>
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif' }}>Reassign Escalated Ticket</DialogTitle>
        <DialogContent dividers sx={{ borderColor: COLORS.border }}>
          <Typography sx={{ fontSize: 13, color: COLORS.onSurfaceVariant, mb: 2 }}>
            Choose who takes over. Technicians who are away, off duty or excluded by the assignment rules cannot be selected.
          </Typography>
          {selectedIncidentId && (
            <CandidatePicker
              incidentId={selectedIncidentId}
              assigneeId={incidentDetail?.assignee?.id}
              selectedId={targetTechId}
              onSelect={setTargetTechId}
            />
          )}
          <TextField
            fullWidth
            size="small"
            label={`Reason for reassignment (${MIN_REASON} to ${MAX_REASON} characters)`}
            value={reassignReason}
            onChange={(e) => setReassignReason(e.target.value)}
            inputProps={{ maxLength: MAX_REASON }}
            placeholder="e.g. Escalating to specialized Tier-2 technician for diagnosis"
            error={reasonBad}
            helperText={reasonBad ? `At least ${MIN_REASON} characters required (${reasonLen}/${MIN_REASON})` : 'Reason required for ITIL audit compliance'}
            sx={{ mt: 2, ...fieldSx }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeReassign} disabled={reassignMutation.isPending} sx={{ color: COLORS.onSurfaceVariant, textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!targetTechId || !selectedIncidentId || !reasonValid || reassignMutation.isPending}
            onClick={() => {
              if (selectedIncidentId && targetTechId && reasonValid) {
                reassignMutation.mutate({ incidentId: selectedIncidentId, technicianId: targetTechId, reason: reassignReason.trim() });
              }
            }}
            startIcon={reassignMutation.isPending ? <CircularProgress size={16} /> : <AssignIcon />}
            sx={{ background: BRAND_GRADIENT, color: tokens.onSurface, fontWeight: 700, textTransform: 'none', borderRadius: 2 }}
          >
            Confirm Reassignment
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={takeOverOpen}
        title="Take over this ticket"
        description="Reassigns the incident to you. The previous assignee is notified."
        confirmLabel="Take over"
        requireReason
        reasonLabel="Reason for taking over"
        minReasonLength={MIN_REASON}
        maxReasonLength={MAX_REASON}
        isLoading={reassignMutation.isPending}
        onConfirm={(r) => {
          if (r && selectedIncidentId && user) {
            reassignMutation.mutate({ incidentId: selectedIncidentId, technicianId: user.id, reason: r });
          }
        }}
        onClose={() => setTakeOverOpen(false)}
      />
      {selectedIncidentId && <EscalateDialog open={escalateOpen} incidentId={selectedIncidentId} onClose={() => setEscalateOpen(false)} />}
      {selectedIncidentId && <MarkDuplicateDialog open={duplicateOpen} incidentId={selectedIncidentId} onClose={() => setDuplicateOpen(false)} />}
      {incidentDetail && (
        <LinkProblemDialog
          open={problemOpen}
          incident={incidentDetail}
          onClose={() => setProblemOpen(false)}
          onDone={(problemId) => {
            invalidateIncidentCaches(queryClient);
            if (problemBase) navigate(`${problemBase}/${problemId}`);
          }}
        />
      )}
      {selectedIncidentId && <InternalNoteDialog open={noteOpen} incidentId={selectedIncidentId} onClose={() => setNoteOpen(false)} />}
      {incidentDetail && <OverridePriorityDialog open={overrideOpen} incident={incidentDetail} onClose={() => setOverrideOpen(false)} />}
    </Box>
  );
}
