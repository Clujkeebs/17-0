import { clamp, createRng, seasonWins, softTop } from './prng';
import { letterGrade } from './formulas';
import { lastName } from '@/lib/names';

/**
 * 82-0 (NBA). Each round spins an era, then a franchise; you take one player from that franchise in that era
 * and slot him at PG, SG, SF, PF or C. Players can be moved between slots until the season is simulated.
 * Classic grades on real per-game stats from the player's best season with that franchise in that era.
 */

export const NBA_SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
export type NbaSlot = (typeof NBA_SLOTS)[number];
export const NBA_SLOT_NAMES: Record<NbaSlot, string> = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' };

export const ERAS = [
  // ESPN's stats start with 1984-85, so the '80s are 1985 to 1989.
  { key: '1980s', label: "'80s", from: 1985, to: 1989 },
  { key: '1990s', label: "'90s", from: 1990, to: 1999 },
  { key: '2000s', label: "'00s", from: 2000, to: 2009 },
  { key: '2010s', label: "'10s", from: 2010, to: 2019 },
  { key: '2020s', label: "'20s", from: 2020, to: 2029 },
] as const;
export type EraKey = (typeof ERAS)[number]['key'];
export const eraOf = (key: string) => ERAS.find((e) => e.key === key);
export const isEra = (x: unknown): x is EraKey => typeof x === 'string' && ERAS.some((e) => e.key === x);
/** ESPN labels a season by the year it ends: 1996 is 1995-96. */
export const seasonLabel = (season: number) => `${season - 1}-${String(season % 100).padStart(2, '0')}`;

export const NBA_ROUNDS = NBA_SLOTS.length;
/** Like the original 82-0: each era can be drafted from once, so five picks cover all five eras. */
export const ERA_PICKS_MAX = 1;
/** Two re-spins for the era and two for the team, per game (one each felt too tight once every era can only be used once). Hard mode has none. */
export const ERA_RESPINS = 2;
export const TEAM_RESPINS = 2;

/** Slots a listed position plays naturally. Combo listings cover both. */
/** A season with this many assists a game runs an offense: he plays the point with no cost (Jokic, LeBron, Magic). */
export const PLAYMAKER_APG = 7;

export function naturalSlots(position: string, apg?: number | null): NbaSlot[] {
  const own = listedSlots(position);
  return apg != null && apg >= PLAYMAKER_APG && !own.includes('PG') ? ['PG', ...own] : own;
}

function listedSlots(position: string): NbaSlot[] {
  const p = position.toUpperCase().replace(/\s/g, '');
  const map: Record<string, NbaSlot[]> = {
    PG: ['PG'], SG: ['SG'], SF: ['SF'], PF: ['PF'], C: ['C'],
    G: ['PG', 'SG'], F: ['SF', 'PF'], GF: ['SG', 'SF'], 'G-F': ['SG', 'SF'], 'F-G': ['SG', 'SF'],
    FC: ['PF', 'C'], 'F-C': ['PF', 'C'], 'C-F': ['PF', 'C'], 'PG-SG': ['PG', 'SG'], 'SG-SF': ['SG', 'SF'], 'SF-PF': ['SF', 'PF'], 'PF-C': ['PF', 'C'],
  };
  return map[p] ?? ['SF'];
}

/**
 * Playing out of position costs a share of the player's value: one spot over (a shooting guard at the point)
 * costs a little, two or more spots (a center at guard) costs a lot. This is what makes moving players matter.
 */
export function fitMultiplier(position: string, slot: NbaSlot, apg?: number | null): number {
  const nat = naturalSlots(position, apg).map((s) => NBA_SLOTS.indexOf(s));
  const d = Math.min(...nat.map((i) => Math.abs(i - NBA_SLOTS.indexOf(slot))));
  return d === 0 ? 1 : d === 1 ? 0.94 : d === 2 ? 0.82 : 0.7;
}

export interface SeasonLine { gp: number; mpg: number; ppg: number; rpg: number; apg: number; spg: number; bpg: number; tov: number | null; fgPct: number | null; tpPct?: number | null; ftPct?: number | null }

/**
 * One number per player-season, on a 40-99 scale. It is a box-score composite in the spirit of Hollinger's
 * game score: scoring, boards, assists and stocks count, turnovers subtract, efficiency above league norms
 * adds. Tiny samples are pulled toward replacement level. The top of the scale is bent (softTop) so only the
 * greatest seasons ever land near 99: a star's good year and his best year read differently.
 */
