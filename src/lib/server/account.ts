import { createHash } from 'node:crypto';
import { and, desc, eq, ne, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { computeStreak, dailyDateET, longestStreak } from '@/lib/game/daily';
import { audit } from './audit';
import { accountDeleted, sendEmail } from './email';
import { scoreSummary } from './result-summary';
import { isOwnerEmail, resolveStyle, type NameStyle } from '@/lib/cosmetics';

export const deletedUsername = (userId: string) =>
  `deleted-user-${createHash('sha256').update(userId).digest('hex').slice(0, 8)}`;

export async function getUserById(id: string) {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return u && !u.deletedAt ? u : null;
}

export async function getUserByUsername(username: string) {
  const [u] = await db.select().from(schema.users).where(dsql`lower(${schema.users.username}) = ${username.toLowerCase()}`).limit(1);
  return u && !u.deletedAt ? u : null;
}

/** How this user's name renders. Owner status comes from the account email on the server, nothing else. */
export function nameStyleOf(u: { email: string | null; nameFont: string | null; nameColor: string | null; equipTitle?: string | null; equipFlair?: string | null; equipBorder?: string | null; equipBanner?: string | null }): NameStyle {
  return resolveStyle({ font: u.nameFont, color: u.nameColor, title: u.equipTitle, flair: u.equipFlair, border: u.equipBorder, banner: u.equipBanner }, isOwnerEmail(u.email));
}

/** Case-insensitive availability check. */
export async function isUsernameAvailable(username: string, exceptUserId?: string): Promise<boolean> {
  const cond = dsql`lower(${schema.users.username}) = ${username.toLowerCase()}`;
  const [r] = await db.select({ id: schema.users.id }).from(schema.users)
    .where(exceptUserId ? and(cond, ne(schema.users.id, exceptUserId)) : cond).limit(1);
  return !r;
}

const GAME_NAMES: Record<string, string> = { '17-0': '17-0', 'build-a-player': 'Build a Player', '82-0': '82-0', '162-0': '162-0' };

/**
 * Display name for a game type. Mini-game names come from the registry via a lazy import:
 * the registry pulls in the games' shared data module, which opens a database client, so a
 * static import here would connect every account page to the database for one label.
 */
export async function gameName(type: string): Promise<string> {
  if (GAME_NAMES[type]) return GAME_NAMES[type];
  try {
    const { getMiniGame } = await import('@/lib/minigames/registry');
    return getMiniGame(type)?.name ?? type;
  } catch { return type; }
}

/** Public-safe account view (never includes the password hash). */
export function publicAccount(u: typeof schema.users.$inferSelect) {
  return {
    id: u.id, email: u.email, username: u.username, displayName: u.name, image: u.image,
    emailVerified: u.emailVerified, createdAt: u.createdAt, newsletterOptIn: u.newsletterOptIn,
    newsletterConfirmedAt: u.newsletterConfirmedAt, soundEnabled: u.soundEnabled,
    hasPassword: !!u.hashedPassword, favoriteGames: u.favoriteGames ?? [], nameFont: u.nameFont, nameColor: u.nameColor,
    nameStyle: nameStyleOf(u),
  };
}

/** Distinct ET play dates for a user: daily_date when present, else created_at converted to ET. */
export async function getPlayDates(userId: string): Promise<string[]> {
  const rows = await db.select({ dailyDate: schema.gameResults.dailyDate, createdAt: schema.gameResults.createdAt })
    .from(schema.gameResults).where(eq(schema.gameResults.userId, userId));
  return [...new Set(rows.map((r) => r.dailyDate ?? dailyDateET(r.createdAt)))];
}

export async function getStreak(userId: string) {
  const dates = await getPlayDates(userId);
  const today = dailyDateET();
  return { streak: computeStreak(dates, today), longest: longestStreak(dates), playedToday: dates.includes(today), today };
}

export async function getUserStats(userId: string) {
  const [totals, byTypeRows, recentRows, bestRows, streak] = await Promise.all([
    // 17-0 results store wins in result_data; perfect seasons and the best record come from there.
    db.select({
      n: dsql<number>`count(*)::int`,
      perfect: dsql<number>`count(*) filter (where ${schema.gameResults.gameType} = '17-0' and (${schema.gameResults.resultData}->>'wins')::int = 17)::int`,
      bestWins: dsql<number | null>`max((${schema.gameResults.resultData}->>'wins')::int) filter (where ${schema.gameResults.gameType} = '17-0')`,
    }).from(schema.gameResults).where(eq(schema.gameResults.userId, userId)),
    db.select({
      gameType: schema.gameResults.gameType,
      n: dsql<number>`count(*)::int`,
      best: dsql<number>`max(${schema.gameResults.score})::int`,
    }).from(schema.gameResults).where(eq(schema.gameResults.userId, userId)).groupBy(schema.gameResults.gameType),
    db.select({
      id: schema.gameResults.id, gameType: schema.gameResults.gameType, score: schema.gameResults.score,
      isDaily: schema.gameResults.isDaily, dailyDate: schema.gameResults.dailyDate, createdAt: schema.gameResults.createdAt,
      resultData: schema.gameResults.resultData,
    }).from(schema.gameResults).where(eq(schema.gameResults.userId, userId)).orderBy(desc(schema.gameResults.createdAt)).limit(10),
    // Best result_data per game type, so the profile can show "17-0" instead of the raw score.
    db.execute<{ game_type: string; result_data: Record<string, unknown> }>(dsql`
      select distinct on (game_type) game_type, result_data
      from game_results
      where user_id = ${userId}
      order by game_type, score desc`),
    getStreak(userId),
  ]);
  const bestSummary = new Map(bestRows.map((r) => [r.game_type, scoreSummary(r.game_type, r.result_data)]));
  const byType = await Promise.all(byTypeRows.map(async (t) => ({
    ...t,
    gameName: await gameName(t.gameType),
    bestSummary: bestSummary.get(t.gameType) ?? String(t.best),
  })));
  const recent = await Promise.all(recentRows.map(async (r) => ({
    ...r,
    gameName: await gameName(r.gameType),
    summary: scoreSummary(r.gameType, r.resultData),
  })));
  const bestWins = totals[0]?.bestWins ?? null;
  return {
    played: totals[0]?.n ?? 0, perfectSeasons: totals[0]?.perfect ?? 0,
    bestRecord: bestWins == null ? null : `${bestWins}-${17 - bestWins}`,
    byType, recent, ...streak,
  };
}

export async function exportAccount(userId: string) {
  const u = await getUserById(userId);
  if (!u) return null;
  const [results, subscriber, oauth] = await Promise.all([
    db.select({
      id: schema.gameResults.id, gameType: schema.gameResults.gameType, isDaily: schema.gameResults.isDaily,
      dailyDate: schema.gameResults.dailyDate, score: schema.gameResults.score, resultData: schema.gameResults.resultData,
      username: schema.gameResults.username, createdAt: schema.gameResults.createdAt,
    }).from(schema.gameResults).where(eq(schema.gameResults.userId, userId)).orderBy(desc(schema.gameResults.createdAt)),
    db.select({
      email: schema.newsletterSubscribers.email, confirmed: schema.newsletterSubscribers.confirmed, source: schema.newsletterSubscribers.source,
      referrer: schema.newsletterSubscribers.referrer, subscribedAt: schema.newsletterSubscribers.subscribedAt,
      confirmedAt: schema.newsletterSubscribers.confirmedAt, unsubscribedAt: schema.newsletterSubscribers.unsubscribedAt,
    }).from(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, (u.email ?? '').toLowerCase())).limit(1),
    db.select({ provider: schema.accounts.provider, type: schema.accounts.type }).from(schema.accounts).where(eq(schema.accounts.userId, userId)),
  ]);
  const { hasPassword, ...account } = publicAccount(u);
  return {
    exportedAt: new Date().toISOString(),
    account: { ...account, signInMethods: [...(hasPassword ? ['password'] : []), ...oauth.map((o) => o.provider)] },
    results,
    newsletterSubscriber: subscriber[0] ?? null,
  };
}

