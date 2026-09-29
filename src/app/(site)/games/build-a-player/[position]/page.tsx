import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ATTRIBUTE_LABELS, POSITION_NAMES, type AttributeKey, type Attributes } from '@/lib/game/attributes';
import { BUILD_CATEGORIES, BUILD_POSITIONS, BUILD_TEAMS, buildRating, type BuildPosition } from '@/lib/game/build';
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
    description: `Build a ${pos} one attribute at a time from ${BUILD_TEAMS} random teams. The ${BUILD_CATEGORIES[pos].length} categories, the top 5 real ${GROUP_PLURAL[pos]}, and how the build is graded.`,
    path: `/games/build-a-player/${pos.toLowerCase()}`,
  });
}

export default async function BuildPositionPage({ params }: Props) {
  const pos = parse((await params).position);
  if (!pos) notFound();
  const cats = BUILD_CATEGORIES[pos];
  const [pool, teams] = await Promise.all([loadGroup(pos, 200), loadTeamMap()]);
  const scored = pool.map((p) => {
    const a: Attributes = {};
    for (const c of cats) a[c] = p.attributes?.[c] ?? 50;
    return { p, rating: buildRating(pos, a) };
  }).sort((x, y) => y.rating - x.rating).slice(0, 5);
  // Category leaders: the single best source for each category among the top 200.
  const leaders = cats.map((c) => {
    let best: { name: string; slug: string; v: number } | null = null;
    for (const p of pool) { const v = p.attributes?.[c]; if (typeof v === 'number' && (!best || v > best.v)) best = { name: p.fullName, slug: p.slug, v }; }
    return { c, best };
  });
  const path = `/games/build-a-player/${pos.toLowerCase()}`;
  const label = (k: AttributeKey) => ATTRIBUTE_LABELS[k];
  const faq = [
    { q: `How does Build a Player work for a ${pos}?`, a: `You get ${BUILD_TEAMS} random teams and ${cats.length} categories: ${cats.map((c) => label(c).toLowerCase()).join(', ')}. For each category you choose which team's ${POSITION_NAMES[pos].toLowerCase()} supplies that attribute. The finished build is graded on the site's ${pos} formula and simulated over a season.` },
    { q: `Who is the best real ${POSITION_NAMES[pos].toLowerCase()} for a build?`, a: scored[0] ? `${scored[0].p.fullName} grades highest across the ${pos} categories at ${scored[0].rating.toFixed(1)}. You will rarely get him whole, since the game gives you one attribute per pick.` : 'Ratings are not loaded yet. Check back after the next sync.' },
    { q: 'Which category matters most?', a: `The ones the ${pos} formula weights. Every formula input is a category, so the grade is decided by those picks. The other categories do not move the grade, though some of them feed the simulated season stat line.` },
    { q: 'Do I have to take the best player on each team?', a: `No. You draft one ${POSITION_NAMES[pos].toLowerCase()} from each of the ${BUILD_TEAMS} teams, then choose whose number to use for each category, and one player can supply as many categories as you like. A player who is elite at one weighted attribute is often a better source than the team's highest overall.` },
  ];

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Build a Player', path: '/games/build-a-player' }, { name: POSITION_NAMES[pos], path }]} />
      <JsonLd data={faqLd(faq)} />
      <span className="eyebrow">Build a Player / {pos}</span>
      <h1>Build the perfect {POSITION_NAMES[pos].toLowerCase()}</h1>
      <p style={{ maxWidth: '66ch', fontSize: '1.1rem' }}>{cats.length} categories, {BUILD_TEAMS} teams, one attribute per pick. The trick is knowing which team to spend on which category.</p>
      <div className="row" style={{ margin: '20px 0 36px' }}>
        <Link className="btn btn-primary" href={`/games/build-a-player?position=${pos}`}>Build a {pos}</Link>
        <Link className="btn" href={`/positions/${pos.toLowerCase()}`}>Top 50 {GROUP_PLURAL[pos]}</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
        <section aria-labelledby="cats-h">
          <h2 id="cats-h" style={{ fontSize: '1.2rem' }}>The categories, and who owns each</h2>
          {pool.length === 0 ? <p className="muted">Ratings are not loaded yet.</p> : (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table>
                <caption className="sr-only">Best available value in each {pos} category</caption>
                <thead><tr><th scope="col">Category</th><th scope="col">Best source</th><th scope="col" className="num">Value</th></tr></thead>
                <tbody>
                  {leaders.map(({ c, best }) => (
                    <tr key={c}><td>{label(c)}</td><td>{best ? <Link href={`/players/${best.slug}`}>{best.name}</Link> : '--'}</td><td className="num">{best?.v ?? '--'}</td></tr>
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
          <p className="hint">Build grade on the {pos} categories, not overall.</p>
        </section>
      </div>

      <section aria-labelledby="faq-h" style={{ marginTop: 40, maxWidth: 760 }}>
        <h2 id="faq-h">Questions</h2>
        {faq.map((f) => (<div key={f.q} style={{ marginBottom: 20 }}><h3>{f.q}</h3><p className="muted">{f.a}</p></div>))}
        <p><Link href="/blog/build-a-player-the-case-for-stealing-one-attribute">Build a Player: the case for stealing one attribute</Link></p>
      </section>

      <nav aria-label="Other positions" style={{ marginTop: 24 }}>
        <ul className="row" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {BUILD_POSITIONS.filter((x) => x !== pos).map((x) => (<li key={x}><Link className="btn btn-sm" href={`/games/build-a-player/${x.toLowerCase()}`}>{x}</Link></li>))}
        </ul>
      </nav>
      <PlayCta href={`/games/build-a-player?position=${pos}`} label={`Build a ${pos}`} title={`Your ${pos}, one steal at a time`} body={`${BUILD_TEAMS} teams, ${cats.length} categories. Take the best arm here, the best legs there, and see what the formula makes of it.`} />
    </div>
  );
}
