import { describe, expect, it } from 'vitest';
import { describeStats, pct, statsFromDist, statsFromWins } from '@/lib/game/difficulty';

describe('difficulty stats', () => {
  it('summarises a record distribution as fractions of the season', () => {
    // Ten 17-game seasons: one perfect, three 15-2, four 12-5, two 8-9.
    const dist = new Array(18).fill(0); dist[17] = 1; dist[15] = 3; dist[12] = 4; dist[8] = 2;
    const s = statsFromDist(dist, 17);
    expect(s.n).toBe(10);
    expect(s.perfect).toBeCloseTo(0.1, 5);
    expect(s.median).toBeCloseTo(12 / 17, 5);       // the fifth season of ten sorted by wins is a 12-5
    expect(s.mean).toBeCloseTo((17 + 45 + 48 + 16) / 10 / 17, 5);
    expect(s.p25).toBeCloseTo(12 / 17, 5);       // the third season of ten
    expect(s.p90).toBeCloseTo(15 / 17, 5);
  });
  it('reads the same from a list of win totals, whatever the season length', () => {
    const wins = [82, 70, 70, 66, 60, 60, 55, 50, 44, 30];
    const s = statsFromWins(wins, 82);
    expect(s.n).toBe(10);
    expect(s.perfect).toBeCloseTo(0.1, 5);
    expect(s.median).toBeCloseTo(60 / 82, 5);
    expect(statsFromWins([], 162).n).toBe(0);
    expect(statsFromWins([200, -4], 162).perfect).toBeCloseTo(0.5, 5);    // out-of-range totals are clamped to the season
  });
  it('formats percentages for the logs', () => {
    expect(pct(0.1234)).toBe('12.3%');
    expect(describeStats(statsFromWins([17, 10], 17))).toMatch(/^n=2 perfect 50\.0% median /);
  });
});
