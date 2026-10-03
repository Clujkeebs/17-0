import { z } from 'zod';
import { auth } from '@/auth';
import { getUserById } from '@/lib/server/account';
import { audit } from '@/lib/server/audit';
import { ShopError, buy, equip } from '@/lib/server/points';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';
import { invalidatePrefix } from '@/lib/server/redis';

export const runtime = 'nodejs';

const Kind = z.enum(['font', 'color', 'border', 'banner', 'title', 'flair']);
const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('buy'), item: z.string().min(1).max(40) }),
  z.object({ action: z.literal('equip'), kind: Kind, item: z.string().min(1).max(40).nullable() }),
]);

/** Shop: buy an item with points, or equip / unequip one you own. Signed-in players only. */
export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (!userId) return errorJson(401, 'Sign in to use the shop.');
  if (!(await rateLimit('shopUser', userId)).ok) return errorJson(429, 'Slow down a little and try again.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const user = await getUserById(userId);
  if (!user) return errorJson(401, 'Sign in to use the shop.');
  const b = parsed.data;
  try {
    if (b.action === 'buy') {
      const out = await buy(userId, user.email, b.item);
      await audit(userId, 'shop.buy', 'item', b.item);
      return json({ ok: true, points: out.points });
    }
    await equip(userId, user.email, b.kind, b.item);
    // Names on leaderboards render the new look on the next load.
    await invalidatePrefix('lb:').catch(() => {});
    return json({ ok: true });
  } catch (e) {
    if (e instanceof ShopError) return errorJson(e.status, e.message);
    console.error('[shop]', (e as Error).message);
    return errorJson(503, 'The shop is not responding. Your points are safe. Try again.');
  }
}
