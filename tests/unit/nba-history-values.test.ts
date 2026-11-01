import { describe, expect, it } from 'vitest';
import { HISTORY_FIRST, HISTORY_LAST, MODERN_RAW, STOCKS_FROM, historyValues, type HistoryLine } from '@/lib/game/nba-history';
import { seasonRaw, seasonValue, valueFromRaw } from '@/lib/game/eightytwo';

/** A league of 60 rotation players with a spread of scoring, boards and passing. */
function league(season: number, scale = 1, extra: Partial<HistoryLine> = {}): HistoryLine[] {
  return Array.from({ length: 60 }, (_, i) => ({
    season, gp: 70, mpg: 28, ppg: (6 + i * 0.4) * scale, rpg: (3 + (i % 7)) * scale, apg: (1 + (i % 5) * 0.9) * scale, spg: 0, bpg: 0, tov: null, fgPct: null, tpPct: null, ftPct: null, ...extra,
  }));
}

describe('history values', () => {
  it('covers 1960 to 1989 and steals are counted from 1974', () => {
    expect(HISTORY_FIRST).toBe(1960);
    expect(HISTORY_LAST).toBe(1989);
    expect(STOCKS_FROM).toBe(1974);
  });

  it('does not reward a league for its pace: scaling every line by the same factor changes nothing', () => {
    const a = historyValues(league(1966));
    const b = historyValues(league(1966, 1.3));
    a.forEach((v, i) => expect(Math.abs(v - b[i])).toBeLessThan(0.15));
  });

  it('keeps the order within a season and puts the average rotation player at the modern average', () => {
    const climbing = league(1966).map((l, i) => ({ ...l, ppg: 6 + i * 0.4, rpg: 3 + i * 0.1, apg: 1 + i * 0.05 }));
    const v = historyValues(climbing);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThanOrEqual(v[i - 1]);
    const middle = v[Math.floor(v.length / 2)];
    const modernAverage = valueFromRaw(MODERN_RAW.mean, 70);
    expect(Math.abs(middle - modernAverage)).toBeLessThan(6);
    expect(v[v.length - 1]).toBeGreaterThan(90);
    expect(Math.max(...v)).toBeLessThanOrEqual(99);
    expect(Math.min(...v)).toBeGreaterThanOrEqual(40);
  });

  it('ignores steals and blocks before 1974 and uses them once the league counted them', () => {
    const withStocks = (season: number) => league(season).map((l, i) => ({ ...l, spg: 0.5 + (i % 6) * 0.4, bpg: (i % 4) * 0.5 }));
    const stripped = (season: number) => league(season);
    const same = (season: number) => historyValues(withStocks(season)).every((v, i) => Math.abs(v - historyValues(stripped(season))[i]) < 0.01);
    expect(same(1970)).toBe(true);
    expect(same(1977)).toBe(false);
  });

  it('counts steals only when most of the season recorded them', () => {
    // 1977 with the stats missing for nearly everyone is graded like a season before 1974.
    const sparse = league(1977).map((l, i) => (i < 6 ? { ...l, spg: 2, bpg: 1 } : l));
    const plain = league(1977);
    const a = historyValues(sparse), b = historyValues(plain);
    expect(Math.abs(a[a.length - 1] - b[b.length - 1])).toBeLessThan(2);
  });

  it('pulls a short season toward 50 the way the modern seasons do', () => {
    const base = league(1966);
    const star = { ...base[59] };
    const full = historyValues([...base.slice(0, 59), star])[59];
    const short = historyValues([...base.slice(0, 59), { ...star, gp: 12 }])[59];
    expect(short).toBeLessThan(full);
    expect(short).toBeGreaterThan(50);
  });

  it('leaves the modern formula as it was', () => {
    const line = { gp: 82, mpg: 36, ppg: 30.4, rpg: 6.6, apg: 4.3, spg: 2.2, bpg: 0.5, tov: 2.4, fgPct: 0.495, tpPct: 0.427, ftPct: 0.834 };
    expect(seasonValue(line)).toBe(valueFromRaw(seasonRaw(line), 82));
    expect(seasonValue(line)).toBeGreaterThan(95);
  });
});
