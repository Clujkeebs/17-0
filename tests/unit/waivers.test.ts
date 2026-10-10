import { describe, expect, it } from 'vitest';
import { waiverTargets, type Ranked } from '@/lib/fantasy/rank';

const P = (id: string, trend: number, value = 10, popularity: number | null = 200) => ({ id, name: id, pos: 'WR', trend, value, popularity } as unknown as Ranked);

describe('waiver wire', () => {
  it('puts the most-added player first', () => {
    const list = waiverTargets([P('a', 300), P('b', 120000), P('c', 4500, 20), ...Array.from({ length: 10 }, (_, i) => P(`x${i}`, 10 + i))]);
    expect(list.slice(0, 3).map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
  it('with nobody being added, falls back to producing players few leagues roster', () => {
    const list = waiverTargets([P('star', 0, 20, 5), P('sleeper', 0, 12, 300), P('bust', 0, 3, 300)]);
    expect(list.map((p) => p.id)).toEqual(['sleeper']);
  });
});
