import { describe, expect, it } from 'vitest';
import { softTop } from '@/lib/game/prng';
import { seasonValue } from '@/lib/game/eightytwo';
import { fullEras } from '@/lib/server/nba-game';

const line = (ppg: number, rpg: number, apg: number, spg: number, bpg: number, tov: number, fgPct: number) => ({ gp: 75, mpg: 35, ppg, rpg, apg, spg, bpg, tov, fgPct });

describe('bent top of the value scale', () => {
  it('leaves everything up to the knee alone and never reaches 99', () => {
    for (const v of [40, 60, 76, 82]) expect(softTop(v)).toBe(v);
    let prev = 82;
    for (let v = 83; v <= 130; v++) { const t = softTop(v); expect(t).toBeGreaterThan(prev); expect(t).toBeLessThan(99); prev = t; }
  });
  it('separates a star\'s good years from his best and from the greatest seasons ever', () => {
    const curry2021 = seasonValue(line(32.0, 5.5, 5.8, 1.2, 0.1, 3.4, 0.482));
    const curry2016 = seasonValue(line(30.1, 5.4, 6.7, 2.1, 0.2, 3.3, 0.504));
    const jordan1988 = seasonValue(line(35.0, 5.5, 5.9, 3.2, 1.6, 3.1, 0.535));
    const starter = seasonValue(line(15, 4, 3, 1, 0.5, 1.5, 0.46));
    expect(curry2021).toBeLessThan(curry2016);
    expect(curry2016).toBeLessThan(jordan1988);
    expect(jordan1988).toBeLessThan(99);
    expect(curry2021).toBeLessThan(95);
    expect(starter).toBeCloseTo(76.1, 0);
  });
});

describe('one pick per era (82-0 Classic)', () => {
  it('marks an era full once it has given a pick', () => {
    const picks = [{ playerId: 1, teamId: 1, season: 1996, slot: 'PG' as const, era: '1990s' as const }];
    expect([...fullEras({ picks })]).toEqual(['1990s']);
    expect(fullEras({ picks: [] }).size).toBe(0);
  });
});
