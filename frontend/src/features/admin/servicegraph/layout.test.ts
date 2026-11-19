import { describe, expect, it } from 'vitest';
import { computeLayout } from './layout';

const n = (id: number, name: string) => ({ id, name, criticality: 3, openIncidents: 0, hasOpenP1: false });

describe('computeLayout', () => {
  it('puts dependants above the services they depend on', () => {
    const layout = computeLayout([n(1, 'App'), n(2, 'API'), n(3, 'DB')], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 1, to: 3 },
    ]);
    const y = (id: number) => layout.byId.get(id)!.y;
    expect(y(1)).toBeLessThan(y(2));
    expect(y(2)).toBeLessThan(y(3));
    expect(layout.byId.get(3)!.layer).toBe(0);
    expect(layout.byId.get(1)!.layer).toBe(2);
  });

  it('survives a cycle and edges to unknown services', () => {
    const layout = computeLayout([n(1, 'A'), n(2, 'B')], [
      { from: 1, to: 2 },
      { from: 2, to: 1 },
      { from: 1, to: 99 },
    ]);
    expect(layout.nodes).toHaveLength(2);
  });

  it('handles an empty graph', () => {
    expect(computeLayout([], []).nodes).toHaveLength(0);
  });
});
