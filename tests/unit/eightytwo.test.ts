import { describe, expect, it } from 'vitest';
import { fitMultiplier, gradeNbaRoster, naturalSlots, seasonLabel, seasonValue, NBA_SLOTS, type NbaPick } from '@/lib/game/eightytwo';

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
