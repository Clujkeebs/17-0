import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BLOG_POSTS, getPost, readingMinutes, wordCount } from '@/content/blog';
import { SITE } from '@/lib/site';
import { absUrl, pageMeta } from '@/lib/seo/meta';
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

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const p = getPost(slug);
  if (!p) notFound();
  const path = `/blog/${p.slug}`;
  const others = BLOG_POSTS.filter((x) => x.slug !== p.slug).slice(0, 3);
  const date = new Date(`${p.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Blog', path: '/blog' }, { name: p.title, path }]} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt,
        datePublished: p.date, dateModified: p.date, wordCount: wordCount(p), url: absUrl(path), mainEntityOfPage: absUrl(path),
        author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url, logo: { '@type': 'ImageObject', url: absUrl('/icon.svg') } },
      }} />
      <article className="prose">
        <header style={{ marginBottom: 32 }}>
          <span className="eyebrow"><time dateTime={p.date}>{date}</time> / {readingMinutes(p)} min read</span>
          <h1>{p.title}</h1>
          <p style={{ fontSize: '1.2rem' }} className="muted">{p.excerpt}</p>
        </header>
        {p.sections.map((s) => (
          <section key={s.h2} aria-labelledby={slugId(s.h2)}>
            <h2 id={slugId(s.h2)}>{s.h2}</h2>
            {s.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
          </section>
        ))}
      </article>

      <PlayCta />

      <nav aria-labelledby="next-h" style={{ marginTop: 48 }}>
        <h2 id="next-h" className="eyebrow">Keep reading</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
          {others.map((o) => (
            <li key={o.slug} className="card">
              <Link href={`/blog/${o.slug}`} style={{ fontWeight: 700 }}>{o.title}</Link>
              <p className="muted" style={{ fontSize: '.88rem', margin: '6px 0 0' }}>{o.excerpt}</p>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
