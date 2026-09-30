import type { Metadata } from 'next';
import Link from 'next/link';
import { TeamLogo } from '@/components/TeamLogo';
import { Avatar } from '@/components/Avatar';
import { resolvePlayerImage } from '@/lib/server/images';
import { POSITION_GROUPS, POSITION_NAMES } from '@/lib/game/attributes';
import { searchPlayers } from '@/lib/server/data';
import { pageMeta } from '@/lib/seo/meta';
import { safe } from '@/lib/seo/safe';
import { loadTeamMap, loadTop, teamName } from '@/lib/seo/queries';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayerTable } from '@/components/seo/PlayerTable';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const readQ = (q: string | string[] | undefined) => (Array.isArray(q) ? q[0] : q ?? '').trim().slice(0, 60);

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = readQ((await searchParams).q);
  return pageMeta({
    title: q ? `Player search: ${q}` : 'NFL player ratings, ranked',
    description: 'Every active NFL player ranked by EA Sports Madden NFL ratings overall, with position leaders, key attributes, and how each one grades in 17-0.',
    path: '/players',
    noindex: !!q,
  });
}

export default async function PlayersPage({ searchParams }: Props) {
  const q = readQ((await searchParams).q);
  const [top, teams] = await Promise.all([loadTop(100), loadTeamMap()]);
  const results = q.length >= 2 ? await safe(() => searchPlayers(q, 25), []) : null;

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Players', path: '/players' }]} />
      <span className="eyebrow">Player ratings</span>
      <h1>The top 100, by overall</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>
        Overall is EA&apos;s number. Each player page also shows the site&apos;s own position grade, which only counts the attributes that decide the job.
      </p>

      <form method="get" action="/players" role="search" style={{ maxWidth: 520, margin: '28px 0' }}>
        <label htmlFor="player-q">Search players</label>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input id="player-q" name="q" type="search" defaultValue={q} minLength={2} maxLength={60} placeholder="Last name, for example Kelce" autoComplete="off" />
          <button className="btn btn-primary" type="submit">Search</button>
        </div>
        <p className="hint">Two characters minimum.</p>
      </form>

      {q && (
        <section aria-labelledby="results-h" style={{ marginBottom: 40 }}>
          <h2 id="results-h" style={{ fontSize: '1.2rem' }}>
            {q.length < 2 ? 'Type at least two characters.' : results && results.length ? `${results.length} match${results.length === 1 ? '' : 'es'} for "${q}"` : `No players match "${q}".`}
          </h2>
          {results && results.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {results.map((r) => {
                const t = r.teamId != null ? teams.get(r.teamId) : undefined;
                return (
                  <li key={r.slug} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--steel)', alignItems: 'center' }}>
                    <span className="num" style={{ width: 32, fontWeight: 700 }}>{r.overallRating}</span>
                    <Avatar name={r.fullName} src={resolvePlayerImage(r)} color={t?.primaryColor ?? '#0A0A0A'} size={32} decorative />
                    <Link href={`/players/${r.slug}`}>{r.fullName}</Link>
                    <span className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{r.position}{t ? <>, <TeamLogo abbr={t.abbreviation} src={t.logoUrl} color={t.primaryColor} size={18} />{teamName(t)}</> : ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <nav aria-label="Browse by position" style={{ marginBottom: 32 }}>
        <span className="eyebrow">By position</span>
        <ul className="row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {POSITION_GROUPS.map((g) => (
            <li key={g}><Link className="btn btn-sm" href={`/positions/${g.toLowerCase()}`} title={POSITION_NAMES[g]}>{g}</Link></li>
          ))}
        </ul>
      </nav>

      {top.length ? <PlayerTable players={top} teams={teams} caption="Top 100 NFL players by overall rating" /> : <EmptyState />}
      <PlayCta />
    </div>
  );
}
