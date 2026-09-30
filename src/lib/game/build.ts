import type { AttributeKey, Attributes } from './attributes';
import { DEFAULT_FORMULAS, applyWeights, letterGrade, type Weights } from './formulas';
import { clamp, createRng } from './prng';

export const BUILD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'EDGE', 'LB', 'CB', 'S'] as const;
export type BuildPosition = (typeof BUILD_POSITIONS)[number];
export const BUILD_TEAMS = 5;

/** Five traits per position, each built from Madden attributes, with a weight in the final score. */
export interface Trait { key: string; label: string; attrs: AttributeKey[]; weight: number; phrase: string }
const T = (key: string, label: string, attrs: AttributeKey[], weight: number, phrase = label.toLowerCase()): Trait => ({ key, label, attrs, weight, phrase });

export const TRAITS: Record<BuildPosition, Trait[]> = {
  QB: [T('arm', 'Arm', ['throwPower'], 0.2, 'arm'), T('accuracy', 'Accuracy', ['throwAccuracyShort', 'throwAccuracyMid'], 0.25), T('mobility', 'Mobility', ['speed', 'agility'], 0.15), T('deep', 'Deep ball', ['throwAccuracyDeep'], 0.15), T('poise', 'Poise', ['throwUnderPressure', 'awareness'], 0.25)],
  RB: [T('speed', 'Speed', ['speed', 'acceleration'], 0.2), T('size', 'Power', ['trucking', 'strength'], 0.15, 'power'), T('vision', 'Vision', ['bcVision'], 0.25), T('elusive', 'Elusiveness', ['breakTackle', 'jukeMove'], 0.2), T('hands', 'Receiving', ['catching'], 0.2, 'receiving')],
  WR: [T('speed', 'Speed', ['speed', 'acceleration'], 0.2), T('hands', 'Hands', ['catching'], 0.2), T('routes', 'Route running', ['routeRunning'], 0.25), T('contested', 'Contested catch', ['catchInTraffic', 'spectacularCatch'], 0.15), T('release', 'Release', ['release'], 0.2)],
  TE: [T('speed', 'Speed', ['speed'], 0.15), T('hands', 'Hands', ['catching'], 0.2), T('routes', 'Route running', ['routeRunning'], 0.25), T('block', 'Blocking', ['runBlock', 'passBlock'], 0.2), T('contested', 'Contested catch', ['catchInTraffic'], 0.2)],
  EDGE: [T('burst', 'Burst', ['acceleration', 'speed'], 0.15), T('power', 'Power rush', ['powerMoves', 'strength'], 0.25), T('finesse', 'Finesse rush', ['finesseMoves'], 0.25), T('shed', 'Block shedding', ['blockShedding'], 0.2), T('pursuit', 'Pursuit', ['pursuit', 'tackle'], 0.15)],
  LB: [T('speed', 'Speed', ['speed'], 0.2), T('tackling', 'Tackling', ['tackle', 'hitPower'], 0.2), T('range', 'Range', ['pursuit'], 0.2), T('coverage', 'Coverage', ['zoneCoverage', 'manCoverage'], 0.2), T('instincts', 'Instincts', ['playRecognition'], 0.2)],
  CB: [T('speed', 'Speed', ['speed', 'agility'], 0.2), T('man', 'Man coverage', ['manCoverage'], 0.3), T('zone', 'Zone coverage', ['zoneCoverage'], 0.2), T('press', 'Press', ['press'], 0.15), T('ball', 'Ball skills', ['catching', 'playRecognition'], 0.15)],
  S: [T('speed', 'Speed', ['speed'], 0.2), T('range', 'Range', ['zoneCoverage'], 0.25), T('man', 'Man coverage', ['manCoverage'], 0.15), T('hit', 'Hitting', ['hitPower', 'tackle'], 0.15), T('instincts', 'Instincts', ['playRecognition', 'awareness'], 0.25)],
};

/** Legacy category list (attribute keys touched by this position's traits). */
export const BUILD_CATEGORIES: Record<BuildPosition, AttributeKey[]> = Object.fromEntries(
  Object.entries(TRAITS).map(([k, ts]) => [k, [...new Set(ts.flatMap((t) => t.attrs))]]),
) as Record<BuildPosition, AttributeKey[]>;

export function traitValue(attrs: Attributes, t: Trait): number {
  return Math.round(t.attrs.reduce((sum, a) => sum + (attrs[a] ?? 50), 0) / t.attrs.length);
}

export interface TraitPick { trait: string; value: number; name: string; teamId: number; attributes: Attributes }

export function traitScore(position: BuildPosition, picks: Pick<TraitPick, 'trait' | 'value'>[]): number {
  let sum = 0;
  for (const t of TRAITS[position]) sum += (picks.find((p) => p.trait === t.key)?.value ?? 0) * t.weight;
  return Math.round(sum * 10) / 10;
}

