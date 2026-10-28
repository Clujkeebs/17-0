import { createRng, seasonWins } from './prng';
import { letterGrade } from './formulas';
import { lastName } from '@/lib/names';
import { NBA_SLOTS, PLAYMAKER_APG, fitMultiplier, naturalSlots, seasonValue, type NbaSlot, type SeasonLine } from './eightytwo';

/**
 * 44-0 (WNBA). The same game as 82-0 on the league's own history: each round spins an era, then a franchise;
 * you take one player from that franchise in that era and slot him at PG, SG, SF, PF or C. The regular season is
 * 44 games, so a perfect one is 44-0. Eras mode drafts across the league's history; Right now drafts from this
 * season's rosters only.
 */

export const WNBA_GAME = '44-0';
export const WNBA_GAMES = 44;
export const WNBA_SLOTS = NBA_SLOTS;
export type WnbaSlot = NbaSlot;
export const WNBA_SLOT_NAMES: Record<WnbaSlot, string> = { PG: 'Point guard', SG: 'Shooting guard', SF: 'Small forward', PF: 'Power forward', C: 'Center' };
export const WNBA_ROUNDS = WNBA_SLOTS.length;

/** Six seasons an era, so every era has the same depth; the last one stays open as new seasons arrive. */
export const WNBA_ERAS = [
  { key: '1997-2002', label: "'97-'02", from: 1997, to: 2002 },
  { key: '2003-2008', label: "'03-'08", from: 2003, to: 2008 },
  { key: '2009-2014', label: "'09-'14", from: 2009, to: 2014 },
  { key: '2015-2020', label: "'15-'20", from: 2015, to: 2020 },
  { key: '2021-now', label: "'21-now", from: 2021, to: 2099 },
] as const;
export type WnbaEraKey = (typeof WNBA_ERAS)[number]['key'];
/** A spin lands on an era, or on 'now' (this season only) in Right now mode. */
export type WnbaSpin = WnbaEraKey | 'now';
export type WnbaMode = 'eras' | 'now';
export const WNBA_MODES: WnbaMode[] = ['eras', 'now'];
export const wnbaEraOf = (key: string) => WNBA_ERAS.find((e) => e.key === key);
export const isWnbaEra = (x: unknown): x is WnbaEraKey => typeof x === 'string' && WNBA_ERAS.some((e) => e.key === x);
export const isWnbaMode = (x: unknown): x is WnbaMode => x === 'eras' || x === 'now';
/** ESPN names a WNBA season by its calendar year. */
export const wnbaSeasonLabel = (season: number) => String(season);

/** Each era can be drafted from once, so five picks cover all five eras. */
export const WNBA_ERA_PICKS_MAX = 1;
/** Two re-spins for the era and two for the team, per game. Hard mode has none; Right now has no eras to re-spin. */
export const WNBA_ERA_RESPINS = 2;
export const WNBA_TEAM_RESPINS = 2;

/** A player needs this many games with a franchise in a season to show up on its board. */
export const WNBA_MIN_GP = 10;
/** WNBA assists run lower than the NBA's: a forward at five a game runs the offense and plays the point with no cost. */
export const WNBA_PLAYMAKER_APG = 5;
/**
 * ESPN lists a WNBA player as G, F or C and nothing finer. A guard covers both guard spots and a forward both forward
 * spots, but a center covered only C, which put the league's centers (A'ja Wilson) out of position at the four. The
 * WNBA's center is nearly always a power forward too, so a listed C is treated as PF-C: both spots, no cost.
 */
const listedCenter = (position: string) => position.toUpperCase().replace(/\s/g, '') === 'C';
const wnbaListed = (position: string) => (listedCenter(position) ? 'PF-C' : position);
/** The spots a player fills at no cost; a listed center is drafted at C first and can move to PF. */
export const wnbaSlots = (position: string, apg?: number | null): WnbaSlot[] => {
  const slots = naturalSlots(wnbaListed(position), apg, WNBA_PLAYMAKER_APG);
  return listedCenter(position) ? [...slots.filter((s) => s === 'C'), ...slots.filter((s) => s !== 'C')] : slots;
};
export const wnbaFit = (position: string, slot: WnbaSlot, apg?: number | null) => fitMultiplier(wnbaListed(position), slot, apg, WNBA_PLAYMAKER_APG);
export { PLAYMAKER_APG as NBA_PLAYMAKER_APG };

