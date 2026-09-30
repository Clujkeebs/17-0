import Link from 'next/link';
import { BLOG_POSTS } from '@/content/blog';
import { ArrowIcon } from './Icons';

/** Three latest posts as editorial cards. */
export function HomeBlogCards() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="container section" aria-labelledby="blog-h">
      <div className="sec-head">
        <div><span className="eyebrow">Film room</span><h2 id="blog-h">Notes on the numbers.</h2></div>
        <Link href="/blog">All posts</Link>
      </div>
      <div className="blog-cards">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="post-card">
            <span className="eyebrow">{new Date(`${p.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <h3>{p.title}</h3>
            <p>{p.excerpt}</p>
            <span className="more">Read <ArrowIcon size={14} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
