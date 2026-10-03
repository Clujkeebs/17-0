import { describe, expect, it } from 'vitest';
import { gradeSeasons, legendGroup, seasonLine, seasonScore, type HistSeason } from '@/lib/game/legend-grade';
import { leaderStats } from '@/lib/server/nfl-history';

describe('All-time legends from NFL history', () => {
  it('puts positions in groups; pass-rushing linebackers are edge rushers; linemen are skipped', () => {
    expect(legendGroup('QB', {})).toBe('QB');
    expect(legendGroup('OLB', { sacks: 12 })).toBe('EDGE');
    expect(legendGroup('OLB', { sacks: 2, totalTackles: 110 })).toBe('LB');
    expect(legendGroup('DT', { sacks: 5 })).toBe('DL');
    expect(legendGroup('FS', {})).toBe('S');
    expect(legendGroup('G', {})).toBeNull();
    expect(legendGroup('K', {})).toBeNull();
    expect(legendGroup('', {})).toBeNull();
  });

  it('ignores cameo seasons', () => {
    expect(seasonScore('QB', { passingYards: 900 })).toBeNull();
    expect(seasonScore('RB', { rushingYards: 1848, rushingTouchdowns: 15 })).toBeGreaterThan(0);
  });

  it('writes a readable line', () => {
    expect(seasonLine('WR', { receptions: 112, receivingYards: 1499, receivingTouchdowns: 13 })).toBe('112 rec, 1,499 yds, 13 TD');
    expect(seasonLine('EDGE', { sacks: 22.5, totalTackles: 60 })).toBe('22.5 sacks, 60 tkl');
  });

  it('grades against each season\'s starter level, onto today\'s range', () => {
    const seasons: HistSeason[] = [];
    // Two eras: 1985 passing ran lower than 2015. The best of each era should grade alike.
    for (const [season, scale] of [[1985, 0.8], [2015, 1.1]] as const) {
      for (let i = 0; i < 40; i++) seasons.push({ key: `${season}-${i}`, group: 'QB', season, stats: { passingYards: Math.round((2000 + i * 60) * scale), passingTouchdowns: Math.round((10 + i * 0.6) * scale), quarterbackRating: 70 + i * 0.6 } });
    }
    const range = Array.from({ length: 100 }, (_, i) => 50 + i * 0.49);
    const g = gradeSeasons(seasons, { QB: range });
    expect(g.get('1985-39')).toBeGreaterThan(95);
    expect(Math.abs(g.get('1985-39')! - g.get('2015-39')!)).toBeLessThan(3);
    expect(g.get('2015-0')!).toBeLessThan(60);
    for (const v of g.values()) { expect(v).toBeGreaterThanOrEqual(50); expect(v).toBeLessThanOrEqual(99); }
  });

  it('reads ESPN leader categories into per-athlete stats', () => {
    const j = { categories: [
      { name: 'receivingYards', leaders: [{ value: 1499, athlete: { $ref: 'http://x/seasons/1994/athletes/12?lang=en' } }] },
      { name: 'receptions', leaders: [{ value: 112, athlete: { $ref: 'http://x/seasons/1994/athletes/12?lang=en' } }] },
      { name: 'receivingLeader', leaders: [{ value: 1499, athlete: { $ref: 'http://x/seasons/1994/athletes/12?lang=en' } }] },
    ] };
    expect(leaderStats(j).get(12)).toEqual({ receivingYards: 1499, receptions: 112 });
  });
});
