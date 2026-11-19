import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Chip, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { getAdminConfig } from '../../../api/admin';
import type { ServiceRecord, SlaPolicyRecord } from '../../../api/adminDirectory';
import { getSlaViolations } from '../../../api/incidents';
import { getSlaCompliance } from '../../../api/reports';
import { ErrorState, LoadingState } from '../../../components/StateViews';
import { tokens } from '../../../theme/theme';
import { apiErrorMessage } from '../../../utils/errors';
import { cardSx, fieldSx, monoLabelSx } from '../adminForm';

export const formatMinutes = (m: number) => {
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${+(m / 60).toFixed(1)} h`;
  return `${+(m / 1440).toFixed(1)} days`;
};

/** Compliance by priority and the latest breaches, from the reports API (all history, all services). */
export function ComplianceStrip() {
  const navigate = useNavigate();
  const compliance = useQuery({ queryKey: ['admin-sla-compliance'], queryFn: () => getSlaCompliance({}, 'priority') });
  const violations = useQuery({ queryKey: ['admin-sla-violations-latest'], queryFn: () => getSlaViolations({ size: 5 }) });
  const rows = useMemo(() => [...(compliance.data ?? [])].sort((a, b) => a.label.localeCompare(b.label)), [compliance.data]);
  const met = rows.reduce((s, r) => s + r.met, 0);
  const judged = rows.reduce((s, r) => s + r.total, 0);

  return (
    <Grid container spacing={2.5} sx={{ mb: 3 }}>
      <Grid item xs={12} md={7}>
        <Paper elevation={0} sx={cardSx}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography sx={monoLabelSx}>SLA compliance by priority</Typography>
            <Button size="small" onClick={() => navigate('/admin/reports')} sx={{ textTransform: 'none' }}>Open reports</Button>
          </Stack>
          {compliance.isLoading && <LoadingState />}
          {compliance.isError && <ErrorState onRetry={() => compliance.refetch()} message={apiErrorMessage(compliance.error)} />}
          {compliance.data && (judged === 0
            ? <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mt: 1 }}>No incident has been judged against an SLA yet.</Typography>
            : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Sora, sans-serif', mt: 0.5 }}>
                  {((met / judged) * 100).toFixed(1)}%
                  <Typography component="span" sx={{ fontSize: 13, color: tokens.onSurfaceVariant, ml: 1 }}>{met} met of {judged} judged</Typography>
                </Typography>
                <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
                  {rows.map((r) => (
                    <Chip key={r.label} label={`${r.label}: ${r.compliancePercent.toFixed(1)}% (${r.violated} breached)`}
                      sx={{ fontSize: 12, bgcolor: tokens.surfaceContainerHigh, color: r.violated > 0 ? '#fbbf24' : tokens.onSurface }} />
                  ))}
                </Stack>
              </>
            ))}
        </Paper>
      </Grid>
      <Grid item xs={12} md={5}>
        <Paper elevation={0} sx={{ ...cardSx, height: '100%' }}>
          <Typography sx={monoLabelSx}>Latest breaches</Typography>
          {violations.isLoading && <LoadingState />}
          {violations.isError && <ErrorState onRetry={() => violations.refetch()} message={apiErrorMessage(violations.error)} />}
          {violations.data && violations.data.items.length === 0 && (
            <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mt: 1 }}>No SLA breaches recorded.</Typography>
          )}
          <Stack spacing={1} mt={1}>
            {violations.data?.items.map((v) => (
              <Box key={v.id} onClick={() => navigate(`/admin/tickets/${v.incidentId}`)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/tickets/${v.incidentId}`); }}
                sx={{ cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: tokens.surfaceContainerHigh } }}>
                <Typography sx={{ fontSize: 13 }}>
                  <b style={{ fontFamily: 'JetBrains Mono, monospace' }}>{v.incidentCode}</b> · {v.type.toLowerCase()} · {formatMinutes(Math.round(v.overdueSeconds / 60))} over
                </Typography>
                <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{v.technician?.name ?? 'Unassigned'} · {new Date(v.createdAt).toLocaleString()}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

