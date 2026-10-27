import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getPost, readingMinutes, relatedPosts, wordCount } from '@/content/blog';
import { SITE } from '@/lib/site';
import { absUrl, pageMeta } from '@/lib/seo/meta';
import { InlineText } from '@/components/blog/InlineText';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() { return BLOG_POSTS.map((p) => ({ slug: p.slug })); }

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) return pageMeta({ title: 'Post not found', description: 'No post with that URL.', path: '/blog', noindex: true });
  return { ...pageMeta({ title: p.title, description: p.excerpt, path: `/blog/${p.slug}`, type: 'article' }), authors: [{ name: SITE.name }] };
}

const slugId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();
  const path = `/blog/${p.slug}`;
  const others = relatedPosts(p, 3);
  const showContents = p.sections.length >= 4;

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }, { name: p.title, path }]} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, articleSection: p.category,
        datePublished: p.date, dateModified: p.updated ?? p.date, wordCount: wordCount(p), url: absUrl(path), mainEntityOfPage: absUrl(path),
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url, logo: { '@type': 'ImageObject', url: absUrl('/icon.svg') } },
      }} />
      <article className="prose">
        <header style={{ marginBottom: 32 }}>
          <span className="eyebrow">{p.category} / <time dateTime={p.date}>{longDate(p.date)}</time> / {readingMinutes(p)} min read{p.updated && p.updated !== p.date ? <> / Updated <time dateTime={p.updated}>{longDate(p.updated)}</time></> : null}</span>
          <h1><InlineText text={p.title} /></h1>
          <p style={{ fontSize: '1.2rem' }} className="muted">{p.excerpt}</p>
        </header>
        {showContents && (
          <nav aria-label="In this post" className="card" style={{ marginBottom: 32 }}>
            <strong>In this post</strong>
            <ol style={{ margin: '8px 0 0' }}>{p.sections.map((s) => <li key={s.h2}><a href={`#${slugId(s.h2)}`}><InlineText text={s.h2} /></a></li>)}</ol>
          </nav>
        )}
        {p.sections.map((s) => (
          <section key={s.h2} aria-labelledby={slugId(s.h2)}>
            <h2 id={slugId(s.h2)}><InlineText text={s.h2} /></h2>
            {s.paragraphs.map((para, i) => <p key={i}><InlineText text={para} /></p>)}
            {s.list && <ul>{s.list.map((li, i) => <li key={i}><InlineText text={li} /></li>)}</ul>}
            {s.table && (
              <div className="table-wrap" tabIndex={0} role="region" aria-label={s.table.caption}>
                <table>
                  <caption className="sr-only">{s.table.caption}</caption>
                  <thead><tr>{s.table.head.map((h, i) => <th key={h} scope="col" className={i > 0 ? 'num' : undefined}>{h}</th>)}</tr></thead>
                  <tbody>{s.table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 ? 'num' : undefined}>{c}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            {s.closing?.map((para, i) => <p key={`c${i}`}><InlineText text={para} /></p>)}
          </section>
        ))}
        <p className="muted" style={{ marginTop: 40, fontSize: '.92rem' }}>
          Found an error? <Link href="/contact">Tell us</Link> and we will fix it and note the change here. How we source our numbers is on the <Link href="/about">about page</Link>.
        </p>
      </article>

      <PlayCta />

      <nav aria-labelledby="next-h" style={{ marginTop: 48 }}>
        <h2 id="next-h" className="eyebrow">Keep reading</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          {others.map((o) => (
            <li key={o.slug} className="card">
              <Link href={`/blog/${o.slug}`} style={{ fontWeight: 700 }}><InlineText text={o.title} /></Link>
              <p className="muted" style={{ fontSize: '.88rem', margin: '6px 0 0' }}>{o.excerpt}</p>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
