import type { Metadata } from 'next';
import Link from 'next/link';
import { POSITION_NAMES } from '@/lib/game/attributes';
import { pageMeta } from '@/lib/seo/meta';
import { comparePath, topMatchups } from '@/lib/seo/queries';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'Player comparisons: top matchups by position',
  description: 'Side-by-side EA Sports Madden NFL ratings for the best players at every position, with a verdict from the 17-0 grading formula.',
  path: '/compare',
});

export default async function CompareIndex() {
  const groups = await topMatchups();
  const any = groups.some((g) => g.pairs.length);
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Compare', path: '/compare' }]} />
      <span className="eyebrow">Head to head</span>
      <h1>The matchups worth arguing about</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>The top three at every position, paired off. Any two players can be compared: open a player page and use the compare link.</p>
      {!any ? <EmptyState /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, marginTop: 32 }}>
          {groups.filter((g) => g.pairs.length).map(({ group, pairs }) => (
            <section key={group} aria-labelledby={`c-${group}`} className="card">
              <h2 id={`c-${group}`} style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>{POSITION_NAMES[group]}</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {pairs.map(([a, b]) => (
                  <li key={`${a.slug}-${b.slug}`} style={{ padding: '6px 0' }}>
                    <Link href={comparePath(a.slug, b.slug)}>{a.fullName} vs {b.fullName}</Link>{' '}
                    <span className="num muted">{a.overallRating}/{b.overallRating}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <PlayCta />
    </div>
  );
}
