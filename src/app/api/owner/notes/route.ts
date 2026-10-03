import { desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { requireOwner } from '@/lib/server/owner';

export const runtime = 'nodejs';

const Body = z.object({ body: z.string().trim().min(1).max(4000), page: z.string().trim().max(300).optional() });

export async function GET() {
  if (!(await requireOwner())) return errorJson(404, 'Not found');
  const rows = await db.select().from(schema.ownerNotes).orderBy(desc(schema.ownerNotes.createdAt)).limit(100);
  return json({ notes: rows });
}

export async function POST(req: Request) {
  if (!(await requireOwner())) return errorJson(404, 'Not found');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Write a note first (up to 4000 characters).');
  const [row] = await db.insert(schema.ownerNotes).values({ body: parsed.data.body, page: parsed.data.page || null }).returning();
  // One JSON line per note so the hourly review can read it from the web logs.
  console.log(`[owner-note] ${JSON.stringify({ id: row.id.slice(0, 8), page: row.page, body: row.body })}`);
  return json({ note: row });
}
