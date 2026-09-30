import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POSITION_NAMES } from '@/lib/game/attributes';
import { BUILD_POSITIONS, BUILD_TEAMS, TRAITS, traitValue, type BuildPosition } from '@/lib/game/build';
import { pageMeta } from '@/lib/seo/meta';
import { faqLd } from '@/lib/seo/jsonld';
import { GROUP_PLURAL } from '@/lib/seo/positions';
import { loadGroup, loadTeamMap } from '@/lib/seo/queries';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { EmptyState } from '@/components/seo/EmptyState';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ position: string }> };

function parse(raw: string): BuildPosition | null {
  if (raw !== raw.toLowerCase()) return null;
  const up = raw.toUpperCase();
  return (BUILD_POSITIONS as readonly string[]).includes(up) ? (up as BuildPosition) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pos = parse((await params).position);
  if (!pos) return pageMeta({ title: 'Position not found', description: 'No such Build a Player position.', path: '/games/build-a-player', noindex: true });
  return pageMeta({
    title: `Build a Player: the perfect ${POSITION_NAMES[pos].toLowerCase()}`,
    description: `Build a ${pos} one trait at a time from ${BUILD_TEAMS} spins. The ${TRAITS[pos].length} weighted traits, the top 5 real ${GROUP_PLURAL[pos]}, and how the build is graded.`,
    path: `/games/build-a-player/${pos.toLowerCase()}`,
  });
}

