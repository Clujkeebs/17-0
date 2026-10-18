import { sql as dsql } from 'drizzle-orm';
import { gameResults } from '@/db/schema';

/**
 * All-time points: one per 17-0 win, rating / 10 for Build a Player (and any other scored game).
 *
 * Both NULL sources are coalesced: `wins` and `rating` are absent from mini-game result rows, and
 * without the guard `sum(...)` returns NULL for a player with only mini results. Postgres sorts
 * NULL first on DESC, so that player would top the board with a blank score.
 */
export const allTimePointsExpr = dsql<number>`sum(coalesce(case when ${gameResults.gameType} = '17-0' then (${gameResults.resultData}->>'wins')::int else round((coalesce(${gameResults.resultData}->>'rating', '0'))::numeric / 10) end, 0))::int`;

/* ------------------------------------------------------------------ Undefeated */

/** The draft games that have a perfect season, and how many games a season is. */
export const SEASON_GAMES: Record<string, number> = { '17-0': 17, '82-0': 82, '162-0': 162, '44-0': 44 };
export const hasUndefeated = (slug: string): boolean => Object.prototype.hasOwnProperty.call(SEASON_GAMES, slug);

/**
 * Casual perfect seasons that count toward the board in one Eastern day, per game. Every ranked (Today) one counts.
 * The same cap as the points for Casual perfects, so a script cannot farm the board with unlimited replays.
 */
export const CASUAL_PERFECTS_PER_DAY = 5;

/** A result that won every game of its season: 17-0, 82-0, 162-0 or 44-0 (the wins are compared as text, so no cast can fail on another game's row). */
export const perfectResult = dsql`(${dsql.join(Object.entries(SEASON_GAMES).map(([game, n]) => dsql`(game_type = ${game} and result_data->>'wins' = ${String(n)})`), dsql` or `)})`;

/**
 * One row per perfect season by a signed-in player (flagged results never count), with `nth`: its place among that
 * player's results of the same kind (Today or Casual) in the same game on the same Eastern day. Narrow it with `extra`.
 */
export const perfectSeasonRows = (extra = dsql`true`) => dsql`
  select user_id, coalesce(username, 'anonymous') as username, game_type, is_daily, created_at,
         row_number() over (partition by user_id, game_type, is_daily, (created_at at time zone 'America/New_York')::date order by created_at) as nth
  from game_results
  where user_id is not null and not flagged and ${perfectResult} and ${extra}`;

/** Which of those rows count: every Today one, and Casual ones up to the daily cap. */
export const countedPerfect = dsql`(is_daily or nth <= ${CASUAL_PERFECTS_PER_DAY})`;
