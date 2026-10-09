import { SITE } from '@/lib/site';
import { GAMES } from '@/lib/game-registry';

/** IndexNow key (public by design: it is served at /6b4158a0c2e8d8bf572858230b641949.txt to prove the site owns it). */
export const INDEXNOW_KEY = '6b4158a0c2e8d8bf572858230b641949';

/**
 * Tells Bing, Yandex, Seznam and the other IndexNow engines that the main pages changed, so new games are
 * crawled within hours instead of weeks. Run once per worker boot (each deploy); production only.
 */
export async function pingIndexNow(fetchImpl: typeof fetch = fetch) {
  if (!SITE.url.startsWith('https://') || SITE.url.includes('localhost')) { console.log('[indexnow] skipped, site url', SITE.url); return null; }
  const host = new URL(SITE.url).host;
  const paths = ['/', '/games', '/leaderboard', '/fantasy', '/pickem', '/shop', '/llms.txt', ...GAMES.map((g) => `/games/${g.slug}`)];
  const res = await fetchImpl('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation: `${SITE.url}/${INDEXNOW_KEY}.txt`, urlList: paths.map((p) => `${SITE.url}${p}`) }),
    signal: AbortSignal.timeout(15_000),
  }).catch((e) => { console.warn('[indexnow] ping failed', (e as Error).message); return null; });
  if (res) console.log('[indexnow] pinged', paths.length, 'urls, status', res.status);
  return res?.status ?? null;
}