/**
 * Hard delete. Results are kept for leaderboard integrity but detached and renamed to an
 * anonymous label derived from a hash of the id. Everything else tied to the user goes.
 */
export async function deleteAccount(userId: string): Promise<boolean> {
  const u = await getUserById(userId);
  if (!u) return false;
  const label = deletedUsername(userId);
  const email = u.email?.toLowerCase() ?? null;
  await db.transaction(async (tx) => {
    await tx.update(schema.gameResults).set({ userId: null, username: label }).where(eq(schema.gameResults.userId, userId));
    await tx.update(schema.gameSessions).set({ userId: null }).where(eq(schema.gameSessions.userId, userId));
    await tx.update(schema.feedback).set({ userId: null }).where(eq(schema.feedback.userId, userId));
    if (email) await tx.delete(schema.newsletterSubscribers).where(eq(schema.newsletterSubscribers.email, email));
    await tx.delete(schema.accounts).where(eq(schema.accounts.userId, userId));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
    if (email) await tx.delete(schema.verificationTokens).where(eq(schema.verificationTokens.identifier, email));
    await tx.delete(schema.users).where(eq(schema.users.id, userId));
  });
  // No email or id in the audit row: only the anonymous label.
  await audit(null, 'account.deleted', 'user', label);
  const mail = accountDeleted(null);
  if (u.email) void sendEmail({ to: u.email, ...mail }).catch(() => undefined);
  return true;
}
