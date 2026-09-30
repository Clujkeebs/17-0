/**
 * Fetch raw ratings from EA. Two strategies:
 *   1. The public JSON endpoint (drop-api), paginated with limit/offset. Cheap and preferred.
 *   2. Headless Chromium via playwright-core, loading the ratings web page and capturing the JSON
 *      responses it makes. Used when the JSON endpoint is blocked or changes shape.
 * Both return the raw pages untouched; parseRatings() does all normalization.
 */
import { extractItems } from './parse';

export const DEFAULT_JSON_URL = 'https://drop-api.ea.com/rating/madden-nfl';
export const DEFAULT_PAGE_URL = 'https://www.ea.com/games/madden-nfl/ratings';
const PAGE_LIMIT = 100;
const MAX_PAGES = 60; // 6000 players; the feed is ~2,500
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';

export interface RawRatings {
  sourceUrl: string;
  method: 'json' | 'browser';
  pages: unknown[];
  itemCount: number;
}

const isJsonEndpoint = (url: string) => /drop-api\.ea\.com/.test(url);

function jsonBase(): string {
  const env = process.env.MADDEN_RATINGS_URL;
  return env && isJsonEndpoint(env) ? env : DEFAULT_JSON_URL;
}

function pageUrl(): string {
  const env = process.env.MADDEN_RATINGS_PAGE_URL ?? process.env.MADDEN_RATINGS_URL;
  return env && !isJsonEndpoint(env) ? env : DEFAULT_PAGE_URL;
}

/**
 * EA serves several editions on one endpoint; the default is not always the current game.
 * The player-ratings page lists the current iterations (newest first), e.g. "madden-ratings-week-2".
 */
export async function discoverIteration(fetchImpl: typeof fetch = fetch): Promise<string | null> {
  if (process.env.MADDEN_ITERATION) return process.env.MADDEN_ITERATION;
  try {
    const res = await fetchImpl('https://www.ea.com/games/madden-nfl/player-ratings', { headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(20_000) });
    const html = await res.text();
    return html.match(/"iterations":\[\{"id":"([^"]+)"/)?.[1] ?? null;
  } catch { return null; }
}

export async function fetchJsonPages(base = jsonBase(), fetchImpl: typeof fetch = fetch, iteration?: string | null): Promise<RawRatings> {
  const pages: unknown[] = [];
  let itemCount = 0;
  if (iteration === undefined) iteration = await discoverIteration(fetchImpl);
  for (let i = 0; i < MAX_PAGES; i++) {
    const url = new URL(base);
    url.searchParams.set('locale', url.searchParams.get('locale') ?? 'en');
    url.searchParams.set('limit', String(PAGE_LIMIT));
    url.searchParams.set('offset', String(i * PAGE_LIMIT));
    if (iteration) url.searchParams.set('iteration', iteration);
    const res = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': UA }, signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`Ratings endpoint ${url.host} returned ${res.status}`);
    const body = (await res.json()) as unknown;
    const items = extractItems(body);
    pages.push(body);
    itemCount += items.length;
    const total = typeof (body as { totalItems?: unknown })?.totalItems === 'number' ? (body as { totalItems: number }).totalItems : null;
    if (items.length < PAGE_LIMIT || (total != null && itemCount >= total)) break;
  }
  if (itemCount === 0) throw new Error('Ratings endpoint returned no items');
  return { sourceUrl: iteration ? `${base}?iteration=${iteration}` : base, method: 'json', pages, itemCount };
}

export async function fetchWithBrowser(url = pageUrl()): Promise<RawRatings> {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const pages: unknown[] = [];
  const seenUrls = new Set<string>();
  let itemCount = 0;
  try {
    const ctx = await browser.newContext({ userAgent: UA });
    const page = await ctx.newPage();
    page.on('response', async (res) => {
      const u = res.url();
      if (seenUrls.has(u) || !/rating/i.test(u) || !(res.headers()['content-type'] ?? '').includes('json')) return;
      seenUrls.add(u);
      try {
        const body = await res.json();
        const n = extractItems(body).length;
        if (n) { pages.push(body); itemCount += n; }
      } catch { /* non-JSON or aborted */ }
    });
    for (let p = 1; p <= MAX_PAGES; p++) {
      const before = itemCount;
      const target = new URL(url);
      if (p > 1) target.searchParams.set('page', String(p));
      await page.goto(target.toString(), { waitUntil: 'networkidle', timeout: 45_000 });
      if (p === 1 && itemCount === 0) {
        // Server-rendered fallback: Next.js pages embed their data in __NEXT_DATA__.
        const embedded = await page.evaluate(() => document.getElementById('__NEXT_DATA__')?.textContent ?? null);
        if (embedded) {
          try {
            const body = JSON.parse(embedded);
            const n = extractItems(findItemsDeep(body)).length;
            if (n) { pages.push(findItemsDeep(body)); itemCount += n; }
          } catch { /* ignore */ }
        }
      }
      if (itemCount === before) break;
    }
  } finally {
    await browser.close().catch(() => {});
  }
  if (itemCount === 0) throw new Error(`Browser fetch of ${url} captured no ratings`);
  return { sourceUrl: url, method: 'browser', pages, itemCount };
}

/** Walk an arbitrary JSON tree and return the first object that holds a player items array. */
function findItemsDeep(node: unknown, depth = 0): unknown {
  if (depth > 8 || node === null || typeof node !== 'object') return null;
  if (extractItems(node).some((i) => 'overallRating' in i || 'firstName' in i)) return node;
  for (const v of Object.values(node as Record<string, unknown>)) {
    const hit = findItemsDeep(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** JSON endpoint first; browser scrape if that fails. Throws with both reasons if neither works. */
export async function fetchRatings(): Promise<RawRatings> {
  try {
    return await fetchJsonPages();
  } catch (jsonErr) {
    console.warn('[sync] JSON endpoint failed, trying browser:', (jsonErr as Error).message);
    try {
      return await fetchWithBrowser();
    } catch (browserErr) {
      throw new Error(`Ratings fetch failed. json: ${(jsonErr as Error).message}; browser: ${(browserErr as Error).message}`);
    }
  }
}
