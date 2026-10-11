import { and, desc, eq, isNull, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * The header bell. A notification is sent once per (user, kind, ref), so a retried grant or a re-run job
 * never stacks duplicates. Kept short: a title, an optional line and an optional link.
 */
export async function notify(userId: string, kind: string, ref: string, title: string, body?: string | null, href?: string | null) {
  await db.insert(schema.notifications).values({ userId, kind, ref, title, body: body ?? null, href: href ?? null }).onConflictDoNothing().catch((e) => console.warn('[notify] failed', (e as Error).message));
}

export async function listNotifications(userId: string, limit = 20) {
  const [rows, [unread]] = await Promise.all([
    db.select().from(schema.notifications).where(eq(schema.notifications.userId, userId)).orderBy(desc(schema.notifications.createdAt)).limit(limit),
    db.select({ n: dsql<number>`count(*)::int` }).from(schema.notifications).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt))),
  ]);
  return { items: rows.map((r) => ({ id: r.id, kind: r.kind, title: r.title, body: r.body, href: r.href, at: r.createdAt.toISOString(), read: !!r.readAt })), unread: unread?.n ?? 0 };
}

export async function markAllRead(userId: string) {
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)));
}
