import { requireAdmin } from '@/auth';
import { enqueueSync } from '@/lib/server/queue';
import { audit } from '@/lib/server/audit';
import { errorJson, json } from '@/lib/server/request';

export const runtime = 'nodejs';

export async function POST() {
  const s = await requireAdmin();
  if (!s) return errorJson(404, 'Not found');
  const job = await enqueueSync(s.user.email ?? 'admin');
  await audit(s.user.id, 'madden.sync.manual', 'queue', String(job.id));
  return json({ queued: true, jobId: job.id });
}
