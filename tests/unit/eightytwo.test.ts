import { describe, expect, it } from 'vitest';
import { ERAS, ERA_PICKS_MAX, NBA_ROUNDS, eraOf, fitMultiplier, gradeNbaRoster, isEra, naturalSlots, seasonLabel, seasonValue, NBA_SLOTS, type NbaPick } from '@/lib/game/eightytwo';

const jordan96 = { gp: 82, mpg: 37.7, ppg: 30.4, rpg: 6.6, apg: 4.3, spg: 2.2, bpg: 0.5, tov: 2.4, fgPct: 0.495 };
const starter = { gp: 75, mpg: 30, ppg: 15, rpg: 5, apg: 3, spg: 1, bpg: 0.5, tov: 2, fgPct: 0.46 };
const bench = { gp: 60, mpg: 14, ppg: 6, rpg: 2.5, apg: 1, spg: 0.4, bpg: 0.2, tov: 0.8, fgPct: 0.44 };

describe('82-0 values and fit', () => {
  it('ranks an MVP season above a starter above a bench player', () => {
    expect(seasonValue(jordan96)).toBeGreaterThan(95);
    expect(seasonValue(starter)).toBeGreaterThan(seasonValue(bench));
    expect(seasonValue(jordan96)).toBeGreaterThan(seasonValue(starter));
  });
  it('pulls a tiny sample toward replacement level', () => {
    expect(seasonValue({ ...jordan96, gp: 4 })).toBeLessThan(60);
  });
  it('maps combo positions and charges more the further out of position', () => {
    expect(naturalSlots('G')).toEqual(['PG', 'SG']);
    expect(naturalSlots('F-C')).toEqual(['PF', 'C']);
    expect(fitMultiplier('PG', 'PG')).toBe(1);
    expect(fitMultiplier('SG', 'PG')).toBeLessThan(1);
    expect(fitMultiplier('C', 'PG')).toBeLessThan(fitMultiplier('SF', 'PG'));
  });
  it('labels ESPN seasons by both years', () => {
    expect(seasonLabel(1996)).toBe('1995-96');
    expect(seasonLabel(2000)).toBe('1999-00');
  });
});

describe('82-0 grading', () => {
  const lineup = (value: number, swap = false): NbaPick[] => NBA_SLOTS.map((slot, i) => ({ slot, name: `P${i}`, position: swap && slot === 'PG' ? 'C' : slot, teamId: i, season: 1996, value }));
  it('a lineup of stars goes 82-0 and replacement players lose', () => {
    expect(gradeNbaRoster('s', lineup(99)).wins).toBe(82);
    expect(gradeNbaRoster('s', lineup(50)).wins).toBe(0);
  });
  it('playing a center at point guard costs wins', () => {
    expect(gradeNbaRoster('s', lineup(85, true)).wins).toBeLessThan(gradeNbaRoster('s', lineup(85)).wins);
  });
  it('is deterministic per seed and keeps the tiebreak under 1000', () => {
    const a = gradeNbaRoster('same', lineup(85)), b = gradeNbaRoster('same', lineup(85));
    expect(a).toEqual(b);
    expect(a.score % 1000).toBe(Math.round(a.teamStrength * 10));
    expect(a.wins + a.losses).toBe(82);
  });
});

describe('82-0 eras', () => {
  it('runs seven eras from the \'60s to the \'20s, in order, with no season in two of them', () => {
    expect(ERAS.map((e) => e.key)).toEqual(['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s']);
    expect(ERAS.map((e) => e.label)).toEqual(["'60s", "'70s", "'80s", "'90s", "'00s", "'10s", "'20s"]);
    for (let i = 1; i < ERAS.length; i++) expect(ERAS[i].from).toBeGreaterThan(ERAS[i - 1].to);
    for (const e of ERAS) expect(e.to).toBeGreaterThanOrEqual(e.from);
  });
  it('names each season by the year it ends: the \'60s are 1959-60 to 1968-69', () => {
    expect(eraOf('1960s')).toMatchObject({ from: 1960, to: 1969 });
    expect(eraOf('1970s')).toMatchObject({ from: 1970, to: 1979 });
    expect(seasonLabel(1960)).toBe('1959-60');
    expect(seasonLabel(1979)).toBe('1978-79');
  });
  it('recognizes an era by its key and gives each one pick, so five rounds use five of the seven', () => {
    expect(isEra('1960s')).toBe(true);
    expect(isEra('1950s')).toBe(false);
    expect(ERA_PICKS_MAX).toBe(1);
    expect(NBA_ROUNDS).toBeLessThan(ERAS.length);
  });
});
