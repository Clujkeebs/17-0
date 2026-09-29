import type { Attributes, PositionGroup } from './attributes';
import { DEFAULT_FORMULAS, letterGrade, ratePlayer, type FormulaKey, type Weights } from './formulas';
import { clamp, createRng } from './prng';
import { buildNarrative } from './narrative';

export const SLOTS = ['QB', 'RB', 'WRTE', 'DEF', 'K', 'HC'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABELS: Record<Slot, string> = { QB: 'QB', RB: 'RB', WRTE: 'WR/TE', DEF: 'DEF', K: 'K', HC: 'HC' };
export const SLOT_WEIGHTS: Record<Slot, number> = { QB: 0.25, DEF: 0.25, RB: 0.15, WRTE: 0.15, K: 0.05, HC: 0.15 };
export const TEAMS_PER_GAME = 6;
export const MAX_RESPINS = 2;

export function slotAccepts(slot: Slot, group: PositionGroup | 'HC'): boolean {
  switch (slot) {
    case 'QB': return group === 'QB';
    case 'RB': return group === 'RB';
    case 'WRTE': return group === 'WR' || group === 'TE';
    case 'DEF': return ['DL', 'EDGE', 'LB', 'CB', 'S'].includes(group);
    case 'K': return group === 'K';
    case 'HC': return group === 'HC';
  }
}

/** Spin produces 6 teams plus MAX_RESPINS reserves, all deterministic from the seed. */
export function spinTeams(seed: string, teamIds: readonly number[]): { teams: number[]; reserves: number[] } {
  const order = createRng(`spin:${seed}`).shuffle([...teamIds].sort((a, b) => a - b));
  return { teams: order.slice(0, TEAMS_PER_GAME), reserves: order.slice(TEAMS_PER_GAME, TEAMS_PER_GAME + MAX_RESPINS) };
}

export interface Pick {
  slot: Slot;
  teamId: number;
  name: string;
  group: PositionGroup | 'HC';
  attributes?: Attributes;
  coachImpact?: number;
  overall?: number;
}

export interface SlotResult { slot: Slot; name: string; teamId: number; grade: number; letter: string }
export interface SeventeenResult {
  slots: SlotResult[];
  teamStrength: number;
  wins: number;
  losses: number;
  pointDiff: number;
  narrative: string[];
  score: number;
}

export function gradePick(p: Pick, formulas: Record<FormulaKey, Weights> = DEFAULT_FORMULAS): number {
  if (p.slot === 'HC') return clamp(p.coachImpact ?? 60, 0, 99);
  return ratePlayer(p.attributes ?? {}, p.group as PositionGroup, formulas);
}

export function gradeRoster(
  seed: string,
  picks: Pick[],
  formulas: Record<FormulaKey, Weights> = DEFAULT_FORMULAS,
  slotWeights: Record<Slot, number> = SLOT_WEIGHTS,
): SeventeenResult {
  const slots = SLOTS.map((slot) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const grade = gradePick(p, formulas);
    return { slot, name: p.name, teamId: p.teamId, grade, letter: letterGrade(grade) };
  });
  const wsum = SLOTS.reduce((s, k) => s + slotWeights[k], 0);
  const teamStrength = Math.round((slots.reduce((s, r) => s + r.grade * slotWeights[r.slot], 0) / wsum) * 10) / 10;
  const rng = createRng(`grade:${seed}`);
  const jitter = rng.int(-2, 3);
  const wins = clamp(Math.round((teamStrength / 99) * 14 + jitter), 0, 17);
  const losses = 17 - wins;
  const pointDiff = Math.round((wins - 8.5) * 19 + rng.int(-25, 25));
  const narrative = buildNarrative(seed, slots, wins, losses, pointDiff);
  // Leaderboard score: wins dominate, strength breaks ties.
  const score = wins * 1000 + Math.round(teamStrength * 10);
  return { slots, teamStrength, wins, losses, pointDiff, narrative, score };
}
