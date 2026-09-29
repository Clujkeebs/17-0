import type { Metadata } from 'next';
import Link from 'next/link';
import { POSITION_GROUPS, POSITION_NAMES } from '@/lib/game/attributes';
import { pageMeta } from '@/lib/seo/meta';
import { attrLabel, positionSlug, weightsFor } from '@/lib/seo/positions';
import { loadGroup } from '@/lib/seo/queries';
import type { AttributeKey } from '@/lib/game/attributes';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

export const metadata: Metadata = pageMeta({
  title: 'NFL position rankings and rating formulas',
  description: 'Top players at all 11 position groups by EA Sports Madden NFL ratings, plus the exact attribute weights Gridiron Lab uses to grade each position.',
  path: '/positions',
});

export default async function PositionsPage() {
  const leaders = await Promise.all(POSITION_GROUPS.map(async (g) => ({ g, top: (await loadGroup(g, 1))[0] ?? null })));
  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Positions', path: '/positions' }]} />
      <span className="eyebrow">11 position groups</span>
      <h1>What each position is graded on</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>Overall is a summary. The formulas below are what 17-0 and Build a Player actually use. Each page ranks the top 50 at the position.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 32 }}>
        {leaders.map(({ g, top }) => {
          const w = (Object.entries(weightsFor(g)) as [AttributeKey, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3);
          return (
            <Link key={g} href={`/positions/${positionSlug(g)}`} className="card" style={{ textDecoration: 'none', display: 'block' }}>
              <span className="eyebrow">{g}</span>
              <h2 style={{ fontSize: '1.2rem' }}>{POSITION_NAMES[g]}</h2>
              <p className="muted" style={{ fontSize: '.88rem' }}>Leans on {w.map(([k, v]) => `${attrLabel(k).toLowerCase()} (${Math.round(v * 100)}%)`).join(', ')}.</p>
              {top && <p style={{ margin: 0, fontSize: '.9rem' }}>Top rated: {top.fullName} <span className="num accent">{top.overallRating}</span></p>}
            </Link>
          );
        })}
      </div>
      <PlayCta />
    </div>
  );
}
