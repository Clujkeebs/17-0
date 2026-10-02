import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_KEYS, type Attributes } from '@/lib/game/attributes';
import { FORMATS, FORMAT_KEYS, gradeRoster, slotAccepts, slotsFor, type Pick } from '@/lib/game/seventeen';
import { LEGEND_FRANCHISE } from '@/lib/game/legends';
import { ratePlayer } from '@/lib/game/formulas';

const flat = (v: number): Attributes => Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, v]));
const GROUP_FOR: Record<string, string> = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', OL: 'OL', EDGE: 'EDGE', DL: 'DL', LB: 'LB', CB: 'CB', S: 'S', DEF: 'CB', HC: 'HC' };
const rosterFor = (format: (typeof FORMAT_KEYS)[number], v: number): Pick[] => FORMATS[format].slots.map((d, i) => {
  const group = GROUP_FOR[d.key.replace(/\d+$/, '')] as Pick['group'];
  return group === 'HC' ? { slot: d.key, teamId: i + 1, name: `C ${i}`, group, coachImpact: v } : { slot: d.key, teamId: i + 1, name: `P ${i}`, group, attributes: flat(v) };
});

describe('roster formats', () => {
  it('have the advertised sizes, unique slots, and weights that sum to 1', () => {
    expect(FORMAT_KEYS.map((f) => FORMATS[f].slots.length)).toEqual([6, 12, 16]);
    for (const f of FORMAT_KEYS) {
      const keys = FORMATS[f].slots.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
      expect(FORMATS[f].slots.reduce((a, d) => a + d.weight, 0)).toBeCloseTo(1, 10);
    }
  });
  it('keep the quarterback heaviest and the tight end light in every format', () => {
    for (const f of FORMAT_KEYS) {
      const w = (k: string) => FORMATS[f].slots.find((d) => d.key === k)!.weight;
      const others = FORMATS[f].slots.filter((d) => d.key !== 'QB');
      expect(others.every((d) => d.weight < w('QB'))).toBe(true);
      expect(w('TE')).toBeLessThan(w('RB'));
    }
  });
  it('route positions to the right slots', () => {
    expect(slotsFor('WR', '16')).toEqual(['WR1', 'WR2', 'WR3']);
    expect(slotsFor('CB', '6')).toEqual(['DEF']);
    expect(slotsFor('OL', '6')).toEqual([]);
    expect(slotAccepts('EDGE', 'EDGE', '12')).toBe(true);
    expect(slotAccepts('EDGE', 'DL', '12')).toBe(false);
  });
  it('grade every format deterministically, and a weak roster loses', () => {
    for (const f of FORMAT_KEYS) {
      const a = gradeRoster('x', rosterFor(f, 90), undefined, undefined, [], f);
      expect(a).toEqual(gradeRoster('x', rosterFor(f, 90), undefined, undefined, [], f));
      expect(a.slots).toHaveLength(FORMATS[f].slots.length);
      expect(gradeRoster('y', rosterFor(f, 40), undefined, undefined, [], f).wins).toBe(0);
    }
  });
  it('grades linemen on blocking, not catching', () => {
    const blocker = { ...flat(50), passBlock: 95, runBlock: 95, strength: 95 };
    const catcher = { ...flat(50), catching: 95, routeRunning: 95, speed: 95 };
    expect(ratePlayer(blocker, 'OL')).toBeGreaterThan(ratePlayer(catcher, 'OL'));
  });
  it('ties every legend to a real franchise', () => {
    expect(Object.keys(LEGEND_FRANCHISE)).toHaveLength(22);
    for (const abbr of Object.values(LEGEND_FRANCHISE)) expect(abbr).toMatch(/^[A-Z]{2,3}$/);
  });
});