/** Best possible score from the spun teams: each team gives one trait, best player per team per trait. */
export function bestPossible(position: BuildPosition, teams: Attributes[][]): number {
  const traits = TRAITS[position];
  const m = teams.map((players) => traits.map((t) => Math.max(0, ...players.map((a) => traitValue(a, t)))));
  let best = 0;
  const used = new Array(traits.length).fill(false);
  const go = (i: number, acc: number) => {
    if (i === m.length) { best = Math.max(best, acc); return; }
    for (let j = 0; j < traits.length; j++) if (!used[j]) { used[j] = true; go(i + 1, acc + m[i][j] * traits[j].weight); used[j] = false; }
  };
  go(0, 0);
  return Math.round(best * 10) / 10;
}

export const BUILD_ELIGIBLE: Record<BuildPosition, string[]> = {
  QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], EDGE: ['EDGE'], LB: ['LB'], CB: ['CB'], S: ['S'],
};

const BUILD_FORMULA: Record<BuildPosition, Weights> = {
  QB: DEFAULT_FORMULAS.QB, RB: DEFAULT_FORMULAS.RB, WR: DEFAULT_FORMULAS.WR, TE: DEFAULT_FORMULAS.TE,
  EDGE: DEFAULT_FORMULAS.DL, LB: DEFAULT_FORMULAS.LB, CB: DEFAULT_FORMULAS.CB, S: DEFAULT_FORMULAS.S,
};

export interface BuildSource { name: string; attributes: Attributes }
export type BuildChoices = Partial<Record<AttributeKey, number>>; // category -> index into sources

export function assemble(position: BuildPosition, sources: BuildSource[], choices: BuildChoices): Attributes {
  const out: Attributes = {};
  for (const cat of BUILD_CATEGORIES[position]) {
    const idx = choices[cat];
    if (idx === undefined || idx < 0 || idx >= sources.length) throw new Error(`Missing source for ${cat}`);
    out[cat] = sources[idx].attributes[cat] ?? 50;
  }
  return out;
}

export function buildRating(position: BuildPosition, attrs: Attributes): number {
  // Fill non-chosen formula inputs with the average of chosen values so the formula stays fair.
  const vals = Object.values(attrs).filter((v): v is number => typeof v === 'number');
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 50;
  const filled: Attributes = { ...attrs };
  for (const k of Object.keys(BUILD_FORMULA[position]) as AttributeKey[]) if (filled[k] === undefined) filled[k] = avg;
  return applyWeights(filled, BUILD_FORMULA[position]);
}

export interface StatLine { label: string; value: number; key: string }

const n = (a: Attributes, k: AttributeKey) => (a[k] ?? 60) / 99; // 0..1
const scale = (x: number) => clamp((x - 0.55) / 0.44, 0, 1); // 55 rating is replacement level

