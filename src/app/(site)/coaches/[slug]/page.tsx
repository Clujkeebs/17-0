import type { Metadata } from 'next';
import Link from 'next/link';
import { TeamLogo } from '@/components/TeamLogo';
import { notFound } from 'next/navigation';
import { db, schema } from '@/db';
import { letterGrade } from '@/lib/game/formulas';
import { pageMeta } from '@/lib/seo/meta';
import { safe } from '@/lib/seo/safe';
import { personLd } from '@/lib/seo/jsonld';
import { ordinal } from '@/lib/seo/text';
import { avg, loadCoach, loadCoaches, loadRoster, loadTeamMap, teamName } from '@/lib/seo/queries';
import { Avatar } from '@/components/Avatar';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await safe(() => db.select({ slug: schema.coaches.slug }).from(schema.coaches), [], 5000);
  return rows.map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await loadCoach(slug);
  if (!c) return pageMeta({ title: 'Coach not found', description: 'No coach with that URL.', path: `/coaches/${slug}`, noindex: true });
  return pageMeta({
    title: `${c.fullName}: coach impact score ${c.coachImpactScore}`,
    description: `${c.fullName} has a coach impact score of ${c.coachImpactScore}, a ${c.careerWins}-${c.careerLosses} career record, and ${c.superBowlWins} Super Bowl ${c.superBowlWins === 1 ? 'win' : 'wins'}.`,
    path: `/coaches/${c.slug}`,
    image: c.imageUrl,
  });
}

export default async function CoachPage({ params }: Props) {
  const { slug } = await params;
  const c = await loadCoach(slug);
  if (!c) notFound();
  const [teams, all] = await Promise.all([loadTeamMap(), loadCoaches()]);
  const team = c.teamId != null ? teams.get(c.teamId) ?? null : null;
  const roster = team ? await loadRoster(team.id) : [];
  const rosterAvg = avg(roster.map((p) => p.overallRating));
  const path = `/coaches/${c.slug}`;
  const games = c.careerWins + c.careerLosses;
  const pct = games ? (c.careerWins / games).toFixed(3).replace(/^0/, '') : '.000';
  const rank = all.findIndex((x) => x.id === c.id) + 1;
  const winPct3 = c.recent3yrWinPct / 1000;
  const parts: [string, string, number][] = [
    ['Roster avg OVR', `${rosterAvg ? rosterAvg.toFixed(1) : '--'} x 0.35`, rosterAvg * 0.35],
    ['Win pct, last 3 seasons', `${winPct3.toFixed(3).replace(/^0/, '')} x 35`, winPct3 * 35],
    ['Playoff trips, last 3', `${c.playoffAppearances3yr} x 3`, c.playoffAppearances3yr * 3],
    ['Super Bowl wins', `${c.superBowlWins} x 6`, c.superBowlWins * 6],
    ['Years with team', `${c.yearsWithTeam} x 0.5`, c.yearsWithTeam * 0.5],
  ];

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Coaches', path: '/coaches' }, { name: c.fullName, path }]} />
      <JsonLd data={personLd({ name: c.fullName, path, jobTitle: 'NFL head coach', image: c.imageUrl, team: team ? { name: teamName(team), path: `/teams/${team.slug}` } : null })} />

      <header className="profile-hero">
        <div className="portrait"><Avatar name={c.fullName} src={c.imageUrl} color={team?.primaryColor ?? '#0A0A0A'} size={200} /></div>
        <div>
          <span className="eyebrow">Head coach{team ? <> &middot; <TeamLogo abbr={team.abbreviation} src={team.logoUrl} color={team.primaryColor} size={18} /> <Link href={`/teams/${team.slug}`}>{teamName(team)}</Link></> : null}</span>
          <h1>{c.fullName}</h1>
          {rank > 0 && <p className="lead"><span className="num">{ordinal(rank)}</span> of <span className="num">{all.length}</span> head coaches by impact score.</p>}
        </div>
        <div className="ovr-block">
          <span className="l">Impact score</span>
          <div className="big-num" aria-label={`Coach impact score ${c.coachImpactScore}`}>{c.coachImpactScore}</div>
        </div>
      </header>

      <div className="row" style={{ gap: 48, marginTop: 40 }}>
        <div className="stat"><span className="l">Career record</span><span className="v">{c.careerWins}-{c.careerLosses}</span></div>
        <div className="stat"><span className="l">Win pct</span><span className="v">{pct}</span></div>
        <div className="stat"><span className="l">Super Bowls</span><span className="v">{c.superBowlWins}</span></div>
        <div className="stat"><span className="l">Seasons with team</span><span className="v">{c.yearsWithTeam}</span></div>
        <div className="stat"><span className="l">17-0 grade</span><span className="v accent">{letterGrade(c.coachImpactScore)}</span></div>
      </div>

      <section aria-labelledby="calc-h" style={{ marginTop: 72, maxWidth: 720 }}>
        <h2 id="calc-h">Where the score comes from</h2>
        <p className="muted">The impact score is capped at 99. The stored score is refreshed by the nightly sync, so the sum below can drift a point or two from it between updates.</p>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table>
            <caption className="sr-only">Coach impact score components for {c.fullName}</caption>
            <thead><tr><th scope="col">Input</th><th scope="col" className="num">Calculation</th><th scope="col" className="num">Points</th></tr></thead>
            <tbody>
              {parts.map(([k, calc, v]) => (
                <tr key={k}><td>{k}</td><td className="num muted">{calc}</td><td className="num">{v.toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ marginTop: 16 }}><Link href="/blog/coach-impact-score-explained">Read the full explanation of the coach impact score</Link>.</p>
      </section>

      <PlayCta title={`${c.fullName} is 15 percent of a season`} body="The head coach slot carries the same weight as your running back. Pick well." />
    </div>
  );
}
