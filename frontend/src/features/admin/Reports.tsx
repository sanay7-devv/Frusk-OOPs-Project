import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Grid, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { tokens } from '../../theme/theme';
import {
  downloadReport, getCategoryDistribution, getOverview, getPriorityDistribution, getServiceReport, getSlaCompliance,
  getTrends, getWorkloadReport, type ExportType, type SlaGroupBy,
} from '../../api/reports';
import { getCategories } from '../../api/services';
import { apiErrorMessage } from '../../utils/errors';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { ChartCard, type DateRange } from './reports/common';
import {
  CategoryBars, PriorityDonut, ServiceBars, SlaChart, TrendChart, WorkloadChart, formatMinutes,
} from './reports/Charts';
import { CoverageRiskCard, SlaViolationsCard } from './reports/Tables';
import IncidentHeatmap from '../../components/IncidentHeatmap';
import IncidentsDrawer, { type DrawerTarget } from './reports/IncidentsDrawer';

const toIsoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toIsoDate(d); };

const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: 'incidents', label: 'All incidents' },
  { value: 'overview', label: 'Summary numbers' },
  { value: 'trends', label: 'Created and resolved over time' },
  { value: 'sla-compliance', label: 'SLA compliance' },
  { value: 'priority-distribution', label: 'Incidents by priority' },
  { value: 'category-distribution', label: 'Incidents by category' },
  { value: 'services', label: 'Incidents by service' },
  { value: 'workload', label: 'Technician workload' },
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Paper sx={{ p: 2.5, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px', height: '100%' }}>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 13 }}>{label}</Typography>
      <Typography sx={{ color: tokens.onSurface, fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>{value}</Typography>
      {hint && <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 12 }}>{hint}</Typography>}
    </Paper>
  );
}

