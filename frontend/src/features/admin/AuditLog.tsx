import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip,
  Stack, Collapse, IconButton, MenuItem, TextField, TablePagination, Autocomplete, Checkbox, ListItemText,
} from '@mui/material';
import {
  Refresh as RefreshIcon, Download as DownloadIcon, KeyboardArrowDown as DownIcon, KeyboardArrowUp as UpIcon, ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { AUDIT_ACTIONS, type AuditAction } from '../../api/audit';
import { listDirectoryUsers, type DirectoryUser } from '../../api/adminDirectory';
import { listIncidents } from '../../api/incidents';
import { searchAuditActions, type AuditQuery } from './auditSearch';
import DateRangeField from '../../components/DateRangeField';
import { formatDateTime, humanizeEnum } from '../../utils/format';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import AuditSealPanel from './AuditSealPanel';
import AuditHistogram from './AuditHistogram';
import { exportAuditCsv } from './auditCsv';
import { useToast } from '../../components/Toast';
import { reportFailure } from './adminErrors';

type Tone = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'secondary';
const ACTION_TONE: Record<AuditAction, Tone> = {
  INCIDENT_CREATED: 'primary', CLASSIFIED: 'primary', PRIORITY_CALCULATED: 'info', PRIORITY_CHANGED: 'warning',
  ASSIGNED: 'secondary', REASSIGNED: 'secondary', ACKNOWLEDGED: 'info', WORK_STARTED: 'info',
  INFO_REQUESTED: 'warning', INFO_PROVIDED: 'info', RESOLVED: 'success', VERIFIED: 'success', CLOSED: 'success',
  REOPENED: 'warning', ESCALATED: 'error', COMMENT_ADDED: 'primary', SLA_WARNING: 'warning', SLA_VIOLATED: 'error',
  DUPLICATE_LINKED: 'secondary', LOGIN_FAILED: 'error', ACCESS_DENIED: 'error', USER_ROLE_CHANGED: 'warning',
  CONFIG_CHANGED: 'warning', ATTACHMENT_ADDED: 'primary', PASSWORD_RESET_REQUESTED: 'warning',
  PASSWORD_CHANGED: 'info', MFA_ENABLED: 'success', MFA_DISABLED: 'warning',
};
const label = humanizeEnum;
const head = { fontWeight: 600, fontSize: 12, color: 'text.secondary' } as const;

/** `incidentId` is what the API filters by; `incidentCode` is what the admin typed. */
interface Filters { actions: AuditAction[]; actor: DirectoryUser | null; incidentCode: string; incidentId: number | null; from: string; to: string }
const EMPTY: Filters = { actions: [], actor: null, incidentCode: '', incidentId: null, from: '', to: '' };

function toParams(f: Filters, page: number, size: number): AuditQuery {
  const p: AuditQuery = { page, size };
  if (f.actions.length) p.actions = f.actions;
  if (f.actor) p.actorId = f.actor.id;
  if (f.incidentId != null) p.incidentId = f.incidentId;
  if (f.from) p.from = new Date(f.from).toISOString();
  if (f.to) p.to = new Date(f.to).toISOString();
  return p;
}

export default function AuditLog() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-log', filters, page, size],
    queryFn: () => searchAuditActions(toParams(filters, page, size)),
  });
  const users = useQuery({ queryKey: ['audit-actor-options'], queryFn: listDirectoryUsers, staleTime: 5 * 60_000 });
  const [codeError, setCodeError] = useState('');
  const [resolving, setResolving] = useState(false);

  const rangeBad = !!draft.from && !!draft.to && new Date(draft.to) <= new Date(draft.from);
  // The API filters by incident id; turn a typed code (INC-2026-00213) into its id first.
  const apply = async () => {
    if (rangeBad) return;
    const code = draft.incidentCode.trim();
    let incidentId: number | null = null;
    if (code) {
      setResolving(true);
      try {
        const hit = (await listIncidents({ code, size: 1 })).items[0];
        if (!hit) { setCodeError(`No incident has the code ${code}.`); return; }
        incidentId = hit.id;
      } catch (e) {
        setCodeError(apiErrorMessage(e));
        return;
      } finally {
        setResolving(false);
      }
    }
    setCodeError('');
    setPage(0);
    setFilters({ ...draft, incidentCode: code, incidentId });
  };
  const reset = () => { setPage(0); setCodeError(''); setDraft(EMPTY); setFilters(EMPTY); };
  const toggle = (id: number) =>
    setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const field = (k: 'incidentCode' | 'from' | 'to') => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') void apply(); };

  const items = data?.items ?? [];

  const downloadCsv = async () => {
    setExporting(true);
    try {
      const { page: _p, size: _s, ...params } = toParams(filters, 0, 1);
      const res = await exportAuditCsv(params);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast(
        res.truncated ? `Downloaded the newest ${res.rows} of ${res.total} matching records.` : `Downloaded ${res.rows} records.`,
        res.truncated ? 'warning' : 'success'
      );
    } catch (e) {
      reportFailure(toast, e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>Audit trail</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontSize: 13 }}>
            Append-only record of incident changes, assignments, failed logins, access denials and configuration changes.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={exporting || items.length === 0}>
            {exporting ? 'Preparing...' : 'Export CSV'}
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
        </Stack>
      </Stack>

      <AuditSealPanel />

      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
        <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
          <TextField select size="small" label="Actions" value={draft.actions} sx={{ minWidth: 240 }}
            onChange={(e) => setDraft({ ...draft, actions: (typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value) as AuditAction[] })}
            SelectProps={{ multiple: true, renderValue: (v) => ((v as string[]).length ? (v as string[]).map(label).join(', ') : 'All actions') , displayEmpty: true }}
            InputLabelProps={{ shrink: true }}>
            {AUDIT_ACTIONS.map((a) => (
              <MenuItem key={a} value={a}>
                <Checkbox size="small" checked={draft.actions.includes(a)} />
                <ListItemText primary={label(a)} />
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete size="small" sx={{ width: 240 }} options={users.data ?? []} loading={users.isLoading}
            value={draft.actor} onChange={(_, v) => setDraft({ ...draft, actor: v })}
            getOptionLabel={(u) => u.name} isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => (
              <TextField {...params} label="Actor" error={users.isError}
                helperText={users.isError ? apiErrorMessage(users.error) : undefined} />
            )} />
          <TextField size="small" label="Incident code" placeholder="INC-2026-00213" value={draft.incidentCode} onChange={field('incidentCode')}
            onKeyDown={onKey} error={!!codeError} helperText={codeError || undefined} sx={{ width: 190 }} />
          <DateRangeField mode="datetime" from={draft.from} to={draft.to} toTip="Shows records before this time"
            onChange={(r) => setDraft({ ...draft, from: r.from, to: r.to })} />
          <Button variant="contained" onClick={() => void apply()} disabled={rangeBad || resolving}>Apply</Button>
          <Button onClick={reset}>Clear</Button>
        </Stack>
      </Paper>

      {isLoading ? <LoadingState />
        : isError ? <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} />
        : items.length === 0 ? <EmptyState message="No audit records match these filters." />
        : (
        <>
        <AuditHistogram items={items} />
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell sx={{ ...head, whiteSpace: 'nowrap' }}>Time (local)</TableCell>
                <TableCell sx={head}>Action</TableCell>
                <TableCell sx={head}>Actor</TableCell>
                <TableCell sx={head}>Incident</TableCell>
                <TableCell sx={head}>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((e) => {
                const expanded = open.has(e.id);
                return (
                  <Fragment key={e.id}>
                    <TableRow hover onClick={() => toggle(e.id)} sx={{ cursor: 'pointer', '& td': { borderBottom: expanded ? 0 : undefined } }}>
                      <TableCell>
                        <IconButton size="small" aria-label={expanded ? 'Collapse row' : 'Expand row'}>
                          {expanded ? <UpIcon fontSize="small" /> : <DownIcon fontSize="small" />}
                        </IconButton>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{formatDateTime(e.timestamp)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={label(e.action)} color={ACTION_TONE[e.action] ?? 'primary'} variant="outlined" sx={{ fontSize: 12, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.primary' }}>
                        {e.actor ? e.actor.name : <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>System</Typography>}
                      </TableCell>
                      <TableCell onClick={(ev) => ev.stopPropagation()}>
                        {e.incidentId ? (
                          <Chip component={Link} to={`/admin/incidents/${e.incidentId}`} clickable size="small"
                            label={e.incidentCode || `Incident ${e.incidentId}`} sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }} />
                        ) : <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>—</Typography>}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.primary', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.description}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0, borderBottom: expanded ? undefined : 0 }}>
                        <Collapse in={expanded} unmountOnExit>
                          <Box sx={{ py: 1.5, pl: 6 }}>
                            <Typography sx={{ fontSize: 13, color: 'text.primary' }}>{e.description}</Typography>
                            {(e.previousState || e.newState) && (
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Status:</Typography>
                                <Chip size="small" label={e.previousState ? label(e.previousState) : '—'} sx={{ fontSize: 12 }} />
                                <ArrowIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Chip size="small" label={e.newState ? label(e.newState) : '—'} sx={{ fontSize: 12 }} />
                              </Stack>
                            )}
                            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>Record {e.id}</Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={data?.totalItems ?? 0}
            page={page}
            rowsPerPage={size}
            rowsPerPageOptions={[10, 25, 50, 100]}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
            labelDisplayedRows={filters.actions.length > 1 ? ({ from, to }) => `${from}-${to} on this page (each action paged separately)` : undefined}
            sx={{ '& .MuiTablePagination-toolbar, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13 } }}
          />
        </TableContainer>
        </>
      )}
    </Box>
  );
}
