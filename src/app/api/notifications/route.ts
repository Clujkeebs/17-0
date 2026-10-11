export const runtime = 'nodejs';

import { auth } from '@/auth';
import { errorJson, json } from '@/lib/server/request';
import { listNotifications, markAllRead } from '@/lib/server/notifications';

/** The header bell: latest notifications and the unread count. Signed-in players only; never cached. */
export async function GET() {
  const s = await auth().catch(() => null);
  if (!s?.user?.id) return json({ items: [], unread: 0 }, { headers: { 'cache-control': 'private, no-store' } });
  return json(await listNotifications(s.user.id), { headers: { 'cache-control': 'private, no-store' } });
}

/** Opening the bell marks everything read. */
export async function POST() {
  const s = await auth().catch(() => null);
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  await markAllRead(s.user.id);
  return json({ ok: true });
}
