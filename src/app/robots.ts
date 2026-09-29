import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { SITEMAP_IDS } from '@/lib/seo/sitemap-ids';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/settings/'] }],
    sitemap: SITEMAP_IDS.map((id) => `${SITE.url}/sitemap/${id}.xml`),
    host: SITE.url,
  };
}
