import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PositionGroup } from '@/lib/game/attributes';
import { letterGrade, ratePlayer } from '@/lib/game/formulas';
import { SLOT_LABELS, SLOT_WEIGHTS, type Slot } from '@/lib/game/seventeen';
import type { PlayerRow } from '@/lib/server/data';
import { pageMeta } from '@/lib/seo/meta';
import { faqLd } from '@/lib/seo/jsonld';
import { groupOf, loadRoster, loadTeam, loadTeamCoach, teamName } from '@/lib/seo/queries';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ team: string }> };

const SLOT_OF: Partial<Record<PositionGroup, Slot>> = { QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', DL: 'DEF', EDGE: 'DEF', LB: 'DEF', CB: 'DEF', S: 'DEF' };

function draftable(roster: PlayerRow[]) {
  return roster
    .map((p) => { const g = groupOf(p); return { p, g, slot: SLOT_OF[g], grade: ratePlayer(p.attributes ?? {}, g) }; })
    .filter((x): x is typeof x & { slot: Slot } => !!x.slot)
    .sort((a, b) => b.p.overallRating - a.p.overallRating || b.grade - a.grade)
    .slice(0, 6);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTeam((await params).team);
  if (!t) return pageMeta({ title: 'Team not found', description: 'No team with that URL.', path: '/games/17-0', noindex: true });
  const name = teamName(t);
  return pageMeta({
    title: `Can a ${name} roster go 17-0?`,
    description: `The six best draftable ${name} players for 17-0, what each slot is worth, and whether a roster built around them can run the table.`,
    path: `/games/17-0/${t.slug}`,
  });
}

export default async function TeamSeventeenPage({ params }: Props) {
  const t = await loadTeam((await params).team);
  if (!t) notFound();
  const [roster, coach] = await Promise.all([loadRoster(t.id), loadTeamCoach(t.id)]);
  const name = teamName(t);
  const path = `/games/17-0/${t.slug}`;
  const picks = draftable(roster);
  const best = picks[0];
  const qb = picks.find((x) => x.slot === 'QB');

  const faq = [
    { q: `Can a roster built around the ${name} go 17-0?`, a: `Only with help. 17-0 takes one player from each of six random teams, so no single franchise fills your roster. ${best ? `The ${t.name} give you ${best.p.fullName} (${best.p.overallRating} overall) as their strongest option, ` : ''}and the rest depends on the other five spins and a win total that includes a seeded jitter of minus 2 to plus 1.` },
    { q: `Who is the best ${t.name} player to draft in 17-0?`, a: best ? `${best.p.fullName}, ${best.p.position}, with a ${best.p.overallRating} overall and a ${best.grade.toFixed(1)} grade on the site's ${best.g} formula. The ${SLOT_LABELS[best.slot]} slot is worth ${Math.round(SLOT_WEIGHTS[best.slot] * 100)} percent of team strength.` : `Ratings for the ${name} are not loaded yet. Check back after the next sync.` },
    { q: 'How much does each slot count?', a: 'Quarterback is 25 percent, defense 20, running back, wide receiver, and head coach 15 each, and tight end 10. Projected wins are team strength minus 60, divided by 27, times 17, plus a seeded jitter from minus 2 to plus 1, clamped between 0 and 17.' },
    { q: `Should I take the ${t.name} head coach?`, a: coach ? `${coach.fullName} has a coach impact score of ${coach.coachImpactScore}. The HC slot is 15 percent of team strength, the same as your running back, so a strong coach on a weak roster is often the right pick.` : 'The head coach slot is 15 percent of team strength. Coach data for this team is not loaded yet.' },
  ];

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: '17-0', path: '/games/17-0' }, { name, path }]} />
      <JsonLd data={faqLd(faq)} />
      <span className="eyebrow">17-0 / {t.abbreviation}</span>
      <h1>Can a roster built around the {name} go 17-0?</h1>
      <p style={{ maxWidth: '66ch', fontSize: '1.1rem' }}>
        {best
          ? <>Start with {best.p.fullName}. {qb && qb !== best ? <>{qb.p.fullName} at quarterback is the other name that moves the needle, since QB is a quarter of team strength. </> : null}After that, it is up to the other five spins.</>
          : <>When the {t.name} come up on the reel, you get one pick from their roster. Here is who is worth it.</>}
      </p>

      {picks.length === 0 ? <EmptyState title="Roster not loaded yet" /> : (
        <ol style={{ listStyle: 'none', padding: 0, margin: '32px 0 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {picks.map(({ p, g, slot, grade }, i) => (
            <li key={p.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span className="num muted" style={{ fontSize: '.85rem' }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <span className="eyebrow" style={{ marginBottom: 2 }}>{SLOT_LABELS[slot]} slot, {Math.round(SLOT_WEIGHTS[slot] * 100)}%</span>
                <Link href={`/players/${p.slug}`} style={{ fontWeight: 700 }}>{p.fullName}</Link>
                <div className="muted" style={{ fontSize: '.85rem' }}>{p.position}, {g} grade <span className="num">{grade.toFixed(1)}</span> ({letterGrade(grade)})</div>
              </div>
              <span className="num" style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{p.overallRating}</span>
            </li>
          ))}
        </ol>
      )}

      {coach && (
        <p style={{ marginTop: 24 }}>Head coach: <Link href={`/coaches/${coach.slug}`}>{coach.fullName}</Link>, impact score <span className="num accent">{coach.coachImpactScore}</span>.</p>
      )}

      <section aria-labelledby="faq-h" style={{ marginTop: 40, maxWidth: 760 }}>
        <h2 id="faq-h">Questions</h2>
        {faq.map((f) => (
          <div key={f.q} style={{ marginBottom: 20 }}>
            <h3>{f.q}</h3>
            <p className="muted">{f.a}</p>
          </div>
        ))}
        <p><Link href={`/teams/${t.slug}`}>Full {name} roster</Link> / <Link href="/blog/the-math-behind-the-projected-record">The math behind the projected record</Link></p>
      </section>

      <PlayCta title="Spin the reel" body={`The ${t.name} are one of 32 teams on the reel. Six spins, six picks, one season.`} />
    </div>
  );
}
