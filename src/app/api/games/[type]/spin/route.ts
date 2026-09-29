import { z } from 'zod';
import { auth } from '@/auth';
import { createGameSession, isGameType, publicTeams, respin, type SpinPayload } from '@/lib/server/games';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { BUILD_POSITIONS } from '@/lib/game/build';

export const runtime = 'nodejs';

const Body = z.object({
  daily: z.boolean().optional(),
  position: z.enum(BUILD_POSITIONS).optional(),
  respin: z.object({ sessionId: z.string().uuid(), token: z.string().min(10), index: z.number().int().min(0).max(5) }).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isGameType(type)) return errorJson(404, 'Unknown game.');
  const limited = await limitByIp(req, 'spin');
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const body = parsed.data;
  try {
    if (body.respin) {
      const r = await respin(body.respin.sessionId, body.respin.token, body.respin.index);
      if ('error' in r) return errorJson(409, r.error!);
      const p = r.payload as SpinPayload;
      return json({ teams: await publicTeams(p.teams, type, p.position), respinsLeft: 2 - p.respinsUsed });
    }
    if (type === 'build-a-player' && !body.position) return errorJson(400, 'Pick a position first.');
    const session = await auth().catch(() => null);
    const { session: s, token, payload } = await createGameSession({ gameType: type, userId: session?.user?.id, daily: body.daily, position: body.position });
    return json({
      sessionId: s.id, token, daily: s.isDaily, date: s.dailyDate, position: payload.position ?? null,
      teams: await publicTeams(payload.teams, type, payload.position), respinsLeft: 2,
    });
  } catch (e) {
    console.error('[spin]', (e as Error).message);
    return errorJson(503, 'The reel jammed. Try again in a moment.');
  }
}