export default async function BuildPositionPage({ params }: Props) {
  const pos = parse((await params).position);
  if (!pos) notFound();
  const traits = TRAITS[pos];
  const [pool, teams] = await Promise.all([loadGroup(pos, 200), loadTeamMap()]);
  const scoreOf = (a: Parameters<typeof traitValue>[0]) => Math.round(traits.reduce((sum, t) => sum + traitValue(a, t) * t.weight, 0) * 10) / 10;
  const scored = pool.map((p) => ({ p, rating: scoreOf(p.attributes ?? {}) })).sort((x, y) => y.rating - x.rating).slice(0, 5);
  // Trait leaders: the single best source for each trait among the top 200.
  const leaders = traits.map((t) => {
    let best: { name: string; slug: string; v: number } | null = null;
    for (const p of pool) { const v = traitValue(p.attributes ?? {}, t); if (!best || v > best.v) best = { name: p.fullName, slug: p.slug, v }; }
    return { t, best };
  });
  const path = `/games/build-a-player/${pos.toLowerCase()}`;
  const pct = (w: number) => `${Math.round(w * 100)} percent`;
  const heaviest = [...traits].sort((a, b) => b.weight - a.weight)[0];
  const faq = [
    { q: `How does Build a Player work for a ${pos}?`, a: `The reel spins ${BUILD_TEAMS} times, one team per spin, and no team repeats. Each ${POSITION_NAMES[pos].toLowerCase()} on that team shows his rating for every trait you still need. You tap one trait to take from one player, then the reel spins again. The fifth placement completes the build. The ${pos} traits are ${traits.map((t) => `${t.label.toLowerCase()} (${pct(t.weight)})`).join(', ')}.` },
    { q: `Who is the best real ${POSITION_NAMES[pos].toLowerCase()} for a build?`, a: scored[0] ? `${scored[0].p.fullName} scores highest across the ${pos} traits at ${scored[0].rating.toFixed(1)}. You will never get him whole, since each spin gives you one trait from one player.` : 'Ratings are not loaded yet. Check back after the next sync.' },
    { q: 'Which trait matters most?', a: `For a ${pos}, ${heaviest.label.toLowerCase()} carries the most weight at ${pct(heaviest.weight)}. Your score is the weighted sum of the five traits you placed, and the result also shows the best score those same five teams could have produced.` },
    { q: 'Do I have to take the best player on each team?', a: `No. You take one trait from one player per spin. A backup who is elite at a heavily weighted trait is often a better use of that spin than the team's highest overall, and a trait you fill early is a trait you cannot upgrade later.` },
  ];

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Build a Player', path: '/games/build-a-player' }, { name: POSITION_NAMES[pos], path }]} />
      <JsonLd data={faqLd(faq)} />
      <span className="eyebrow">Build a Player / {pos}</span>
      <h1>Build the perfect {POSITION_NAMES[pos].toLowerCase()}</h1>
      <p style={{ maxWidth: '66ch', fontSize: '1.1rem' }}>{traits.length} traits, {BUILD_TEAMS} spins, one trait per spin. The trick is knowing which spin to spend on which trait.</p>
      <div className="row" style={{ margin: '20px 0 36px' }}>
        <Link className="btn btn-primary" href={`/games/build-a-player?position=${pos}`}>Build a {pos}</Link>
        <Link className="btn" href={`/positions/${pos.toLowerCase()}`}>Top 50 {GROUP_PLURAL[pos]}</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
        <section aria-labelledby="cats-h">
          <h2 id="cats-h" style={{ fontSize: '1.2rem' }}>The traits, and who owns each</h2>
          {pool.length === 0 ? <p className="muted">Ratings are not loaded yet.</p> : (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table>
                <caption className="sr-only">Weight and best available rating for each {pos} trait</caption>
                <thead><tr><th scope="col">Trait</th><th scope="col" className="num">Weight</th><th scope="col">Best source</th><th scope="col" className="num">Value</th></tr></thead>
                <tbody>
                  {leaders.map(({ t, best }) => (
                    <tr key={t.key}><td>{t.label}</td><td className="num">{Math.round(t.weight * 100)}%</td><td>{best ? <Link href={`/players/${best.slug}`}>{best.name}</Link> : '--'}</td><td className="num">{best?.v ?? '--'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section aria-labelledby="top-h">
          <h2 id="top-h" style={{ fontSize: '1.2rem' }}>Top 5 real {GROUP_PLURAL[pos]} as builds</h2>
          {scored.length === 0 ? <EmptyState title={`No ${GROUP_PLURAL[pos]} loaded yet`} cta={{ href: `/games/build-a-player?position=${pos}`, label: `Build a ${pos}` }} /> : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {scored.map(({ p, rating }, i) => {
                const t = p.teamId != null ? teams.get(p.teamId) : undefined;
                return (
                  <li key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--steel)' }}>
                    <span className="num muted">{i + 1}</span>
                    <Link href={`/players/${p.slug}`}>{p.fullName}</Link>
                    <span className="muted">{t?.abbreviation ?? 'FA'}</span>
                    <span className="num" style={{ marginLeft: 'auto', fontWeight: 700 }}>{rating.toFixed(1)}</span>
                  </li>
                );
              })}
            </ol>
          )}
          <p className="hint">Weighted score on the {pos} traits, not overall.</p>
        </section>
      </div>

      <section aria-labelledby="faq-h" style={{ marginTop: 40, maxWidth: 760 }}>
        <h2 id="faq-h">Questions</h2>
        {faq.map((f) => (<div key={f.q} style={{ marginBottom: 20 }}><h3>{f.q}</h3><p className="muted">{f.a}</p></div>))}
        <p><Link href="/blog/build-a-player-the-case-for-stealing-one-attribute">Build a Player: the case for stealing one trait</Link></p>
      </section>

      <nav aria-label="Other positions" style={{ marginTop: 24 }}>
        <ul className="row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {BUILD_POSITIONS.filter((x) => x !== pos).map((x) => (<li key={x}><Link className="btn btn-sm" href={`/games/build-a-player/${x.toLowerCase()}`}>{x}</Link></li>))}
        </ul>
      </nav>
      <PlayCta href={`/games/build-a-player?position=${pos}`} label={`Build a ${pos}`} title={`Your ${pos}, one steal at a time`} body={`${BUILD_TEAMS} spins, ${traits.length} traits. Take the best ${traits[0].label.toLowerCase()} here, the best ${traits[1].label.toLowerCase()} there, and see what the weights make of it.`} />
    </div>
  );
}
