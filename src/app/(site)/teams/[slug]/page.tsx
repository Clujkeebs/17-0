import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { POSITION_GROUPS, POSITION_NAMES, type PositionGroup } from '@/lib/game/attributes';
import type { PlayerRow } from '@/lib/server/data';
import { pageMeta } from '@/lib/seo/meta';
import { safe } from '@/lib/seo/safe';
import { sportsTeamLd } from '@/lib/seo/jsonld';
import { avg, divisionLabel, groupOf, loadRoster, loadTeam, loadTeamCoach, teamName } from '@/lib/seo/queries';
import { JsonLd } from '@/components/JsonLd';
import { Monogram } from '@/components/Avatar';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await safe(() => db.select({ slug: schema.teams.slug }).from(schema.teams).orderBy(asc(schema.teams.slug)), [], 5000);
  return rows.map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await loadTeam(slug);
  if (!t) return pageMeta({ title: 'Team not found', description: 'No team with that URL.', path: `/teams/${slug}`, noindex: true });
  const name = teamName(t);
  return pageMeta({
    title: `${name} roster ratings`,
    description: `${name} roster by position group with EA Sports Madden NFL ratings, average overall, and the head coach's impact score.`,
    path: `/teams/${t.slug}`,
  });
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params;
  const t = await loadTeam(slug);
  if (!t) notFound();
  const [roster, coach] = await Promise.all([loadRoster(t.id), loadTeamCoach(t.id)]);
  const name = teamName(t);
  const path = `/teams/${t.slug}`;
  const byGroup = new Map<PositionGroup, PlayerRow[]>();
  for (const p of roster) { const g = groupOf(p); byGroup.set(g, [...(byGroup.get(g) ?? []), p]); }
  const avgOvr = avg(roster.map((p) => p.overallRating));
  const top22 = avg(roster.slice(0, 22).map((p) => p.overallRating));

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Teams', path: '/teams' }, { name, path }]} />
      <JsonLd data={sportsTeamLd({ name, path, logo: t.logoUrl, coach: coach?.fullName, members: roster.slice(0, 25).map((p) => p.fullName) })} />

      <header className="profile-hero">
        {t.logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="team-logo" src={t.logoUrl} alt={`${name} logo`} width={160} height={160} />
          : <div className="portrait"><Monogram name={name} color={t.primaryColor} size={200} /></div>}
        <div>
          <span className="eyebrow">{divisionLabel(t)}</span>
          <h1>{name}</h1>
          <p className="lead">
            {roster.length} active players.
            {coach ? <> Head coach <Link href={`/coaches/${coach.slug}`}>{coach.fullName}</Link>, impact score <span className="num accent">{coach.coachImpactScore}</span>.</> : null}
          </p>
        </div>
        <div className="row" style={{ gap: 40 }}>
          <div className="stat"><span className="l">Roster avg OVR</span><span className="v">{roster.length ? avgOvr.toFixed(1) : '--'}</span></div>
          <div className="stat"><span className="l">Top 22 avg</span><span className="v">{roster.length ? top22.toFixed(1) : '--'}</span></div>
        </div>
      </header>

      <div className="row" style={{ marginTop: 32 }}>
        <Link className="btn btn-primary" href={`/games/17-0/${t.slug}`}>Can the {t.name} go 17-0?</Link>
        {coach && <Link className="btn" href={`/coaches/${coach.slug}`}>Coach profile</Link>}
      </div>

      {roster.length === 0 ? <div style={{ marginTop: 32 }}><EmptyState title="Roster not loaded yet" /></div> : (
        <div style={{ marginTop: 72 }}>
          {POSITION_GROUPS.filter((g) => byGroup.has(g)).map((g) => {
            const ps = byGroup.get(g)!;
            return (
              <section key={g} aria-labelledby={`g-${g}`} style={{ marginBottom: 56 }}>
                <h2 id={`g-${g}`} style={{ fontSize: '1.5rem', display: 'flex', gap: 14, alignItems: 'baseline' }}>
                  <Link href={`/positions/${g.toLowerCase()}`} style={{ textDecoration: 'none' }}>{POSITION_NAMES[g]}</Link>
                  <span className="muted num" style={{ fontSize: '.9rem', fontWeight: 400 }}>avg {avg(ps.map((p) => p.overallRating)).toFixed(1)}</span>
                </h2>
                <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
                  <table className="roster-table">
                    <caption className="sr-only">{name} {POSITION_NAMES[g]} ratings</caption>
                    <thead><tr><th scope="col">Player</th><th scope="col">Pos</th><th scope="col" className="num">#</th><th scope="col" className="num">Age</th><th scope="col" className="num">OVR</th></tr></thead>
                    <tbody>
                      {ps.map((p) => (
                        <tr key={p.id}>
                          <td><Link href={`/players/${p.slug}`}>{p.fullName}</Link></td>
                          <td className="muted">{p.position}</td>
                          <td className="num muted">{p.jerseyNumber ?? ''}</td>
                          <td className="num muted">{p.age ?? ''}</td>
                          <td className="num" style={{ fontWeight: 700 }}>{p.overallRating}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}
      <PlayCta title={`Draft from the ${t.name}`} body={`The ${name} could show up in any spin. Know who you would take before the reel stops.`} />
    </div>
  );
}
