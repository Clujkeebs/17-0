import Link from 'next/link';
import { startHerePosts } from '@/content/blog';
import { InlineText } from '@/components/blog/InlineText';
import { ArrowIcon } from './Icons';

/** The three posts to read first, as editorial cards. */
export function HomeBlogCards() {
  const posts = startHerePosts();
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
            <h3><InlineText text={p.title} /></h3>
            <p>{p.excerpt}</p>
            <span className="more">Read <ArrowIcon size={14} /></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
