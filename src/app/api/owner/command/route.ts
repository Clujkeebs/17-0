import { z } from 'zod';
import { getQueue, QUEUE_NAMES } from '@/lib/server/queue';
import { getRedis, invalidatePrefix } from '@/lib/server/redis';
import { audit } from '@/lib/server/audit';
import { errorJson, json } from '@/lib/server/request';
import { requireOwner } from '@/lib/server/owner';

export const runtime = 'nodejs';

const Body = z.object({ cmd: z.enum(['sync', 'fantasy', 'nba', 'legends', 'cache']) });
const LABEL = { sync: 'Ratings sync started.', fantasy: 'Fantasy points refresh started.', nba: 'NBA history refresh started.', legends: 'All-time legends rebuild started.', cache: 'Caches cleared.' } as const;

/** Owner buttons: run a worker job now, or clear the caches so changes show up immediately. */
export async function POST(req: Request) {
  const s = await requireOwner();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Unknown command.');
  const { cmd } = parsed.data;
  if (cmd === 'cache') {
    await Promise.all([invalidatePrefix('lb:'), getRedis().del('nba:era-teams', 'legends:by-team')]).catch(() => {});
  } else {
    await getQueue(QUEUE_NAMES.sync).add(cmd, { by: 'owner' }, { attempts: 1 });
  }
  await audit(s.user.id, `owner.${cmd}`, 'queue', cmd);
  return json({ ok: true, message: LABEL[cmd] });
}
