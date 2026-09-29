import { and, eq, isNotNull, lt, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { SITE } from '@/lib/site';
import { token } from './request';
import { newsletterConfirm, sendEmail, unsubscribeUrlFor } from './email';

export const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;
export const PURGE_AFTER_DAYS = 90;

type Subscriber = typeof schema.newsletterSubscribers.$inferSelect;
export type SubscribeState = Pick<Subscriber, 'confirmed' | 'confirmationToken' | 'tokenExpiresAt' | 'unsubscribedAt'>;

/** What to do with a subscribe request, given the existing row (if any). Pure. */
export type SubscribeAction =
  | 'create'        // no row: insert, new token, send confirmation
  | 'resubscribe'   // previously unsubscribed: reset to unconfirmed, new token, send confirmation
  | 'refresh'       // unconfirmed with expired or missing token: new token, resend
  | 'resend'        // unconfirmed with a live token: resend the same link
  | 'noop';         // already confirmed and active: send nothing

export const confirmationExpiry = (now: Date = new Date()) => new Date(now.getTime() + CONFIRM_TTL_MS);

export function isTokenExpired(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() <= now.getTime();
}

export function decideSubscribeAction(existing: SubscribeState | null | undefined, now: Date = new Date()): SubscribeAction {
  if (!existing) return 'create';
  if (existing.unsubscribedAt) return 'resubscribe';
  if (existing.confirmed) return 'noop';
  if (!existing.confirmationToken || isTokenExpired(existing.tokenExpiresAt, now)) return 'refresh';
  return 'resend';
}

export type ConfirmOutcome = 'confirmed' | 'expired' | 'invalid';

/** Pure: outcome of clicking a confirm link for a given row. Already-confirmed rows never reach here (token is cleared). */
export function confirmOutcome(row: SubscribeState | null | undefined, now: Date = new Date()): ConfirmOutcome {
  if (!row || row.unsubscribedAt) return 'invalid';
  if (isTokenExpired(row.tokenExpiresAt, now)) return 'expired';
  return 'confirmed';
}

export const SUBSCRIBE_MESSAGE = 'Check your inbox. Click the link in the next 24 hours to confirm.';

const normalizeEmail = (e: string) => e.trim().toLowerCase();

export async function logNewsletterEvent(subscriberId: string | null, eventType: string, metadata?: Record<string, unknown>) {
  try {
    await db.insert(schema.newsletterEvents).values({ subscriberId, eventType, metadata: metadata ?? null });
  } catch (e) { console.error('[newsletter:event]', (e as Error).message); }
}

async function sendConfirmation(sub: { id: string; email: string; confirmationToken: string; unsubscribeToken: string }) {
  const confirmUrl = `${SITE.url}/api/newsletter/confirm?token=${encodeURIComponent(sub.confirmationToken)}`;
  const mail = newsletterConfirm(confirmUrl, unsubscribeUrlFor(sub.unsubscribeToken));
  const res = await sendEmail({ to: sub.email, ...mail });
  await logNewsletterEvent(sub.id, 'sent', { template: 'confirm', ok: res.ok });
}

export interface SubscribeInput { email: string; source?: string | null; ipHash?: string | null; referrer?: string | null }

/**
 * Upsert a subscriber and send a confirmation if needed. Callers must respond identically
 * whatever this returns so the endpoint never reveals whether an address is on the list.
 */
export async function subscribe(input: SubscribeInput, now: Date = new Date()): Promise<SubscribeAction> {
  const email = normalizeEmail(input.email);
  const source = input.source?.slice(0, 64) ?? null;
  const referrer = input.referrer?.slice(0, 500) ?? null;
  const [existing] = await db.select().from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, email)).limit(1);
  const action = decideSubscribeAction(existing, now);
  if (action === 'noop') return action;

  let row: Subscriber | undefined;
  if (action === 'create') {
    [row] = await db.insert(schema.newsletterSubscribers).values({
      email, confirmationToken: token(), tokenExpiresAt: confirmationExpiry(now), unsubscribeToken: token(),
      source, ipHash: input.ipHash ?? null, referrer,
    }).onConflictDoNothing({ target: schema.newsletterSubscribers.email }).returning();
    if (!row) return 'noop'; // lost a race with a concurrent insert; the other request sends the email
  } else if (action === 'resubscribe' || action === 'refresh') {
    [row] = await db.update(schema.newsletterSubscribers).set({
      confirmed: false, confirmedAt: null, unsubscribedAt: null,
      confirmationToken: token(), tokenExpiresAt: confirmationExpiry(now),
      ...(action === 'resubscribe' ? { source, ipHash: input.ipHash ?? null, referrer, subscribedAt: now } : {}),
    }).where(eq(schema.newsletterSubscribers.id, existing!.id)).returning();
  } else {
    row = existing;
  }
  if (row?.confirmationToken) await sendConfirmation({ id: row.id, email: row.email, confirmationToken: row.confirmationToken, unsubscribeToken: row.unsubscribeToken });
  return action;
}

