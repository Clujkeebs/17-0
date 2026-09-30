export const runtime = 'nodejs';

import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { audit } from '@/lib/server/audit';

const Body = z.object({ id: z.string().uuid(), status: z.enum(['open', 'resolved']).default('resolved') });

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Expected { id, status?: "open" | "resolved" }.');
  const { id, status } = parsed.data;
  const rows = await db.update(schema.contactMessages).set({ status }).where(eq(schema.contactMessages.id, id)).returning({ id: schema.contactMessages.id });
  if (!rows.length) return errorJson(404, 'Message not found.');
  await audit(s.user.id, `contact.${status}`, 'contact_message', id);
  return json({ ok: true });
}
