import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbLd, type Crumb } from '@/lib/seo/jsonld';

/** Visible breadcrumb trail plus BreadcrumbList JSON-LD. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Home', path: '/' }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" style={{ fontSize: '.85rem', marginBottom: 20 }}>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }} className="muted">
          {all.map((c, i) => (
            <li key={c.path} style={{ display: 'flex', gap: 6 }}>
              {i < all.length - 1 ? <><Link href={c.path} className="muted">{c.name}</Link><span aria-hidden="true">/</span></> : <span aria-current="page">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}