export async function confirmSubscription(confirmationToken: string, now: Date = new Date()): Promise<ConfirmOutcome> {
  if (!confirmationToken || confirmationToken.length > 200) return 'invalid';
  const [row] = await db.select().from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.confirmationToken, confirmationToken)).limit(1);
  const outcome = confirmOutcome(row, now);
  if (outcome !== 'confirmed' || !row) return outcome;
  await db.update(schema.newsletterSubscribers)
    .set({ confirmed: true, confirmedAt: now, confirmationToken: null, tokenExpiresAt: null })
    .where(eq(schema.newsletterSubscribers.id, row.id));
  await db.update(schema.users).set({ newsletterOptIn: true, newsletterConfirmedAt: now }).where(eq(schema.users.email, row.email));
  await logNewsletterEvent(row.id, 'confirmed');
  return 'confirmed';
}

/** One-click unsubscribe by token. Idempotent. Returns false only for unknown tokens. */
export async function unsubscribeByToken(unsubscribeToken: string, now: Date = new Date()): Promise<boolean> {
  if (!unsubscribeToken || unsubscribeToken.length > 200) return false;
  const [row] = await db.select().from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.unsubscribeToken, unsubscribeToken)).limit(1);
  if (!row) return false;
  if (!row.unsubscribedAt) {
    await db.update(schema.newsletterSubscribers)
      .set({ unsubscribedAt: now, confirmed: false, confirmationToken: null, tokenExpiresAt: null })
      .where(eq(schema.newsletterSubscribers.id, row.id));
    await db.update(schema.users).set({ newsletterOptIn: false, newsletterConfirmedAt: null }).where(eq(schema.users.email, row.email));
    await logNewsletterEvent(row.id, 'unsubscribed', { via: 'token' });
  }
  return true;
}

/** Unsubscribe by email (used from account settings). */
export async function unsubscribeByEmail(email: string, now: Date = new Date()): Promise<void> {
  const [row] = await db.select().from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.email, normalizeEmail(email))).limit(1);
  if (row) await unsubscribeByToken(row.unsubscribeToken, now);
  else await db.update(schema.users).set({ newsletterOptIn: false, newsletterConfirmedAt: null }).where(eq(schema.users.email, normalizeEmail(email)));
}

/** Active (not unsubscribed) subscriber's unsubscribe URL for an address, if any. */
export async function unsubscribeUrlForEmail(email: string): Promise<string | null> {
  const [row] = await db.select({ t: schema.newsletterSubscribers.unsubscribeToken, u: schema.newsletterSubscribers.unsubscribedAt })
    .from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, normalizeEmail(email))).limit(1);
  return row && !row.u ? unsubscribeUrlFor(row.t) : null;
}

/** Hard-delete rows unsubscribed more than 90 days ago. Called by cron. Returns rows deleted. */
export async function purgeUnsubscribed(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 86400_000);
  const rows = await db.delete(schema.newsletterSubscribers)
    .where(and(isNotNull(schema.newsletterSubscribers.unsubscribedAt), lt(schema.newsletterSubscribers.unsubscribedAt, cutoff)))
    .returning({ id: schema.newsletterSubscribers.id });
  return rows.length;
}

export async function subscriberCounts() {
  const [r] = await db.select({
    total: dsql<number>`count(*)::int`,
    confirmed: dsql<number>`count(*) filter (where ${schema.newsletterSubscribers.confirmed} and ${schema.newsletterSubscribers.unsubscribedAt} is null)::int`,
    pending: dsql<number>`count(*) filter (where not ${schema.newsletterSubscribers.confirmed} and ${schema.newsletterSubscribers.unsubscribedAt} is null)::int`,
    unsubscribed: dsql<number>`count(*) filter (where ${schema.newsletterSubscribers.unsubscribedAt} is not null)::int`,
  }).from(schema.newsletterSubscribers);
  return r ?? { total: 0, confirmed: 0, pending: 0, unsubscribed: 0 };
}
