import { describe, expect, it } from 'vitest';
import {
  WNBA_ERAS, WNBA_FLOOR_DEFAULT, WNBA_GAMES, WNBA_SLOTS, WNBA_WIN_SPAN, gradeWnbaRoster, isWnbaEra, isWnbaMode, wnbaFit, wnbaSlots, wnbaValue,
  type WnbaPick,
} from '@/lib/game/fortyfour';
import { modeKey } from '@/lib/game/difficulty';
import { fitMultiplier, seasonValue } from '@/lib/game/eightytwo';

const line = (o: Partial<Parameters<typeof wnbaValue>[0]> = {}) => ({ gp: 40, mpg: 32, ppg: 22, rpg: 8, apg: 3, spg: 1.5, bpg: 1, tov: 2.5, fgPct: 0.48, tpPct: 0.36, ftPct: 0.85, ...o });
const pick = (slot: (typeof WNBA_SLOTS)[number], value: number, position = 'G', apg = 3): WnbaPick => ({ slot, name: `Test ${slot}`, position, teamId: 1, season: 2024, value, apg });

describe('44-0 eras and modes', () => {
  it('cover every season since the league began, in order, with no gap and no overlap', () => {
    expect(WNBA_ERAS[0].from).toBe(1997);
    for (let i = 1; i < WNBA_ERAS.length; i++) expect(WNBA_ERAS[i].from).toBe(WNBA_ERAS[i - 1].to + 1);
    expect(WNBA_ERAS.at(-1)!.to).toBeGreaterThan(2050);
    expect(WNBA_ERAS.length).toBe(5);
  });
  it('recognise their own keys and modes only', () => {
    expect(isWnbaEra('2015-2020')).toBe(true);
    expect(isWnbaEra('1990s')).toBe(false);
    expect(isWnbaMode('now')).toBe(true);
    expect(isWnbaMode('classic')).toBe(false);
  });
  it('have their own balance key per mode', () => {
    expect(modeKey('44-0', { mode: 'now' })).toBe('44-0:now');
    expect(modeKey('44-0', { mode: 'eras' })).toBe('44-0:eras');
    expect(modeKey('44-0', {})).toBe('44-0:eras');
  });
});

describe('44-0 values', () => {
  it('count a full-time season in full whatever the length of the schedule', () => {
    expect(wnbaValue(line({ gp: 22 }), 22)).toBe(wnbaValue(line({ gp: 44 }), 44));
    expect(wnbaValue(line({ gp: 34 }), 34)).toBe(wnbaValue(line({ gp: 44 }), 44));
  });
  it('still pull a small sample toward replacement level', () => {
    expect(wnbaValue(line({ gp: 6 }), 44)).toBeLessThan(wnbaValue(line({ gp: 44 }), 44));
    expect(wnbaValue(line({ gp: 3 }), 44)).toBeGreaterThan(40);
  });
  it('match the NBA formula where the sample is the same', () => {
    expect(wnbaValue(line({ gp: 40 }), 80)).toBe(seasonValue(line({ gp: 40 })));
  });
  it('rank a star above a role player and stay on the 40 to 99 scale', () => {
    const star = wnbaValue(line({ ppg: 27, rpg: 12, apg: 3, spg: 1.8, bpg: 2.6, fgPct: 0.57 }), 44);
    const role = wnbaValue(line({ ppg: 7, rpg: 3, apg: 1.5, spg: 0.8, bpg: 0.2, fgPct: 0.42 }), 44);
    expect(star).toBeGreaterThan(role + 15);
    for (const v of [star, role]) { expect(v).toBeGreaterThanOrEqual(40); expect(v).toBeLessThanOrEqual(99); }
  });
});

describe('44-0 positions', () => {
  it('lets a forward who runs the offense play the point at no cost, at the WNBA scale', () => {
    expect(wnbaFit('F', 'PG', 3)).toBeLessThan(1);
    expect(wnbaFit('F', 'PG', 5.5)).toBe(1);
    expect(wnbaSlots('F', 5.5)[0]).toBe('PG');
  });
  it('keeps the same out-of-position costs as 82-0', () => {
    expect(wnbaFit('F', 'C')).toBe(0.94);
    expect(wnbaFit('F', 'SG')).toBe(0.94);
    expect(wnbaFit('G', 'SF')).toBe(0.94);
    expect(wnbaFit('G', 'C')).toBe(0.7);
  });
  it('plays a listed center at power forward as well, since the league lists only G, F and C', () => {
    expect(wnbaSlots('C')).toEqual(['C', 'PF']);
    expect(wnbaFit('C', 'C')).toBe(1);
    expect(wnbaFit('C', 'PF')).toBe(1);
    expect(wnbaFit('C', 'SF')).toBe(0.94);
    expect(wnbaFit('C', 'SG')).toBe(0.82);
    expect(wnbaFit('C', 'PG')).toBe(0.7);
    // Spacing in the listing does not matter, and the point-guard rule still stacks on top.
    expect(wnbaSlots(' c ')).toEqual(['C', 'PF']);
    expect(wnbaSlots('C', 5.5)).toEqual(['C', 'PG', 'PF']);
    // The NBA game is unchanged: its listings have five positions, so a C is only a C.
    expect(fitMultiplier('C', 'PF')).toBe(0.94);
  });
});

describe('44-0 grading', () => {
  const roster = (v: number) => [pick('PG', v, 'G'), pick('SG', v, 'G'), pick('SF', v, 'F'), pick('PF', v, 'F'), pick('C', v, 'C')];
  it('plays 44 games and is deterministic for a seed', () => {
    const a = gradeWnbaRoster('s1', roster(80)), b = gradeWnbaRoster('s1', roster(80));
    expect(a).toEqual(b);
    expect(a.wins + a.losses).toBe(WNBA_GAMES);
    expect(a.slots).toHaveLength(5);
    expect(a.narrative).toHaveLength(3);
  });
  it('goes 44-0 at the top of the span and never above, and grades a weak roster low', () => {
    const top = gradeWnbaRoster('s2', roster(WNBA_FLOOR_DEFAULT + WNBA_WIN_SPAN + 1));
    expect(top.wins).toBe(WNBA_GAMES);
    expect(top.narrative.at(-1)).toContain('Forty-four and zero');
    expect(top.perfectAt).toBe(WNBA_FLOOR_DEFAULT + WNBA_WIN_SPAN);
    const weak = gradeWnbaRoster('s3', roster(50));
    expect(weak.wins).toBeLessThanOrEqual(3);
  });
  it('moves with the win line and with out-of-position play', () => {
    const base = gradeWnbaRoster('s4', roster(85), 66);
    const harder = gradeWnbaRoster('s4', roster(85), 74);
    expect(harder.wins).toBeLessThan(base.wins);
    const swapped = gradeWnbaRoster('s4', [pick('PG', 85, 'C'), pick('SG', 85, 'G'), pick('SF', 85, 'F'), pick('PF', 85, 'F'), pick('C', 85, 'G')], 66);
    expect(swapped.teamStrength).toBeLessThan(base.teamStrength);
    expect(swapped.slots.find((s) => s.slot === 'PG')!.fit).toBe(0.7);
  });
  it('refuses a roster with a spot missing', () => {
    expect(() => gradeWnbaRoster('s5', roster(80).slice(0, 4))).toThrow(/Missing pick/);
  });
});
