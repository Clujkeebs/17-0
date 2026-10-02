import type { Attributes, PositionGroup } from './attributes';
import { DEFAULT_FORMULAS, letterGrade, ratePlayer, type FormulaKey, type Weights } from './formulas';
import { clamp, createRng } from './prng';
import { buildNarrative } from './narrative';

// Roster matches the StickToTheModel 17-0 format: QB, RB, WR, TE, one defender, head coach.
export const SLOTS = ['QB', 'RB', 'WR', 'TE', 'DEF', 'HC'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABELS: Record<string, string> = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', DEF: 'DEF', HC: 'HC' };
// Weights follow how much each spot moves a real NFL offense: quarterback first, then the receivers and backs
// who touch the ball, with tight end and head coach mattering least. A 97 WR with a 90 TE beats the reverse.
export const SLOT_WEIGHTS: Record<Slot, number> = { QB: 0.3, WR: 0.22, RB: 0.18, DEF: 0.13, HC: 0.09, TE: 0.08 };
export const TEAMS_PER_GAME = 6;
export const MAX_RESPINS = 2;
export const WIN_FLOOR = 67.25;
export const WIN_SPAN = 26;

/* ------------------------------------------------------------------ Roster formats */

/** Roster size: the classic six, or a fuller 12 or 16 man roster. One spin per slot, one pick per team. */
export type FormatKey = '6' | '12' | '16';
export const FORMAT_KEYS: FormatKey[] = ['6', '12', '16'];
/** Player pool: today's rosters, or today's rosters plus each franchise's all-time greats. */
export type PoolKey = 'current' | 'all-time';
export const POOL_KEYS: PoolKey[] = ['current', 'all-time'];

type Group = PositionGroup | 'HC';
export interface SlotDef { key: string; label: string; hint: string; accepts: readonly Group[]; weight: number }
export interface FormatDef { name: string; slots: readonly SlotDef[]; winFloor: number; winSpan: number }
const DEFENDERS = ['DL', 'EDGE', 'LB', 'CB', 'S'] as const;
const s = (key: string, label: string, hint: string, accepts: readonly Group[], weight: number): SlotDef => ({ key, label, hint, accepts, weight });

/**
 * Weights follow positional value: quarterback first, then the players who touch the ball and the ones who
 * protect or chase the quarterback, with tight end and coach smallest. Each format sums to 1. The classic
 * format's live weights come from game_configs (admin-editable); these are its defaults.
 */
export const FORMATS: Record<FormatKey, FormatDef> = {
  '6': {
    name: '6-man roster', winFloor: WIN_FLOOR, winSpan: WIN_SPAN,
    slots: [
      s('QB', 'QB', 'Quarterback', ['QB'], SLOT_WEIGHTS.QB), s('RB', 'RB', 'Running back', ['RB'], SLOT_WEIGHTS.RB),
      s('WR', 'WR', 'Wide receiver', ['WR'], SLOT_WEIGHTS.WR), s('TE', 'TE', 'Tight end', ['TE'], SLOT_WEIGHTS.TE),
      s('DEF', 'DEF', 'Any defender', DEFENDERS, SLOT_WEIGHTS.DEF), s('HC', 'HC', 'Head coach', ['HC'], SLOT_WEIGHTS.HC),
    ],
  },
  // Bigger rosters average out weak spots, so their floors sit higher to keep a perfect draft near 12% 17-0.
  '12': {
    name: '12-man roster', winFloor: 67.75, winSpan: WIN_SPAN,
    slots: [
      s('QB', 'QB', 'Quarterback', ['QB'], 0.2), s('RB', 'RB', 'Running back', ['RB'], 0.1),
      s('WR1', 'WR1', 'Wide receiver', ['WR'], 0.09), s('WR2', 'WR2', 'Wide receiver', ['WR'], 0.07),
      s('TE', 'TE', 'Tight end', ['TE'], 0.05), s('OL', 'OL', 'Offensive lineman', ['OL'], 0.06),
      s('EDGE', 'EDGE', 'Edge rusher', ['EDGE'], 0.08), s('DL', 'DL', 'Defensive tackle', ['DL'], 0.06),
      s('LB', 'LB', 'Linebacker', ['LB'], 0.06), s('CB', 'CB', 'Cornerback', ['CB'], 0.08),
      s('S', 'S', 'Safety', ['S'], 0.06), s('HC', 'HC', 'Head coach', ['HC'], 0.09),
    ],
  },
  '16': {
    name: '16-man roster', winFloor: 68.1, winSpan: WIN_SPAN,
    slots: [
      s('QB', 'QB', 'Quarterback', ['QB'], 0.19), s('RB', 'RB', 'Running back', ['RB'], 0.08),
      s('WR1', 'WR1', 'Wide receiver', ['WR'], 0.07), s('WR2', 'WR2', 'Wide receiver', ['WR'], 0.06), s('WR3', 'WR3', 'Wide receiver', ['WR'], 0.04),
      s('TE', 'TE', 'Tight end', ['TE'], 0.04),
      s('OL1', 'OL1', 'Offensive lineman', ['OL'], 0.05), s('OL2', 'OL2', 'Offensive lineman', ['OL'], 0.04), s('OL3', 'OL3', 'Offensive lineman', ['OL'], 0.04),
      s('EDGE', 'EDGE', 'Edge rusher', ['EDGE'], 0.07), s('DL', 'DL', 'Defensive tackle', ['DL'], 0.05), s('LB', 'LB', 'Linebacker', ['LB'], 0.05),
      s('CB1', 'CB1', 'Cornerback', ['CB'], 0.06), s('CB2', 'CB2', 'Cornerback', ['CB'], 0.04), s('S', 'S', 'Safety', ['S'], 0.05),
      s('HC', 'HC', 'Head coach', ['HC'], 0.07),
    ],
  },
};
export const isFormat = (x: unknown): x is FormatKey => typeof x === 'string' && (FORMAT_KEYS as string[]).includes(x);
export const formatOf = (x: unknown): FormatKey => (isFormat(x) ? x : '6');
export const slotDef = (key: string, format: FormatKey = '6') => FORMATS[format].slots.find((d) => d.key === key);

export function slotAccepts(slot: string, group: Group, format: FormatKey = '6'): boolean {
  return !!slotDef(slot, format)?.accepts.includes(group);
}
/** Slot keys a player of this group can fill, in roster order. */
export function slotsFor(group: Group, format: FormatKey = '6'): string[] {
  return FORMATS[format].slots.filter((d) => d.accepts.includes(group)).map((d) => d.key);
}

/** Spin produces 6 teams plus MAX_RESPINS reserves, all deterministic from the seed. */
export function spinTeams(seed: string, teamIds: readonly number[]): { teams: number[]; reserves: number[] } {
  const order = createRng(`spin:${seed}`).shuffle([...teamIds].sort((a, b) => a - b));
  return { teams: order.slice(0, TEAMS_PER_GAME), reserves: order.slice(TEAMS_PER_GAME, TEAMS_PER_GAME + MAX_RESPINS) };
}

export interface Pick {
  slot: string;
  teamId: number;
  name: string;
  group: PositionGroup | 'HC';
  attributes?: Attributes;
  coachImpact?: number;
  overall?: number;
}

export interface SlotResult { slot: string; name: string; teamId: number; grade: number; letter: string }
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
  format: FormatKey = '6',
): SeventeenResult {
  const fmt = FORMATS[format];
  // The classic format takes its weights from config; bigger rosters use their own.
  const weightOf = (key: string) => (format === '6' ? slotWeights[key as Slot] : slotDef(key, format)!.weight);
  const slots = fmt.slots.map(({ key: slot }) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const grade = gradePick(p, formulas);
    return { slot, name: p.name, teamId: p.teamId, grade, letter: letterGrade(grade) };
  });
  const wsum = fmt.slots.reduce((s, d) => s + weightOf(d.key), 0);
  const teamStrength = Math.round((slots.reduce((s, r) => s + r.grade * weightOf(r.slot), 0) / wsum) * 10) / 10;
  const rng = createRng(`grade:${seed}`);
  // Calibrated so a well-built roster (every pick a star) goes 17-0 roughly one time in eight.
  const jitter = rng.int(-2, 1);
  const wins = clamp(Math.round(((teamStrength - fmt.winFloor) / fmt.winSpan) * 17 + jitter), 0, 17);
  const losses = 17 - wins;
  const schedule = buildSchedule(seed, wins, teamStrength, opponents);
  const pointDiff = schedule.reduce((d, g) => d + g.us - g.them, 0);
  const narrative = buildNarrative(seed, slots, wins, losses, pointDiff);
  // Leaderboard score: wins dominate, strength breaks ties.
  const score = wins * 1000 + Math.round(teamStrength * 10);
  return { slots, teamStrength, wins, losses, pointDiff, narrative, score, schedule };
}
