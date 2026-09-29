import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS, readingMinutes, type BlogPost } from '@/content/blog';
import { pageMeta } from '@/lib/seo/meta';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'Blog: the math behind the games',
  description: 'How 17-0 and Build a Player grade rosters, how EA Sports Madden NFL ratings work, and the numbers behind the projected record.',
  path: '/blog',
});

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Meta({ p }: { p: BlogPost }) {
  return <span className="muted num" style={{ fontSize: '.8rem' }}><time dateTime={p.date}>{fmt(p.date)}</time> / {readingMinutes(p)} min</span>;
}

export default function BlogIndex() {
  const [lead, second, third, ...rest] = BLOG_POSTS;
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }]} />
      <span className="eyebrow">Blog</span>
      <h1>The math, shown</h1>
      <p className="muted" style={{ maxWidth: '60ch' }}>Every formula on the site is public. These posts walk through them, one argument at a time.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 32 }}>
        {lead && (
          <article className="card card-green" style={{ flex: '1 1 100%', padding: '32px 28px', display: 'grid', gap: 12 }}>
            <Meta p={lead} />
            <h2 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', maxWidth: '22ch', margin: 0 }}><Link href={`/blog/${lead.slug}`} style={{ textDecoration: 'none' }}>{lead.title}</Link></h2>
            <p style={{ maxWidth: '58ch', fontSize: '1.1rem', margin: 0 }}>{lead.excerpt}</p>
          </article>
        )}
        {second && (
          <article className="card" style={{ flex: '2 1 360px', display: 'grid', gap: 10, alignContent: 'start', borderLeft: '4px solid var(--orange)' }}>
            <Meta p={second} />
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}><Link href={`/blog/${second.slug}`} style={{ textDecoration: 'none' }}>{second.title}</Link></h2>
            <p className="muted" style={{ margin: 0 }}>{second.excerpt}</p>
          </article>
        )}
        {third && (
          <article style={{ flex: '1 1 220px', padding: '8px 0', borderTop: '1px solid var(--steel)', display: 'grid', gap: 8, alignContent: 'start' }}>
            <Meta p={third} />
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}><Link href={`/blog/${third.slug}`}>{third.title}</Link></h2>
            <p className="muted" style={{ fontSize: '.9rem', margin: 0 }}>{third.excerpt}</p>
          </article>
        )}
      </div>

      {rest.length > 0 && (
        <section aria-labelledby="more-h" style={{ marginTop: 48 }}>
          <h2 id="more-h" style={{ fontSize: '1.1rem' }} className="eyebrow">More posts</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {rest.map((p) => (
              <li key={p.slug} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--steel)', alignItems: 'baseline' }}>
                <div>
                  <Link href={`/blog/${p.slug}`} style={{ fontWeight: 700 }}>{p.title}</Link>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '.9rem' }}>{p.excerpt}</p>
                </div>
                <Meta p={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <PlayCta />
    </div>
  );
}
