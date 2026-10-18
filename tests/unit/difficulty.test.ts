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

import { MIN_PLAYERS, MIN_RUNS, OFFSET_LIMIT, PER_PLAYER, STEP_LIMIT, TARGET_TOP_TENTH, TARGET_TOP_TENTH_17_0, lastRunsPerPlayer, modeKey, nextOffset, quantile, targetTopTenth, trust, wantedOffset } from '@/lib/game/difficulty';

describe('daily balance step', () => {
  it('quantile interpolates between neighbours and ignores input order', () => {
    expect(quantile([3, 1, 2], 0.5)).toBe(2);
    expect(quantile([0, 10], 0.9)).toBeCloseTo(9, 10);
    expect(quantile([1, 2, 3, 4, 5], 1)).toBe(5);
    expect(quantile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(Number.isNaN(quantile([], 0.5))).toBe(true);
  });

  it('a mode whose best tenth already finishes at the target stays put', () => {
    // Strengths 60..79 on a span of 26: the 90th percentile is 77.1, so a line of 77.1 - 0.94 * 26 is exactly right.
    const s = Array.from({ length: 20 }, (_, i) => 60 + i);
    const base = quantile(s, 0.9) - TARGET_TOP_TENTH * 26;
    expect(wantedOffset(s, base, 26)).toBeCloseTo(0, 10);
  });
  it('raises the line when the top tenth is above the target and lowers it when below', () => {
    const s = Array.from({ length: 100 }, (_, i) => 60 + i * 0.2);          // 60..79.8
    const right = quantile(s, 0.9) - TARGET_TOP_TENTH * 26;
    expect(wantedOffset(s, right - 2, 26)).toBeGreaterThan(0);              // line too low, runs too easy: harder
    expect(wantedOffset(s, right + 2, 26)).toBeLessThan(0);                 // line too high: easier
  });
  it('holds 17-0 a notch tighter than the other games', () => {
    expect(TARGET_TOP_TENTH_17_0).toBeLessThan(TARGET_TOP_TENTH);
    for (const m of ['17-0:6:current', '17-0:12:current', '17-0:16:all-time', '17-0:53:current', '17-0:fantasy:current']) expect(targetTopTenth(m), m).toBe(TARGET_TOP_TENTH_17_0);
    for (const m of ['82-0:classic', '82-0:standard', '162-0:eras', '162-0:now', '44-0:eras', '44-0:now']) expect(targetTopTenth(m), m).toBe(TARGET_TOP_TENTH);
  });
  it('a lower target asks for a higher line, by the gap times the span, so the same runs get harder', () => {
    const s = Array.from({ length: 400 }, (_, i) => 60 + (i % 40) * 0.5);
    const base = quantile(s, 0.9) - TARGET_TOP_TENTH * 26;                          // a line that is already right for 94 percent
    const at94 = wantedOffset(s, base, 26), at91 = wantedOffset(s, base, 26, TARGET_TOP_TENTH_17_0);
    expect(at91).toBeGreaterThan(at94);
    expect(at91 - at94).toBeCloseTo((TARGET_TOP_TENTH - TARGET_TOP_TENTH_17_0) * 26 * trust(400), 5);
  });
  it('moves the live 6-man 17-0 line up about half a point, over a few nights, from where it sat on 2026-10-17', () => {
    // Real numbers from the worker log: 268 runs, best tenth at strength 93.1, line 68.8, offset -0.19.
    const strengths = [...Array(237).fill(85), ...Array(31).fill(93.1)];            // the top tenth of 268 sits at 93.1
    expect(quantile(strengths, 0.9)).toBeCloseTo(93.1, 5);
    const before = wantedOffset(strengths, 68.8, 26, TARGET_TOP_TENTH), after = wantedOffset(strengths, 68.8, 26, TARGET_TOP_TENTH_17_0);
    expect(before).toBeCloseTo(-0.12, 1);                                           // the log said "wants offset -0.1"
    expect(after).toBeGreaterThan(0.4); expect(after).toBeLessThan(0.7);
    // Each night closes half the gap, at most half a point, and it stops within a tenth of the target.
    let offset = -0.19; const nights: number[] = [];
    for (let n = 0; n < 8; n++) { offset = Math.round(nextOffset(offset, after, 26) * 100) / 100; nights.push(offset); }
    expect(nights[0]).toBeGreaterThan(-0.19);
    expect(Math.abs(nights.at(-1)! - after)).toBeLessThan(0.1);
  });
  it('trusts few runs less and never asks for more than 15 percent of the span', () => {
    const many = Array.from({ length: 400 }, (_, i) => 60 + (i % 20));
    const few = many.slice(0, 20);
    expect(Math.abs(wantedOffset(few, 50, 24))).toBeLessThan(Math.abs(wantedOffset(many, 50, 24)));
    expect(wantedOffset(many, 0, 24)).toBeCloseTo(OFFSET_LIMIT * 24, 10);
    expect(wantedOffset(many, 200, 24)).toBeCloseTo(-OFFSET_LIMIT * 24, 10);
    expect(trust(20)).toBeCloseTo(1 / 3, 5); expect(trust(360)).toBeCloseTo(0.9, 5);
  });
  it('moves half way a day, never more than half a point on a 26-point span, and ignores slivers', () => {
    expect(nextOffset(0, 1, 26)).toBeCloseTo(0.5, 10);
    expect(nextOffset(0, 10, 26)).toBeCloseTo(STEP_LIMIT, 10);
    expect(nextOffset(0, 10, 40)).toBeCloseTo((STEP_LIMIT * 40) / 26, 10);
    expect(nextOffset(2, -10, 26)).toBeCloseTo(1.5, 10);
    expect(nextOffset(1, 1.05, 26)).toBe(1);
  });
  it('settles on a mode that responds to it: top-tenth strength falls short of the target, then the line stops moving', () => {
    // Players are fixed (strengths 60..80); the line starts 3 points too low. Each day the offset closes half the gap.
    const s = Array.from({ length: 200 }, (_, i) => 60 + i * 0.1);
    const ideal = quantile(s, 0.9) - TARGET_TOP_TENTH * 26;
    const base = ideal - 3;
    let o = 0;
    for (let d = 0; d < 30; d++) o = nextOffset(o, wantedOffset(s, base, 26), 26);
    const want = wantedOffset(s, base, 26);
    expect(want).toBeGreaterThan(2);                 // 3 points, shrunk a little for 200 runs
    expect(Math.abs(o - want)).toBeLessThan(0.11);
    const after = o;
    for (let d = 0; d < 5; d++) o = nextOffset(o, wantedOffset(s, base, 26), 26);
    expect(Math.abs(o - after)).toBeLessThan(0.11);
  });
  it('a base line that moves under it does not cause a lurch: the wanted offset follows the base', () => {
    const s = Array.from({ length: 200 }, (_, i) => 60 + i * 0.1);
    const ideal = quantile(s, 0.9) - TARGET_TOP_TENTH * 26;
    // The tuner raises the base by one point: the offset wanted falls by about the same amount.
    expect(wantedOffset(s, ideal - 3, 26) - wantedOffset(s, ideal - 2, 26)).toBeGreaterThan(0.8);
  });
  it('keeps each player latest few runs only', () => {
    // Newest first: a a b a a a b c. Player a keeps the three newest (positions 0, 1, 3).
    const runs = [...'aabaaabc'].map((who, i) => ({ who, i }));
    expect(lastRunsPerPlayer(runs, 3).map((r) => r.i)).toEqual([0, 1, 2, 3, 6, 7]);
    expect(lastRunsPerPlayer(runs).filter((r) => r.who === 'a')).toHaveLength(PER_PLAYER);
    expect(lastRunsPerPlayer(runs, 1).map((r) => r.i)).toEqual([0, 2, 7]);
  });
  it('keys modes by game, format, pool, edition and era, and treats old results as 6-man current', () => {
    expect(modeKey('17-0', { format: '12', pool: 'all-time' })).toBe('17-0:12:all-time');
    expect(modeKey('17-0', { format: 'fantasy', pool: '' })).toBe('17-0:fantasy:current');
    expect(modeKey('17-0', {})).toBe('17-0:6:current');
    expect(modeKey('82-0', { edition: 'standard' })).toBe('82-0:standard');
    expect(modeKey('82-0', {})).toBe('82-0:classic');
    expect(modeKey('162-0', { mode: 'now' })).toBe('162-0:now');
    expect(modeKey('162-0', {})).toBe('162-0:eras');
    expect(modeKey('higher-lower', {})).toBeNull();
    expect(MIN_RUNS).toBeGreaterThanOrEqual(15); expect(MIN_PLAYERS).toBeGreaterThanOrEqual(3);
  });
});
