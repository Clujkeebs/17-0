import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { MLB_MODES, MLB_SLOTS } from '@/lib/game/onesixtytwo';
import { dailyDateET } from '@/lib/game/daily';
import { MLB_GAME, MlbError, gradeMlb, moveMlb, pickMlb, respinMlb, startMlb } from '@/lib/server/mlb-game';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const Auth = { sessionId: z.string().uuid(), token: z.string().min(10).max(100) };
const Slot = z.enum(MLB_SLOTS);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), daily: z.boolean().optional(), hard: z.boolean().optional(), mode: z.enum(MLB_MODES as [string, ...string[]]).optional() }),
  z.object({ action: z.literal('respin'), what: z.enum(['era', 'team']), ...Auth }),
  z.object({ action: z.literal('pick'), playerId: z.number().int().positive(), slot: Slot.optional(), ...Auth }),
  z.object({ action: z.literal('move'), from: Slot, to: Slot, ...Auth }),
  z.object({ action: z.literal('grade'), ...Auth }),
]);

/** 162-0 draft endpoint: start, re-spin the era or team, pick, move a player between slots, grade. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const b = parsed.data;
  try {
    if (b.action === 'respin') return json(await respinMlb(b.sessionId, b.token, b.what));
    if (b.action === 'pick') return json(await pickMlb(b.sessionId, b.token, b.playerId, b.slot));
    if (b.action === 'move') return json(await moveMlb(b.sessionId, b.token, b.from, b.to));
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (b.action === 'grade') {
      const limited = await limitByIp(req, 'grade');
      if (limited) return limited;
      if (userId && !(await rateLimit('gradeUser', userId)).ok) return errorJson(429, 'That is a lot of rosters. Take a breather.');
      const out = await gradeMlb({ sessionId: b.sessionId, token: b.token, userId, username: session?.user?.username ?? null });
      return json({ ...out, savedToLeaderboard: !!userId && out.daily });
    }
    const limited = await limitByIp(req, 'spin');
    if (limited) return limited;
    if (b.daily) {
      if (!userId) return errorJson(401, 'Sign in to play Today. It is ranked.', { requireAccount: true });
      const [done] = await db.select({ id: schema.gameResults.id }).from(schema.gameResults)
        .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.gameType, MLB_GAME), eq(schema.gameResults.isDaily, true), eq(schema.gameResults.dailyDate, dailyDateET()))).limit(1);
      if (done) return errorJson(409, 'You already played Today. Casual is unlimited.', { resultId: done.id });
    }
    return json(await startMlb({ userId, daily: b.daily, hard: b.hard, mode: b.mode as 'eras' | 'now' | undefined }));
  } catch (e) {
    if (e instanceof MlbError) return errorJson(e.status, e.message);
    console.error('[162-0]', (e as Error).message);
    return errorJson(503, 'The reel jammed. Try again in a moment.');
  }
}
