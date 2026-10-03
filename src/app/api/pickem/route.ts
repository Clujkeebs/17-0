import { z } from 'zod';
import { auth } from '@/auth';
import { PickError, savePick } from '@/lib/server/pickem';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
const Body = z.object({ gameId: z.string().min(1).max(20), pick: z.enum(['home', 'away']) });

/** Save or change a Pick 'em pick. Signed-in players only; locked at kickoff. */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return errorJson(401, 'Sign in to make picks.');
  if (!(await rateLimit('shopUser', userId)).ok) return errorJson(429, 'Slow down a little.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  try { await savePick(userId, parsed.data.gameId, parsed.data.pick); return json({ ok: true }); }
  catch (e) { if (e instanceof PickError) return errorJson(e.status, e.message); console.error('[pickem]', (e as Error).message); return errorJson(503, 'Could not save. Try again.'); }
}