/**
 * One number per player-season on the 40-99 scale 82-0 uses, with the sample cutoff scaled to the season: the
 * league has played anywhere from 22 to 44 games a year, so a full-time player counts in full whatever the year.
 */
export function wnbaValue(line: SeasonLine, seasonGames: number): number {
  return seasonValue(line, Math.max(6, Math.round(seasonGames * 0.5)));
}

export interface WnbaPick { slot: WnbaSlot; name: string; position: string; teamId: number; season: number; value: number; apg?: number | null }
export interface WnbaSlotResult { slot: WnbaSlot; name: string; position: string; teamId: number; season: number; value: number; fit: number; grade: number; letter: string }
export interface WnbaResult { slots: WnbaSlotResult[]; teamStrength: number; /** Lineup strength that locks in 44-0. */ perfectAt?: number; wins: number; losses: number; narrative: string[]; score: number }

/** Strength at which wins start to come, and the strength span from there to a perfect season. */
export const WNBA_FLOOR_DEFAULT = 66;
export const WNBA_WIN_SPAN = 24;

export function gradeWnbaRoster(seed: string, picks: WnbaPick[], winFloor = WNBA_FLOOR_DEFAULT): WnbaResult {
  const slots = WNBA_SLOTS.map((slot) => {
    const p = picks.find((x) => x.slot === slot);
    if (!p) throw new Error(`Missing pick for ${slot}`);
    const fit = wnbaFit(p.position, slot, p.apg);
    const grade = Math.round(p.value * fit * 10) / 10;
    return { slot, name: p.name, position: p.position, teamId: p.teamId, season: p.season, value: p.value, fit, grade, letter: letterGrade(grade) };
  });
  const teamStrength = Math.round((slots.reduce((s, r) => s + r.grade, 0) / slots.length) * 10) / 10;
  const rng = createRng(`wnba:${seed}`);
  const jitter = rng.int(-2, 1);
  const wins = seasonWins(((teamStrength - winFloor) / WNBA_WIN_SPAN) * WNBA_GAMES, WNBA_GAMES, jitter);
  const perfectAt = Math.round((winFloor + WNBA_WIN_SPAN) * 10) / 10;
  return { slots, teamStrength, wins, losses: WNBA_GAMES - wins, perfectAt, narrative: wnbaNarrative(seed, slots, wins), score: wins * 1000 + Math.min(999, Math.round(teamStrength * 10)) };
}

const last = lastName;
function wnbaNarrative(seed: string, slots: WnbaSlotResult[], wins: number): string[] {
  const rng = createRng(`wnbastory:${seed}`);
  const sorted = [...slots].sort((a, b) => b.grade - a.grade);
  const best = sorted[0], worst = sorted[sorted.length - 1];
  const misfit = slots.find((s) => s.fit < 0.9);
  return [
    rng.pick([
      `${last(best.name)} was the engine. Her ${wnbaSeasonLabel(best.season)} season at ${best.slot} graded ${best.grade.toFixed(1)}, best on the floor.`,
      `Everything ran through ${last(best.name)}. Opponents game-planned for her and lost anyway.`,
    ]),
    misfit
      ? `${last(misfit.name)} spent the year at ${misfit.slot}, which is not her spot. It cost her ${Math.round((1 - misfit.fit) * 100)} percent of her value.`
      : rng.pick([`${last(worst.name)} was the soft spot at ${worst.slot}, and good teams went at her every night.`, `The ${worst.slot} spot was the question all year. ${last(worst.name)} answered it some nights.`]),
    wins === WNBA_GAMES ? 'Forty-four and zero. Nobody has done it. You did.'
      : wins >= 38 ? `${wins} wins puts this team in the conversation with the greatest ever.`
      : wins >= 30 ? `${wins} wins. A contender, not a dynasty.`
      : wins >= 22 ? `${wins} wins. A playoff team that nobody feared.`
      : `${wins} wins. The lottery odds are looking good.`,
  ];
}
