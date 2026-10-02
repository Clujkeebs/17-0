export const runtime = 'nodejs';

import { auth } from '@/auth';
import { getUserById, nameStyleOf } from '@/lib/server/account';
import { json } from '@/lib/server/request';

/** What the header needs: who is signed in, their picture and their name style. Never cached. */
export async function GET() {
  const s = await auth().catch(() => null);
  const u = s?.user?.id ? await getUserById(s.user.id) : null;
  const body = u
    ? { signedIn: true, username: u.username, name: u.name || u.username || 'Player', image: u.image, style: nameStyleOf(u) }
    : { signedIn: false };
  return json(body, { headers: { 'cache-control': 'private, no-store' } });
}
