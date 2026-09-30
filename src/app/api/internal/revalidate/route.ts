import { revalidatePath } from 'next/cache';
import { errorJson, json, requireCron } from '@/lib/server/request';

export const runtime = 'nodejs';

/**
 * Purges every ISR page. Called on boot (the build container cannot reach the private database,
 * so pages prerendered at build time are empty shells) and after a ratings sync.
 */
export async function POST(req: Request) {
  if (!requireCron(req)) return errorJson(401, 'Unauthorized');
  revalidatePath('/', 'layout');
  return json({ revalidated: true });
}
