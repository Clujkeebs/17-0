import Link from 'next/link';
import { BLOG_POSTS } from '@/content/blog';

/** Three blog cards in an asymmetric layout: one lead, two stacked. */
export function HomeBlogCards() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="container section" aria-labelledby="blog-h">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 id="blog-h" style={{ margin: 0 }}>From the film room</h2>
        <Link href="/blog">All posts</Link>
      </div>
      <div className="blog-cards">
        {posts.map((p, i) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className={`tile ${i === 0 ? 'tile-wide' : ''}`} style={{ minHeight: i === 0 ? 320 : 150 }}>
            <span className="eyebrow">{new Date(`${p.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <h3 style={{ fontSize: i === 0 ? '1.6rem' : '1.1rem' }}>{p.title}</h3>
            {i === 0 && <p className="muted">{p.excerpt}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
