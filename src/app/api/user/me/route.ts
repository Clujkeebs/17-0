export const runtime = 'nodejs';

import { auth } from '@/auth';
import { getUserById, nameStyleOf } from '@/lib/server/account';
import { json } from '@/lib/server/request';
import { giftsFor } from '@/lib/shop';
import { notify } from '@/lib/server/notifications';

/** What the header needs: who is signed in, their picture and their name style. Never cached. */
export async function GET() {
  const s = await auth().catch(() => null);
  const u = s?.user?.id ? await getUserById(s.user.id) : null;
  // A gift waiting for this player: tell them once (the bell dedupes by kind and ref).
  const gift = u ? giftsFor(u.username) : null;
  if (u && gift) await notify(u.id, 'gift', gift.items.join(','), 'You got a gift', `${gift.note} Equip them in the shop.`, '/shop');
  const body = u
    ? { signedIn: true, username: u.username, name: u.name || u.username || 'Player', image: u.image, style: nameStyleOf(u) }
    : { signedIn: false };
  return json(body, { headers: { 'cache-control': 'private, no-store' } });
}
