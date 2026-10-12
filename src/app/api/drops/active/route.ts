export const runtime = 'nodejs';

import { auth } from '@/auth';
import { json } from '@/lib/server/request';
import { activeDrop } from '@/lib/server/drops';
import { ownedKeys } from '@/lib/server/points';
import { shopItem } from '@/lib/shop';

/**
 * Polled by every open tab: is a free drop live right now? Cheap when none is (a cached lookup). `now` is the server
 * clock, so the countdown does not depend on the visitor's clock being right.
 */
export async function GET() {
  const headers = { 'cache-control': 'private, no-store' };
  const drop = await activeDrop().catch(() => null);
  if (!drop) return json({ drop: null, owned: false, signedIn: false, now: Date.now() }, { headers });
  const item = shopItem(drop.itemKey);
  if (!item) return json({ drop: null, owned: false, signedIn: false, now: Date.now() }, { headers });
  const s = await auth().catch(() => null);
  const userId = s?.user?.id;
  const owned = userId ? (await ownedKeys(userId, s?.user?.email).catch(() => new Set<string>())).has(drop.itemKey) : false;
  return json({
    drop: { id: drop.id, itemKey: drop.itemKey, kind: item.kind, label: item.label, blurb: item.blurb ?? null, startsAt: drop.startsAt, endsAt: drop.endsAt },
    owned, signedIn: !!userId, now: Date.now(),
  }, { headers });
}