export default function Reports() {
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [preset, setPreset] = useState<number | 'custom'>(30);
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(toIsoDate(new Date()));
  const [groupBy, setGroupBy] = useState<SlaGroupBy>('priority');
  const [exportType, setExportType] = useState<ExportType>('incidents');
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const rangeInvalid = !from || !to || from > to;
  // Backend takes date-times: start of the first day to the end of the last day, in the viewer's time zone.
  const range = useMemo<DateRange | null>(() => (rangeInvalid ? null : {
    from: new Date(`${from}T00:00:00`).toISOString(),
    to: new Date(`${to}T23:59:59.999`).toISOString(),
  }), [from, to, rangeInvalid]);
  const enabled = range !== null;
  const r = range ?? {};
  const bucket = range && (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000 > 45 ? 'week' : 'day';

  const overview = useQuery({ queryKey: ['reports', 'overview', range], queryFn: () => getOverview(r), enabled });
  const trends = useQuery({ queryKey: ['reports', 'trends', range, bucket], queryFn: () => getTrends(r, bucket), enabled });
  const sla = useQuery({ queryKey: ['reports', 'sla', range, groupBy], queryFn: () => getSlaCompliance(r, groupBy), enabled });
  const priorities = useQuery({ queryKey: ['reports', 'priority', range], queryFn: () => getPriorityDistribution(r), enabled });
  const categories = useQuery({ queryKey: ['reports', 'categories', range], queryFn: () => getCategoryDistribution(r), enabled });
  const services = useQuery({ queryKey: ['reports', 'services', range], queryFn: () => getServiceReport(r), enabled });
  const workload = useQuery({ queryKey: ['reports', 'workload'], queryFn: getWorkloadReport });
  const categoryList = useQuery({ queryKey: ['categories-flat'], queryFn: getCategories });

  const pickPreset = (days: number) => { setPreset(days); setFrom(daysAgo(days)); setTo(toIsoDate(new Date())); };
  const created = range ? { createdFrom: range.from, createdTo: range.to } : {};
  // A heatmap cell is one local day: from its midnight to the next.
  const openDay = (day: string) => {
    const start = new Date(`${day}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    setDrawer({ title: `Incidents created on ${day}`, filters: { createdFrom: start.toISOString(), createdTo: end.toISOString() } });
  };
  const openPriority = (priority: string) =>
    setDrawer({ title: `${priority} incidents in this period`, filters: { priority: [priority], ...created } });
  const openService = (row: { serviceId: number; name: string }) =>
    setDrawer({ title: `${row.name}: incidents in this period`, filters: { serviceId: row.serviceId, ...created } });
  const openTechnician = (row: { technicianId: number; name: string }) =>
    setDrawer({
      title: `${row.name}: open incidents`,
      filters: { assigneeId: row.technicianId, status: ['ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'PENDING_USER_INFO', 'REOPENED'] },
    });

  /** Bars carry only a name; the id comes from the matching report rows, and a name with no match opens nothing. */
  const openCategory = (label: string) => {
    const c = categoryList.data?.find((x) => x.name === label);
    if (c) setDrawer({ title: `${c.name}: incidents in this period`, filters: { categoryId: c.id, ...created } });
  };
  const openSlaBar = (label: string) => {
    if (groupBy === 'priority') return openPriority(label);
    if (groupBy === 'service') {
      const row = services.data?.find((x) => x.name === label);
      if (row) openService(row);
      return;
    }
    const tech = workload.data?.find((x) => x.name === label);
    if (tech) setDrawer({ title: `${tech.name}: incidents in this period`, filters: { assigneeId: tech.technicianId, ...created } });
  };

  const doExport = async (format: 'csv' | 'pdf') => {
    setExporting(format);
    setExportError(null);
    try { if (!range) return;
      await downloadReport(exportType, format, range); }
    catch (e) { setExportError(apiErrorMessage(e)); }
    finally { setExporting(null); }
  };

  const o = overview.data;
  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Typography component="h1" variant="h4" sx={{ fontWeight: 700, color: tokens.onSurface, mb: 0.5 }}>Reports</Typography>
      <Typography sx={{ color: tokens.onSurfaceVariant, fontSize: 14, mb: 3 }}>Incident volume, SLA results and team workload for the chosen dates.</Typography>

      <Paper sx={{ p: 2, mb: 3, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems={{ lg: 'center' }} justifyContent="space-between">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <ToggleButtonGroup size="small" exclusive value={preset} onChange={(_, v) => v !== null && (v === 'custom' ? setPreset('custom') : pickPreset(v))}>
              <ToggleButton value={7}>Last 7 days</ToggleButton>
              <ToggleButton value={30}>Last 30 days</ToggleButton>
              <ToggleButton value={90}>Last 90 days</ToggleButton>
              <ToggleButton value="custom">Custom</ToggleButton>
            </ToggleButtonGroup>
            <TextField size="small" type="date" label="From" value={from} InputLabelProps={{ shrink: true }}
              onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }} error={rangeInvalid} />
            <TextField size="small" type="date" label="To" value={to} InputLabelProps={{ shrink: true }}
              onChange={(e) => { setTo(e.target.value); setPreset('custom'); }} error={rangeInvalid}
              helperText={rangeInvalid ? 'Pick a start date that is not after the end date' : undefined} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
            <TextField select size="small" label="Report to download" value={exportType} sx={{ minWidth: 240 }}
              onChange={(e) => setExportType(e.target.value as ExportType)}>
              {EXPORT_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled={rangeInvalid || exporting !== null} onClick={() => doExport('csv')}>
              {exporting === 'csv' ? 'Preparing...' : 'Download CSV'}
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} disabled={rangeInvalid || exporting !== null} onClick={() => doExport('pdf')}>
              {exporting === 'pdf' ? 'Preparing...' : 'Download PDF'}
            </Button>
          </Stack>
        </Stack>
        {exportError && <Alert severity="error" sx={{ mt: 2 }} onClose={() => setExportError(null)}>Download failed: {exportError}</Alert>}
      </Paper>

      {overview.isLoading && enabled ? <LoadingState /> : overview.isError ? (
        <ErrorState message={apiErrorMessage(overview.error)} onRetry={() => overview.refetch()} />
      ) : o && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}><Kpi label="Total incidents" value={String(o.total)} hint={`${o.resolved} resolved`} /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi label="Still open" value={String(o.open)} hint={`${o.critical} critical`} /></Grid>
          <Grid item xs={12} sm={6} md={3}><Kpi label="SLA violations" value={String(o.slaViolations)} /></Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Kpi label="Average time to resolve"
              value={o.resolved === 0 ? 'No data' : formatMinutes(o.avgResolutionMinutes)}
              hint={o.avgSatisfaction != null ? `Average satisfaction ${o.avgSatisfaction.toFixed(1)} / 5` : undefined} />
          </Grid>
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <ChartCard title={`Incidents created and resolved (per ${bucket})`} query={trends} isEmpty={(d) => d.every((p) => p.created === 0 && p.resolved === 0)}
            emptyMessage="No incidents in this period">
            {(d) => <TrendChart data={d} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <ChartCard title={`SLA compliance by ${groupBy}`} query={sla} isEmpty={(d) => d.length === 0} emptyMessage="No SLA results in this period"
            action={
              <ToggleButtonGroup size="small" exclusive value={groupBy} onChange={(_, v) => v && setGroupBy(v)}>
                <ToggleButton value="priority">Priority</ToggleButton>
                <ToggleButton value="service">Service</ToggleButton>
                <ToggleButton value="technician">Technician</ToggleButton>
              </ToggleButtonGroup>
            }>
            {(d) => <SlaChart data={d} onBarClick={openSlaBar} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <ChartCard title="Incidents by priority" query={priorities} isEmpty={(d) => d.every((p) => p.count === 0)} emptyMessage="No incidents in this period">
            {(d) => <PriorityDonut data={d} onSliceClick={openPriority} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Top 8 categories" query={categories} isEmpty={(d) => d.length === 0} emptyMessage="No incidents in this period">
            {(d) => <CategoryBars data={d} onBarClick={openCategory} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <ChartCard title="Incidents by service" query={services} isEmpty={(d) => d.length === 0} emptyMessage="No incidents in this period">
            {(d) => <ServiceBars data={d} onBarClick={openService} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12}>
          <ChartCard title="Technician workload" query={workload} isEmpty={(d) => d.length === 0} emptyMessage="No technicians yet">
            {(d) => <WorkloadChart data={d} onBarClick={openTechnician} />}
          </ChartCard>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, color: tokens.onSurface, mb: 2 }}>Incidents per day, last 14 weeks</Typography>
            <IncidentHeatmap onSelectDay={openDay} />
          </Paper>
        </Grid>
        <Grid item xs={12}><CoverageRiskCard /></Grid>
        <Grid item xs={12}><SlaViolationsCard range={range} /></Grid>
      </Grid>
      <IncidentsDrawer target={drawer} onClose={() => setDrawer(null)} />
    </Box>
  );
}
