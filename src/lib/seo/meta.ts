import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const absUrl = (path: string) => `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;

/** Standard page metadata with a canonical URL. `title` is templated by the root layout. */
export function pageMeta(o: { title: string; description: string; path: string; noindex?: boolean; type?: 'website' | 'article'; image?: string | null }): Metadata {
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: {
      type: o.type ?? 'website',
      url: o.path,
      title: o.title,
      description: o.description,
      siteName: SITE.name,
      ...(o.image ? { images: [o.image] } : {}),
    },
    ...(o.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
