import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Skeleton } from '@mui/material';
import { listStudioIncidents as listIncidents } from '../api/studio';
import { tokenStore } from '../api/client';
import type { IncidentSummary } from '../api/types';
import { errorMessage } from '../utils/errors';
import { useAuth } from '../auth/AuthContext';
import PriorityBadge from './PriorityBadge';
import StatusChip from './StatusChip';

const FILTERS = [{ id: 'all', label: 'Everything' }, { id: 'open', label: 'In motion' }, { id: 'waiting', label: 'Needs a reply' }, { id: 'closed', label: 'Resolved' }];
const CLOSED = ['RESOLVED', 'VERIFIED', 'CLOSED'];
const STATUSES: Record<string, string[] | undefined> = { all: undefined, open: ['NEW', 'CLASSIFIED', 'ASSIGNED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'REOPENED'], waiting: ['PENDING_USER_INFO'], closed: CLOSED };

export default function IncidentBoard({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<IncidentSummary | null>(null);
  const sample = Boolean(tokenStore.getAccess()?.startsWith('mock-'));
  const query = useQuery({ queryKey: ['studio-incidents', user?.id, admin, filter, term, page],
    queryFn: () => listIncidents({ mine: !admin, status: STATUSES[filter], q: term || undefined, page, size: 12, sort: 'createdAt,desc' }) });
  const rows = query.data?.items || [];
  const total = query.data?.totalItems ?? 0;
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setTerm(search.trim()); setPage(0); };
  return <section className="incident-board">
    <div className="board-heading"><div><div className="eyebrow"><span className="shape-dot" />EVERY ISSUE HAS A JOURNEY</div><h1>{admin ? 'The whole picture.' : 'Your issues. In motion.'}</h1><p>{admin ? 'Find a report. Follow its progress. Keep the handoffs clear.' : 'A little clarity on what’s happening, and what happens next.'}</p></div>{!admin && <Link className="studio-button" to="/employee/report">Report an issue <span>↗</span></Link>}</div>
    <div className="board-toolbar"><div className="board-filters" role="group" aria-label="Filter incidents">{FILTERS.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setPage(0); }}>{item.label}</button>)}</div><form className="board-search" onSubmit={submitSearch}><input aria-label="Search incidents" placeholder="Find an issue…" value={search} onChange={event => setSearch(event.target.value)} /><button aria-label="Run incident search" type="submit">↗</button></form></div>
    <div className="board-count"><span>{String(total).padStart(2, '0')} REPORTS {sample ? '/ SAMPLE DATA' : '/ MATCHING YOUR FILTER'}</span><span>REPORT → RESOLVE → RECORD</span></div>
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>{errorMessage(query.error)}</Alert>}
    {query.isLoading ? <div className="incident-grid">{[0, 1, 2].map(n => <Skeleton key={n} variant="rectangular" height={245} />)}</div> : <div className="incident-grid">{rows.map((incident, index) => <button type="button" className={`incident-card incident-card--${incident.priority?.toLowerCase() || 'p4'}`} key={incident.id} style={{ animationDelay: `${Math.min(index, 5) * 35}ms` }} onClick={() => setSelected(incident)} aria-label={`View ${incident.code}: ${incident.title}`}><div className="incident-card-top"><span>{incident.code}</span>{incident.priority && <PriorityBadge priority={incident.priority} />}</div><span className="incident-service">{incident.service.name}</span><h2>{incident.title}</h2><div className="incident-card-status"><StatusChip status={incident.status} /><span aria-hidden="true">↗</span></div><div className="incident-card-owner"><span>{incident.assignee ? incident.assignee.name : 'Waiting for assignment'}</span><span>{CLOSED.includes(incident.status) ? '✓' : '→'}</span></div></button>)}</div>}
    {!query.isLoading && !query.isError && rows.length === 0 && <div className="board-empty"><span aria-hidden="true">○</span><h2>A little breathing room.</h2><p>No reports match this view. Try another filter or search.</p><button onClick={() => { setFilter('all'); setSearch(''); setTerm(''); }}>Show everything ↗</button></div>}
    {(query.data?.totalPages ?? 0) > 1 && <Pagination sx={{ mt: 3 }} count={query.data!.totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} aria-label="Incident pages" />}
    <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogTitle>{selected?.code}</DialogTitle><DialogContent>{selected && <div className="incident-preview"><h2>{selected.title}</h2><StatusChip status={selected.status} /><dl><dt>Service</dt><dd>{selected.service.name}</dd><dt>Assigned to</dt><dd>{selected.assignee?.name || 'Awaiting assignment'}</dd><dt>Reported by</dt><dd>{selected.reporter.name}</dd><dt>Reported</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd><dt>SLA status</dt><dd>{selected.slaState.replace(/_/g, ' ')}</dd></dl>{sample && <p className="sample-note">Sample incident for exploring the workspace.</p>}</div>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button>{admin && selected && <Button component={Link} to={`/admin/audit?incident=${selected.id}`} variant="contained">View audit trail ↗</Button>}</DialogActions></Dialog>
  </section>;
}
