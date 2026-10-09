import type { Attributes, PositionGroup } from './attributes';
import { DEFAULT_FORMULAS, letterGrade, ratePlayer, type FormulaKey, type Weights } from './formulas';
import { clamp, createRng } from './prng';
import { buildNarrative } from './narrative';
import { FANTASY_FLOOR_DEFAULT, FANTASY_SPAN, fantasyGrade } from './fantasy';

// Roster matches the StickToTheModel 17-0 format: QB, RB, WR, TE, one defender, head coach.
export const SLOTS = ['QB', 'RB', 'WR', 'TE', 'DEF', 'HC'] as const;
export type Slot = (typeof SLOTS)[number];
export const SLOT_LABELS: Record<string, string> = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', DEF: 'DEF', HC: 'HC' };
// Weights follow how much each spot moves a real NFL offense: quarterback first, then the receivers and backs
// who touch the ball, with tight end and head coach mattering least. A 97 WR with a 90 TE beats the reverse.
export const SLOT_WEIGHTS: Record<Slot, number> = { QB: 0.3, WR: 0.22, RB: 0.18, DEF: 0.13, HC: 0.09, TE: 0.08 };
export const TEAMS_PER_GAME = 6;
export const MAX_RESPINS = 2;
export const WIN_FLOOR = 68.8;
export const WIN_SPAN = 26;

/* ------------------------------------------------------------------ Roster formats */

/**
 * Roster size: the classic six, or a fuller 12 or 16 man roster. One spin per slot, one pick per team.
 * 'fantasy' is the Fantasy edition: a seven-man fantasy lineup scored on real PPR points, not ratings.
 */
export type FormatKey = '6' | '12' | '16' | '53' | 'fantasy';
export const FORMAT_KEYS: FormatKey[] = ['6', '12', '16', '53', 'fantasy'];
/** Player pool: today's rosters, or today's rosters plus each franchise's all-time greats. */
export type PoolKey = 'current' | 'all-time';
export const POOL_KEYS: PoolKey[] = ['current', 'all-time'];

type Group = PositionGroup | 'HC';
export interface SlotDef { key: string; label: string; hint: string; accepts: readonly Group[]; weight: number }
export interface FormatDef {
  name: string; slots: readonly SlotDef[]; winFloor: number; winSpan: number; scoring?: 'ratings' | 'fantasy';
  /** Re-rolls for this roster size (default MAX_RESPINS). */
  respins?: number;
  /** More spins than franchises: teams come around again (each player still only once). */
  repeatTeams?: boolean;
}
const DEFENDERS = ['DL', 'EDGE', 'LB', 'CB', 'S'] as const;
const s = (key: string, label: string, hint: string, accepts: readonly Group[], weight: number): SlotDef => ({ key, label, hint, accepts, weight });

/**
 * The full 53: three quarterbacks down to the punter, plus a head coach. Each position's depth
 * chart weighs the starters and gives the backups a sliver, so a bad QB3 costs a little and a bad QB1 a lot.
 * Weights are normalized to sum to 1.
 */
const DEPTH_53: [Group, string, string, number[]][] = [
  ['QB', 'QB', 'Quarterback', [0.15, 0.02, 0.006]],
  ['RB', 'RB', 'Running back', [0.045, 0.018, 0.008, 0.005]],
  ['WR', 'WR', 'Wide receiver', [0.05, 0.04, 0.03, 0.012, 0.006, 0.004]],
  ['TE', 'TE', 'Tight end', [0.03, 0.01, 0.004]],
  ['OL', 'OL', 'Offensive lineman', [0.027, 0.027, 0.025, 0.025, 0.023, 0.008, 0.006, 0.004, 0.004]],
  ['DL', 'DT', 'Defensive tackle', [0.03, 0.025, 0.008, 0.005]],
  ['EDGE', 'EDGE', 'Edge rusher', [0.045, 0.035, 0.01, 0.006, 0.004]],
  ['LB', 'LB', 'Linebacker', [0.03, 0.025, 0.01, 0.006, 0.004, 0.004]],
  ['CB', 'CB', 'Cornerback', [0.04, 0.03, 0.015, 0.008, 0.005, 0.004]],
  ['S', 'S', 'Safety', [0.03, 0.025, 0.008, 0.005, 0.004]],
  ['K', 'K', 'Kicker', [0.008]],
  ['K', 'P', 'Punter', [0.005]],
];
const SLOTS_53: SlotDef[] = (() => {
  const raw = [...DEPTH_53.flatMap(([g, key, hint, ws]) => ws.map((w, i) => s(ws.length > 1 ? `${key}${i + 1}` : key, ws.length > 1 ? `${key}${i + 1}` : key, i === 0 ? hint : `${hint} (backup)`, [g], w))),
    s('HC', 'HC', 'Head coach', ['HC'], 0.04)];
  const total = raw.reduce((a, d) => a + d.weight, 0);
  return raw.map((d) => ({ ...d, weight: d.weight / total }));
})();

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
    name: '12-man roster', winFloor: 68.55, winSpan: WIN_SPAN,
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
    name: '16-man roster', winFloor: 68.8, winSpan: WIN_SPAN,
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
  // The full 53 (plus a coach): 54 spins, teams repeat, five re-rolls. The floor is refit by the worker.
  '53': { name: '53-man roster', winFloor: 66, winSpan: WIN_SPAN, slots: SLOTS_53, respins: 5, repeatTeams: true },
  // Fantasy: team strength is total points per week, so weights are not used. The floor is recalibrated
  // by the worker after every points sync and passed in at grading time.
  fantasy: {
    name: 'Fantasy lineup', winFloor: FANTASY_FLOOR_DEFAULT, winSpan: FANTASY_SPAN, scoring: 'fantasy',
    slots: [
      s('QB', 'QB', 'Quarterback', ['QB'], 1), s('RB1', 'RB1', 'Running back', ['RB'], 1), s('RB2', 'RB2', 'Running back', ['RB'], 1),
      s('WR1', 'WR1', 'Wide receiver', ['WR'], 1), s('WR2', 'WR2', 'Wide receiver', ['WR'], 1), s('TE', 'TE', 'Tight end', ['TE'], 1),
      s('FLEX', 'FLEX', 'RB, WR or TE', ['RB', 'WR', 'TE'], 1),
    ],
  },
};
export const respinsFor = (format: FormatKey = '6') => FORMATS[format].respins ?? MAX_RESPINS;

