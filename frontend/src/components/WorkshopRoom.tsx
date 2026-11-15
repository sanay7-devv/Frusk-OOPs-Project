import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { listStudioIncidents } from '../api/studio';
import { tokenStore } from '../api/client';
import '../theme/workshop.css';

type Station = 'desk' | 'rack' | 'archive';
type View = { yaw: number; pitch: number; zoom: number };
const OVERVIEW: View = { yaw: -27, pitch: 55, zoom: 1 };
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const STATIONS = [
  { id: 'desk', number: '01', label: 'The help desk', note: 'A place to start', colour: '#cf5947' },
  { id: 'rack', number: '02', label: 'The ticket rack', note: 'Work in motion', colour: '#315fc1' },
  { id: 'archive', number: '03', label: 'The record room', note: 'Every step, kept', colour: '#bc8a23' },
] as const;

/** Small physical volumes, built from CSS planes rather than an opaque room image. */
function Block({ x, y, z = 0, w, d, h, colour, className = '', children }: { x: number; y: number; z?: number; w: number; d: number; h: number; colour: string; className?: string; children?: ReactNode }) {
  return <div className={`workshop-block ${className}`} style={{ left: x, top: y, '--w': `${w}px`, '--d': `${d}px`, '--h': `${h}px`, '--z': `${z}px`, '--block': colour } as CSSProperties}>
    <div className="block-top" /><div className="block-left" /><div className="block-right" /><div className="block-back" /><div className="block-front">{children}</div>
  </div>;
}

