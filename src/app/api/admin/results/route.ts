import { invalidatePrefix } from '@/lib/server/redis';
export const runtime = 'nodejs';

import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAdmin } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { audit } from '@/lib/server/audit';

export async function GET() {
  if (!(await requireAdmin())) return errorJson(404, 'Not found');
  const rows = await db.select().from(schema.gameResults).where(eq(schema.gameResults.flagged, true)).orderBy(desc(schema.gameResults.createdAt)).limit(200);
  return json({ results: rows });
}

const Body = z.object({ id: z.string().uuid(), action: z.enum(['unflag', 'delete']) });

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Expected { id, action: "unflag" | "delete" }.');
  const { id, action } = parsed.data;
  const rows = action === 'unflag'
    ? await db.update(schema.gameResults).set({ flagged: false }).where(eq(schema.gameResults.id, id)).returning({ id: schema.gameResults.id, score: schema.gameResults.score })
    : await db.delete(schema.gameResults).where(eq(schema.gameResults.id, id)).returning({ id: schema.gameResults.id, score: schema.gameResults.score });
  if (!rows.length) return errorJson(404, 'Result not found.');
  await invalidatePrefix('lb:').catch(() => {});
  await audit(s.user.id, `result.${action}`, 'game_result', id, { score: rows[0].score });
  return json({ ok: true });
}
