import { z } from 'zod';
import { ChallengeError, createChallenge } from '@/lib/server/challenges';
import { errorJson, json } from '@/lib/server/request';
import { limitByIp } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
const Body = z.object({ resultId: z.string().uuid() });

/** Turns a Casual 17-0, 82-0 or 162-0 result into a challenge link (the same link every time for one result). */
export async function POST(req: Request) {
  const limited = await limitByIp(req, 'challenge');
  if (limited) return limited;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return errorJson(400, 'Bad request.');
  try {
    const { id } = await createChallenge(parsed.data.resultId);
    return json({ id, url: `/c/${id}` });
  } catch (e) {
    if (e instanceof ChallengeError) return errorJson(e.status, e.message);
    console.error('[challenge]', (e as Error).message);
    return errorJson(503, 'Could not create the challenge. Try again.');
  }
}
