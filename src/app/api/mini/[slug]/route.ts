import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { dataFor, getMiniGame } from '@/lib/minigames/registry';
import { dailyDateET } from '@/lib/game/daily';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';
import { earnForResult } from '@/lib/server/points';
import { getRedis, invalidatePrefix } from '@/lib/server/redis';
import { readChecks } from '@/lib/minigames/checks';

export const runtime = 'nodejs';

const todaySeed = (slug: string, date: string) => `mini:${slug}:${date}`;
/** Server clock for timed games: set when the puzzle is first served (never reset by a reload), read at submit. */
const clockKey = (slug: string, seed: string, userId: string | null) => `mini:t0:${slug}:${userId ?? 'anon'}:${seed}`;

async function existingToday(userId: string, slug: string, date: string) {
  const [r] = await db.select().from(schema.gameResults)
    .where(and(eq(schema.gameResults.userId, userId), eq(schema.gameResults.gameType, slug), eq(schema.gameResults.dailyDate, date), eq(schema.gameResults.isDaily, true))).limit(1);
  return r ?? null;
}

/**
 * GET ?mode=today|casual. Today is ranked: same puzzle for everyone, one attempt, account required.
 * Casual returns a fresh random seed every time.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getMiniGame(slug);
  if (!game) return errorJson(404, 'Unknown game.');
  const mode = new URL(req.url).searchParams.get('mode') === 'today' ? 'today' : 'casual';
  const date = dailyDateET();
  let seed: string;
  if (mode === 'today') {
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return errorJson(401, 'Sign in to play Today. It is ranked.', { requireAccount: true });
    const done = await existingToday(session.user.id, slug, date);
    if (done) return json({ mode, date, played: true, result: { id: done.id, score: done.score, ...(done.resultData as object) } });
    seed = todaySeed(slug, date);
  } else {
    seed = `casual:${slug}:${randomBytes(8).toString('hex')}`;
  }
  try {
    const puzzle = game.generate(seed, await dataFor(game));
    const uid = mode === 'today' ? (await auth().catch(() => null))?.user?.id ?? null : null;
    await getRedis().set(clockKey(slug, seed, uid), String(Date.now()), 'EX', 2 * 86400, 'NX').catch(() => {});
    return json({ mode, date, seed, puzzle: game.publicView(puzzle) });
  } catch (e) {
    console.error(`[mini:${slug}]`, (e as Error).message);
    return errorJson(503, 'Could not build a puzzle right now. Try again.');
  }
}

const Body = z.object({ mode: z.enum(['today', 'casual']), seed: z.string().max(120), answer: z.unknown() });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getMiniGame(slug);
  if (!game) return errorJson(404, 'Unknown game.');
  const limited = await limitByIp(req, 'grade');
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const { mode, seed, answer } = parsed.data;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const date = dailyDateET();
  if (mode === 'today') {
    if (!userId) return errorJson(401, 'Sign in to play Today.', { requireAccount: true });
    if (seed !== todaySeed(slug, date)) return errorJson(409, 'Today\'s puzzle changed at midnight ET. Reload.');
    if (await existingToday(userId, slug, date)) return errorJson(409, 'You already played Today. Casual is unlimited.');
  } else if (!seed.startsWith(`casual:${slug}:`)) return errorJson(400, 'Bad seed.');
  let result;
  let finalAnswer = answer;
  if (mode === 'today' && userId && game.applyChecks) finalAnswer = game.applyChecks(answer, await readChecks(slug, date, userId));
  const t0 = Number(await getRedis().get(clockKey(slug, seed, mode === 'today' ? userId : null)).catch(() => null));
  const elapsedMs = t0 > 0 ? Date.now() - t0 : undefined;
  try { result = game.score(game.generate(seed, await dataFor(game)), finalAnswer, { elapsedMs }); }
  catch (e) { return errorJson(400, (e as Error).message || 'Invalid answer.'); }
  const resultData = { summary: result.summary, detail: result.detail, perfect: !!result.perfect };
  try {
    const [row] = await db.insert(schema.gameResults).values({
      userId, username: session?.user?.username ?? null, gameType: slug, isDaily: mode === 'today', dailyDate: mode === 'today' ? date : null,
      resultData, score: result.score,
    }).returning({ id: schema.gameResults.id });
    if (mode === 'today') await Promise.all([invalidatePrefix(`lb:daily:${slug}:`), invalidatePrefix(`lb:week:${slug}:`), invalidatePrefix(`lb:all:${slug}:`)]).catch(() => {});
    if (userId) await earnForResult(userId, slug, mode === 'today', !!result.perfect, row.id).catch((e) => console.warn('[points] earn failed', (e as Error).message));
    return json({ id: row.id, score: result.score, ...resultData });
  } catch {
    return errorJson(409, 'You already played Today. Casual is unlimited.');
  }
}