const DAY_LABEL: Record<string, string> = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };

/** Read-only summary of the sla.business.* settings, with a link to the calendar editor in Configuration. */
export function CalendarSummary() {
  const navigate = useNavigate();
  const config = useQuery({ queryKey: ['admin-config-settings'], queryFn: getAdminConfig });
  const v = (key: string) => config.data?.find((c) => c.key === key)?.value ?? '';
  const days = v('sla.business.days').split(',').map((d) => d.trim().slice(0, 3).toUpperCase()).filter(Boolean);
  const holidays = v('sla.business.holidays').split(',').map((d) => d.trim()).filter(Boolean);
  return (
    <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }}>
        <Box>
          <Typography sx={monoLabelSx}>Business-hours calendar (for BUSINESS_HOURS policies)</Typography>
          {config.isLoading && <Typography sx={{ fontSize: 14, color: tokens.onSurfaceVariant, mt: 0.5 }}>Loading…</Typography>}
          {config.isError && <Typography sx={{ fontSize: 14, color: '#fb7185', mt: 0.5 }}>{apiErrorMessage(config.error)}</Typography>}
          {config.data && (
            <Typography sx={{ fontSize: 14, mt: 0.5 }}>
              {v('sla.business.open')} to {v('sla.business.close')}, {days.map((d) => DAY_LABEL[d] ?? d).join(', ') || 'no working days'} ({v('sla.business.zone')}); {holidays.length} holiday{holidays.length === 1 ? '' : 's'}
            </Typography>
          )}
        </Box>
        <Button variant="outlined" size="small" onClick={() => navigate('/admin/config')} sx={{ textTransform: 'none' }}>Edit calendar</Button>
      </Stack>
    </Paper>
  );
}

/** Which policy an incident of this service and priority gets: the service's own, else the global default. */
export function EffectivePolicy({ policies, services }: { policies: SlaPolicyRecord[]; services: ServiceRecord[] }) {
  const [serviceId, setServiceId] = useState('');
  const [priority, setPriority] = useState('P1');
  const hit = useMemo(() => {
    const own = serviceId ? policies.find((p) => p.serviceId === Number(serviceId) && p.priority === priority) : undefined;
    if (own) return { policy: own, via: 'service' as const };
    const global = policies.find((p) => p.serviceId == null && p.priority === priority);
    return global ? { policy: global, via: 'global' as const } : null;
  }, [policies, serviceId, priority]);

  return (
    <Paper elevation={0} sx={{ ...cardSx, mb: 3 }}>
      <Typography sx={monoLabelSx}>Which policy applies?</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={1.5} alignItems={{ sm: 'center' }}>
        <TextField select size="small" label="Service" value={serviceId} onChange={(e) => setServiceId(e.target.value)} sx={{ ...fieldSx, minWidth: 220 }}
          SelectProps={{ displayEmpty: true, renderValue: (val) => (val === '' ? 'Any service (global only)' : services.find((s) => String(s.id) === val)?.name ?? String(val)) }}>
          <MenuItem value="">Any service (global only)</MenuItem>
          {services.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.name}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)} sx={{ ...fieldSx, minWidth: 100 }}>
          {['P1', 'P2', 'P3', 'P4'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 14, color: hit ? tokens.onSurface : '#fb7185' }}>
          {hit
            ? `${hit.via === 'service' ? 'Service policy' : 'Global default'}: respond in ${formatMinutes(hit.policy.responseMinutes)}, resolve in ${formatMinutes(hit.policy.resolutionMinutes)}, ${hit.policy.calendarType === 'ALWAYS' ? 'clock always runs' : 'business hours only'}`
            : 'No policy: incidents of this service and priority are rejected with SLA_NOT_CONFIGURED. Add a global default.'}
        </Typography>
      </Stack>
    </Paper>
  );
}
