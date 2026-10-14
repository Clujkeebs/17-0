import { sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';

type Sport = 'nba' | 'wnba' | 'mlb';

/**
 * Teams a draft can actually land on: those with real player seasons. ESPN and the MLB feed also list exhibition
 * and international sides (a "Brazil" the NBA once played in preseason) that have a team row but no players, and
 * the wheel must never show a team the draw cannot give you.
 */
export async function teamsWithPlayers(sport: Sport, atLeast = 12): Promise<Set<number>> {
  const t = sport === 'nba' ? schema.nbaPlayerSeasons : sport === 'wnba' ? schema.wnbaPlayerSeasons : schema.mlbPlayerSeasons;
  const rows = await db.select({ teamId: t.teamId, n: dsql<number>`count(*)::int` }).from(t).groupBy(t.teamId);
  return new Set(rows.filter((r) => r.n >= atLeast).map((r) => r.teamId));
}
