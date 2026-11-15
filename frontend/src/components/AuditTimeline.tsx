import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Skeleton } from '@mui/material';
import { getStudioHistory as getHistory, getStudioIncident as getIncident, listStudioIncidents as listIncidents } from '../api/studio';
import { tokenStore } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { errorMessage } from '../utils/errors';
import { DEMO_HISTORY } from './demoWorkspace';

interface AuditEntry { id: number; action: string; description: string; actor: { name: string } | null; timestamp?: string; createdAt?: string; previousState?: string; newState?: string }
const pretty = (value: string) => value.toLowerCase().replace(/_/g, ' ');

export default function AuditTimeline() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const sample = Boolean(tokenStore.getAccess()?.startsWith('mock-'));
  const initial = params.get('incident') || (sample ? '101' : '');
  const [draft, setDraft] = useState(initial);
  const [term, setTerm] = useState(initial);
  const [filter, setFilter] = useState('all');
  const query = useQuery({ queryKey: ['studio-audit', user?.id, term], enabled: !!term,
    queryFn: async () => {
      const incident = /^\d+$/.test(term) ? await getIncident(Number(term)) : (await listIncidents({ code: term, size: 1 })).items[0];
      if (!incident) throw new Error('No report found for that incident code.');
      let history: AuditEntry[];
      if (sample) {
        history = DEMO_HISTORY.map((event, index) => ({ ...event,
          createdAt: new Date(new Date(incident.createdAt).getTime() + index * 60_000).toISOString(),
          description: index === 0 ? `An employee reported: ${incident.title}.` : index === 1 ? `Categorised under ${incident.service.name}.` : index === 2 ? `Routed to ${incident.assignee?.name || 'the triage team'}.` : event.description,
          actor: index >= 3 ? { name: incident.assignee?.name || 'Triage team' } : event.actor,
        }));
        const max = incident.status === 'NEW' ? 1 : incident.status === 'CLASSIFIED' ? 2 : incident.status === 'ASSIGNED' ? 3 : incident.status === 'ACKNOWLEDGED' ? 4 : 5;
        history = history.slice(0, max);
        if (incident.status === 'PENDING_USER_INFO') history.push({ id: 6, action: 'INFO_REQUESTED', description: 'The technician requested more information. The resolution clock is paused.', actor: incident.assignee, timestamp: new Date(new Date(incident.createdAt).getTime() + 360_000).toISOString() });
        if (['RESOLVED','VERIFIED','CLOSED'].includes(incident.status)) history.push({ id: 6, action: 'RESOLVED', description: 'The issue was resolved.', actor: incident.assignee, timestamp: new Date(new Date(incident.createdAt).getTime() + 360_000).toISOString() });
      } else history = await getHistory(incident.id) as AuditEntry[];
      return { incident, history };
    },
  });
  const incident = query.data?.incident;
  const entries: AuditEntry[] = query.data?.history || [];
  const visible = entries.filter(event => filter === 'all' || (filter === 'people' ? !!event.actor : !event.actor));
  const actors = new Set(entries.map(event => event.actor?.name).filter(Boolean)).size;
  const search = (event: FormEvent) => { event.preventDefault(); setTerm(draft.trim()); setFilter('all'); };

  return <section className="audit-workspace">
    <div className="audit-heading"><div><div className="eyebrow"><span className="shape-dot" />THE RECORD ROOM</div><h1>Nothing lost<br />between the lines.</h1><p>Who did what. When it happened. How an issue moved forward.<br />A clear trail, from the first signal to the final action.</p></div><div className="audit-seal" aria-hidden="true"><span>FRUSK</span><strong>↗</strong><span>EVERY ACTION COUNTS</span></div></div>
    <form className="audit-search" onSubmit={search}><label htmlFor="audit-incident">FOLLOW A REPORT</label><input id="audit-incident" placeholder="Incident code or ID" value={draft} onChange={event => setDraft(event.target.value)} required /><button type="submit">Trace the story <span>↗</span></button></form>
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Retry</Button>}>{errorMessage(query.error)}</Alert>}
    {query.isFetching ? <Skeleton variant="rectangular" height={300} sx={{ mt: 3 }} /> : incident ? <>
      <div className="audit-summary"><div><span>THE REPORT</span><strong>{incident.code}</strong><p>{incident.title}</p></div><div><span>RECORDED ACTIONS</span><strong>{String(entries.length).padStart(2, '0')}</strong><p>{sample ? 'Illustrative timeline' : 'Events for this incident'}</p></div><div><span>PEOPLE INVOLVED</span><strong>{String(actors).padStart(2, '0')}</strong><p>Plus automated system actions</p></div></div>
      <div className="audit-timeline-header"><h2>The paper trail.</h2><div className="board-filters" role="group" aria-label="Filter audit events">{[['all', 'All actions'], ['people', 'People'], ['system', 'System']].map(([id, title]) => <button type="button" key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{title}</button>)}</div></div>
      {sample && <p className="sample-note">Example events for exploring the audit view. Demo actions are not persisted.</p>}
      <ol className="audit-timeline">{visible.map((event, index) => <li key={event.id} style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}><span className={`audit-event-dot ${event.actor ? 'audit-event-dot--person' : ''}`} aria-hidden="true" /><div className="audit-event-time"><span>{String(index + 1).padStart(2, '0')}</span><time dateTime={event.timestamp || event.createdAt}>{new Date(event.timestamp || event.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></div><div className="audit-event-body"><div><h3>{pretty(event.action)}</h3><span>{event.actor?.name || 'System'}</span></div><p>{event.description}</p>{event.newState && <small>{event.previousState ? `${pretty(event.previousState)} → ` : ''}{pretty(event.newState)}</small>}</div></li>)}</ol>
      {!visible.length && <p className="sample-note">No events match this filter.</p>}
    </> : !query.isFetching && !query.isError && !term ? <div className="board-empty"><span aria-hidden="true">≡</span><h2>Every report has a story.</h2><p>Enter an incident code or ID above to see its recorded actions.</p></div> : null}
  </section>;
}
