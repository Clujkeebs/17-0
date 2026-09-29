export const runtime = 'nodejs';

import { auth } from '@/auth';
import { errorJson } from '@/lib/server/request';
import { exportAccount } from '@/lib/server/account';
import { audit } from '@/lib/server/audit';

export async function GET() {
  const s = await auth();
  if (!s?.user?.id) return errorJson(401, 'Sign in first.');
  const data = await exportAccount(s.user.id);
  if (!data) return errorJson(404, 'Account not found.');
  await audit(s.user.id, 'user.exported', 'user', s.user.id);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="gridiron-lab-data-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
