import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip,
  Stack, Collapse, IconButton, MenuItem, TextField, TablePagination,
} from '@mui/material';
import {
  Refresh as RefreshIcon, KeyboardArrowDown as DownIcon, KeyboardArrowUp as UpIcon, ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { AUDIT_ACTIONS, searchAudit, type AuditAction, type AuditSearchParams } from '../../api/audit';
import { apiErrorMessage } from '../../utils/errors';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import AuditSealPanel from './AuditSealPanel';

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
const label = (a: string) => a.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const head = { fontWeight: 600, fontSize: 12, color: 'text.secondary' } as const;

interface Filters { action: string; actorId: string; incidentId: string; from: string; to: string }
const EMPTY: Filters = { action: '', actorId: '', incidentId: '', from: '', to: '' };

function toParams(f: Filters, page: number, size: number): AuditSearchParams {
  const p: AuditSearchParams = { page, size };
  if (f.action) p.action = f.action as AuditAction;
  if (f.actorId) p.actorId = Number(f.actorId);
  if (f.incidentId) p.incidentId = Number(f.incidentId);
  if (f.from) p.from = new Date(f.from).toISOString();
  if (f.to) p.to = new Date(f.to).toISOString();
  return p;
}

export default function AuditLog() {
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [open, setOpen] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-log', filters, page, size],
    queryFn: () => searchAudit(toParams(filters, page, size)),
  });

  const rangeBad = !!draft.from && !!draft.to && new Date(draft.to) <= new Date(draft.from);
  const apply = () => { if (rangeBad) return; setPage(0); setFilters(draft); };
  const reset = () => { setPage(0); setDraft(EMPTY); setFilters(EMPTY); };
  const toggle = (id: number) =>
    setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const field = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [k]: e.target.value });
  const onKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') apply(); };

  const items = data?.items ?? [];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} mb={3} spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ color: 'text.primary' }}>Audit trail</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, fontSize: 13 }}>
            Append-only record of incident changes, assignments, failed logins, access denials and configuration changes.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()} disabled={isFetching}>Refresh</Button>
      </Stack>

      <AuditSealPanel />

      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: 1, borderColor: 'divider' }}>
        <Stack direction="row" flexWrap="wrap" gap={1.5} alignItems="center">
          <TextField select size="small" label="Action" value={draft.action} onChange={field('action')} sx={{ minWidth: 220 }}>
            <MenuItem value="">All actions</MenuItem>
            {AUDIT_ACTIONS.map((a) => <MenuItem key={a} value={a}>{label(a)}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Actor (user ID)" type="number" value={draft.actorId} onChange={field('actorId')} onKeyDown={onKey} sx={{ width: 150 }} />
          <TextField size="small" label="Incident (ID)" type="number" value={draft.incidentId} onChange={field('incidentId')} onKeyDown={onKey} sx={{ width: 150 }} />
          <TextField size="small" label="From" type="datetime-local" value={draft.from} onChange={field('from')} InputLabelProps={{ shrink: true }} />
          <TextField size="small" label="To" type="datetime-local" value={draft.to} onChange={field('to')} InputLabelProps={{ shrink: true }}
            error={rangeBad} helperText={rangeBad ? 'To must be after From' : 'To is exclusive'} />
          <Button variant="contained" onClick={apply} disabled={rangeBad}>Apply</Button>
          <Button onClick={reset}>Clear</Button>
        </Stack>
      </Paper>

      {isLoading ? <LoadingState />
        : isError ? <ErrorState onRetry={() => refetch()} message={apiErrorMessage(error)} />
        : items.length === 0 ? <EmptyState message="No audit records match these filters." />
        : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48 }} />
                <TableCell sx={head}>Time (your local time)</TableCell>
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
                      <TableCell sx={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(e.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip size="small" label={label(e.action)} color={ACTION_TONE[e.action] ?? 'primary'} variant="outlined" sx={{ fontSize: 12, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.primary' }}>
                        {e.actor ? e.actor.name : <Typography component="span" sx={{ fontSize: 13, color: 'text.secondary' }}>System</Typography>}
                      </TableCell>
                      <TableCell onClick={(ev) => ev.stopPropagation()}>
                        {e.incidentId ? (
                          <Chip component={Link} to={`/admin/incidents/${e.incidentId}`} clickable size="small"
                            label={e.incidentCode || `Incident ${e.incidentId}`} sx={{ fontSize: 12, fontWeight: 600 }} />
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
            sx={{ '& .MuiTablePagination-toolbar, & .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { fontSize: 13 } }}
          />
        </TableContainer>
      )}
    </Box>
  );
}
