import { describe, expect, it } from 'vitest';
import { fitMultiplier, naturalSlots, seasonValue } from '@/lib/game/eightytwo';

const base = { gp: 80, mpg: 36, ppg: 20.5, rpg: 3.2, apg: 3.0, spg: 1.0, bpg: 0.2, tov: 1.8, fgPct: 0.47 };

describe('82-0 values and fit', () => {
  it('a great shooter is worth more than the same line from a poor one', () => {
    const sniper = seasonValue({ ...base, tpPct: 0.42, ftPct: 0.9 });
    const brick = seasonValue({ ...base, tpPct: 0.3, ftPct: 0.7 });
    expect(sniper).toBeGreaterThan(brick + 3);
  });
  it('never charges a big for not shooting threes', () => {
    const big = { gp: 80, mpg: 34, ppg: 18, rpg: 11, apg: 2, spg: 0.6, bpg: 2, tov: 2.4, fgPct: 0.56, ftPct: 0.75 };
    expect(seasonValue({ ...big, tpPct: 0 })).toBe(seasonValue({ ...big, tpPct: null }));
  });
  it('a center who averages 7+ assists plays the point with no cost', () => {
    expect(fitMultiplier('C', 'PG', 9.8)).toBe(1);
    expect(naturalSlots('C', 9.8)).toContain('PG');
    expect(fitMultiplier('C', 'PG', 3)).toBeLessThan(1);
    expect(fitMultiplier('C', 'PG')).toBeLessThan(1);
  });
});
