export const runtime = 'nodejs';

import { z } from 'zod';
import { auth } from '@/auth';
import { getUserById } from '@/lib/server/account';
import { audit } from '@/lib/server/audit';
import { DropError, claimDrop } from '@/lib/server/drops';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';
import { invalidatePrefix } from '@/lib/server/redis';
import { shopItem } from '@/lib/shop';
import { queueBadgeSync } from '@/lib/server/badges';

const Body = z.object({ dropId: z.string().uuid() });

/** Claim the live drop. Signed-in players only; the window is checked on the database clock. */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return errorJson(401, 'Sign in to claim a drop.');
  if (!(await rateLimit('shopUser', userId)).ok) return errorJson(429, 'Slow down a little and try again.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const user = await getUserById(userId);
  if (!user) return errorJson(401, 'Sign in to claim a drop.');
  try {
    const { itemKey } = await claimDrop(userId, user.email, parsed.data.dropId);
    await audit(userId, 'drop.claim', 'item', itemKey).catch(() => {});
    await invalidatePrefix('lb:').catch(() => {});
    void queueBadgeSync(userId);
    return json({ ok: true, itemKey, label: shopItem(itemKey)?.label ?? itemKey });
  } catch (e) {
    if (e instanceof DropError) return errorJson(e.status, e.message);
    console.error('[drops] claim', (e as Error).message);
    return errorJson(503, 'The shop is not responding. Try again in a moment.');
  }
}
