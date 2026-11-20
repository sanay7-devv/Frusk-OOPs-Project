import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, IconButton, InputAdornment, Menu, MenuItem, Paper, Stack, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  Add as AddIcon, BookmarkBorder as BookmarkIcon, FileDownload as DownloadIcon, FilterAltOff as FilterAltOffIcon,
  PersonAddAlt as AssignIcon, Refresh as RefreshIcon, Search as SearchIcon,
} from '@mui/icons-material';
import { listIncidents } from '../../api/incidents';
import { downloadReport } from '../../api/reports';
import { getCategories, getServices } from '../../api/services';
import { listTechnicians } from '../../api/technicians';
import { getAdminUsers } from '../../api/admin';
import type { IncidentSummary } from '../../api/types';
import { IncidentCreateDialog } from '../../components/IncidentCreateDialog';
import PriorityBadge from '../../components/PriorityBadge';
import SlaBar from '../../components/SlaBar';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import StatusChip from '../../components/StatusChip';
import { useToast } from '../../components/Toast';
import { tokens } from '../../theme/theme';
import { apiErrorMessage } from '../../utils/errors';
import AssignDialog from './tickets/AssignDialog';
import IncidentDrawer from './tickets/IncidentDrawer';
import SavedViewsDialog from './tickets/SavedViewsDialog';
import { ALL_STATUSES, SLA_STATES, dateRange, fromSnapshot, snapshot, tabOf, toApiFilters } from './tickets/filters';
import type { TabKey } from './tickets/filters';

const PAGE_SIZE = 25;
const TAB_LABEL: Record<TabKey, string> = { today: 'Today', previous: 'Earlier', all: 'All' };
const headSx = { fontSize: 12, fontWeight: 600, color: tokens.onSurfaceVariant, whiteSpace: 'nowrap' } as const;
const cellSx = { fontSize: 13, whiteSpace: 'nowrap', py: 1 } as const;

