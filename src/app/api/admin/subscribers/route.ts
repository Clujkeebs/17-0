export const runtime = 'nodejs';

import { asc } from 'drizzle-orm';
import { requireAdmin } from '@/auth';
import { db, schema } from '@/db';
import { errorJson, json } from '@/lib/server/request';
import { subscriberCounts } from '@/lib/server/newsletter';
import { audit } from '@/lib/server/audit';

/** Quote a CSV cell and neutralize spreadsheet formula injection. */
function cell(v: unknown): string {
  let s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  if (new URL(req.url).searchParams.get('format') !== 'csv') return json(await subscriberCounts());

  const rows = await db.select({
    email: schema.newsletterSubscribers.email, confirmed: schema.newsletterSubscribers.confirmed, source: schema.newsletterSubscribers.source,
    subscribedAt: schema.newsletterSubscribers.subscribedAt, confirmedAt: schema.newsletterSubscribers.confirmedAt, unsubscribedAt: schema.newsletterSubscribers.unsubscribedAt,
  }).from(schema.newsletterSubscribers).orderBy(asc(schema.newsletterSubscribers.subscribedAt));
  const header = ['email', 'confirmed', 'source', 'subscribed_at', 'confirmed_at', 'unsubscribed_at'];
  const csv = [header.join(','), ...rows.map((r) => [r.email, r.confirmed, r.source, r.subscribedAt, r.confirmedAt, r.unsubscribedAt].map(cell).join(','))].join('\r\n');
  await audit(s.user.id, 'subscribers.exported', 'newsletter', undefined, { rows: rows.length });
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
