import { eq, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { coachImpact } from '@/lib/game/formulas';
import { invalidatePrefix } from './redis';

const HISTORY_CAP = 104; // two years of weekly recomputes

/**
 * Recompute every coach's impact score from current roster strength and stored record inputs.
 * Coaches without a team (historical) are scored against the league-average roster.
 * Appends to impact_history and returns the number of coaches updated.
 */
export async function recomputeCoachImpact(): Promise<number> {
  const avgRows = await db.select({ teamId: schema.players.teamId, avg: dsql<number>`avg(${schema.players.overallRating})::float` })
    .from(schema.players).where(eq(schema.players.isActive, true)).groupBy(schema.players.teamId);
  const avgs = new Map<number, number>();
  for (const r of avgRows) if (r.teamId != null) avgs.set(r.teamId, Number(r.avg));
  const leagueAvg = avgs.size ? [...avgs.values()].reduce((a, b) => a + b, 0) / avgs.size : 75;

  const coaches = await db.select().from(schema.coaches);
  const at = new Date().toISOString();
  for (const c of coaches) {
    const score = coachImpact({
      teamRosterAvgOvr: c.teamId != null ? avgs.get(c.teamId) ?? leagueAvg : leagueAvg,
      recent3yrWinPct: c.recent3yrWinPct / 1000,
      playoffAppearances3yr: c.playoffAppearances3yr,
      superBowlWins: c.superBowlWins,
      yearsWithTeam: c.yearsWithTeam,
    });
    const impactHistory = [...(c.impactHistory ?? []), { at, score }].slice(-HISTORY_CAP);
    await db.update(schema.coaches).set({ coachImpactScore: score, impactHistory }).where(eq(schema.coaches.id, c.id));
  }
  try { await invalidatePrefix('coaches:'); } catch { /* cache is best-effort */ }
  return coaches.length;
}
