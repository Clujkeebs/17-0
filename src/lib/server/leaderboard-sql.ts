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
