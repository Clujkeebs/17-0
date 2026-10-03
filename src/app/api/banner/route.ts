import { getRedis } from '@/lib/server/redis';
import { json } from '@/lib/server/request';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The owner's site-wide message, if one is up. Cached briefly at the edge. */
export async function GET() {
  const text = await getRedis().get('site:banner').catch(() => null);
  return json({ text: text || null }, { cacheSeconds: 30 });
}
