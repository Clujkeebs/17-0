export const runtime = 'nodejs';

import { z } from 'zod';
import { auth } from '@/auth';
import { errorJson, json } from '@/lib/server/request';
import { rateLimit } from '@/lib/server/rate-limit';
import { deleteAccount } from '@/lib/server/account';

const Body = z.object({ confirm: z.literal('DELETE') });

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Type DELETE, in capitals, to confirm.');

  const limit = await rateLimit('delete', s.user.id);
  if (!limit.ok) {
    const r = errorJson(429, 'Already tried that today. Contact us if the account is still there.');
    r.headers.set('Retry-After', String(limit.retryAfter));
    return r;
  }
  try {
    const ok = await deleteAccount(s.user.id);
    if (!ok) return errorJson(404, 'Account not found.');
  } catch (e) {
    console.error('[user:delete]', (e as Error).message);
    return errorJson(500, 'Delete failed and nothing was removed. Try again or email us.');
  }
  return json({ ok: true, message: 'Account deleted.' });
}
