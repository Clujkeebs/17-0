import { getLastSync } from '@/lib/server/data';

export async function StaleSyncBanner() {
  let last: Date | null = null;
  try { last = await getLastSync(); } catch { return null; }
  if (!last || Date.now() - new Date(last).getTime() < 7 * 86400_000) return null;
  const d = new Date(last).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return <div role="status" className="banner banner-warn">Ratings last updated {d}. The next sync will refresh them.</div>;
}