export function simulateSeason(position: BuildPosition, attrs: Attributes, seed: string): StatLine[] {
  const rng = createRng(`sim:${seed}`);
  const v = (base: number) => base * (0.94 + rng.next() * 0.1);
  const r = (x: number) => Math.round(x);
  switch (position) {
    case 'QB': {
      const arm = scale((n(attrs, 'throwPower') + n(attrs, 'throwAccuracyDeep') + n(attrs, 'throwAccuracyMid') + n(attrs, 'awareness')) / 4);
      const td = scale((n(attrs, 'throwAccuracyDeep') + n(attrs, 'awareness')) / 2);
      const safe = scale((n(attrs, 'awareness') + n(attrs, 'throwUnderPressure')) / 2);
      const legs = scale((n(attrs, 'speed') + (attrs.agility !== undefined ? n(attrs, 'agility') : n(attrs, 'speed'))) / 2);
      return [
        { key: 'passYds', label: 'Pass Yds', value: r(clamp(v(2600 + arm * 2700), 1800, 5500)) },
        { key: 'passTd', label: 'Pass TD', value: r(clamp(v(12 + td * 38), 6, 55)) },
        { key: 'int', label: 'INT', value: r(clamp(v(18 - safe * 14), 3, 25)) },
        { key: 'rushYds', label: 'Rush Yds', value: r(clamp(v(40 + legs * 820), 0, 900)) },
      ];
    }
    case 'RB': {
      const burst = scale((n(attrs, 'speed') + n(attrs, 'acceleration') + n(attrs, 'bcVision')) / 3);
      const power = scale((n(attrs, 'breakTackle') + n(attrs, 'carrying') + n(attrs, 'trucking')) / 3);
      const hands = scale(n(attrs, 'catching'));
      return [
        { key: 'rushYds', label: 'Rush Yds', value: r(clamp(v(500 + burst * 1100 + power * 350), 300, 2100)) },
        { key: 'ypc', label: 'Yds/Carry x10', value: r(clamp(v(36 + burst * 20), 30, 62)) },
        { key: 'rushTd', label: 'Rush TD', value: r(clamp(v(3 + power * 10 + burst * 5), 1, 22)) },
        { key: 'recYds', label: 'Rec Yds', value: r(clamp(v(80 + hands * 620), 30, 900)) },
        { key: 'fumbles', label: 'Fumbles', value: r(clamp(v(6 - n(attrs, 'carrying') * 5.5), 0, 8)) },
      ];
    }
    case 'WR': case 'TE': {
      const te = position === 'TE';
      const sep = scale((n(attrs, 'speed') + n(attrs, 'routeRunning') + (attrs.release !== undefined ? n(attrs, 'release') : n(attrs, 'routeRunning'))) / 3);
      const hands = scale((n(attrs, 'catching') + n(attrs, 'catchInTraffic')) / 2);
      const k = te ? 0.72 : 1;
      return [
        { key: 'rec', label: 'Receptions', value: r(clamp(v((40 + hands * 75) * k), 20, 140)) },
        { key: 'recYds', label: 'Rec Yds', value: r(clamp(v((450 + sep * 850 + hands * 350) * k), 250, 1950)) },
        { key: 'recTd', label: 'Rec TD', value: r(clamp(v((2 + hands * 7 + sep * 7) * k), 1, 20)) },
        ...(te ? [{ key: 'blockGrade', label: 'Block Grade', value: r(clamp(40 + n(attrs, 'runBlock') * 55, 40, 95)) }] : []),
      ];
    }
    case 'EDGE': {
      const rush = scale((n(attrs, 'powerMoves') + n(attrs, 'finesseMoves') + n(attrs, 'blockShedding') + n(attrs, 'acceleration')) / 4);
      return [
        { key: 'sacks', label: 'Sacks', value: r(clamp(v(2 + rush * 17), 0, 22)) },
        { key: 'pressures', label: 'Pressures', value: r(clamp(v(15 + rush * 75), 5, 100)) },
        { key: 'tackles', label: 'Tackles', value: r(clamp(v(25 + scale(n(attrs, 'tackle')) * 40), 15, 75)) },
        { key: 'ff', label: 'Forced Fumbles', value: r(clamp(v(rush * 5), 0, 7)) },
      ];
    }
    case 'LB': {
      const run = scale((n(attrs, 'tackle') + n(attrs, 'pursuit') + n(attrs, 'playRecognition')) / 3);
      const cov = scale((n(attrs, 'zoneCoverage') + n(attrs, 'manCoverage')) / 2);
      return [
        { key: 'tackles', label: 'Tackles', value: r(clamp(v(60 + run * 110), 40, 175)) },
        { key: 'tfl', label: 'TFL', value: r(clamp(v(3 + run * 14), 1, 20)) },
        { key: 'sacks', label: 'Sacks', value: r(clamp(v(0.5 + scale(n(attrs, 'blockShedding')) * 7), 0, 10)) },
        { key: 'int', label: 'INT', value: r(clamp(v(cov * 5), 0, 6)) },
      ];
    }
    case 'CB': case 'S': {
      const cov = scale((n(attrs, 'manCoverage') + n(attrs, 'zoneCoverage') + n(attrs, 'playRecognition')) / 3);
      const hands = scale(n(attrs, 'catching'));
      const box = scale((n(attrs, 'tackle') + (attrs.hitPower !== undefined ? n(attrs, 'hitPower') : 0.6)) / 2);
      const s = position === 'S';
      return [
        { key: 'int', label: 'INT', value: r(clamp(v(1 + cov * 4 + hands * 3), 0, 11)) },
        { key: 'pd', label: 'Pass Defl', value: r(clamp(v(4 + cov * 18), 2, 26)) },
        { key: 'tackles', label: 'Tackles', value: r(clamp(v((s ? 55 : 35) + box * (s ? 60 : 35)), 25, 130)) },
        { key: 'rating', label: 'Passer Rtg Allowed', value: r(clamp(v(118 - cov * 60), 48, 125)) },
      ];
    }
  }
}

export interface BuildResult {
  attributes: Attributes;
  traits: { key: string; label: string; value: number; weight: number; donor: string; teamId: number }[];
  rating: number;
  best: number;
  letter: string;
  stats: StatLine[];
  score: number;
}

export function gradeTraitBuild(position: BuildPosition, picks: TraitPick[], best: number, seed: string): BuildResult {
  const attributes: Attributes = {};
  const traits = TRAITS[position].map((t) => {
    const p = picks.find((x) => x.trait === t.key);
    if (!p) throw new Error(`Missing trait ${t.key}`);
    for (const a of t.attrs) attributes[a] = p.attributes[a] ?? 50;
    return { key: t.key, label: t.label, value: p.value, weight: t.weight, donor: p.name, teamId: p.teamId };
  });
  const rating = traitScore(position, picks);
  return { attributes, traits, rating, best, letter: letterGrade(rating), stats: simulateSeason(position, attributes, seed), score: Math.round(rating * 10) };
}
