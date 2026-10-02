export const runtime = 'nodejs';

import { z } from 'zod';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { clientIp, errorJson, hashIp, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().max(1000).default(''),
  page: z.string().trim().max(200).regex(/^\/[^\s]*$/).optional(),
  // Honeypot: people never see this field, bots fill it in.
  website: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const limited = await limitByIp(req, 'feedback');
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Pick a rating from 1 to 5. Notes can be up to 1000 characters.');
  const { rating, message, page, website } = parsed.data;
  if (website) return json({ ok: true });
  const s = await auth().catch(() => null);
  try {
    await db.insert(schema.feedback).values({ rating, message, page: page ?? null, userId: s?.user?.id ?? null, ipHash: hashIp(clientIp(req)) });
  } catch (e) {
    console.error('[feedback]', (e as Error).message);
    return errorJson(500, 'That did not send. Try again in a minute.');
  }
  // One JSON line per response so the hourly review can read them straight from the web logs.
  console.log(`[feedback] ${JSON.stringify({ rating, page: page ?? null, signedIn: !!s?.user?.id, message })}`);
  return json({ ok: true });
}
