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

const FILTERS = [{ id: 'all', label: 'All incidents' }, { id: 'open', label: 'Open' }, { id: 'waiting', label: 'Awaiting response' }, { id: 'closed', label: 'Resolved' }];
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
    <div className="board-heading"><div><div className="eyebrow"><span className="shape-dot" />INCIDENT MANAGEMENT</div><h1>{admin ? 'Incidents' : 'My incidents'}</h1><p>{admin ? 'Review incidents, priorities and assignment status.' : 'Track the status, assignment and progress of your reported incidents.'}</p></div>{!admin && <Link className="studio-button" to="/employee/report">Report incident <span>↗</span></Link>}</div>
    <div className="board-toolbar"><div className="board-filters" role="group" aria-label="Filter incidents">{FILTERS.map(item => <button type="button" key={item.id} aria-pressed={filter === item.id} onClick={() => { setFilter(item.id); setPage(0); }}>{item.label}</button>)}</div><form className="board-search" onSubmit={submitSearch}><input aria-label="Search incidents" placeholder="Find an issue…" value={search} onChange={event => setSearch(event.target.value)} /><button aria-label="Run incident search" type="submit">↗</button></form></div>
    <div className="board-count"><span>{String(total).padStart(2, '0')} REPORTS {sample ? '/ SAMPLE DATA' : '/ MATCHING YOUR FILTER'}</span></div>
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>{errorMessage(query.error)}</Alert>}
    {query.isLoading ? <Skeleton variant="rectangular" height={210} /> : <div className="incident-table-wrap"><table className="incident-table"><caption className="sr-only">{admin ? 'All incidents' : 'Your reported incidents'}</caption><thead><tr><th scope="col">Incident</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Service</th><th scope="col">Assigned to</th><th scope="col">Reported</th></tr></thead><tbody>{rows.map(incident => <tr key={incident.id}><td><button type="button" className="incident-table-title" onClick={() => setSelected(incident)} aria-label={`View ${incident.code}: ${incident.title}`}><span>{incident.code}</span><strong>{incident.title}</strong></button></td><td>{incident.priority ? <PriorityBadge priority={incident.priority} /> : 'Unclassified'}</td><td><StatusChip status={incident.status} /></td><td>{incident.service.name}</td><td>{incident.assignee?.name || 'Unassigned'}</td><td>{new Date(incident.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>}
    {!query.isLoading && !query.isError && rows.length === 0 && <div className="board-empty"><span aria-hidden="true">○</span><h2>No incidents found</h2><p>No reports match this view. Try another filter or search.</p><button onClick={() => { setFilter('all'); setSearch(''); setTerm(''); }}>Clear filters</button></div>}
    {(query.data?.totalPages ?? 0) > 1 && <Pagination sx={{ mt: 3 }} count={query.data!.totalPages} page={page + 1} onChange={(_, value) => setPage(value - 1)} aria-label="Incident pages" />}
    <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="sm"><DialogTitle>{selected?.code}</DialogTitle><DialogContent>{selected && <div className="incident-preview"><h2>{selected.title}</h2><StatusChip status={selected.status} /><dl><dt>Service</dt><dd>{selected.service.name}</dd><dt>Assigned to</dt><dd>{selected.assignee?.name || 'Awaiting assignment'}</dd><dt>Reported by</dt><dd>{selected.reporter.name}</dd><dt>Reported</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd><dt>SLA status</dt><dd>{selected.slaState.replace(/_/g, ' ')}</dd></dl>{sample && <p className="sample-note">Sample incident for exploring the workspace.</p>}</div>}</DialogContent><DialogActions><Button onClick={() => setSelected(null)}>Close</Button>{admin && selected && <Button component={Link} to={`/admin/audit?incident=${selected.id}`} variant="contained">View audit trail ↗</Button>}</DialogActions></Dialog>
  </section>;
}
