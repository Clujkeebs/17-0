import type { Attributes, PositionGroup } from './attributes';
import { DEFAULT_FORMULAS, letterGrade, ratePlayer, type FormulaKey, type Weights } from './formulas';
import { clamp, createRng } from './prng';
import { buildNarrative } from './narrative';

// Roster matches the StickToTheModel 17-0 format: QB, RB, WR, TE, one defender, head coach.
export const SLOTS = ['QB', 'RB', 'WR', 'TE', 'DEF', 'HC'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABELS: Record<Slot, string> = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', DEF: 'DEF', HC: 'HC' };
export const SLOT_WEIGHTS: Record<Slot, number> = { QB: 0.25, DEF: 0.2, RB: 0.15, WR: 0.15, TE: 0.1, HC: 0.15 };
export const TEAMS_PER_GAME = 6;
export const MAX_RESPINS = 2;
export const WIN_FLOOR = 60;
export const WIN_SPAN = 27;

export function slotAccepts(slot: Slot, group: PositionGroup | 'HC'): boolean {
  switch (slot) {
    case 'QB': return group === 'QB';
    case 'RB': return group === 'RB';
    case 'WR': return group === 'WR';
    case 'TE': return group === 'TE';
    case 'DEF': return ['DL', 'EDGE', 'LB', 'CB', 'S'].includes(group);
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
  schedule: GameLine[];
}

export interface GameLine { week: number; opp: string; home: boolean; us: number; them: number; win: boolean }

const SCORES = [3, 6, 7, 10, 13, 14, 16, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35, 38, 41, 42, 45];

/** A plausible 17-game schedule consistent with the projected record. Deterministic per seed. */
export function buildSchedule(seed: string, wins: number, strength: number, opponents: readonly string[]): GameLine[] {
  const rng = createRng(`sched:${seed}`);
  const results = rng.shuffle([...Array(wins).fill(true), ...Array(17 - wins).fill(false)] as boolean[]);
  const opps = rng.shuffle(opponents.length ? opponents : ['OPP']);
  const edge = clamp((strength - 70) / 25, 0, 1); // better teams win bigger
  return results.map((win, i) => {
    const margin = win ? 1 + Math.floor(rng.next() * (6 + edge * 18)) : 1 + Math.floor(rng.next() * (16 - edge * 9));
    let winner = SCORES[rng.int(7, SCORES.length - 1)];
    let loser = Math.max(0, winner - margin);
    if (!SCORES.includes(loser)) loser = SCORES.reduce((b, v) => (Math.abs(v - loser) < Math.abs(b - loser) && v < winner ? v : b), 0);
    if (loser >= winner) { winner = loser + 3; }
    return { week: i + 1, opp: opps[i % opps.length], home: rng.next() < 0.5, us: win ? winner : loser, them: win ? loser : winner, win };
  });
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
  opponents: readonly string[] = [],
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
  // Calibrated so a well-built roster (every pick a star) goes 17-0 roughly one time in eleven.
  const jitter = rng.int(-2, 1);
  const wins = clamp(Math.round(((teamStrength - WIN_FLOOR) / WIN_SPAN) * 17 + jitter), 0, 17);
  const losses = 17 - wins;
  const schedule = buildSchedule(seed, wins, teamStrength, opponents);
  const pointDiff = schedule.reduce((d, g) => d + g.us - g.them, 0);
  const narrative = buildNarrative(seed, slots, wins, losses, pointDiff);
  // Leaderboard score: wins dominate, strength breaks ties.
  const score = wins * 1000 + Math.round(teamStrength * 10);
  return { slots, teamStrength, wins, losses, pointDiff, narrative, score, schedule };
}
