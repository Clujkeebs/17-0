import { describe, expect, it } from 'vitest';
import { FORMATS, boardOrder, respinsFor, slotsFor } from '@/lib/game/seventeen';

const league = Array.from({ length: 32 }, (_, i) => i + 1);

describe('53-man roster', () => {
  it('is 53 players plus a coach, weights summing to 1, starters outweighing backups', () => {
    const f = FORMATS['53'];
    expect(f.slots).toHaveLength(54);
    expect(f.slots.filter((d) => d.key !== 'HC')).toHaveLength(53);
    expect(f.slots.reduce((a, d) => a + d.weight, 0)).toBeCloseTo(1, 6);
    const w = (k: string) => f.slots.find((d) => d.key === k)!.weight;
    expect(w('QB1')).toBeGreaterThan(w('QB2'));
    expect(w('QB2')).toBeGreaterThan(w('QB3'));
    expect(slotsFor('QB', '53')).toEqual(['QB1', 'QB2', 'QB3']);
    expect(slotsFor('K', '53')).toEqual(['K', 'P']);
    expect(respinsFor('53')).toBe(5);
    expect(respinsFor('6')).toBe(2);
  });
  it('walks fresh shuffles of the league: repeats allowed, never the same team twice in a row, deterministic', () => {
    const a = boardOrder('seed', league, '53');
    expect(a.teams).toHaveLength(54);
    expect(a.reserves).toHaveLength(5);
    expect(boardOrder('seed', league, '53')).toEqual(a);
    for (let i = 1; i < a.teams.length; i++) expect(a.teams[i]).not.toBe(a.teams[i - 1]);
    expect(new Set(a.teams.slice(0, 32)).size).toBe(32);
  });
  it('leaves the small formats one team each', () => {
    const b = boardOrder('seed', league, '16');
    expect(new Set(b.teams).size).toBe(16);
    expect(b.reserves.every((t) => !b.teams.includes(t))).toBe(true);
  });
});
