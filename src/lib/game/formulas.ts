import type { AttributeKey, Attributes, PositionGroup } from './attributes';
import { clamp } from './prng';

export type Weights = Partial<Record<AttributeKey, number>>;
export type FormulaKey = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DL' | 'LB' | 'CB' | 'S';

/** Default rating formulas. Admin overrides are stored in game_configs (key "formulas"). */
export const DEFAULT_FORMULAS: Record<FormulaKey, Weights> = {
  QB: { throwPower: 0.15, throwAccuracyDeep: 0.2, throwAccuracyMid: 0.15, throwUnderPressure: 0.15, awareness: 0.15, speed: 0.1, playAction: 0.1 },
  RB: { speed: 0.2, acceleration: 0.15, carrying: 0.2, breakTackle: 0.15, jukeMove: 0.1, bcVision: 0.2 },
  WR: { catching: 0.25, routeRunning: 0.2, speed: 0.2, release: 0.15, catchInTraffic: 0.1, awareness: 0.1 },
  TE: { catching: 0.2, catchInTraffic: 0.15, runBlock: 0.2, speed: 0.15, routeRunning: 0.15, awareness: 0.15 },
  DL: { blockShedding: 0.25, powerMoves: 0.2, finesseMoves: 0.2, tackle: 0.15, pursuit: 0.1, playRecognition: 0.1 },
  LB: { tackle: 0.2, pursuit: 0.2, playRecognition: 0.2, zoneCoverage: 0.15, manCoverage: 0.1, hitPower: 0.15 },
  CB: { manCoverage: 0.25, zoneCoverage: 0.2, speed: 0.2, agility: 0.15, playRecognition: 0.1, press: 0.1 },
  S: { zoneCoverage: 0.2, manCoverage: 0.15, playRecognition: 0.2, tackle: 0.15, hitPower: 0.15, speed: 0.15 },
  K: { kickPower: 0.5, kickAccuracy: 0.5 },
};

export function formulaFor(group: PositionGroup): FormulaKey {
  switch (group) {
    case 'EDGE': case 'DL': return 'DL';
    case 'OL': return 'TE';
    default: return group as FormulaKey;
  }
}

export function applyWeights(attrs: Attributes, weights: Weights): number {
  let sum = 0, total = 0;
  for (const [k, w] of Object.entries(weights) as [AttributeKey, number][]) {
    sum += (attrs[k] ?? 50) * w;
    total += w;
  }
  return total === 0 ? 0 : Math.round(clamp(sum / total, 0, 99) * 10) / 10;
}

export function ratePlayer(attrs: Attributes, group: PositionGroup, formulas = DEFAULT_FORMULAS): number {
  return applyWeights(attrs, formulas[formulaFor(group)] ?? DEFAULT_FORMULAS[formulaFor(group)]);
}

export interface CoachInputs {
  teamRosterAvgOvr: number;
  recent3yrWinPct: number; // 0..1
  playoffAppearances3yr: number;
  superBowlWins: number;
  yearsWithTeam: number;
}

export function coachImpact(c: CoachInputs): number {
  return Math.round(clamp(
    c.teamRosterAvgOvr * 0.35 + c.recent3yrWinPct * 35 + c.playoffAppearances3yr * 3 + c.superBowlWins * 6 + c.yearsWithTeam * 0.5,
    0, 99,
  ));
}

export function letterGrade(score: number): string {
  if (score >= 93) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 84) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 76) return 'B';
  if (score >= 72) return 'B-';
  if (score >= 68) return 'C+';
  if (score >= 64) return 'C';
  if (score >= 60) return 'C-';
  if (score >= 55) return 'D';
  return 'F';
}
