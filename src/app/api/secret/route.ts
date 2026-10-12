export const runtime = 'nodejs';

import { z } from 'zod';
import { auth } from '@/auth';
import { recordSecret } from '@/lib/server/badges';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';

const Body = z.object({ code: z.string().max(20) });

/** A code typed on the site (the old cheat code). Signed-in players only; it records a hidden achievement and pays nothing. */
export async function POST(req: Request) {
  const s = await auth().catch(() => null);
  const userId = s?.user?.id;
  if (!userId) return errorJson(401, 'Sign in first.');
  if (!(await rateLimit('shopUser', userId)).ok) return errorJson(429, 'Slow down a little and try again.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const fresh = await recordSecret(userId, parsed.data.code);
  return json({ ok: true, fresh });
}
