export const runtime = 'nodejs';

import { z } from 'zod';
import { requireAdmin } from '@/auth';
import { errorJson, hashIp, json } from '@/lib/server/request';
import { getRedis } from '@/lib/server/redis';
import { audit } from '@/lib/server/audit';

// rateLimit() keys on hashIp(ip) for anonymous scopes and on user id for per-user scopes.
const Body = z.object({
  kind: z.enum(['ip', 'user', 'raw']),
  value: z.string().trim().min(1).max(200),
  hours: z.number().int().min(1).max(24 * 30).optional(),
});

const overrideId = (kind: 'ip' | 'user' | 'raw', value: string) => (kind === 'ip' ? hashIp(value) : value);

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !parsed.data.hours) return errorJson(400, 'Expected { kind, value, hours } with hours 1 to 720.');
  const id = overrideId(parsed.data.kind, parsed.data.value);
  try {
    await getRedis().set(`rate-override:${id}`, s.user.email ?? '1', 'EX', parsed.data.hours * 3600);
  } catch { return errorJson(503, 'Redis unavailable.'); }
  await audit(s.user.id, 'rate_override.set', 'rate_limit', id, { kind: parsed.data.kind, hours: parsed.data.hours });
  return json({ ok: true, id, expiresInHours: parsed.data.hours });
}

export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Expected { kind, value }.');
  const id = overrideId(parsed.data.kind, parsed.data.value);
  try { await getRedis().del(`rate-override:${id}`); } catch { return errorJson(503, 'Redis unavailable.'); }
  await audit(s.user.id, 'rate_override.cleared', 'rate_limit', id);
  return json({ ok: true, id });
}
