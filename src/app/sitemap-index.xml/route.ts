import { SITE } from '@/lib/site';
import { SITEMAP_IDS } from '@/lib/seo/sitemap-ids';

// The sitemap index, reachable at /sitemap.xml through a rewrite in next.config.ts: the one address to hand to a search console.
// Rendered per request so the links use the live site address (build containers do not have it).
export const dynamic = 'force-dynamic';

export function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${SITEMAP_IDS.map((id) => `  <sitemap><loc>${SITE.url}/sitemap/${id}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
