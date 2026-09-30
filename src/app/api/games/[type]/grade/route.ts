import { z } from 'zod';
import { auth } from '@/auth';
import { isGameType } from '@/lib/server/games';
import { GradeError, gradeBuildAPlayer, gradeSeventeen } from '@/lib/server/grading';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp, rateLimit } from '@/lib/server/rate-limit';
import { ATTRIBUTE_KEYS } from '@/lib/game/attributes';
import { enqueueOgImage } from '@/lib/server/queue';

export const runtime = 'nodejs';

const Base = z.object({ sessionId: z.string().uuid(), token: z.string().min(10).max(100) });
const Seventeen = Base;
const Build = Base.extend({
  choices: z.partialRecord(z.enum(ATTRIBUTE_KEYS as [string, ...string[]]), z.number().int().min(0).max(7)),
});

export async function POST(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isGameType(type)) return errorJson(404, 'Unknown game.');
  const limited = await limitByIp(req, 'grade');
  if (limited) return limited;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  if (userId) {
    const r = await rateLimit('gradeUser', userId);
    if (!r.ok) { const res = errorJson(429, 'That is a lot of rosters. Take a breather.'); res.headers.set('Retry-After', String(r.retryAfter)); return res; }
  }
  const raw = await req.json().catch(() => null);
  try {
    const ctx = (b: z.infer<typeof Base>) => ({ sessionId: b.sessionId, token: b.token, userId, username: session?.user?.username ?? null });
    let out;
    if (type === '17-0') {
      const b = Seventeen.safeParse(raw);
      if (!b.success) return errorJson(400, 'Fill all six slots before grading.');
      out = await gradeSeventeen(ctx(b.data));
    } else {
      const b = Build.safeParse(raw);
      if (!b.success) return errorJson(400, 'Choose a source for every attribute.');
      out = await gradeBuildAPlayer(ctx(b.data), b.data.choices);
    }
    void enqueueOgImage(out.id).catch(() => {});
    return json({ ...out, savedToLeaderboard: !!userId && out.daily });
  } catch (e) {
    if (e instanceof GradeError) return errorJson(e.status, e.message);
    console.error('[grade]', e);
    return errorJson(500, 'Grading failed. Your picks are still on this page, try again.');
  }
}
