import { clamp, createRng } from './prng';
import { letterGrade } from './formulas';
import { lastName } from '@/lib/names';

/**
 * 162-0 (MLB). Each round spins an era, then a franchise; you take one player from that franchise in that era
 * for one of eleven spots. Grades come from real season stats (MLB's public Stats API) measured against that
 * season's league, not video game ratings. Hitters can be moved between fielding spots until the season is
 * played; pitchers stay on the mound.
 */

export const MLB_SLOTS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'] as const;
export type MlbSlot = (typeof MLB_SLOTS)[number];
export const MLB_SLOT_NAMES: Record<MlbSlot, string> = {
  C: 'Catcher', '1B': 'First base', '2B': 'Second base', '3B': 'Third base', SS: 'Shortstop',
  LF: 'Left field', CF: 'Center field', RF: 'Right field', DH: 'Designated hitter', SP: 'Starting pitcher', RP: 'Relief pitcher',
};
export const PITCH_SLOTS: MlbSlot[] = ['SP', 'RP'];
export const isPitchSlot = (s: MlbSlot) => s === 'SP' || s === 'RP';

export const MLB_ERAS = [
  { key: '1970s', label: "'70s", from: 1970, to: 1979 },
  { key: '1980s', label: "'80s", from: 1980, to: 1989 },
  { key: '1990s', label: "'90s", from: 1990, to: 1999 },
  { key: '2000s', label: "'00s", from: 2000, to: 2009 },
  { key: '2010s', label: "'10s", from: 2010, to: 2019 },
  { key: '2020s', label: "'20s", from: 2020, to: 2029 },
] as const;
export type MlbEraKey = (typeof MLB_ERAS)[number]['key'];
export const mlbEraOf = (key: string) => MLB_ERAS.find((e) => e.key === key);
export const MLB_FIRST_SEASON = 1970;

export const MLB_ROUNDS = MLB_SLOTS.length;
export const MLB_ERA_RESPINS = 2;
export const MLB_TEAM_RESPINS = 2;

/** What a season was: an everyday hitter, a starter or a reliever. */
export type MlbKind = 'bat' | 'sp' | 'rp';

/** Spots a listed position plays without a penalty. */
export function mlbNaturalSlots(position: string, kind: MlbKind): MlbSlot[] {
  if (kind === 'sp') return ['SP'];
  if (kind === 'rp') return ['RP'];
  const p = position.toUpperCase();
  const map: Record<string, MlbSlot[]> = { C: ['C'], '1B': ['1B'], '2B': ['2B'], '3B': ['3B'], SS: ['SS'], LF: ['LF'], CF: ['CF'], RF: ['RF'], OF: ['LF', 'CF', 'RF'], DH: ['DH'] };
  return map[p] ?? ['DH'];
}

const INFIELD = new Set(['2B', '3B', 'SS']);
const OUTFIELD = new Set(['LF', 'CF', 'RF']);

/**
 * Share of value kept when a player plays a spot. Hitters only play hitting spots and pitchers only pitch.
 * Nearby moves cost a little (short to second, center to a corner), a catcher's spot is hard to fill, and an
 * infielder in the outfield (or the reverse) costs more. Anyone can DH or play first at a small cost.
 */
export function mlbFit(position: string, kind: MlbKind, slot: MlbSlot): number {
  const natural = mlbNaturalSlots(position, kind);
  if (kind !== 'bat') return !isPitchSlot(slot) ? 0 : natural.includes(slot) ? 1 : kind === 'sp' ? 0.9 : 0.75;
  if (isPitchSlot(slot)) return 0;
  if (natural.includes(slot)) return 1;
  const from = natural[0];
  if (slot === 'DH') return 0.97;
  if (slot === '1B') return 0.93;
  if (slot === 'C' || from === 'C') return 0.75;
  if (INFIELD.has(from) && INFIELD.has(slot)) return from === 'SS' ? 0.96 : 0.9;
  if (OUTFIELD.has(from) && OUTFIELD.has(slot)) return from === 'CF' ? 0.97 : 0.92;
  if (from === '1B' || from === 'DH') return 0.8;
  return 0.84;
}

export interface BatLine { pa: number; ops: number; hr: number; sb: number; avg: number; obp: number; slg: number; rbi: number }
export interface PitchLine { gs: number; g: number; ip: number; era: number; so: number; sv: number; w: number; whip: number }
export interface LeagueNorms { ops: number; era: number }

/** Value of a hitter's season on a 40-99 scale: OPS against the league that year, playing time, speed, and how hard his spot is to fill. */
export function batValue(s: BatLine, lg: LeagueNorms, position: string): number {
  const pos: Record<string, number> = { C: 8, SS: 6, '2B': 4, CF: 4, '3B': 2, RF: 0, LF: -1, OF: 0, '1B': -3, DH: -6 };
  const opsPlus = (s.ops / (lg.ops || 0.72) - 1) * 100;
  const raw = opsPlus + (s.pa - 450) / 25 + s.sb / 5 + (pos[position.toUpperCase()] ?? 0);
  const sample = clamp(s.pa / 400, 0, 1);
  return Math.round(clamp(70 + raw * 0.6, 40, 99) * sample * 10 + 50 * (1 - sample) * 10) / 10;
}

