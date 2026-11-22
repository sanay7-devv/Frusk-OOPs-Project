import { Box, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { getServiceGraph } from '../api/services';
import { tokens } from '../theme/theme';
import { apiErrorMessage } from '../utils/errors';
import { ErrorState, LoadingState } from './StateViews';

export interface ServiceGraphMinimapProps {
  /** Square size in px (default 260). */
  size?: number;
  /** Called with the service id when a node is clicked or activated with the keyboard. */
  onSelect?: (serviceId: number) => void;
  /** Highlight this service id. */
  selectedId?: number | null;
}

/**
 * Small read-only picture of `GET /services/graph`: nodes on a circle, one line per dependency.
 * A node is red when the server reports an open P1 on it, amber when it has other open incidents.
 */
export default function ServiceGraphMinimap({ size = 260, onSelect, selectedId }: ServiceGraphMinimapProps) {
  const q = useQuery({ queryKey: ['service-graph', 'minimap'], queryFn: getServiceGraph, refetchInterval: 30_000 });

  const layout = useMemo(() => {
    const nodes = q.data?.nodes ?? [];
    const c = size / 2;
    const r = c - 22;
    const pos = new Map<number, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2;
      pos.set(n.id, { x: c + r * Math.cos(a), y: c + r * Math.sin(a) });
    });
    return pos;
  }, [q.data, size]);

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error)} onRetry={() => q.refetch()} />;
  const nodes = q.data?.nodes ?? [];
  const edges = q.data?.edges ?? [];
  if (!nodes.length) return <Typography sx={{ fontSize: 13, color: tokens.onSurfaceVariant }}>No services yet.</Typography>;

  return (
    <Box>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Service dependency graph: ${nodes.length} services, ${edges.length} dependencies`}
      >
        {edges.map((e) => {
          const a = layout.get(e.from);
          const b = layout.get(e.to);
          if (!a || !b) return null;
          return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={tokens.border} strokeWidth={1} />;
        })}
        {nodes.map((n) => {
          const p = layout.get(n.id);
          if (!p) return null;
          const fill = n.hasOpenP1 ? tokens.danger : n.openIncidents > 0 ? tokens.amber : tokens.success;
          return (
            <g
              key={n.id}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? 'button' : undefined}
              aria-label={`${n.name}: ${n.openIncidents} open incidents`}
              onClick={onSelect ? () => onSelect(n.id) : undefined}
              onKeyDown={onSelect ? (ev) => { if (ev.key === 'Enter' || ev.key === ' ') onSelect(n.id); } : undefined}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              <title>{`${n.name} - ${n.openIncidents} open`}</title>
              <circle
                cx={p.x}
                cy={p.y}
                r={5 + Math.min(n.criticality, 5)}
                fill={fill}
                stroke={n.id === selectedId ? tokens.white : 'none'}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap justifyContent="center" sx={{ mt: 0.5 }} aria-label="Service health legend">
        {[
          { label: 'Open P1', color: tokens.danger },
          { label: 'Other open', color: tokens.amber },
          { label: 'No open', color: tokens.success },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: item.color }} />
            <Typography sx={{ fontSize: 10, color: tokens.onSurfaceVariant }}>{item.label}</Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