export default function WorkshopRoom({ workspace }: { workspace: 'employee' | 'admin' | 'tech' }) {
  const { user } = useAuth();
  const [view, setView] = useState<View>(OVERVIEW);
  const [station, setStation] = useState<Station | null>(null);
  const [width, setWidth] = useState(900);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const stationButton = useRef<HTMLButtonElement | null>(null);
  const pointer = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  const sample = Boolean(tokenStore.getAccess()?.startsWith('mock-'));
  const query = useQuery({ queryKey: ['workshop-incidents', user?.id, workspace], queryFn: () => listStudioIncidents({ mine: workspace === 'employee', size: 6, page: 0, sort: 'createdAt,desc' }), enabled: station === 'rack' || station === 'archive' });
  const rows = query.data?.items || [];
  const chosen = rows.find(row => row.id === file);
  const queue = workspace === 'admin' ? '/admin/tickets' : workspace === 'tech' ? '/tech/queue' : '/employee/incidents';
  const firstAction = workspace === 'admin' ? '/admin/tickets' : workspace === 'tech' ? '/tech/queue' : '/employee/report';

  useEffect(() => {
    if (!viewport.current || !('ResizeObserver' in window)) return;
    const observer = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!station) return;
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.studioMotion === 'off' ? 'instant' : 'smooth' });
  }, [station]);
  const select = (next: Station, button?: HTMLButtonElement) => {
    if (button) stationButton.current = button;
    setStation(next); setFile(null);
    setView({ yaw: next === 'desk' ? -19 : next === 'rack' ? -37 : -12, pitch: 49, zoom: 1.12 });
  };
  const reset = () => { setStation(null); setFile(null); setView(OVERVIEW); stationButton.current?.focus(); };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as Element).closest('button,a')) return;
    pointer.current = { x: event.clientX, y: event.clientY, view, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointer.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    start.moved = true; setDragging(true);
    setView({ ...start.view, yaw: clamp(start.view.yaw + dx * .16, -55, 10), pitch: clamp(start.view.pitch - dy * .1, 38, 67) });
  };
  const up = () => { pointer.current = null; setDragging(false); };
  const sceneStyle = { '--yaw': `${view.yaw}deg`, '--pitch': `${view.pitch}deg`, '--room-scale': Math.min(1.03, width / 860) * view.zoom, '--pin-scale': Math.min(2.2, 1 / (Math.min(1.03, width / 860) * view.zoom)) } as CSSProperties;

  return <section className={`workshop ${station ? `workshop--${station}` : ''}`} aria-label="Interactive service workshop">
    <div className="workshop-heading"><div><span className="eyebrow">A PLACE FOR EVERY PROBLEM</span><h2>The service workshop<span>.</span></h2><p>Pick a station. Move something forward.</p></div><span className="workshop-edition">FRUSK STUDIO<br />OPEN FOR GOOD FIXES ↗</span></div>
    <div className={`workshop-viewport ${dragging ? 'is-dragging' : ''}`} ref={viewport} style={sceneStyle} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="workshop-ambient" aria-hidden="true" />
      <div className="workshop-scene" aria-hidden="true">
        <Block className="room-floor" x={0} y={0} z={-12} w={650} d={390} h={12} colour="#e4d5b9" />
        <Block className="room-wall" x={0} y={0} w={650} d={8} h={205} colour="#dedbcf"><div className="wall-identity"><span>FRUSK / SERVICE DEPARTMENT</span><strong>Good systems.<br />Better workdays.</strong><i /><b>REPORT · RESOLVE · RECORD</b></div></Block>
        <Block className="room-sidewall" x={642} y={8} w={8} d={170} h={205} colour="#e5e3d9" />
        <div className="room-rug" />
        <div className="room-path"><i /><i /><i /><i /><i /><i /></div>
        {/* A working desk, monitor and physical report slip. */}
        <div className="room-object room-object--desk">
          <Block x={66} y={155} w={12} d={12} h={90} colour="#3658a2" />
          <Block x={236} y={155} w={12} d={12} h={90} colour="#3658a2" />
          <Block x={66} y={239} w={12} d={12} h={90} colour="#3658a2" />
          <Block x={236} y={239} w={12} d={12} h={90} colour="#3658a2" />
          <Block x={48} y={143} z={90} w={217} d={120} h={10} colour="#f2d16b" />
          <Block x={106} y={166} z={100} w={55} d={28} h={5} colour="#c9c6bb" />
          <Block x={128} y={170} z={105} w={10} d={10} h={18} colour="#6f7779" />
          <Block className="room-monitor" x={81} y={166} z={123} w={113} d={8} h={74} colour="#24332f"><div className="monitor-screen"><i /><span>LET’S FIX<br />YOUR DAY.</span><b>＋ NEW REPORT</b></div></Block>
          <Block className="room-keyboard" x={94} y={208} z={100} w={95} d={30} h={4} colour="#f9f7ed" />
          <Block className="room-paper" x={212} y={197} z={101} w={31} d={46} h={2} colour="#fffdf5" />
          <Block className="room-inbox" x={49} y={282} w={57} d={54} h={48} colour="#cc5945"><div className="inbox-slot" /><span>HELLO,<br />PROBLEM.</span></Block>
          <Block x={153} y={287} w={54} d={49} h={47} colour="#7c9778" />
          <Block x={153} y={327} z={35} w={54} d={7} h={47} colour="#8aa486" />
        </div>
        {/* A physical three-column ticket rack. */}
        <div className="room-object room-object--rack">
          <Block x={296} y={39} w={9} d={16} h={149} colour="#586566" />
          <Block x={455} y={39} w={9} d={16} h={149} colour="#586566" />
          <Block className="ticket-rack" x={284} y={37} z={54} w={193} d={9} h={122} colour="#f4f0e4"><div className="rack-label">THE NEXT GOOD FIX</div><div className="rack-columns">{['IN', 'ON IT', 'DONE'].map((label, n) => <div key={label}><b>{label}</b>{[0, 1, 2].slice(0, 3 - n).map(i => <i key={i} style={{ '--ticket-colour': ['#da765d', '#7091c9', '#83a788'][n], transform: `rotate(${i % 2 ? 3 : -3}deg)` } as CSSProperties}><span /><span /><span /></i>)}</div>)}</div></Block>
          <Block x={298} y={34} z={175} w={165} d={13} h={7} colour="#315fc1" />
        </div>
        {/* The cabinet's folders become usable records in the close-up. */}
        <div className="room-object room-object--archive">
          <Block className="archive-cabinet" x={500} y={63} w={112} d={64} h={150} colour="#a46c43"><div className="cabinet-label">THE PAPER TRAIL</div><div className="cabinet-files">{['#315fc1', '#cd5947', '#ddbd57', '#7b9276', '#c68b65'].map((c, i) => <i key={c} style={{ background: c }}><span>0{i + 1}</span></i>)}</div><div className="cabinet-drawer"><i /><span>EVERY STEP, KEPT.</span></div></Block>
          <Block x={496} y={59} z={150} w={120} d={72} h={7} colour="#d7ad78" />
          <Block x={527} y={78} z={157} w={30} d={25} h={5} colour="#e5bc51" />
          <Block x={530} y={78} z={162} w={30} d={25} h={5} colour="#cd5947" />
          <Block x={533} y={78} z={167} w={30} d={25} h={5} colour="#f9f4e5" />
        </div>
        <Block className="room-planter" x={551} y={265} w={43} d={43} h={36} colour="#c27c60" />
        <div className="room-plant"><i /><i /><i /><i /><i /></div>
        <div className="room-floor-type">MAKE WORK<br /><strong>WORK AGAIN.</strong><span>01 — 02 — 03</span></div>
      </div>
      <div className="workshop-scene workshop-hotspots">
        {STATIONS.map((item, index) => <button type="button" key={item.id} className={`workshop-pin workshop-pin--${item.id}`} aria-label={`Open ${item.label.toLowerCase()}`} title={item.label} onClick={event => select(item.id, event.currentTarget)} style={{ left: [150, 376, 555][index], top: [210, 55, 120][index], '--pin-height': `${[210, 200, 195][index]}px`, '--station-colour': item.colour } as CSSProperties}><span>{item.number}</span><strong>{item.label}</strong><b aria-hidden="true">↗</b></button>)}
      </div>
      <div className="workshop-view-controls" role="group" aria-label="Workshop view controls"><button type="button" aria-label="Rotate workshop left" onClick={() => setView(v => ({ ...v, yaw: clamp(v.yaw - 12, -55, 10) }))}>↶</button><button type="button" aria-label="Rotate workshop right" onClick={() => setView(v => ({ ...v, yaw: clamp(v.yaw + 12, -55, 10) }))}>↷</button><span /><button type="button" aria-label="Zoom out of workshop" disabled={view.zoom <= .8} onClick={() => setView(v => ({ ...v, zoom: Math.max(.8, v.zoom - .15) }))}>−</button><button type="button" aria-label="Zoom into workshop" disabled={view.zoom >= 1.3} onClick={() => setView(v => ({ ...v, zoom: Math.min(1.3, v.zoom + .15) }))}>＋</button><button type="button" aria-label="Reset workshop view" onClick={() => setView(OVERVIEW)}>⌂</button></div>
      <div className="workshop-drag-hint" aria-hidden="true"><span>↔</span> Drag to rotate · pick a station below</div>
      {station && <div className="workshop-focus-label" aria-hidden="true">{STATIONS.find(item => item.id === station)?.label}</div>}
    </div>
    <div className="workshop-stations" role="group" aria-label="Choose a workshop station">{STATIONS.map(item => <button key={item.id} type="button" aria-pressed={station === item.id} aria-controls="workshop-closeup" onClick={event => select(item.id, event.currentTarget)} style={{ '--station-colour': item.colour } as CSSProperties}><span>{item.number}</span><div><strong>{item.label}</strong><small>{item.note}</small></div><b aria-hidden="true">↗</b></button>)}</div>
    {station && <div className="workshop-closeup" id="workshop-closeup" ref={panel} tabIndex={-1} aria-label={`${STATIONS.find(item => item.id === station)?.label} close-up`} onKeyDown={event => { if (event.key === 'Escape') reset(); }}>
      <div className="closeup-bar"><span>{station === 'desk' ? '01 / THE HELP DESK' : station === 'rack' ? '02 / THE TICKET RACK' : '03 / THE RECORD ROOM'}</span><button type="button" onClick={reset}>← Back to the workshop</button></div>
      {station === 'desk' ? <div className="desk-closeup"><div className="desk-letter" aria-hidden="true"><span>FRUSK SERVICE DEPARTMENT</span><strong>Hello,<br />problem.</strong><i /><i /><i /><b>WE’LL TAKE IT FROM HERE. ↗</b></div><div><h3>Small glitch.<br />Big blocker.<br /><em>Start here.</em></h3><p>{workspace === 'tech' ? 'Your next fix is waiting in the queue. Pick a ticket and get to work.' : 'Give your issue a place to go. Describe what happened, tell us what it affects, and follow the fix.'}</p><Link className="studio-button" to={firstAction}>{workspace === 'admin' ? 'Open ticket manager' : workspace === 'tech' ? 'Open my queue' : 'Start a report'}<span>↗</span></Link></div></div> : <>
        <div className="rack-closeup-heading"><div><h3>{station === 'archive' ? 'A story in every file.' : 'Good work, in progress.'}</h3><p>{station === 'archive' ? 'Hover or tap a file to pull it forward. Select one to read its details.' : 'Pick a ticket from the rack to see where it stands.'}</p></div><span>{sample ? 'SAMPLE WORKSPACE' : 'YOUR WORKSPACE'}<br />{query.data?.totalItems ?? '—'} REPORTS · LATEST SIX</span></div>
        {query.isLoading ? <p role="status">Fetching your files…</p> : query.isError ? <div className="workshop-file-empty" role="alert"><p>The files couldn’t be loaded.</p><button onClick={() => void query.refetch()}>Try again</button></div> : rows.length === 0 ? <p className="workshop-file-empty">Nothing on this shelf yet. Your reports will appear here.</p> : <div className={`workshop-file-rack ${station === 'archive' ? 'is-archive' : ''}`} role="group" aria-label="Incident files">{rows.map((row, index) => <button type="button" className={`workshop-file ${file === row.id ? 'is-pulled' : ''}`} key={row.id} onClick={() => setFile(row.id)} aria-pressed={file === row.id} aria-label={`Pull out ${row.code}: ${row.title}`} style={{ '--file-colour': ['#315fc1', '#ca5c49', '#b38b35', '#6d896c', '#6e738f', '#a27553'][index % 6], '--file-delay': `${index * 45}ms` } as CSSProperties}><span className="file-tab">{String(index + 1).padStart(2, '0')}</span><span className="file-code">{row.code}</span><strong>{row.title}</strong><span className="file-service">{row.service.name}</span><span className="file-status">{row.status.split('_').join(' ')}</span><i aria-hidden="true">↗</i></button>)}</div>}
        {chosen && <div className="workshop-file-detail" aria-live="polite"><div><span>{chosen.code} · {chosen.priority || 'Unclassified'}</span><h4>{chosen.title}</h4><p>{chosen.service.name} · {chosen.assignee?.name || 'Awaiting assignment'} · {chosen.status.split('_').join(' ')}</p></div><Link className="studio-button" to={station === 'archive' && workspace === 'admin' ? `/admin/audit?incident=${chosen.id}` : queue}>{station === 'archive' && workspace === 'admin' ? 'Follow the audit trail' : 'Open ticket view'}<span>↗</span></Link></div>}
        <div className="workshop-open-all"><Link to={station === 'archive' && workspace === 'admin' ? '/admin/audit' : queue}>{station === 'archive' && workspace === 'admin' ? 'Open the full audit ledger' : 'Open the full ticket view'} ↗</Link><span>Every report belongs to the existing workspace.</span></div>
      </>}
    </div>}
  </section>;
}
