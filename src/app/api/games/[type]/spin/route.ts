import { z } from 'zod';
import { auth } from '@/auth';
import { createGameSession, fantasyReady, isGameType, todaysResult } from '@/lib/server/games';
import { DraftError, draftState, pickPlayer, respinCurrent } from '@/lib/server/draft';
import { ChallengeError, challengeStart } from '@/lib/server/challenges';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { BUILD_POSITIONS } from '@/lib/game/build';
import { FORMAT_KEYS, POOL_KEYS } from '@/lib/game/seventeen';

export const runtime = 'nodejs';

const Auth = { sessionId: z.string().uuid(), token: z.string().min(10).max(100) };
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), daily: z.boolean().optional(), hard: z.boolean().optional(), position: z.enum(BUILD_POSITIONS).optional(), format: z.enum(FORMAT_KEYS).optional(), pool: z.enum(POOL_KEYS).optional(), challenge: z.string().min(6).max(24).optional() }),
  z.object({ action: z.literal('respin'), ...Auth }),
  z.object({ action: z.literal('pick'), ...Auth, playerId: z.string().max(60), slot: z.string().max(8).optional(), trait: z.string().max(20).optional() }),
]);

/**
 * Draft endpoint. `start` opens a session and reveals the first team. `pick` drafts a player from the team
 * on the clock and reveals the next one. `respin` swaps the team on the clock (two per game).
 */
export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isGameType(type)) return errorJson(404, 'Unknown game.');
  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse({ action: 'start', ...raw });
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const body = parsed.data;
  try {
    if (body.action === 'respin') return json(await respinCurrent(body.sessionId, body.token, type));
    if (body.action === 'pick') return json(await pickPlayer(body.sessionId, body.token, type, body.playerId, body.slot, body.trait));
    const limited = await limitByIp(req, 'spin');
    if (limited) return limited;
    if (body.challenge) {
      if (type !== '17-0') return errorJson(400, 'Challenges are for 17-0 here.');
      const c = await challengeStart(body.challenge, '17-0');
      const format = c.setup.format as (typeof FORMAT_KEYS)[number], pool = c.setup.pool as (typeof POOL_KEYS)[number];
      if (format === 'fantasy' && !(await fantasyReady())) return errorJson(503, 'Fantasy points are still loading. Try again in a few minutes.');
      const session = await auth().catch(() => null);
      const { session: s, token, payload } = await createGameSession({ gameType: type, userId: session?.user?.id, hard: c.setup.hard, format, pool, challenge: c });
      return json({ ...(await draftState(s.id, type, payload)), token, daily: false, date: null, position: null, challenge: c.challengeId });
    }
    if (type === 'build-a-player' && !body.position) return errorJson(400, 'Pick a position first.');
    if (body.format === 'fantasy' && !body.daily && !(await fantasyReady())) return errorJson(503, 'Fantasy points are still loading. Try a ratings game for now.');
    const session = await auth().catch(() => null);
    if (body.daily) {
      // Today is ranked: account required, one attempt per game per day.
      if (!session?.user?.id) return errorJson(401, 'Sign in to play Today. It is ranked.', { requireAccount: true });
      const done = await todaysResult(session.user.id, type);
      if (done) return errorJson(409, 'You already played Today. Casual is unlimited.', { resultId: done });
    }
    const { session: s, token, payload } = await createGameSession({ gameType: type, userId: session?.user?.id, daily: body.daily, hard: body.hard, position: body.position, format: body.format, pool: body.pool });
    return json({ ...(await draftState(s.id, type, payload)), token, daily: s.isDaily, date: s.dailyDate, position: payload.position ?? null });
  } catch (e) {
    if (e instanceof DraftError || e instanceof ChallengeError) return errorJson(e.status, e.message);
    console.error('[spin]', (e as Error).message);
    return errorJson(503, 'The reel jammed. Try again in a moment.');
  }
}
