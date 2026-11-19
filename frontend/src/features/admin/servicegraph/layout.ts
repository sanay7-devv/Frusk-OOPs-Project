import type { GraphEdge, GraphNode } from '../../../api/services';

export const NODE_W = 208;
export const NODE_H = 76;
const GAP_X = 40;
const GAP_Y = 96;

export interface PositionedNode {
  node: GraphNode;
  x: number;
  y: number;
  /** 0 = depends on nothing (bottom row); higher = depends on more. */
  layer: number;
}

export interface GraphLayout {
  nodes: PositionedNode[];
  byId: Map<number, PositionedNode>;
  width: number;
  height: number;
}

/**
 * Layered layout computed from the edges only. A service sits one row above the highest service it depends on,
 * so dependants are on top and foundations (databases, networks) at the bottom.
 */
export function computeLayout(nodes: GraphNode[], edges: GraphEdge[]): GraphLayout {
  const ids = new Set(nodes.map((n) => n.id));
  const deps = new Map<number, number[]>();
  const dependants = new Map<number, number[]>();
  nodes.forEach((n) => {
    deps.set(n.id, []);
    dependants.set(n.id, []);
  });
  edges.forEach((e) => {
    if (ids.has(e.from) && ids.has(e.to) && e.from !== e.to) {
      deps.get(e.from)!.push(e.to);
      dependants.get(e.to)!.push(e.from);
    }
  });

  const layerOf = new Map<number, number>();
  const visiting = new Set<number>();
  const layer = (id: number): number => {
    const known = layerOf.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) return 0; // cycle guard; the backend rejects cycles
    visiting.add(id);
    const d = deps.get(id) ?? [];
    const value = d.length === 0 ? 0 : 1 + Math.max(...d.map(layer));
    visiting.delete(id);
    layerOf.set(id, value);
    return value;
  };
  nodes.forEach((n) => layer(n.id));

  const maxLayer = Math.max(0, ...Array.from(layerOf.values()));
  const rows: GraphNode[][] = Array.from({ length: maxLayer + 1 }, () => []);
  nodes.forEach((n) => rows[layerOf.get(n.id) ?? 0].push(n));

  // Top row first; order each row by the average position of its dependants above, then by name.
  const order = new Map<number, number>();
  for (let l = maxLayer; l >= 0; l--) {
    const row = rows[l];
    const key = (n: GraphNode) => {
      const above = (dependants.get(n.id) ?? []).map((d) => order.get(d)).filter((v): v is number => v !== undefined);
      return above.length ? above.reduce((a, b) => a + b, 0) / above.length : Number.POSITIVE_INFINITY;
    };
    row.sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name));
    row.forEach((n, i) => order.set(n.id, i));
  }

  const widest = Math.max(1, ...rows.map((r) => r.length));
  const width = widest * NODE_W + (widest - 1) * GAP_X;
  const height = (maxLayer + 1) * NODE_H + maxLayer * GAP_Y;
  const positioned: PositionedNode[] = [];
  const byId = new Map<number, PositionedNode>();
  rows.forEach((row, l) => {
    const rowWidth = row.length * NODE_W + (row.length - 1) * GAP_X;
    const left = (width - rowWidth) / 2;
    row.forEach((node, i) => {
      const p = { node, layer: l, x: left + i * (NODE_W + GAP_X), y: (maxLayer - l) * (NODE_H + GAP_Y) };
      positioned.push(p);
      byId.set(node.id, p);
    });
  });
  return { nodes: positioned, byId, width, height };
}