export function seasonValue(s: SeasonLine): number {
  const tov = s.tov ?? 0.12 * (s.ppg + s.apg);
  const eff = s.fgPct != null && s.ppg >= 5 ? (s.fgPct - 0.46) * 40 : 0;
  // Shooting beyond the field goal: great three-point and free-throw shooters (Reggie Miller) score more per shot
  // than FG% shows. Attempts are not stored, so a low three-point rate never counts against anyone.
  const scorer = s.ppg >= 10;
  const three = scorer && s.tpPct != null ? Math.min(3.5, Math.max(0, s.tpPct - 0.35) * 30) : 0;
  const line = scorer && s.ftPct != null ? clamp((s.ftPct - 0.77) * 15, -1.5, 2.5) : 0;
  const raw = s.ppg + 1.2 * s.rpg + 1.5 * s.apg + 2.5 * s.spg + 2 * s.bpg - 1.5 * tov + eff + three + line;
  const sample = clamp(s.gp / 40, 0, 1);
  return Math.round(clamp(softTop(50 + raw * 1.02), 40, 99) * sample * 10 + 50 * (1 - sample) * 10) / 10;
}

export interface NbaPick { slot: NbaSlot; name: string; position: string; teamId: number; season: number; value: number; /** That season's assists a game: 7+ plays the point at no cost. */ apg?: number | null }
export interface NbaSlotResult { slot: NbaSlot; name: string; position: string; teamId: number; season: number; value: number; fit: number; grade: number; letter: string }
export interface NbaResult { slots: NbaSlotResult[]; teamStrength: number; /** Team strength that locks in 82-0. */ perfectAt?: number; wins: number; losses: number; narrative: string[]; score: number }

export const NBA_WIN_FLOOR_DEFAULT = 70;
export const NBA_WIN_SPAN = 24;

export function gradeNbaRoster(seed: string, picks: NbaPick[], winFloor = NBA_WIN_FLOOR_DEFAULT): NbaResult {
  const slots = NBA_SLOTS.map((slot) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const fit = fitMultiplier(p.position, slot, p.apg);
    const grade = Math.round(p.value * fit * 10) / 10;
    return { slot, name: p.name, position: p.position, teamId: p.teamId, season: p.season, value: p.value, fit, grade, letter: letterGrade(grade) };
  });
  const teamStrength = Math.round((slots.reduce((s, r) => s + r.grade, 0) / slots.length) * 10) / 10;
  const rng = createRng(`nba:${seed}`);
  const jitter = rng.int(-3, 2);
  const wins = seasonWins(((teamStrength - winFloor) / NBA_WIN_SPAN) * 82, 82, jitter);
  const perfectAt = Math.round((winFloor + NBA_WIN_SPAN) * 10) / 10;
  const losses = 82 - wins;
  return { slots, teamStrength, wins, losses, perfectAt, narrative: nbaNarrative(seed, slots, wins), score: wins * 1000 + Math.min(999, Math.round(teamStrength * 10)) };
}

const last = lastName;
function nbaNarrative(seed: string, slots: NbaSlotResult[], wins: number): string[] {
  const rng = createRng(`nbastory:${seed}`);
  const sorted = [...slots].sort((a, b) => b.grade - a.grade);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const misfit = slots.find((s) => s.fit < 0.9);
  const out = [
    rng.pick([
      `${last(best.name)} was the engine. His ${seasonLabel(best.season)} season at ${best.slot} graded ${best.grade.toFixed(1)}, best on the floor.`,
      `Everything ran through ${last(best.name)}. Opponents game-planned for him and lost anyway.`,
    ]),
    misfit
      ? `${last(misfit.name)} spent the year at ${misfit.slot}, which is not his spot. It cost him ${Math.round((1 - misfit.fit) * 100)} percent of his value.`
      : rng.pick([`${last(worst.name)} was the soft spot at ${worst.slot}, and good teams went at him every night.`, `The ${worst.slot} spot was the question all year. ${last(worst.name)} answered it some nights.`]),
    wins === 82 ? 'Eighty-two and zero. Nobody has done it. You did.'
      : wins >= 72 ? `${wins} wins puts this team in the conversation with the greatest ever.`
      : wins >= 55 ? `${wins} wins. A contender, not a dynasty.`
      : wins >= 41 ? `${wins} wins. A playoff team that nobody feared.`
      : `${wins} wins. The lottery odds are looking good.`,
  ];
  return out;
}
