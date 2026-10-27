import type { Metadata } from 'next';
import Link from 'next/link';
import { BLOG_POSTS, CATEGORY_INTRO, categoriesWithPosts, postsIn, readingMinutes, startHerePosts, type BlogPost } from '@/content/blog';
import { pageMeta } from '@/lib/seo/meta';
import { InlineText } from '@/components/blog/InlineText';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'Blog: strategy, math and history for the draft games',
  description: 'How to draft better in 17-0, 82-0, 162-0 and 44-0, how every grade and win line is built, fantasy football math, puzzle tips, and the arithmetic of a perfect season.',
  path: '/blog',
});

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

function Meta({ p }: { p: BlogPost }) {
  return <span className="muted num" style={{ fontSize: '.8rem' }}><time dateTime={p.date}>{fmt(p.date)}</time> / {readingMinutes(p)} min</span>;
}

function Card({ p }: { p: BlogPost }) {
  return (
    <article className="post-card">
      <Meta p={p} />
      <h3 style={{ marginTop: 12 }}><Link href={`/blog/${p.slug}`} style={{ textDecoration: 'none' }}><InlineText text={p.title} /></Link></h3>
      <p>{p.excerpt}</p>
    </article>
  );
}

export default function BlogIndex() {
  const start = startHerePosts();
  const cats = categoriesWithPosts();
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }]} />
      <header className="page-head">
        <span className="eyebrow">Blog</span>
        <h1>Strategy, math and history</h1>
        <p>Every formula on the site is public. These {BLOG_POSTS.length} posts walk through them one argument at a time, with worked examples, and add what the formulas cannot: how to draft, how fantasy football values work, and how rare a perfect season really is.</p>
      </header>

      {start.length > 0 && (
        <section aria-labelledby="start-h" style={{ marginTop: 40 }}>
          <h2 id="start-h" className="eyebrow">Start here</h2>
          <div className="blog-cards" style={{ marginTop: 16 }}>{start.map((p) => <Card key={p.slug} p={p} />)}</div>
        </section>
      )}

      {cats.map((c) => (
        <section key={c} id={c.toLowerCase().replace(/[^a-z0-9]+/g, '-')} aria-labelledby={`cat-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} style={{ marginTop: 72 }}>
          <h2 id={`cat-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} style={{ marginBottom: 8 }}>{c}</h2>
          <p className="muted" style={{ maxWidth: '64ch', margin: '0 0 16px' }}>{CATEGORY_INTRO[c]}</p>
          <div className="blog-cards">{postsIn(c).map((p) => <Card key={p.slug} p={p} />)}</div>
        </section>
      ))}
      <PlayCta />
    </div>
  );
}
