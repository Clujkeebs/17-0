import { lt } from 'drizzle-orm';
import { db, schema } from '@/db';
import { pruneSnapshots } from '@/lib/server/sync';
import { purgeUnsubscribed } from '@/lib/server/newsletter';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

/** Nightly retention: snapshots 30d, unsubscribed newsletter rows 90d, expired game sessions 7d. */
export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  const snapshots = await pruneSnapshots();
  const subscribers = await purgeUnsubscribed();
  const sessions = await db.delete(schema.gameSessions).where(lt(schema.gameSessions.expiresAt, new Date(Date.now() - 7 * 86400_000))).returning({ id: schema.gameSessions.id });
  return json({ snapshots, subscribers, sessions: sessions.length });
}
