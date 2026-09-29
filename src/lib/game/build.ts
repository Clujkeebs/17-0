import type { AttributeKey, Attributes } from './attributes';
import { DEFAULT_FORMULAS, applyWeights, letterGrade, type Weights } from './formulas';
import { clamp, createRng } from './prng';

export const BUILD_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'EDGE', 'LB', 'CB', 'S'] as const;
export type BuildPosition = (typeof BUILD_POSITIONS)[number];
export const BUILD_TEAMS = 5;

export const BUILD_CATEGORIES: Record<BuildPosition, AttributeKey[]> = {
  QB: ['throwPower', 'throwAccuracyShort', 'throwAccuracyMid', 'throwAccuracyDeep', 'throwUnderPressure', 'throwOnTheRun', 'playAction', 'awareness', 'speed', 'agility'],
  RB: ['speed', 'acceleration', 'agility', 'carrying', 'breakTackle', 'jukeMove', 'trucking', 'bcVision', 'catching'],
  WR: ['speed', 'acceleration', 'catching', 'catchInTraffic', 'spectacularCatch', 'routeRunning', 'release', 'awareness', 'jumping'],
  TE: ['speed', 'catching', 'catchInTraffic', 'routeRunning', 'runBlock', 'passBlock', 'strength', 'awareness'],
  EDGE: ['speed', 'acceleration', 'strength', 'blockShedding', 'powerMoves', 'finesseMoves', 'pursuit', 'tackle', 'playRecognition'],
  LB: ['speed', 'tackle', 'hitPower', 'pursuit', 'playRecognition', 'zoneCoverage', 'manCoverage', 'blockShedding', 'awareness'],
  CB: ['speed', 'acceleration', 'agility', 'manCoverage', 'zoneCoverage', 'press', 'playRecognition', 'catching', 'jumping'],
  S: ['speed', 'zoneCoverage', 'manCoverage', 'playRecognition', 'tackle', 'hitPower', 'pursuit', 'catching', 'awareness'],
};

/** Which site position groups are eligible in the Build a Player pool for each build position. */
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
  rating: number;
  letter: string;
  stats: StatLine[];
  score: number;
}

export function gradeBuild(position: BuildPosition, sources: BuildSource[], choices: BuildChoices, seed: string): BuildResult {
  const attributes = assemble(position, sources, choices);
  const rating = buildRating(position, attributes);
  return { attributes, rating, letter: letterGrade(rating), stats: simulateSeason(position, attributes, seed), score: Math.round(rating * 10) };
}
