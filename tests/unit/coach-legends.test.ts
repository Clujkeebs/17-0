import { describe, expect, it } from 'vitest';
import { COACH_LEGENDS, coachLegendByKey, coachLegendGrade, coachLegendId, coachLegendLine, coachLegendsFor, isCoachLegendId, seasonsCoached } from '@/lib/game/coach-legends';

const TEAMS = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB', 'TEN', 'WAS'];
const grade = (key: string) => coachLegendGrade(coachLegendByKey(key)!);

describe('all-time head coaches', () => {
  it('are unique, on real franchises, with sane seasons and records', () => {
    expect(new Set(COACH_LEGENDS.map((c) => c.key)).size).toBe(COACH_LEGENDS.length);
    expect(COACH_LEGENDS.length).toBeGreaterThanOrEqual(60);
    for (const c of COACH_LEGENDS) {
      expect(TEAMS, c.key).toContain(c.team);
      for (const [a, b] of c.years) { expect(a, c.key).toBeGreaterThanOrEqual(1950); expect(b, c.key).toBeLessThanOrEqual(2025); expect(b, c.key).toBeGreaterThanOrEqual(a); }
      const games = c.w + c.l + c.t, per = games / seasonsCoached(c);
      expect(per, `${c.key} games a season`).toBeGreaterThan(8); expect(per, `${c.key} games a season`).toBeLessThanOrEqual(17.5);
      expect(c.finals, c.key).toBeGreaterThanOrEqual(c.titles);
      expect(c.playoffs, c.key).toBeLessThanOrEqual(seasonsCoached(c));
    }
  });

  it('add up to exactly the games the franchise played in the seasons covered', () => {
    // The league played 12 games a season to 1960 (the AFL played 14 from its first year), 14 to 1977, then 16, except the strike years of 1982 (9) and 1987 (15), and 17 from 2021.
    const afl = new Set(['KC', 'LAC', 'DEN', 'LV', 'NYJ', 'TEN', 'BUF', 'NE']);
    const games = (y: number, team: string) => (y < 1960 ? 12 : y === 1960 ? (afl.has(team) ? 14 : 12) : y <= 1977 ? 14 : y === 1982 ? 9 : y === 1987 ? 15 : y <= 2020 ? 16 : 17);
    for (const c of COACH_LEGENDS) {
      const expected = c.years.reduce((sum, [a, b]) => sum + Array.from({ length: b - a + 1 }, (_, i) => games(a + i, c.team)).reduce((x, y) => x + y, 0), 0);
      expect(c.w + c.l + c.t, `${c.key} played ${expected} games`).toBe(expected);
    }
  });

  it('cover every franchise', () => {
    const covered = new Set(COACH_LEGENDS.map((c) => c.team));
    expect([...covered].sort()).toEqual([...TEAMS].sort());
    expect(coachLegendsFor('SF').map((c) => c.name)).toEqual(expect.arrayContaining(['Bill Walsh', 'George Seifert']));
    expect(coachLegendsFor('NOPE')).toEqual([]);
  });

  it('are graded on the 82 to 99 scale, with the greatest at the top and a decent coach well below', () => {
    for (const c of COACH_LEGENDS) { const g = coachLegendGrade(c); expect(g, c.key).toBeGreaterThanOrEqual(82); expect(g, c.key).toBeLessThanOrEqual(99); }
    for (const k of ['belichick-ne', 'lombardi-gb', 'shula-mia', 'noll-pit']) expect(grade(k), k).toBeGreaterThanOrEqual(97);
    expect(grade('belichick-ne')).toBeGreaterThanOrEqual(grade('walsh-sf'));
    expect(grade('walsh-sf')).toBeGreaterThan(grade('mccarthy-gb'));
    expect(grade('smith-atl')).toBeLessThan(90);
    expect(grade('seifert-sf')).toBeGreaterThan(grade('caldwell-det'));
  });

  it('rewards winning, titles and playoff trips', () => {
    const base = { key: 'x', name: 'X', team: 'SF', years: [[2000, 2008]] as [number, number][], w: 80, l: 64, t: 0, titles: 0, finals: 0, playoffs: 3 };
    expect(coachLegendGrade({ ...base, w: 100, l: 44 })).toBeGreaterThan(coachLegendGrade(base));
    expect(coachLegendGrade({ ...base, titles: 2, finals: 2 })).toBeGreaterThan(coachLegendGrade(base));
    expect(coachLegendGrade({ ...base, playoffs: 8 })).toBeGreaterThan(coachLegendGrade(base));
    expect(coachLegendGrade({ ...base, w: 20, l: 124, playoffs: 0 })).toBe(82);
  });

  it('describe themselves on a board row without repeating "Legend"', () => {
    expect(coachLegendLine(coachLegendByKey('shula-mia')!)).toBe('1970-95 · 257-133-2 · 2 titles');
    expect(coachLegendLine(coachLegendByKey('levy-buf')!)).toBe('1987-97 · 110-65 · 4 title games');
    expect(coachLegendLine(coachLegendByKey('smith-atl')!)).toBe('2008-14 · 66-46');
    expect(coachLegendLine(coachLegendByKey('gibbs-was')!)).toBe('1981-07 · 154-94 · 3 titles');
    expect(coachLegendLine(coachLegendByKey('brown-cle')!)).toBe('1950-62 · 111-44-5 · 3 titles');
  });

  it('have their own pick ids', () => {
    expect(coachLegendId('shula-mia')).toBe('lcoach:shula-mia');
    expect(isCoachLegendId('lcoach:shula-mia')).toBe(true);
    expect(isCoachLegendId('coach:12')).toBe(false);
  });
});
