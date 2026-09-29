export const runtime = 'nodejs';

import { z } from 'zod';
import { clientIp, errorJson, hashIp, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { subscribe, SUBSCRIBE_MESSAGE } from '@/lib/server/newsletter';

const Body = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  source: z.string().trim().max(64).regex(/^[a-z0-9_:/-]*$/i).optional(),
});

export async function POST(req: Request) {
  const limited = await limitByIp(req, 'newsletter');
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'That does not look like an email address.');
  try {
    await subscribe({
      email: parsed.data.email,
      source: parsed.data.source ?? null,
      ipHash: hashIp(clientIp(req)),
      referrer: req.headers.get('referer'),
    });
  } catch (e) {
    console.error('[newsletter:subscribe]', (e as Error).message);
    return errorJson(500, 'That did not work. Try again in a minute.');
  }
  // Identical response for new, pending, confirmed, and previously unsubscribed addresses.
  return json({ ok: true, message: SUBSCRIBE_MESSAGE });
}