export default function Tickets() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<IncidentSummary | null>(null);
  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const tab = tabOf(params);
  const page = Number(params.get('page')) || 0;
  const openId = Number(params.get('open')) || null;
  const get = (k: string) => params.get(k) ?? '';

  /** Sets one URL filter; every change except paging goes back to page 0 and closes the drawer's page offset. */
  const setParam = (key: string, value: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (key !== 'page' && key !== 'open') next.delete('page');
      return next;
    }, { replace: key === 'q' || key === 'code' });
  };

  // The search boxes keep a local copy so typing does not hit the API on every key.
  const [qText, setQText] = useState(get('q'));
  const [codeText, setCodeText] = useState(get('code'));
  useEffect(() => { setQText(get('q')); setCodeText(get('code')); }, [params.get('q'), params.get('code')]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => {
      if (qText !== get('q')) setParam('q', qText);
      if (codeText !== get('code')) setParam('code', codeText);
    }, 400);
    return () => clearTimeout(t);
  }, [qText, codeText]); // eslint-disable-line react-hooks/exhaustive-deps

  const services = useQuery({ queryKey: ['catalog-services'], queryFn: getServices });
  const categories = useQuery({ queryKey: ['catalog-categories'], queryFn: getCategories });
  const technicians = useQuery({ queryKey: ['technicians-list'], queryFn: () => listTechnicians() });
  const users = useQuery({ queryKey: ['admin-users-list'], queryFn: getAdminUsers });

  const filters = useMemo(() => ({ ...toApiFilters(params), size: PAGE_SIZE }), [params]);
  const list = useQuery({
    queryKey: ['admin-incidents-list', filters],
    queryFn: () => listIncidents(filters),
    refetchInterval: 15000,
    placeholderData: (prev) => prev,
  });
  const rows = list.data?.items ?? [];
  const totalItems = list.data?.totalItems ?? 0;
  const totalPages = list.data?.totalPages ?? 0;

  const current = useMemo(() => snapshot(params), [params]);
  const hasFilters = Object.keys(current).some((k) => k !== 'tab');

  const changeTab = (_: unknown, v: TabKey) => setParam('tab', v === 'all' ? '' : v);
  const clearFilters = () => setParams(params.get('tab') ? new URLSearchParams({ tab: params.get('tab')! }) : new URLSearchParams());
  const applyView = (filter: Record<string, unknown>) => setParams(fromSnapshot(filter));

  async function runExport(format: 'csv' | 'pdf') {
    setExportAnchor(null);
    setExporting(true);
    try {
      // Same local-day range as the list on screen (tickets/filters.ts dateRange).
      const { createdFrom, createdTo } = dateRange(params);
      const range = { from: createdFrom, to: createdTo };
      await downloadReport('incidents', format, range);
    } catch (e) {
      toast(apiErrorMessage(e), 'error');
    } finally {
      setExporting(false);
    }
  }

  const select = (key: string, label: string, options: { value: string; label: string }[], width = 150) => (
    <TextField select size="small" label={label} value={get(key)} onChange={(e) => setParam(key, e.target.value)} sx={{ minWidth: width }}>
      <MenuItem value="">Any</MenuItem>
      {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
    </TextField>
  );

  const loadFailed = list.isError && !list.data;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontSize: 24, fontWeight: 700 }}>Incidents</Typography>
          <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>
            {list.data ? `${totalItems} incident${totalItems === 1 ? '' : 's'} match the filters` : 'Search, filter and assign incidents'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Tooltip title="Refresh"><IconButton aria-label="Refresh" onClick={() => list.refetch()} disabled={list.isFetching}><RefreshIcon /></IconButton></Tooltip>
          <Button variant="outlined" startIcon={<BookmarkIcon />} onClick={() => setViewsOpen(true)} sx={{ textTransform: 'none' }}>Saved views</Button>
          <Button variant="outlined" startIcon={<DownloadIcon />} disabled={exporting} onClick={(e) => setExportAnchor(e.currentTarget)} sx={{ textTransform: 'none' }}>Export</Button>
          <Menu anchorEl={exportAnchor} open={!!exportAnchor} onClose={() => setExportAnchor(null)}>
            <MenuItem onClick={() => runExport('csv')}>CSV</MenuItem>
            <MenuItem onClick={() => runExport('pdf')}>PDF</MenuItem>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant, px: 2, py: 0.5, maxWidth: 240 }}>
              The export covers the date range only, not the other filters.
            </Typography>
          </Menu>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none' }}>Declare incident</Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={changeTab} sx={{ mb: 2 }}>
        {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => <Tab key={k} value={k} label={TAB_LABEL[k]} sx={{ textTransform: 'none', fontSize: 13 }} />)}
      </Tabs>

      <Paper sx={{ p: 2, mb: 2, bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px' }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField size="small" label="Search" placeholder="Title, description or code" value={qText} onChange={(e) => setQText(e.target.value)} sx={{ minWidth: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TextField size="small" label="Code" placeholder="INC-2026-00001" value={codeText} onChange={(e) => setCodeText(e.target.value)} sx={{ minWidth: 160 }} />
          {select('status', 'Status', [{ value: 'ACTIVE', label: 'Active (not resolved)' }, ...ALL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))], 190)}
          {select('priority', 'Priority', ['P1', 'P2', 'P3', 'P4'].map((p) => ({ value: p, label: p })), 110)}
          {select('slaState', 'SLA', SLA_STATES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') })), 130)}
          {select('level', 'Escalation', [0, 1, 2, 3].map((l) => ({ value: String(l), label: `Level ${l} or higher` })), 170)}
          {select('serviceId', 'Service', (services.data ?? []).map((s) => ({ value: String(s.id), label: s.name })), 180)}
          {select('categoryId', 'Category', (categories.data ?? []).map((c) => ({ value: String(c.id), label: c.name })), 180)}
          {select('assigneeId', 'Assignee', (technicians.data ?? []).map((t) => ({ value: String(t.id), label: t.name })), 170)}
          {select('reporterId', 'Reporter', (users.data ?? []).map((u) => ({ value: String(u.id), label: u.name })), 170)}
          <TextField size="small" type="date" label="Created from" value={get('from')} disabled={tab !== 'all'} onChange={(e) => setParam('from', e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="Created to" value={get('to')} disabled={tab !== 'all'} onChange={(e) => setParam('to', e.target.value)} InputLabelProps={{ shrink: true }} />
          {hasFilters && <Button startIcon={<FilterAltOffIcon />} onClick={clearFilters} sx={{ textTransform: 'none' }}>Clear filters</Button>}
        </Stack>
        {(services.isError || categories.isError || technicians.isError || users.isError) && (
          <Typography sx={{ fontSize: 12, color: tokens.tertiary, mt: 1 }}>
            Some filter lists did not load: {apiErrorMessage((services.error ?? categories.error ?? technicians.error ?? users.error))}
          </Typography>
        )}
      </Paper>

      {list.isLoading && <LoadingState />}
      {loadFailed && <ErrorState onRetry={() => list.refetch()} message={apiErrorMessage(list.error)} />}
      {list.data && rows.length === 0 && (
        <EmptyState message={hasFilters || tab !== 'all' ? 'No incidents match these filters.' : 'No incidents yet.'}
          action={hasFilters ? <Button onClick={clearFilters} sx={{ textTransform: 'none' }}>Clear filters</Button> : undefined} />
      )}
      {list.isError && list.data && <ErrorState onRetry={() => list.refetch()} message={apiErrorMessage(list.error)} />}

      {rows.length > 0 && (
        <Paper sx={{ bgcolor: tokens.surfaceContainerLow, border: `1px solid ${tokens.outlineVariant}`, borderRadius: '12px', overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['Code', 'Title', 'Service', 'Priority', 'Status', 'SLA', 'Assignee', 'Created', ''].map((h) => <TableCell key={h || 'actions'} sx={headSx}>{h}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id} hover sx={{ cursor: 'pointer' }} onClick={() => setParam('open', String(i.id))}>
                    <TableCell sx={cellSx}>
                      {i.code}
                      {i.major && <Chip size="small" label="MAJOR" color="error" sx={{ ml: 1, height: 20, fontSize: 12 }} />}
                    </TableCell>
                    <TableCell sx={{ ...cellSx, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.title}</TableCell>
                    <TableCell sx={cellSx}>{i.service.name}</TableCell>
                    <TableCell sx={cellSx}><PriorityBadge priority={i.priority} /></TableCell>
                    <TableCell sx={cellSx}><StatusChip status={i.status} /></TableCell>
                    <TableCell sx={{ ...cellSx, minWidth: 110 }}><SlaBar createdAt={i.createdAt} due={i.resolutionDue} slaState={i.slaState} /></TableCell>
                    <TableCell sx={cellSx}>{i.assignee?.name ?? <Box component="span" sx={{ color: tokens.onSurfaceVariant }}>Unassigned</Box>}</TableCell>
                    <TableCell sx={cellSx}>{new Date(i.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                    <TableCell sx={cellSx} align="right">
                      <Tooltip title={i.assignee ? 'Reassign' : 'Assign'}>
                        <IconButton size="small" aria-label={i.assignee ? `Reassign ${i.code}` : `Assign ${i.code}`}
                          onClick={(e) => { e.stopPropagation(); setAssignTarget(i); }}><AssignIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.5 }}>
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Page {page + 1} of {Math.max(totalPages, 1)}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page <= 0} onClick={() => setParam('page', page - 1 > 0 ? String(page - 1) : '')} sx={{ textTransform: 'none' }}>Previous</Button>
              <Button size="small" disabled={page + 1 >= totalPages} onClick={() => setParam('page', String(page + 1))} sx={{ textTransform: 'none' }}>Next</Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      <IncidentCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} defaultServiceId={Number(get('serviceId')) || undefined}
        onCreated={(c) => setParam('open', String(c.id))} />
      <AssignDialog incident={assignTarget} onClose={() => setAssignTarget(null)} />
      <SavedViewsDialog open={viewsOpen} onClose={() => setViewsOpen(false)} current={current} onApply={applyView} />
      <IncidentDrawer id={openId} onClose={() => setParam('open', '')} />
    </Box>
  );
}
