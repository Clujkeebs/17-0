import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { NBA_SLOTS } from '@/lib/game/eightytwo';
import { dailyDateET } from '@/lib/game/daily';
import { NBA_EDITIONS, NBA_GAME, NbaError, gradeNba, moveNba, pickNba, respinNba, startNba } from '@/lib/server/nba-game';
import { ChallengeError, challengeStart } from '@/lib/server/challenges';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp, rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';

const Auth = { sessionId: z.string().uuid(), token: z.string().min(10).max(100) };
const Slot = z.enum(NBA_SLOTS);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), daily: z.boolean().optional(), hard: z.boolean().optional(), edition: z.enum(NBA_EDITIONS as [string, ...string[]]).optional(), challenge: z.string().min(6).max(24).optional() }),
  z.object({ action: z.literal('respin'), what: z.enum(['era', 'team']), ...Auth }),
  z.object({ action: z.literal('pick'), playerId: z.number().int().positive(), slot: Slot.optional(), ...Auth }),
  z.object({ action: z.literal('move'), from: Slot, to: Slot, ...Auth }),
  z.object({ action: z.literal('grade'), ...Auth }),
]);

/** 82-0 draft endpoint: start, re-spin the era or team, pick, move a player between slots, grade. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const b = parsed.data;
  try {
    if (b.action === 'respin') return json(await respinNba(b.sessionId, b.token, b.what));
    if (b.action === 'pick') return json(await pickNba(b.sessionId, b.token, b.playerId, b.slot));
    if (b.action === 'move') return json(await moveNba(b.sessionId, b.token, b.from, b.to));
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    if (b.action === 'grade') {
      const limited = await limitByIp(req, 'grade');
      if (limited) return limited;
      if (userId && !(await rateLimit('gradeUser', userId)).ok) return errorJson(429, 'That is a lot of rosters. Take a breather.');
      const out = await gradeNba({ sessionId: b.sessionId, token: b.token, userId, username: session?.user?.username ?? null });
      return json({ ...out, savedToLeaderboard: !!userId && out.daily });
    }
    const limited = await limitByIp(req, 'spin');
    if (limited) return limited;
    if (b.challenge) {
      const c = await challengeStart(b.challenge, '82-0');
      return json(await startNba({ userId, hard: c.setup.hard, edition: c.setup.edition as 'classic' | 'standard' | undefined, challenge: c }));
    }
    if (b.daily) {
      if (!userId) return errorJson(401, 'Sign in to play Today. It is ranked.', { requireAccount: true });
      const [done] = await db.select({ id: schema.gameResults.id }).from(schema.gameResults)
        .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.gameType, NBA_GAME), eq(schema.gameResults.isDaily, true), eq(schema.gameResults.dailyDate, dailyDateET()))).limit(1);
      if (done) return errorJson(409, 'You already played Today. Casual is unlimited.', { resultId: done.id });
    }
    return json(await startNba({ userId, daily: b.daily, hard: b.hard, edition: b.edition as 'classic' | 'standard' | undefined }));
  } catch (e) {
    if (e instanceof NbaError || e instanceof ChallengeError) return errorJson(e.status, e.message);
    console.error('[82-0]', (e as Error).message);
    return errorJson(503, 'The reel jammed. Try again in a moment.');
  }
}
