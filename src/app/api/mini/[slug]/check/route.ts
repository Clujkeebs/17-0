import { z } from 'zod';
import { getMiniGame } from '@/lib/minigames/registry';
import { loadGameData } from '@/lib/minigames/data';
import { dailyDateET } from '@/lib/game/daily';
import { errorJson, json } from '@/lib/server/request';

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
  if (!(seed === `mini:${slug}:${dailyDateET()}` || seed.startsWith(`casual:${slug}:`))) return errorJson(400, 'Bad seed.');
  const data = await loadGameData();
  try { return json({ feedback: game.check(game.generate(seed, data), guess, data) }); }
  catch (e) { return errorJson(400, (e as Error).message || 'Invalid guess.'); }
}
