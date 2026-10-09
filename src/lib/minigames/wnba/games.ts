import type { NbaGameData } from '../nba/data';
import { hoopsGames, valueAt } from '../nba/games';

/**
 * WNBA stat games on ESPN's WNBA history, the same four games as the NBA. WNBA seasons are shorter and
 * per-game numbers lower, so "good season" cut-offs come from where a season ranks, not fixed values.
 */
const cuts = new WeakMap<NbaGameData, { ok: number; good: number; star: number }>();
const W = hoopsGames({
  sport: 'wnba', prefix: 'wnba', league: 'WNBA', she: 'she', stars: 80,
  names: { hl: 'Higher or Lower: WNBA', br: 'Blind Résumé: WNBA', led: 'Who Led? WNBA', team: 'Whose Team? WNBA' },
  cuts: (data) => {
    let c = cuts.get(data);
    if (!c) { c = { ok: valueAt(data, 0.55), good: valueAt(data, 0.75), star: valueAt(data, 0.88) }; cuts.set(data, c); }
    return c;
  },
});
export const wnbaHigherLower = W.higherLower;
export const wnbaBlindResume = W.blindResume;
export const wnbaWhoLed = W.whoLed;
export const wnbaWhoseTeam = W.whoseTeam;

/** Registered WNBA mini games, in hub order. */
export const wnbaGames = [wnbaHigherLower, wnbaBlindResume, wnbaWhoLed, wnbaWhoseTeam];
