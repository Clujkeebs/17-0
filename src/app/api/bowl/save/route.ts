export const runtime = 'nodejs';

import { auth } from '@/auth';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';
import { deleteSave, getSave, putSave } from '@/lib/server/bowl';

const PRIVATE = { headers: { 'cache-control': 'private, no-store' } };

/** Your GM save on this account (so a league follows you between devices). */
export async function GET() {
  const s = await auth().catch(() => null);
  if (!s?.user?.id) return json({ league: null }, PRIVATE);
  return json({ league: await getSave(s.user.id) }, PRIVATE);
}

export async function PUT(req: Request) {
  const s = await auth().catch(() => null);
  if (!s?.user?.id) return errorJson(401, 'Sign in to save to your account.');
  if (!(await rateLimit('bowlSave', s.user.id)).ok) return errorJson(429, 'Saving too often. Your league is still saved in this browser.');
  const r = await putSave(s.user.id, await req.text());
  return 'error' in r ? errorJson(400, r.error) : json(r, PRIVATE);
}

export async function DELETE() {
  const s = await auth().catch(() => null);
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  await deleteSave(s.user.id);
  return json({ ok: true }, PRIVATE);
}