/**
 * The teams on the clock for a game, plus the re-roll reserves. Small formats use each franchise once; the 53
 * walks through fresh shuffles of the league so every team comes up about equally often and never twice in a row.
 */
export function boardOrder(seed: string, pool: readonly number[], format: FormatKey = '6'): { teams: number[]; reserves: number[] } {
  const rng = createRng(`spin:${seed}`);
  const sorted = [...pool].sort((a, b) => a - b);
  const count = FORMATS[format].slots.length, extra = respinsFor(format);
  if (!FORMATS[format].repeatTeams) {
    const order = rng.shuffle(sorted);
    return { teams: order.slice(0, count), reserves: order.slice(count, count + extra) };
  }
  const seq: number[] = [];
  while (seq.length < count + extra) {
    const next = rng.shuffle(sorted);
    if (seq.length && next[0] === seq[seq.length - 1]) next.push(next.shift()!);
    seq.push(...next);
  }
  return { teams: seq.slice(0, count), reserves: seq.slice(count, count + extra) };
}
export const isFantasy = (format: FormatKey) => FORMATS[format].scoring === 'fantasy';
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
  /** Fantasy edition: blended PPR points per game. */
  fantasy?: number;
  /** All-time legend from ESPN history: his graded best season with the franchise (no Madden attributes). */
  legendGrade?: number;
}

export interface SlotResult { slot: string; name: string; teamId: number; grade: number; letter: string; points?: number }
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
  if (p.fantasy !== undefined) return fantasyGrade(p.fantasy, p.group);
  if (p.slot === 'HC') return clamp(p.coachImpact ?? 60, 0, 99);
  if (p.legendGrade !== undefined) return p.legendGrade;
  return ratePlayer(p.attributes ?? {}, p.group as PositionGroup, formulas);
}

export function gradeRoster(
  seed: string,
  picks: Pick[],
  formulas: Record<FormulaKey, Weights> = DEFAULT_FORMULAS,
  slotWeights: Record<Slot, number> = SLOT_WEIGHTS,
  opponents: readonly string[] = [],
  format: FormatKey = '6',
  winFloor?: number,
): SeventeenResult {
  const fmt = FORMATS[format];
  const fantasy = isFantasy(format);
  const floor = winFloor ?? fmt.winFloor;
  // The classic format takes its weights from config; bigger rosters use their own.
  const weightOf = (key: string) => (format === '6' ? slotWeights[key as Slot] : slotDef(key, format)!.weight);
  const slots = fmt.slots.map(({ key: slot }) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const grade = gradePick(p, formulas);
    return { slot, name: p.name, teamId: p.teamId, grade, letter: letterGrade(grade), ...(fantasy ? { points: p.fantasy ?? 0 } : {}) };
  });
  const wsum = fmt.slots.reduce((s, d) => s + weightOf(d.key), 0);
  // Fantasy strength is the lineup's points per week; everything else is the weighted average grade.
  const teamStrength = fantasy
    ? Math.round(slots.reduce((s, r) => s + (r.points ?? 0), 0) * 10) / 10
    : Math.round((slots.reduce((s, r) => s + r.grade * weightOf(r.slot), 0) / wsum) * 10) / 10;
  const rng = createRng(`grade:${seed}`);
  // Calibrated so a well-built roster (every pick a star) goes 17-0 roughly one time in eight.
  const jitter = rng.int(-2, 1);
  const wins = clamp(Math.round(((teamStrength - floor) / fmt.winSpan) * 17 + jitter), 0, 17);
  const losses = 17 - wins;
  const schedule = buildSchedule(seed, wins, fantasy ? 70 + wins : teamStrength, opponents);
  const pointDiff = schedule.reduce((d, g) => d + g.us - g.them, 0);
  const narrative = buildNarrative(seed, slots, wins, losses, pointDiff);
  // Leaderboard score: wins dominate, strength breaks ties.
  const score = wins * 1000 + Math.min(999, Math.round(teamStrength * (fantasy ? 5 : 10)));
  return { slots, teamStrength, wins, losses, pointDiff, narrative, score, schedule };
}
