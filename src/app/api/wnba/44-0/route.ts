import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { WNBA_MODES, WNBA_SLOTS } from '@/lib/game/fortyfour';
import { dailyDateET } from '@/lib/game/daily';
import { WNBA_GAME, WnbaError, gradeWnba, moveWnba, pickWnba, respinWnba, startWnba } from '@/lib/server/wnba-game';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const Auth = { sessionId: z.string().uuid(), token: z.string().min(10).max(100) };
const Slot = z.enum(WNBA_SLOTS);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), daily: z.boolean().optional(), hard: z.boolean().optional(), mode: z.enum(WNBA_MODES as [string, ...string[]]).optional() }),
  z.object({ action: z.literal('respin'), what: z.enum(['era', 'team']), ...Auth }),
  z.object({ action: z.literal('pick'), playerId: z.number().int().positive(), slot: Slot.optional(), ...Auth }),
  z.object({ action: z.literal('move'), from: Slot, to: Slot, ...Auth }),
  z.object({ action: z.literal('grade'), ...Auth }),
]);

/** 44-0 draft endpoint: start, re-spin the era or team, pick, move a player between slots, grade. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const b = parsed.data;
  try {
    if (b.action === 'respin') return json(await respinWnba(b.sessionId, b.token, b.what));
    if (b.action === 'pick') return json(await pickWnba(b.sessionId, b.token, b.playerId, b.slot));
    if (b.action === 'move') return json(await moveWnba(b.sessionId, b.token, b.from, b.to));
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (b.action === 'grade') {
      const limited = await limitByIp(req, 'grade');
      if (limited) return limited;
      if (userId && !(await rateLimit('gradeUser', userId)).ok) return errorJson(429, 'That is a lot of rosters. Take a breather.');
      const out = await gradeWnba({ sessionId: b.sessionId, token: b.token, userId, username: session?.user?.username ?? null });
      return json({ ...out, savedToLeaderboard: !!userId && out.daily });
    }
    const limited = await limitByIp(req, 'spin');
    if (limited) return limited;
    if (b.daily) {
      if (!userId) return errorJson(401, 'Sign in to play Today. It is ranked.', { requireAccount: true });
      const [done] = await db.select({ id: schema.gameResults.id }).from(schema.gameResults)
        .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.gameType, WNBA_GAME), eq(schema.gameResults.isDaily, true), eq(schema.gameResults.dailyDate, dailyDateET()))).limit(1);
      if (done) return errorJson(409, 'You already played Today. Casual is unlimited.', { resultId: done.id });
    }
    return json(await startWnba({ userId, daily: b.daily, hard: b.hard, mode: b.mode as 'eras' | 'now' | undefined }));
  } catch (e) {
    if (e instanceof WnbaError) return errorJson(e.status, e.message);
    console.error('[44-0]', (e as Error).message);
    return errorJson(503, 'The reel jammed. Try again in a moment.');
  }
}
