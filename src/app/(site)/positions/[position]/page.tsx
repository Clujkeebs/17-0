import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POSITION_NAMES, type AttributeKey } from '@/lib/game/attributes';
import { ratePlayer } from '@/lib/game/formulas';
import { pageMeta } from '@/lib/seo/meta';
import { FORMULA_NOTE, GROUP_PLURAL, POSITION_EXPLAINERS, attrLabel, groupFromSlug, positionSlug, weightsFor } from '@/lib/seo/positions';
import { loadGroup, loadTeamMap } from '@/lib/seo/queries';
import { BUILD_POSITIONS } from '@/lib/game/build';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayerTable } from '@/components/seo/PlayerTable';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ position: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = groupFromSlug((await params).position);
  if (!g) return pageMeta({ title: 'Position not found', description: 'No such position group.', path: '/positions', noindex: true });
  return pageMeta({
    title: `Best NFL ${GROUP_PLURAL[g]}: top 50 ${g} ratings`,
    description: `The top 50 ${GROUP_PLURAL[g]} by EA Sports Madden NFL ratings, plus the attribute weights Unbeaten uses to grade a ${POSITION_NAMES[g].toLowerCase()}.`,
    path: `/positions/${positionSlug(g)}`,
  });
}

export default async function PositionPage({ params }: Props) {
  const raw = (await params).position;
  const g = groupFromSlug(raw);
  if (!g) notFound();
  if (raw !== positionSlug(g)) notFound();
  const [players, teams] = await Promise.all([loadGroup(g, 50), loadTeamMap()]);
  const weights = (Object.entries(weightsFor(g)) as [AttributeKey, number][]).sort((a, b) => b[1] - a[1]);
  const buildPos = (BUILD_POSITIONS as readonly string[]).includes(g) ? g.toLowerCase() : null;
  const path = `/positions/${positionSlug(g)}`;

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Positions', path: '/positions' }, { name: POSITION_NAMES[g], path }]} />
      <span className="eyebrow">{g}</span>
      <h1>The top 50 {GROUP_PLURAL[g]}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32, margin: '24px 0 40px' }}>
        <section aria-labelledby="formula-h">
          <h2 id="formula-h" style={{ fontSize: '1.2rem' }}>What the formula weights</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {weights.map(([k, w]) => (
              <li key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 48px', gap: 12, alignItems: 'center', padding: '6px 0' }}>
                <div>
                  <div style={{ fontSize: '.9rem' }}>{attrLabel(k)}</div>
                  <div aria-hidden="true" style={{ height: 6, background: 'var(--surface)', marginTop: 4 }}>
                    <div style={{ height: 6, width: `${Math.round(w * 200)}%`, maxWidth: '100%', background: 'var(--orange)' }} />
                  </div>
                </div>
                <span className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{Math.round(w * 100)}%</span>
              </li>
            ))}
          </ul>
          {FORMULA_NOTE[g] && <p className="hint">{FORMULA_NOTE[g]}</p>}
        </section>
        <section aria-labelledby="explain-h">
          <h2 id="explain-h" style={{ fontSize: '1.2rem' }}>How to read it</h2>
          <p>{POSITION_EXPLAINERS[g]}</p>
          <div className="row">
            {buildPos && <Link className="btn btn-sm" href={`/games/build-a-player/${buildPos}`}>Build a {g}</Link>}
            <Link className="btn btn-sm" href="/blog/ea-sports-madden-nfl-ratings-explained">How the ratings work</Link>
          </div>
        </section>
      </div>

      {players.length ? (
        <PlayerTable players={players} teams={teams} caption={`Top 50 ${GROUP_PLURAL[g]} by overall rating`}
          extra={{ label: 'Grade', value: (p) => ratePlayer(p.attributes ?? {}, g).toFixed(1) }} />
      ) : <EmptyState title={`No ${GROUP_PLURAL[g]} loaded yet`} />}
      <PlayCta />
    </div>
  );
}
