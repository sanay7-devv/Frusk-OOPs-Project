import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import { Add, FitScreen, Remove } from '@mui/icons-material';
import { tokens } from '../../../theme/theme';
import type { GraphEdge, ServiceHealth, ServiceHealthRow } from '../../../api/services';
import { HEALTH_COLOR } from './health';
import { NODE_H, NODE_W, type GraphLayout } from './layout';
import { NO_PATH, edgeKey, type CausePath } from './MajorIncidentPanel';

interface Props {
  layout: GraphLayout;
  edges: GraphEdge[];
  health: Map<number, ServiceHealthRow>;
  selectedId: number | null;
  /** Ids affected by the selected service (from the impact endpoint). */
  affectedIds: Set<number>;
  /** Ids shown at full strength (filters). */
  visibleIds: Set<number>;
  onSelect: (id: number | null) => void;
  /** Probable root cause and the services on its path (Major Incident Mode). */
  causePath?: CausePath;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const PAD = 32;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function GraphCanvas({ layout, edges, health, selectedId, affectedIds, visibleIds, onSelect, causePath = NO_PATH }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: PAD, y: PAD });
  const [dragging, setDragging] = useState(false);
  // Active pointers (touch points), for two-finger pinch zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const fit = useCallback(() => {
    const el = box.current;
    if (!el || layout.nodes.length === 0) return;
    const s = Math.min(
      1,
      Math.max(MIN_SCALE, Math.min((el.clientWidth - 2 * PAD) / layout.width, (el.clientHeight - 2 * PAD) / layout.height)),
    );
    setScale(s);
    setPan({ x: (el.clientWidth - layout.width * s) / 2, y: Math.max(PAD / 2, (el.clientHeight - layout.height * s) / 2) });
  }, [layout]);

  // Fit when the shape of the graph changes, not on every status refresh.
  const shape = layout.nodes.map((n) => n.node.id).join(',') + '|' + edges.length;
  useLayoutEffect(fit, [shape]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [fit]);

  const zoom = (f: number) => setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * f)));

  const pointerDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onPointerDown = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      pinch.current = { dist: pointerDistance(), scale };
      drag.current = null;
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      return;
    }
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
    setDragging(true);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const next = (pinch.current.scale * pointerDistance()) / Math.max(1, pinch.current.dist);
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setPan({ x: d.px + dx, y: d.py + dy });
  };
  const onPointerUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      drag.current = null;
      setDragging(false);
      return;
    }
    if (drag.current && !drag.current.moved) onSelect(null);
    drag.current = null;
    setDragging(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = 40;
    if (e.key === 'ArrowLeft') setPan((p) => ({ ...p, x: p.x + step }));
    else if (e.key === 'ArrowRight') setPan((p) => ({ ...p, x: p.x - step }));
    else if (e.key === 'ArrowUp') setPan((p) => ({ ...p, y: p.y + step }));
    else if (e.key === 'ArrowDown') setPan((p) => ({ ...p, y: p.y - step }));
    else if (e.key === '+' || e.key === '=') zoom(1.2);
    else if (e.key === '-') zoom(1 / 1.2);
    else if (e.key === '0') fit();
    else if (e.key === 'Escape') onSelect(null);
    else return;
    e.preventDefault();
  };

  const healthOf = (id: number): ServiceHealth => health.get(id)?.status ?? 'HEALTHY';
  const hasSelection = selectedId !== null;

  return (
    <Box
      ref={box}
      tabIndex={0}
      role="application"
      aria-label="Service dependency graph. Arrow keys pan, plus and minus zoom, zero fits the screen."
      onKeyDown={onKeyDown}
      sx={{
        position: 'relative',
        height: { xs: 420, md: 'calc(100vh - 300px)' },
        minHeight: 420,
        overflow: 'hidden',
        borderRadius: '12px',
        border: `1px solid ${tokens.outlineVariant}`,
        bgcolor: tokens.surfaceContainerLowest,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        '&:focus-visible': { outline: `2px solid ${tokens.primaryLight}` },
      }}
    >
      <svg
        width="100%"
        height="100%"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ display: 'block' }}
      >
        <defs>
          <marker id="sg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={tokens.outline} />
          </marker>
          <marker id="sg-arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={tokens.primaryLight} />
          </marker>
        </defs>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          {edges.map((e) => {
            const a = layout.byId.get(e.from);
            const b = layout.byId.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2;
            const y1 = a.y + NODE_H;
            const x2 = b.x + NODE_W / 2;
            const y2 = b.y;
            const mid = (y1 + y2) / 2;
            const hot =
              hasSelection &&
              (selectedId === e.from ||
                selectedId === e.to ||
                (affectedIds.has(e.from) && (affectedIds.has(e.to) || selectedId === e.to)));
            const onCause = causePath.edgeKeys.has(edgeKey(e.from, e.to));
            const dim = hasSelection && !hot && !onCause;
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                fill="none"
                stroke={onCause ? HEALTH_COLOR.OUTAGE : hot ? tokens.primaryLight : tokens.outline}
                strokeWidth={onCause ? 3 : hot ? 2 : 1.2}
                strokeDasharray={onCause ? '6 4' : undefined}
                opacity={dim ? 0.15 : hot || onCause ? 1 : 0.55}
                markerEnd={hot ? 'url(#sg-arrow-hot)' : 'url(#sg-arrow)'}
              />
            );
          })}
          {layout.nodes.map(({ node, x, y }) => {
            const h = healthOf(node.id);
            const color = HEALTH_COLOR[h];
            const selected = node.id === selectedId;
            const affected = affectedIds.has(node.id);
            const onPath = causePath.nodeIds.has(node.id);
            const isRoot = causePath.rootId === node.id;
            const dim = !visibleIds.has(node.id) || (hasSelection && !selected && !affected && !onPath);
            const toggle = () => onSelect(selected ? null : node.id);
            return (
              <g
                key={node.id}
                transform={`translate(${x} ${y})`}
                opacity={dim ? 0.3 : 1}
                tabIndex={0}
                role="button"
                aria-pressed={selected}
                aria-label={`${node.name}, ${h.toLowerCase()}, ${node.openIncidents} open incidents`}
                style={{ cursor: 'pointer', outline: 'none' }}
                onPointerDown={(ev) => ev.stopPropagation()}
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggle();
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    toggle();
                  }
                }}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={tokens.surfaceContainer}
                  stroke={selected ? tokens.primaryLight : isRoot ? HEALTH_COLOR.OUTAGE : affected || onPath ? HEALTH_COLOR.DEGRADED : color}
                  strokeWidth={selected || affected || onPath ? 3 : 1.5}
                  strokeDasharray={isRoot ? '6 3' : undefined}
                />
                <rect width={6} height={NODE_H} rx={3} fill={color} />
                <text x={18} y={26} fill={tokens.onSurface} fontSize={14} fontWeight={700}>
                  {truncate(node.name, 24)}
                </text>
                <text x={18} y={48} fill={color} fontSize={12} fontWeight={700}>
                  {h}
                </text>
                <text x={18} y={66} fill={tokens.onSurfaceVariant} fontSize={12}>
                  {`Criticality ${node.criticality} · ${node.openIncidents} open`}
                </text>
                {isRoot && (
                  <text x={NODE_W - 12} y={NODE_H - 8} textAnchor="end" fill={HEALTH_COLOR.OUTAGE} fontSize={12} fontWeight={700}>
                    Root cause
                  </text>
                )}
                {node.hasOpenP1 && (
                  <g transform={`translate(${NODE_W - 38} 10)`}>
                    <rect width={28} height={18} rx={4} fill={HEALTH_COLOR.OUTAGE} />
                    <text x={14} y={13} textAnchor="middle" fill={tokens.onSurface} fontSize={12} fontWeight={700}>
                      P1
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <Stack
        direction="column"
        spacing={0.5}
        sx={{ position: 'absolute', right: 12, top: 12, bgcolor: tokens.surfaceContainerHigh, borderRadius: '10px', p: 0.5 }}
      >
        <Tooltip title="Zoom in" placement="left">
          <IconButton size="small" aria-label="Zoom in" onClick={() => zoom(1.2)} sx={{ color: tokens.onSurface }}>
            <Add fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Zoom out" placement="left">
          <IconButton size="small" aria-label="Zoom out" onClick={() => zoom(1 / 1.2)} sx={{ color: tokens.onSurface }}>
            <Remove fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Fit to screen" placement="left">
          <IconButton size="small" aria-label="Fit to screen" onClick={fit} sx={{ color: tokens.onSurface }}>
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
