import { describe, expect, it } from 'vitest';
import { createRng, hashSeed, clamp } from '@/lib/game/prng';
import { applyWeights, coachImpact, DEFAULT_FORMULAS, formulaFor, letterGrade, ratePlayer } from '@/lib/game/formulas';
import { gradeRoster, slotAccepts, spinTeams, SLOTS, SLOT_WEIGHTS, WIN_FLOOR, WIN_SPAN, type Pick } from '@/lib/game/seventeen';
import { assemble, buildRating, simulateSeason, BUILD_CATEGORIES, BUILD_POSITIONS, type BuildSource } from '@/lib/game/build';
import { computeStreak, dailyDateET, dailySeed, longestStreak } from '@/lib/game/daily';
import { buildNarrative } from '@/lib/game/narrative';
import { positionGroup, ATTRIBUTE_KEYS, type Attributes } from '@/lib/game/attributes';

const flat = (v: number): Attributes => Object.fromEntries(ATTRIBUTE_KEYS.map((k) => [k, v]));

describe('prng', () => {
  it('is deterministic per seed', () => {
    const a = createRng('abc'), b = createRng('abc');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it('differs across seeds', () => { expect(createRng('a').next()).not.toBe(createRng('b').next()); });
  it('int stays in range and hits both ends', () => {
    const r = createRng('range'); const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) { const v = r.int(-2, 3); expect(v).toBeGreaterThanOrEqual(-2); expect(v).toBeLessThanOrEqual(3); seen.add(v); }
    expect(seen.size).toBe(6);
  });
  it('shuffle is a permutation', () => {
    const arr = Array.from({ length: 32 }, (_, i) => i);
    expect(createRng('s').shuffle(arr).sort((a, b) => a - b)).toEqual(arr);
  });
  it('pick and hash', () => { expect(['x']).toContain(createRng('p').pick(['x'])); expect(hashSeed('z')).toHaveLength(4); expect(clamp(5, 0, 3)).toBe(3); });
});

describe('formulas', () => {
  it('weights sum to 1 for every formula', () => {
    for (const w of Object.values(DEFAULT_FORMULAS)) expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('flat attributes rate at that value', () => { expect(ratePlayer(flat(80), 'QB')).toBe(80); expect(ratePlayer(flat(90), 'CB')).toBe(90); });
  it('QB formula uses the spec weights', () => {
    const a = { ...flat(50), throwAccuracyDeep: 100 };
    expect(ratePlayer(a, 'QB')).toBeCloseTo(50 + 50 * 0.2, 1);
  });
  it('maps defensive groups to branches', () => {
    expect(formulaFor('EDGE')).toBe('DL'); expect(formulaFor('LB')).toBe('LB'); expect(formulaFor('S')).toBe('S'); expect(formulaFor('OL')).toBe('TE');
  });
  it('empty weights return 0; missing attributes default to 50', () => { expect(applyWeights({}, {})).toBe(0); expect(applyWeights({}, { speed: 1 })).toBe(50); });
  it('coach impact clamps to 0..99', () => {
    expect(coachImpact({ teamRosterAvgOvr: 99, recent3yrWinPct: 1, playoffAppearances3yr: 3, superBowlWins: 6, yearsWithTeam: 25 })).toBe(99);
    expect(coachImpact({ teamRosterAvgOvr: 75, recent3yrWinPct: 0.5, playoffAppearances3yr: 1, superBowlWins: 0, yearsWithTeam: 2 })).toBe(Math.round(75 * .35 + 17.5 + 3 + 1));
    expect(coachImpact({ teamRosterAvgOvr: 0, recent3yrWinPct: 0, playoffAppearances3yr: 0, superBowlWins: 0, yearsWithTeam: 0 })).toBe(0);
  });
  it('letter grades cover the range', () => {
    expect([99, 90, 85, 81, 77, 73, 69, 65, 61, 56, 20].map(letterGrade)).toEqual(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']);
  });
  it('position groups map raw codes', () => { expect(positionGroup('HB')).toBe('RB'); expect(positionGroup('ROLB')).toBe('LB'); expect(positionGroup('re')).toBe('EDGE'); expect(positionGroup('??')).toBe('OL'); });
});

const roster = (v: number, coach = v): Pick[] => [
  { slot: 'QB', teamId: 1, name: 'Q B', group: 'QB', attributes: flat(v) },
  { slot: 'RB', teamId: 2, name: 'R B', group: 'RB', attributes: flat(v) },
  { slot: 'WR', teamId: 3, name: 'W R', group: 'WR', attributes: flat(v) },
  { slot: 'TE', teamId: 5, name: 'T E', group: 'TE', attributes: flat(v) },
  { slot: 'DEF', teamId: 4, name: 'D F', group: 'CB', attributes: flat(v) },
  { slot: 'HC', teamId: 6, name: 'H C', group: 'HC', coachImpact: coach },
];

describe('17-0', () => {
  it('slot eligibility', () => {
    expect(slotAccepts('TE', 'TE')).toBe(true); expect(slotAccepts('WR', 'TE')).toBe(false); expect(slotAccepts('DEF', 'EDGE')).toBe(true); expect(slotAccepts('DEF', 'QB')).toBe(false);
    expect(slotAccepts('HC', 'HC')).toBe(true); expect(slotAccepts('WR', 'WR')).toBe(true); expect(slotAccepts('RB', 'WR')).toBe(false); expect(slotAccepts('QB', 'QB')).toBe(true);
  });
  it('spin gives 6 distinct teams + 2 reserves deterministically', () => {
    const ids = Array.from({ length: 32 }, (_, i) => i + 1);
    const a = spinTeams('seed', ids), b = spinTeams('seed', [...ids].reverse());
    expect(a).toEqual(b);
    expect(new Set([...a.teams, ...a.reserves]).size).toBe(8);
  });
  it('grading is reproducible for the same seed', () => { expect(gradeRoster('x', roster(85))).toEqual(gradeRoster('x', roster(85))); });
  it('projected wins follow the formula and stay in 0..17', () => {
    for (let i = 0; i < 200; i++) {
      const r = gradeRoster(`s${i}`, roster(80));
      const base = ((80 - WIN_FLOOR) / WIN_SPAN) * 17;
      expect(r.wins).toBeGreaterThanOrEqual(Math.max(0, Math.round(base - 2))); expect(r.wins).toBeLessThanOrEqual(Math.min(17, Math.round(base + 1)));
      expect(r.wins + r.losses).toBe(17);
      expect(r.narrative).toHaveLength(3);
      expect(r.narrative.join(' ')).not.toMatch(/—/);
    }
    for (let i = 0; i < 100; i++) expect(gradeRoster(`z${i}`, roster(0)).wins).toBeLessThanOrEqual(3);
  });
  it('an all-99 roster can go 17-0', () => {
    expect(Array.from({ length: 60 }, (_, i) => gradeRoster(`p${i}`, roster(99)).wins).some((w) => w === 17)).toBe(true);
  });
  it('score orders by wins then strength', () => { const r = gradeRoster('q', roster(90)); expect(r.score).toBe(r.wins * 1000 + Math.round(r.teamStrength * 10)); });
  it('throws on a missing slot', () => { expect(() => gradeRoster('m', roster(80).slice(1))).toThrow(/QB/); });
  it('weights put QB first and receivers and backs ahead of tight end and coach', () => {
    const w = SLOT_WEIGHTS;
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(w.QB).toBeGreaterThan(w.WR); expect(w.WR).toBeGreaterThan(w.TE); expect(w.RB).toBeGreaterThan(w.TE);
    expect(w.QB).toBeGreaterThan(w.HC); expect(w.WR).toBeGreaterThan(w.HC);
  });
  it('a 97 WR with a 90 TE beats a 90 WR with a 97 TE', () => {
    const swap = (wr: number, te: number) => roster(90).map((p) => p.slot === 'WR' ? { ...p, attributes: flat(wr) } : p.slot === 'TE' ? { ...p, attributes: flat(te) } : p);
    let better = 0, worse = 0;
    for (let i = 0; i < 200; i++) {
      const a = gradeRoster(`b${i}`, swap(97, 90)), b = gradeRoster(`b${i}`, swap(90, 97));
      expect(a.teamStrength).toBeGreaterThan(b.teamStrength + 0.8);
      expect(a.wins).toBeGreaterThanOrEqual(b.wins);
      if (a.wins > b.wins) better++; else worse++;
    }
    expect(better).toBeGreaterThan(worse / 2); // same luck roll, so the receiver roster is usually a full game better
  });
  it('uses all six slots', () => { expect(gradeRoster('a', roster(70)).slots.map((s) => s.slot)).toEqual([...SLOTS]); });
  it('narrative covers every record tier', () => {
    const slots = [{ slot: 'QB', name: 'A B', grade: 90 }, { slot: 'K', name: 'C D', grade: 60 }];
    for (const w of [17, 14, 11, 8, 3]) expect(buildNarrative('n', slots, w, 17 - w, 10)[2]).toContain(`${w}`);
    expect(buildNarrative('n', slots, 17, 0, 120)[2]).toMatch(/Perfect/);
  });
});

describe('build a player', () => {
  const sources: BuildSource[] = [60, 70, 80, 90, 99].map((v, i) => ({ name: `P${i}`, attributes: flat(v) }));
  it('assembles chosen categories', () => {
    const choices = Object.fromEntries(BUILD_CATEGORIES.QB.map((c) => [c, 4]));
    expect(Object.values(assemble('QB', sources, choices)).every((v) => v === 99)).toBe(true);
  });
  it('rejects missing choices', () => { expect(() => assemble('QB', sources, {})).toThrow(); });
  it('rating is monotonic', () => {
    const lo = buildRating('WR', flat(60)), hi = buildRating('WR', flat(95));
    expect(hi).toBeGreaterThan(lo);
  });
  it('simulations respect realistic caps for every position', () => {
    for (const pos of BUILD_POSITIONS) {
      for (const v of [40, 75, 99]) {
        const stats = simulateSeason(pos, flat(v), `${pos}${v}`);
        expect(stats.length).toBeGreaterThan(2);
        for (const s of stats) expect(Number.isFinite(s.value)).toBe(true);
      }
    }
    const qb = Object.fromEntries(simulateSeason('QB', flat(99), 'cap').map((s) => [s.key, s.value]));
    expect(qb.passYds).toBeLessThanOrEqual(5500); expect(qb.passTd).toBeLessThanOrEqual(55); expect(qb.int).toBeGreaterThanOrEqual(3); expect(qb.rushYds).toBeLessThanOrEqual(900);
    expect(qb.passYds).toBeGreaterThan(4800);
  });
  it('trait model: values, score, best possible, full build', async () => {
    const { TRAITS, traitValue, traitScore, bestPossible, gradeTraitBuild } = await import('@/lib/game/build');
    for (const pos of BUILD_POSITIONS) expect(TRAITS[pos].reduce((a, t) => a + t.weight, 0)).toBeCloseTo(1, 5);
    const qb = TRAITS.QB;
    expect(traitValue(flat(90), qb[0])).toBe(90);
    const picks = qb.map((t, i) => ({ trait: t.key, value: 80 + i, name: `P${i}`, teamId: i, attributes: flat(80 + i) }));
    expect(traitScore('QB', picks)).toBeGreaterThan(80);
    const best = bestPossible('QB', [[flat(70)], [flat(99)], [flat(80)], [flat(60)], [flat(90)]]);
    expect(best).toBeCloseTo(82.8, 1);
    const r = gradeTraitBuild('QB', picks, best, 'seed');
    expect(r.traits).toHaveLength(5);
    expect(gradeTraitBuild('QB', picks, best, 'seed')).toEqual(r);
    expect(() => gradeTraitBuild('QB', picks.slice(1), best, 'seed')).toThrow();
  });
});

describe('daily + streaks', () => {
  it('uses Eastern time for the daily reset', () => {
    expect(dailyDateET(new Date('2026-09-29T03:59:00Z'))).toBe('2026-09-28');
    expect(dailyDateET(new Date('2026-09-29T04:01:00Z'))).toBe('2026-09-29');
    expect(dailySeed('17-0', '2026-09-29')).toBe('daily:17-0:2026-09-29');
  });
  it('counts consecutive days ending today or yesterday', () => {
    expect(computeStreak(['2026-09-27', '2026-09-28', '2026-09-29'], '2026-09-29')).toBe(3);
    expect(computeStreak(['2026-09-27', '2026-09-28'], '2026-09-29')).toBe(2);
    expect(computeStreak(['2026-09-25', '2026-09-27'], '2026-09-29')).toBe(0);
    expect(computeStreak([], '2026-09-29')).toBe(0);
    expect(longestStreak(['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-10', '2026-09-11'])).toBe(3);
    expect(longestStreak(['2026-09-30', '2026-10-01', '2026-10-01'])).toBe(2);
    expect(longestStreak(['2026-03-07', '2026-03-08', '2026-03-09'])).toBe(3); // across the DST change
    expect(longestStreak([])).toBe(0);
  });
});

describe('schedule', () => {
  it('matches the record and is deterministic', async () => {
    const { buildSchedule } = await import('@/lib/game/seventeen');
    for (const w of [0, 5, 12, 17]) {
      const s = buildSchedule(`x${w}`, w, 85, ['KC', 'BUF', 'DAL']);
      expect(s).toHaveLength(17);
      expect(s.filter((g) => g.win).length).toBe(w);
      for (const g of s) { expect(g.win ? g.us > g.them : g.us < g.them).toBe(true); expect(g.them).toBeGreaterThanOrEqual(0); }
      expect(buildSchedule(`x${w}`, w, 85, ['KC'])).toEqual(buildSchedule(`x${w}`, w, 85, ['KC']));
    }
  });
});
