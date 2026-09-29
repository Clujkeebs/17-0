/**
 * Pre-warms the share card for a result so the first social crawler hit is fast.
 * The web service renders and caches the PNG (Cloudflare caches the response for an hour).
 */
export async function renderResultCard(resultId: string) {
  const base = process.env.INTERNAL_WEB_URL ?? 'http://localhost:3000';
  const res = await fetch(`${base}/api/og/game-result?id=${encodeURIComponent(resultId)}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`og render ${res.status}`);
  await res.arrayBuffer();
  return { ok: true };
}
