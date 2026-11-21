import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Box, Typography } from '@mui/material';
import { tokens } from '../../../theme/theme';
import type { GraphEdge, ServiceHealth, ServiceHealthRow } from '../../../api/services';
import { HEALTH_COLOR, HEALTH_LABEL } from './health';
import { NODE_H, NODE_W, type GraphLayout } from './layout';
import { alpha, tone } from '../palette';
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
  /** Blast radius mode: with a service selected, dim everything it does not affect. */
  focus?: boolean;
}

/** Zoom controls live in the filter bar, so the screen drives the canvas through this handle. */
export interface GraphCanvasHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const PAD = 32;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const GraphCanvas = forwardRef<GraphCanvasHandle, Props>(function GraphCanvas(
  { layout, edges, health, selectedId, affectedIds, visibleIds, onSelect, causePath = NO_PATH, focus = true },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: PAD, y: PAD });
  const [dragging, setDragging] = useState(false);
  const [hoverId, setHoverId] = useState<number | null>(null);
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

  useImperativeHandle(ref, () => ({ zoomIn: () => zoom(1.2), zoomOut: () => zoom(1 / 1.2), fit }), [fit]);

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
  const hasSelection = selectedId !== null && focus;
  const mono = tokens.fontMono;
  const layers = Array.from(new Set(layout.nodes.map((n) => n.layer))).sort((a, b) => a - b);
  const layerY = (l: number) => layout.layerTop.get(l) ?? 0;
  const layerLabel = (l: number) =>
    l === 0 ? 'Foundations · depend on no other service' : `Level ${l} · builds on ${l} layer${l === 1 ? '' : 's'} below`;

  return (
    <Box
      ref={box}
      tabIndex={0}
      role="application"
      aria-label="Service dependency graph. Arrow keys pan, plus and minus zoom, zero fits the screen."
      onKeyDown={onKeyDown}
      sx={{
        position: 'relative',
        height: { xs: 460, md: 'clamp(480px, calc(100vh - 160px), 740px)' },
        overflow: 'hidden',
        borderRadius: '16px',
        border: `1px solid ${tokens.outlineVariant}`,
        bgcolor: tokens.surfaceContainerLow,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none',
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
          <pattern id="sg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={tokens.white} strokeOpacity={0.12} strokeWidth={0.8} strokeDasharray="2 4" />
          </pattern>
          {[
            ['sg-arrow', tokens.textDisabled],
            ['sg-arrow-hot', tokens.primary],
            ['sg-arrow-outage', HEALTH_COLOR.OUTAGE],
            ['sg-arrow-degraded', HEALTH_COLOR.DEGRADED],
          ].map(([id, fill]) => (
            <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" fill={fill} />
            </marker>
          ))}
        </defs>
        <rect width="100%" height="100%" fill="url(#sg-grid)" opacity={0.25} pointerEvents="none" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
          {layers.map((l) => {
            const label = layerLabel(l);
            const w = label.length * 7.6 + 34;
            return (
              <g key={`layer-${l}`} transform={`translate(0 ${layerY(l) - 34})`} pointerEvents="none">
                <rect width={w} height={26} rx={8} fill={alpha(tokens.surfaceContainerLow, 0.9)} stroke={tokens.outlineVariant} />
                <circle cx={14} cy={13} r={4} fill={l === 0 ? tone.success : tone.accent} />
                <text x={26} y={18} fill={tokens.onSurfaceVariant} fontSize={12} fontWeight={700} fontFamily={mono} letterSpacing="0.04em">
                  {label.toUpperCase()}
                </text>
              </g>
            );
          })}
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
            const touched = hoverId === e.from || hoverId === e.to || selectedId === e.from || selectedId === e.to;
            const onCause = causePath.edgeKeys.has(edgeKey(e.from, e.to));
            const dim = hasSelection && !hot && !onCause;
            // The service it depends on (`to`) is the source of trouble for this edge.
            const upstream = healthOf(e.to);
            let stroke: string = tokens.outline;
            let width = 1.6;
            let dash: string | undefined = '4 4';
            let marker = 'sg-arrow';
            let opacity = 0.5;
            if (onCause || upstream === 'OUTAGE') {
              stroke = HEALTH_COLOR.OUTAGE;
              width = onCause ? 3 : 2.6;
              dash = '6 3';
              marker = 'sg-arrow-outage';
              opacity = 1;
            } else if (upstream === 'DEGRADED') {
              stroke = HEALTH_COLOR.DEGRADED;
              width = 2.2;
              dash = '5 3';
              marker = 'sg-arrow-degraded';
              opacity = 0.95;
            } else if (hot || touched) {
              stroke = tone.accent;
              width = 2.4;
              dash = undefined;
              marker = 'sg-arrow-hot';
              opacity = 1;
            }
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                fill="none"
                stroke={stroke}
                strokeWidth={width}
                strokeDasharray={dash}
                opacity={dim ? 0.15 : opacity}
                markerEnd={`url(#${marker})`}
                style={{ transition: 'stroke 0.2s, opacity 0.2s' }}
              />
            );
          })}
          {layout.nodes.map(({ node, x, y }) => {
            const row = health.get(node.id);
            const h = healthOf(node.id);
            const color = HEALTH_COLOR[h];
            const selected = node.id === selectedId;
            const affected = focus && affectedIds.has(node.id);
            const onPath = causePath.nodeIds.has(node.id);
            const isRoot = causePath.rootId === node.id;
            const dim = !visibleIds.has(node.id) || (hasSelection && !selected && !affected && !onPath);
            const hovered = hoverId === node.id;
            const alert = h !== 'HEALTHY';
            const toggle = () => onSelect(selected ? null : node.id);
            const reason = row?.reason ?? '';
            const sla = row?.slaCompliancePercent;
            return (
              <g
                key={node.id}
                transform={`translate(${x} ${y})`}
                opacity={dim ? 0.3 : 1}
                tabIndex={0}
                role="button"
                aria-pressed={selected}
                aria-label={`${node.name}, ${h.toLowerCase()}, ${node.openIncidents} open incidents`}
                style={{
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'opacity 0.2s',
                  filter: alert || selected ? `drop-shadow(0 0 10px ${alpha(selected ? tone.accent : color, 0.4)})` : undefined,
                }}
                onPointerDown={(ev) => ev.stopPropagation()}
                onPointerEnter={() => setHoverId(node.id)}
                onPointerLeave={() => setHoverId(null)}
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
                  rx={14}
                  fill={
                    h === 'OUTAGE'
                      ? alpha(HEALTH_COLOR.OUTAGE, 0.14)
                      : h === 'DEGRADED'
                        ? alpha(HEALTH_COLOR.DEGRADED, 0.12)
                        : selected
                          ? alpha(tone.accent, 0.18)
                          : alpha(tokens.surfaceContainerLow, 0.95)
                  }
                  stroke={
                    selected
                      ? tone.accent
                      : isRoot
                        ? HEALTH_COLOR.OUTAGE
                        : affected || onPath
                          ? HEALTH_COLOR.DEGRADED
                          : alert
                            ? color
                            : hovered
                              ? alpha(tokens.white, 0.3)
                              : tokens.outlineVariant
                  }
                  strokeWidth={selected || affected || onPath || alert ? 2 : 1.5}
                  strokeDasharray={isRoot ? '6 3' : undefined}
                />
                {/* Top strip: criticality chip and health beacon */}
                <rect x={14} y={10} width={76} height={20} rx={10} fill={alpha(tokens.white, 0.06)} stroke={tokens.outlineVariant} />
                <text x={52} y={24.5} textAnchor="middle" fill={tokens.slate300} fontSize={12} fontWeight={800} fontFamily={mono}>
                  {`CRIT ${node.criticality}`}
                </text>
                <circle cx={NODE_W - 14 - (HEALTH_LABEL[h].length * 7.4 + 10)} cy={20} r={alert ? 4 : 3.5} fill={color} />
                <text x={NODE_W - 14} y={24.5} textAnchor="end" fill={color} fontSize={12} fontWeight={800} fontFamily={mono}>
                  {HEALTH_LABEL[h].toUpperCase()}
                </text>
                <text x={14} y={52} fill={h === 'OUTAGE' ? tokens.errorLight : tokens.white} fontSize={14} fontWeight={700} fontFamily={tokens.fontHeading}>
                  {truncate(node.name, 20)}
                </text>
                <text x={14} y={70} fill={alert ? color : tokens.onSurfaceVariant} fontSize={12} fontWeight={alert ? 600 : 400}>
                  {truncate(reason, 27)}
                </text>
                <line x1={14} x2={NODE_W - 14} y1={77} y2={77} stroke={tokens.borderSubtle} />
                <text x={14} y={92} fill={tokens.textDisabled} fontSize={12} fontFamily={mono}>
                  {`${node.openIncidents} open`}
                </text>
                {isRoot ? (
                  <text x={NODE_W - 14} y={92} textAnchor="end" fill={HEALTH_COLOR.OUTAGE} fontSize={12} fontWeight={800} fontFamily={mono}>
                    ROOT CAUSE
                  </text>
                ) : node.hasOpenP1 ? (
                  <text x={NODE_W - 14} y={92} textAnchor="end" fill={HEALTH_COLOR.OUTAGE} fontSize={12} fontWeight={800} fontFamily={mono}>
                    OPEN P1
                  </text>
                ) : sla !== null && sla !== undefined ? (
                  <text x={NODE_W - 14} y={92} textAnchor="end" fill={tone.info} fontSize={12} fontWeight={700} fontFamily={mono}>
                    {`SLA ${sla}%`}
                  </text>
                ) : null}
                {selected && <rect y={NODE_H - 3} width={NODE_W} height={3} rx={1.5} fill={tone.accent} />}
              </g>
            );
          })}
        </g>
      </svg>
      <Box
        sx={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          maxWidth: 'calc(100% - 28px)',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          columnGap: 1.75,
          rowGap: 0.5,
          px: 2,
          py: 0.75,
          borderRadius: '9999px',
          bgcolor: alpha(tokens.surfaceContainerLow, 0.88),
          backdropFilter: 'blur(16px)',
          border: `1px solid ${tokens.outlineVariant}`,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'none',
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: tokens.onSurface }}>Legend</Typography>
        {(['HEALTHY', 'DEGRADED', 'OUTAGE'] as const).map((h) => (
          <Box key={h} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: HEALTH_COLOR[h] }} />
            <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>{HEALTH_LABEL[h]}</Typography>
          </Box>
        ))}
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Arrow: depends on</Typography>
        <Typography sx={{ fontSize: 12, color: tokens.onSurfaceVariant }}>Dashed red: probable cause path</Typography>
      </Box>
    </Box>
  );
});

export default GraphCanvas;
