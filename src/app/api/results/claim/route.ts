import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
const Body = z.object({ runs: z.array(z.object({ id: z.string().uuid(), sessionId: z.string().uuid(), token: z.string().min(8).max(200) })).max(20) });
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

/**
 * Moves runs finished while signed out onto the signed-in account. A run moves only when the caller holds that
 * game's session token and the run has no owner yet. Casual runs only: Today needs an account to start with.
 */
export async function POST(req: Request) {
  const limited = await limitByIp(req, 'claim');
  if (limited) return limited;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return errorJson(401, 'Sign in first.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const runs = parsed.data.runs;
  if (!runs.length) return json({ claimed: [] });
  const [user] = await db.select({ username: schema.users.username }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const sessions = await db.select({ id: schema.gameSessions.id, token: schema.gameSessions.token }).from(schema.gameSessions).where(inArray(schema.gameSessions.id, runs.map((r) => r.sessionId)));
  const claimed: string[] = [];
  for (const r of runs) {
    const s = sessions.find((x) => x.id === r.sessionId);
    if (!s || s.token !== hash(r.token)) continue;
    const done = await db.update(schema.gameResults).set({ userId, username: user?.username ?? null })
      .where(and(eq(schema.gameResults.id, r.id), eq(schema.gameResults.sessionId, r.sessionId), isNull(schema.gameResults.userId), eq(schema.gameResults.isDaily, false)))
      .returning({ id: schema.gameResults.id });
    if (done.length) {
      claimed.push(r.id);
      await db.update(schema.gameSessions).set({ userId }).where(and(eq(schema.gameSessions.id, r.sessionId), isNull(schema.gameSessions.userId)));
    }
  }
  if (claimed.length) console.log(`[claim] ${claimed.length} guest run(s) saved to an account`);
  return json({ claimed });
}
