import { z } from 'zod';
import { getMiniGame } from '@/lib/minigames/registry';
import { loadGameData } from '@/lib/minigames/data';
import { dailyDateET } from '@/lib/game/daily';
import { errorJson, json } from '@/lib/server/request';
import { auth } from '@/auth';
import { recordCheck } from '@/lib/minigames/checks';

export const runtime = 'nodejs';

const Body = z.object({ seed: z.string().max(120), guess: z.unknown() });

/** Per-guess feedback for guess games. Stateless: the puzzle is regenerated from the seed. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = getMiniGame(slug);
  if (!game?.check) return errorJson(404, 'Unknown game.');
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  const { seed, guess } = parsed.data;
  const date = dailyDateET();
  const today = seed === `mini:${slug}:${date}`;
  if (!(today || seed.startsWith(`casual:${slug}:`))) return errorJson(400, 'Bad seed.');
  if (today) {
    // Ranked: checks are recorded so the final score is built from what you actually tried.
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return errorJson(401, 'Sign in to play Today.', { requireAccount: true });
    if (!(await recordCheck(slug, date, session.user.id, guess, game.maxChecks))) return errorJson(409, 'No checks left. Lock in your answer.');
  }
  const data = await loadGameData();
  try { return json({ feedback: game.check(game.generate(seed, data), guess, data) }); }
  catch (e) { return errorJson(400, (e as Error).message || 'Invalid guess.'); }
}
