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
      <header className="page-head">
        <span className="eyebrow">Blog</span>
        <h1>The math, shown</h1>
        <p>Every formula on the site is public. These posts walk through them, one argument at a time.</p>
      </header>

      {lead && (
        <article className="blog-lead">
          <Meta p={lead} />
          <h2><Link href={`/blog/${lead.slug}`}>{lead.title}</Link></h2>
          <p>{lead.excerpt}</p>
        </article>
      )}

      <div className="blog-cards" style={{ marginTop: 56 }}>
        {[second, third, ...rest].filter(Boolean).map((p) => (
          <article key={p!.slug} className="post-card">
            <Meta p={p!} />
            <h3 style={{ marginTop: 12 }}><Link href={`/blog/${p!.slug}`} style={{ textDecoration: 'none' }}>{p!.title}</Link></h3>
            <p>{p!.excerpt}</p>
          </article>
        ))}
      </div>
      <PlayCta />
    </div>
  );
}
