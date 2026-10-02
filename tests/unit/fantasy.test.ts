import { describe, expect, it } from 'vitest';
import { fantasyGrade, fantasyValue, PROJ_WEIGHT } from '@/lib/game/fantasy';
import { FORMATS, gradeRoster, slotsFor, type Pick } from '@/lib/game/seventeen';
import { matchSleeper, seasonProjections, seasonStats } from '@/lib/server/sleeper';

const fakeFetch = (routes: Record<string, unknown>) => (async (url: string) => {
  const hit = Object.entries(routes).find(([k]) => String(url).endsWith(k));
  return hit ? new Response(JSON.stringify(hit[1]), { status: 200 }) : new Response('nope', { status: 404 });
}) as unknown as typeof fetch;

describe('fantasy scoring', () => {
  it('blends real points with the projection until the sample is big', () => {
    expect(fantasyValue(20, 3, 14)).toBe(Math.round(((3 * 20 + PROJ_WEIGHT * 14) / (3 + PROJ_WEIGHT)) * 10) / 10);
    expect(fantasyValue(20, 15, 14)).toBeGreaterThan(18.9);
    expect(fantasyValue(null, 0, 12.34)).toBe(12.3);
    expect(fantasyValue(18, 4, null)).toBe(18);
    expect(fantasyValue(null, null, null)).toBe(0);
  });
  it('grades relative to the position', () => {
    expect(fantasyGrade(15, 'TE')).toBe(99);
    expect(fantasyGrade(15, 'WR')).toBeLessThan(90);
    expect(fantasyGrade(0, 'QB')).toBe(55);
  });
  it('lets FLEX take a back, a receiver or a tight end, never a quarterback', () => {
    expect(slotsFor('TE', 'fantasy')).toEqual(['TE', 'FLEX']);
    expect(slotsFor('QB', 'fantasy')).toEqual(['QB']);
  });
  it('turns weekly points into a record against the floor', () => {
    const pick = (slot: string, group: Pick['group'], fantasy: number, teamId: number): Pick => ({ slot, group, fantasy, teamId, name: slot });
    const lineup = (pts: number) => FORMATS.fantasy.slots.map((d, i) => pick(d.key, d.accepts[0] as Pick['group'], pts, i + 1));
    const great = gradeRoster('x', lineup(25), undefined, undefined, [], 'fantasy', 100);
    const bad = gradeRoster('x', lineup(8), undefined, undefined, [], 'fantasy', 100);
    expect(great.teamStrength).toBe(175);
    expect(great.wins).toBe(17);
    expect(bad.wins).toBe(0);
    expect(great.slots[0].points).toBe(25);
    expect(great.score % 1000).toBeLessThan(1000);
    expect(Math.floor(great.score / 1000)).toBe(17);
  });
});

describe('Sleeper sync', () => {
  const byEspn = new Map([['4241478', 's1']]);
  const byTeamName = new Map([['PHI:devontasmith', ['s1']], ['PHI:last:smith', ['s1']], ['CAR:last:smith', ['s2', 's3']]]);
  it('matches by ESPN id first, then a unique same-team name', () => {
    expect(matchSleeper({ espnId: '4241478', fullName: 'Anyone', position: 'WR', team: 'CAR' }, byEspn, byTeamName)).toBe('s1');
    expect(matchSleeper({ espnId: null, fullName: 'DeVonta Smith', position: 'WR', team: 'PHI' }, byEspn, byTeamName)).toBe('s1');
    expect(matchSleeper({ espnId: null, fullName: 'DeVonta Smith Jr.', position: 'WR', team: 'PHI' }, byEspn, byTeamName)).toBe('s1');
    expect(matchSleeper({ espnId: null, fullName: 'Jon Smith', position: 'WR', team: 'CAR' }, byEspn, byTeamName)).toBeNull();
    expect(matchSleeper({ espnId: null, fullName: 'DeVonta Smith', position: 'WR', team: null }, byEspn, byTeamName)).toBeNull();
  });
  it('reads season totals, and adds up weeks when the totals file is missing', async () => {
    const totals: Record<string, unknown> = {};
    for (let i = 0; i < 120; i++) totals[`p${i}`] = { pts_ppr: 50, gp: 5 };
    expect((await seasonStats('2026', 6, fakeFetch({ '/stats/nfl/regular/2026': totals }))).get('p3')).toEqual({ pts: 50, gp: 5 });
    const weekly = fakeFetch({ '/regular/2026/1': { a: { pts_ppr: 10, gp: 1 } }, '/regular/2026/2': { a: { pts_ppr: 20, gp: 1 }, b: { pts_ppr: 0, gp: 0 } } });
    const m = await seasonStats('2026', 3, weekly);
    expect(m.get('a')).toEqual({ pts: 30, gp: 2 });
    expect(m.has('b')).toBe(false);
  });
  it('turns season projections into points per game', async () => {
    const m = await seasonProjections('2026', fakeFetch({ '/projections/nfl/regular/2026': { a: { pts_ppr: 340 }, b: { pts_ppr: 0 }, c: { pts_ppr: 160, gp: 16 } } }));
    expect(m.get('a')).toBe(20);
    expect(m.has('b')).toBe(false);
    expect(m.get('c')).toBe(10);
  });
});
