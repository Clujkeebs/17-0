import { describe, expect, it } from 'vitest';
import { latestSeason, leaderIds, lineFrom, readStats } from '@/lib/server/nba-sync';

describe('82-0 ESPN parsing', () => {
  it('reads per-game lines from ESPN stat categories', () => {
    const j = { splits: { categories: [
      { name: 'defensive', stats: [{ name: 'avgBlocks', value: 0.51 }, { name: 'avgSteals', value: 2.2 }] },
      { name: 'general', stats: [{ name: 'gamesPlayed', value: 82 }, { name: 'avgMinutes', value: 37.7 }, { name: 'avgRebounds', value: 6.6 }] },
      { name: 'offensive', stats: [{ name: 'avgPoints', value: 30.4 }, { name: 'avgAssists', value: 4.3 }, { name: 'avgTurnovers', value: 2.4 }, { name: 'fieldGoalPct', value: 49.5 }] },
    ] } };
    const l = lineFrom(readStats(j));
    expect(l).toMatchObject({ gp: 82, ppg: 30.4, rpg: 6.6, apg: 4.3, spg: 2.2, bpg: 0.51, tov: 2.4, fgPct: 0.495 });
  });
  it('recovers games played and per-game numbers from totals', () => {
    const l = lineFrom({ minutes: 3090, avgMinutes: 37.68, points: 2491, rebounds: 543 });
    expect(l.gp).toBe(82);
    expect(l.ppg).toBeCloseTo(30.4, 1);
    expect(l.rpg).toBeCloseTo(6.6, 1);
  });
  it('treats an empty response as zero games', () => {
    expect(lineFrom(readStats(null)).gp).toBe(0);
  });
  it('names the season by its end year once it has tipped off', () => {
    expect(latestSeason(new Date('2026-10-02T12:00:00Z'))).toBe(2026);
    expect(latestSeason(new Date('2026-10-25T12:00:00Z'))).toBe(2027);
    expect(latestSeason(new Date('2027-03-01T12:00:00Z'))).toBe(2027);
  });
});

describe('82-0 rosters from team leaders', () => {
  it('collects each player once across categories', () => {
    const ref = (id: number) => ({ athlete: { $ref: `http://sports.core.api.espn.com/v2/sports/basketball/leagues/nba/seasons/1996/athletes/${id}?lang=en` } });
    const j = { categories: [{ name: 'pointsPerGame', leaders: [ref(1035), ref(663)] }, { name: 'reboundsPerGame', leaders: [ref(726), ref(1035)] }] };
    expect(leaderIds(j).sort()).toEqual([1035, 663, 726].sort());
    expect(leaderIds(null)).toEqual([]);
  });
});