/** Value of a pitcher's season on a 40-99 scale: ERA against the league that year, innings (starters) or saves (relievers), strikeouts. */
export function pitchValue(s: PitchLine, lg: LeagueNorms, kind: 'sp' | 'rp'): number {
  const eraPlus = s.era > 0 ? ((lg.era || 4) / s.era - 1) * 100 : 60;
  const kRate = s.ip > 0 ? s.so / s.ip : 0;
  if (kind === 'sp') {
    const raw = Math.min(eraPlus, 120) + (s.ip - 150) / 6 + (kRate - 0.8) * 20;
    const sample = clamp(s.ip / 140, 0, 1);
    return Math.round(clamp(70 + raw * 0.5, 40, 99) * sample * 10 + 50 * (1 - sample) * 10) / 10;
  }
  const raw = Math.min(eraPlus, 150) * 0.8 + s.sv * 0.5 + (kRate - 0.9) * 20 + (s.ip - 60) / 8;
  const sample = clamp(s.ip / 50, 0, 1);
  return Math.round(clamp(66 + raw * 0.4, 40, 99) * sample * 10 + 50 * (1 - sample) * 10) / 10;
}

/** A season only counts as a draftable line with real playing time. */
export function kindOf(bat: BatLine | null, pitch: PitchLine | null): MlbKind | null {
  if (pitch && pitch.gs >= 12 && pitch.ip >= 80) return 'sp';
  if (pitch && pitch.gs < 6 && pitch.g >= 30 && pitch.ip >= 35) return 'rp';
  if (bat && bat.pa >= 250) return 'bat';
  return null;
}

export const mlbSeasonLabel = (season: number) => String(season);

export interface MlbPick { slot: MlbSlot; name: string; position: string; kind: MlbKind; teamId: number; season: number; value: number }
export interface MlbSlotResult extends MlbPick { fit: number; grade: number; letter: string }
export interface MlbResult { slots: MlbSlotResult[]; teamStrength: number; wins: number; losses: number; narrative: string[]; score: number }

export const MLB_WIN_FLOOR_DEFAULT = 70;
export const MLB_WIN_SPAN = 24;
/** Pitching matters: a starter counts double, the closer one and a half. */
const SLOT_WEIGHT: Partial<Record<MlbSlot, number>> = { SP: 2, RP: 1.5 };

export function gradeMlbRoster(seed: string, picks: MlbPick[], winFloor = MLB_WIN_FLOOR_DEFAULT): MlbResult {
  const slots = MLB_SLOTS.map((slot) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const fit = mlbFit(p.position, p.kind, slot);
    if (fit === 0) throw new Error(`${p.name} cannot play ${slot}.`);
    const grade = Math.round(p.value * fit * 10) / 10;
    return { ...p, fit, grade, letter: letterGrade(grade) };
  });
  const totalW = slots.reduce((s, r) => s + (SLOT_WEIGHT[r.slot] ?? 1), 0);
  const teamStrength = Math.round((slots.reduce((s, r) => s + r.grade * (SLOT_WEIGHT[r.slot] ?? 1), 0) / totalW) * 10) / 10;
  const rng = createRng(`mlb:${seed}`);
  const wins = clamp(Math.round(((teamStrength - winFloor) / MLB_WIN_SPAN) * 162 + rng.int(-5, 4)), 0, 162);
  return { slots, teamStrength, wins, losses: 162 - wins, narrative: mlbNarrative(seed, slots, wins), score: wins * 1000 + Math.min(999, Math.round(teamStrength * 10)) };
}

function mlbNarrative(seed: string, slots: MlbSlotResult[], wins: number): string[] {
  const rng = createRng(`mlbstory:${seed}`);
  const sorted = [...slots].sort((a, b) => b.grade - a.grade);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const ace = slots.find((s) => s.slot === 'SP')!;
  const misfit = slots.find((s) => s.fit < 0.9);
  return [
    rng.pick([
      `${lastName(best.name)} carried the lineup card. His ${best.season} season graded ${best.grade.toFixed(1)}, best on the roster.`,
      `Every series started with a plan for ${lastName(best.name)}. Most of them failed.`,
    ]),
    ace.grade >= 85 ? `${lastName(ace.name)} took the ball every fifth day and the bullpen got the night off.` : `${lastName(ace.name)} at the top of the rotation was the worry all summer.`,
    misfit ? `${lastName(misfit.name)} played ${misfit.slot}, which is not his spot. It cost him ${Math.round((1 - misfit.fit) * 100)} percent of his value.` : `${lastName(worst.name)} at ${worst.slot} was the soft spot, and good teams found it.`,
    wins === 162 ? 'One hundred sixty-two and zero. It has never been close to done. You did it.'
      : wins >= 116 ? `${wins} wins. Mentioned with the 1906 Cubs and the 2001 Mariners.`
      : wins >= 95 ? `${wins} wins. A division title and a real October run.`
      : wins >= 81 ? `${wins} wins. Over .500, in the wild card hunt to the last week.`
      : `${wins} wins. A long summer.`,
  ];
}
