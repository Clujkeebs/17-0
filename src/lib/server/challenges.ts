import { and, asc, count, eq, gte, sql as dsql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { token as newToken } from './request';
import { grant } from './points';

/**
 * Challenges: a Casual game's seed and setup, saved so friends draft from the exact same spins (re-spins
 * included, since every draw is a function of the seed and the re-spins used). Grading for challenge sessions
 * is seeded from the challenge and the roster, so the same picks always give the same record.
 */
export const CHALLENGE_GAMES = ['17-0', '82-0', '162-0'] as const;
export type ChallengeGame = (typeof CHALLENGE_GAMES)[number];
export const isChallengeGame = (g: string): g is ChallengeGame => (CHALLENGE_GAMES as readonly string[]).includes(g);

/** What a challenge fixes for everyone: the same roster size, pool, edition or mode, and Hard on or off. */
export interface ChallengeSetup { hard: boolean; format?: string; pool?: string; edition?: string; mode?: string }
export const CHALLENGE_POINTS = { win: 25, defend: 10, defendCap: 5 };

export class ChallengeError extends Error { constructor(msg: string, public status = 400) { super(msg); } }

function setupOf(gameType: ChallengeGame, p: Record<string, unknown>): ChallengeSetup {
  const hard = !!p.hard;
  if (gameType === '17-0') return { hard, format: String(p.format ?? '6'), pool: String(p.pool ?? 'current') };
  if (gameType === '82-0') return { hard, edition: String(p.edition ?? 'classic') };
  return { hard, mode: String(p.mode ?? 'eras') };
}

/** Creates (or returns the existing) challenge for a Casual result. */
export async function createChallenge(resultId: string): Promise<{ id: string }> {
  const [r] = await db.select().from(schema.gameResults).where(eq(schema.gameResults.id, resultId)).limit(1);
  if (!r) throw new ChallengeError('That result does not exist.', 404);
  if (!isChallengeGame(r.gameType)) throw new ChallengeError('Challenges are for 17-0, 82-0 and 162-0.');
  if (r.isDaily) throw new ChallengeError('Today is ranked and the same for everyone already. Challenge a Casual game.');
  const [existing] = await db.select({ id: schema.challenges.id }).from(schema.challenges).where(eq(schema.challenges.creatorResultId, r.id)).limit(1);
  if (existing) return existing;
  if (!r.sessionId) throw new ChallengeError('This game is too old to challenge. Play a new one.', 410);
  const [s] = await db.select().from(schema.gameSessions).where(eq(schema.gameSessions.id, r.sessionId)).limit(1);
  if (!s) throw new ChallengeError('This game is too old to challenge. Play a new one.', 410);
  const p = s.spinPayload as Record<string, unknown>;
  // A result that came from a challenge challenges the same board: send people to the original.
  if (typeof p.challengeId === 'string') return { id: p.challengeId };
  const id = newToken(8).slice(0, 10);
  const inserted = await db.insert(schema.challenges).values({
    id, gameType: r.gameType, seed: s.seed, setup: setupOf(r.gameType, p), creatorId: r.userId, creatorName: r.username, creatorResultId: r.id,
  }).onConflictDoNothing().returning({ id: schema.challenges.id });
  if (!inserted.length) {
    const [again] = await db.select({ id: schema.challenges.id }).from(schema.challenges).where(eq(schema.challenges.creatorResultId, r.id)).limit(1);
    if (again) return again;
    throw new ChallengeError('Could not create the challenge. Try again.', 503);
  }
  await db.insert(schema.challengeEntries).values({ challengeId: id, resultId: r.id, userId: r.userId, username: r.username }).onConflictDoNothing();
  return { id };
}

export async function getChallenge(id: string) {
  if (!/^[A-Za-z0-9_-]{6,24}$/.test(id)) return null;
  const [c] = await db.select().from(schema.challenges).where(eq(schema.challenges.id, id)).limit(1);
  return c ?? null;
}

/** For a start route: the seed and setup to use. The client's own setup is ignored. */
export async function challengeStart(id: string, gameType: ChallengeGame) {
  const c = await getChallenge(id);
  if (!c || c.gameType !== gameType) throw new ChallengeError('That challenge does not exist.', 404);
  return { seed: c.seed, challengeId: c.id, setup: c.setup as ChallengeSetup };
}

/** Who is owed points for one new entry. Pure, so the rules are unit tested. */
export function challengePayouts(o: { challengeId: string; creatorId: string | null; creatorScore: number; entrantId: string | null; entrantScore: number; defendsSoFar: number }) {
  const out: { userId: string; amount: number; reason: 'challenge-win' | 'challenge-defend'; ref: string }[] = [];
  if (!o.entrantId || !o.creatorId || o.entrantId === o.creatorId) return out;
  if (o.entrantScore > o.creatorScore) out.push({ userId: o.entrantId, amount: CHALLENGE_POINTS.win, reason: 'challenge-win', ref: `${o.challengeId}:${o.entrantId}` });
  else if (o.entrantScore < o.creatorScore && o.defendsSoFar < CHALLENGE_POINTS.defendCap) out.push({ userId: o.creatorId, amount: CHALLENGE_POINTS.defend, reason: 'challenge-defend', ref: `${o.challengeId}:${o.entrantId}` });
  return out;
}

/** Called after a challenge session is graded. The first result per signed-in player is the one that counts. */
export async function recordEntry(challengeId: string, resultId: string, score: number, userId: string | null | undefined, username: string | null | undefined) {
  const c = await getChallenge(challengeId);
  if (!c) return;
  const ins = await db.insert(schema.challengeEntries).values({ challengeId, resultId, userId: userId ?? null, username: username ?? null }).onConflictDoNothing().returning({ id: schema.challengeEntries.id });
  if (!ins.length || !userId) return;
  const [creator] = await db.select({ score: schema.gameResults.score }).from(schema.gameResults).where(eq(schema.gameResults.id, c.creatorResultId)).limit(1);
  const [hidden] = await db.select({ h: schema.users.lbHidden }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!creator || hidden?.h) return;
  const [d] = await db.select({ n: count() }).from(schema.pointEvents).where(and(eq(schema.pointEvents.reason, 'challenge-defend'), dsql`${schema.pointEvents.ref} like ${`${challengeId}:%`}`));
  for (const p of challengePayouts({ challengeId, creatorId: c.creatorId, creatorScore: creator.score, entrantId: userId, entrantScore: score, defendsSoFar: d?.n ?? 0 })) {
    await grant(p.userId, p.amount, p.reason, p.ref).catch((e) => console.warn('[challenge] grant failed', (e as Error).message));
  }
}

export interface Entrant { resultId: string; userId: string | null; username: string | null; score: number; wins: number; losses: number; createdAt: Date; hidden: boolean }

/** Everyone who played, best first (score encodes wins and the tiebreaks; earlier entry wins a tie). */
export async function entrants(challengeId: string): Promise<Entrant[]> {
  const rows = await db.select({ e: schema.challengeEntries, r: schema.gameResults, hidden: schema.users.lbHidden }).from(schema.challengeEntries)
    .innerJoin(schema.gameResults, eq(schema.gameResults.id, schema.challengeEntries.resultId))
    .leftJoin(schema.users, eq(schema.users.id, schema.challengeEntries.userId))
    .where(eq(schema.challengeEntries.challengeId, challengeId)).orderBy(dsql`${schema.gameResults.score} desc`, asc(schema.challengeEntries.createdAt)).limit(200);
  return rows.map(({ e, r, hidden }) => {
    const d = r.resultData as { wins?: number; losses?: number };
    return { resultId: r.id, userId: e.userId, username: e.username, score: r.score, wins: Number(d.wins ?? 0), losses: Number(d.losses ?? 0), createdAt: e.createdAt, hidden: !!hidden };
  });
}

/** The challenge a result belongs to, if any (for a link back from the result page). */
export async function challengeOfResult(resultId: string): Promise<string | null> {
  const [e] = await db.select({ id: schema.challengeEntries.challengeId }).from(schema.challengeEntries).where(eq(schema.challengeEntries.resultId, resultId)).limit(1);
  return e?.id ?? null;
}

/** Owner stats: challenges and entries since a time. */
export async function challengeCounts(since: Date) {
  const [[c], [e]] = await Promise.all([
    db.select({ n: count() }).from(schema.challenges).where(gte(schema.challenges.createdAt, since)),
    db.select({ n: count() }).from(schema.challengeEntries).where(gte(schema.challengeEntries.createdAt, since)),
  ]);
  return { challenges: c?.n ?? 0, entries: e?.n ?? 0 };
}

/** For a game page opened from a challenge link: who set the spins. Null when the link is wrong or for another game. */
export async function challengeInfo(id: string | undefined, gameType: ChallengeGame): Promise<{ id: string; by: string } | null> {
  if (!id) return null;
  const c = await getChallenge(id).catch(() => null);
  return c && c.gameType === gameType ? { id: c.id, by: c.creatorName ?? 'a friend' } : null;
}
