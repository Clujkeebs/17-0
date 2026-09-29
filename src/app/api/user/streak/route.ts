export const runtime = 'nodejs';

import { auth } from '@/auth';
import { errorJson, json } from '@/lib/server/request';
import { getStreak } from '@/lib/server/account';

export async function GET() {
  const s = await auth();
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  return json(await getStreak(s.user.id));
}
