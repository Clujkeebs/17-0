import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbLd, type Crumb } from '@/lib/seo/jsonld';

/** Visible breadcrumb trail plus BreadcrumbList JSON-LD. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: 'Home', path: '/' }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className="crumbs">
        <ol>
          {all.map((c, i) => (
            <li key={c.path}>
              {i < all.length - 1 ? <><Link href={c.path}>{c.name}</Link><span aria-hidden="true">/</span></> : <span aria-current="page">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(all)} />
    </>
  );
}
