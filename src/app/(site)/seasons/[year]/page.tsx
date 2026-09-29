import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageMeta } from '@/lib/seo/meta';
import { FIRST_SEASON, currentSeason, editionFor, eraFor } from '@/lib/seo/seasons';
import { loadTeamMap, loadTop } from '@/lib/seo/queries';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayerTable } from '@/components/seo/PlayerTable';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ year: string }> };

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const y = Number(raw);
  return y >= FIRST_SEASON && y <= currentSeason() ? y : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const y = parseYear((await params).year);
  if (!y) return pageMeta({ title: 'Season not found', description: 'No such season.', path: '/seasons', noindex: true });
  const cur = y === currentSeason();
  return pageMeta({
    title: cur ? `${y} NFL player ratings` : `${y} NFL season ratings era`,
    description: cur
      ? `The ${y} season on Gridiron Lab: ${editionFor(y)} ratings, the top players by overall, and the games built on them.`
      : `What the ${y} season looked like in ${editionFor(y)} terms, and where it sits in the history of the ratings.`,
    path: `/seasons/${y}`,
    noindex: !cur,
  });
}

export default async function SeasonPage({ params }: Props) {
  const y = parseYear((await params).year);
  if (!y) notFound();
  const cur = currentSeason();
  const isCur = y === cur;
  const era = eraFor(y);
  const top = isCur ? await loadTop(25) : [];
  const teams = isCur ? await loadTeamMap() : new Map();

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Seasons', path: '/seasons' }, { name: String(y), path: `/seasons/${y}` }]} />
      <span className="eyebrow">{editionFor(y)}</span>
      <h1><span className="num">{y}</span> season</h1>
      <p style={{ maxWidth: '66ch', fontSize: '1.1rem' }}>
        The {y} season was rated by {editionFor(y)}, part of what we call {era.name.toLowerCase()}. {era.summary}
      </p>
      {isCur ? (
        <>
          <p className="muted" style={{ maxWidth: '66ch' }}>This is the live season. Every player page, team page, and game on the site uses these ratings, refreshed by the nightly sync.</p>
          <h2 style={{ marginTop: 32 }}>Top 25 by overall</h2>
          {top.length ? <PlayerTable players={top} teams={teams} caption={`Top 25 players, ${y} season`} /> : <EmptyState />}
          <div className="row" style={{ marginTop: 24 }}>
            <Link className="btn btn-sm" href="/players">All players</Link>
            <Link className="btn btn-sm" href="/positions">By position</Link>
            <Link className="btn btn-sm" href="/teams">By team</Link>
          </div>
        </>
      ) : (
        <div className="card" style={{ maxWidth: 640, marginTop: 24 }}>
          <p style={{ marginTop: 0 }}>We do not keep player-level ratings for {y}. Gridiron Lab only stores the current edition, so there is no table here to pretend otherwise.</p>
          <div className="row">
            <Link className="btn btn-primary btn-sm" href={`/seasons/${cur}`}>See the {cur} ratings</Link>
            <Link className="btn btn-sm" href="/seasons">All seasons</Link>
            {y > FIRST_SEASON && <Link className="btn btn-sm" href={`/seasons/${y - 1}`}>{y - 1}</Link>}
            {y < cur && <Link className="btn btn-sm" href={`/seasons/${y + 1}`}>{y + 1}</Link>}
          </div>
        </div>
      )}
      <PlayCta />
    </div>
  );
}
