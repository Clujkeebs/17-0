import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { POSITION_NAMES, type AttributeKey } from '@/lib/game/attributes';
import { ratePlayer, letterGrade } from '@/lib/game/formulas';
import { pageMeta } from '@/lib/seo/meta';
import { safe } from '@/lib/seo/safe';
import { personLd } from '@/lib/seo/jsonld';
import { heightStr, ordinal } from '@/lib/seo/text';
import { keyAttributes, weightsFor, GROUP_PLURAL, positionSlug } from '@/lib/seo/positions';
import { attrRank, comparePath, groupOf, loadGroup, loadPlayer, loadTeamMap, nearest, rankOf, teamName } from '@/lib/seo/queries';
import { playerSummary } from '@/lib/seo/summary';
import { Avatar } from '@/components/Avatar';
import { JsonLd } from '@/components/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { AttrGrid } from '@/components/seo/AttrGrid';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const rows = await safe(() => db.select({ slug: schema.players.slug }).from(schema.players)
    .where(eq(schema.players.isActive, true)).orderBy(desc(schema.players.overallRating)).limit(50), [], 5000);
  return rows.map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const p = await loadPlayer(slug);
  if (!p) return null;
  const group = groupOf(p);
  const [pool, teams] = await Promise.all([loadGroup(group), loadTeamMap()]);
  const team = p.teamId != null ? teams.get(p.teamId) ?? null : null;
  const attrs = p.attributes ?? {};
  const weights = weightsFor(group);
  const weighted = (Object.keys(weights) as AttributeKey[]).filter((k) => typeof attrs[k] === 'number');
  const topKey = [...weighted].sort((a, b) => (attrs[b] ?? 0) - (attrs[a] ?? 0))[0];
  const weakKey = [...weighted].sort((a, b) => (attrs[a] ?? 0) - (attrs[b] ?? 0))[0];
  const topAttr = topKey ? { key: topKey, value: attrs[topKey]!, ...attrRank(pool, topKey, attrs[topKey]!) } : null;
  const weakAttr = weakKey && weakKey !== topKey ? { key: weakKey, value: attrs[weakKey]! } : null;
  const ovrRank = rankOf(pool.map((x) => x.overallRating), p.overallRating);
  const grade = ratePlayer(attrs, group);
  const related = nearest(pool, p, 3);
  const summary = playerSummary({
    slug: p.slug, fullName: p.fullName, group, ovr: p.overallRating, ovrRank, groupSize: Math.max(pool.length, 1),
    team: team ? teamName(team) : null, topAttr, weakAttr, formulaGrade: grade, age: p.age, yearsPro: p.yearsPro,
  });
  return { p, group, team, teams, attrs, weights, topAttr, ovrRank, poolSize: Math.max(pool.length, 1), grade, related, summary };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return pageMeta({ title: 'Player not found', description: 'No player with that URL.', path: `/players/${slug}`, noindex: true });
  return pageMeta({
    title: `${d.p.fullName} ratings: ${d.p.overallRating} OVR ${d.p.position}`,
    description: d.summary.slice(0, 160),
    path: `/players/${d.p.slug}`,
    image: d.p.imageBlobUrl ?? d.p.imageUrl,
  });
}

export default async function PlayerPage({ params }: Props) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { p, group, team, teams, attrs, weights, topAttr, ovrRank, poolSize, grade, related, summary } = d;
  const path = `/players/${p.slug}`;
  const color = team?.primaryColor ?? '#1B4332';
  const rival = related[0];
  const q = encodeURIComponent(p.fullName);
  const facts: [string, string | number | null | undefined][] = [
    ['Position', `${p.position} (${POSITION_NAMES[group]})`],
    ['Team', team ? teamName(team) : 'Free agent'],
    ['Jersey', p.jerseyNumber != null ? `#${p.jerseyNumber}` : null],
    ['Height', heightStr(p.heightInches)],
    ['Weight', p.weightLbs ? `${p.weightLbs} lb` : null],
    ['Age', p.age],
    ['Experience', p.yearsPro != null ? (p.yearsPro === 0 ? 'Rookie' : `${p.yearsPro} yr${p.yearsPro === 1 ? '' : 's'}`) : null],
    ['College', p.college],
    ['Archetype', p.archetype],
    ['Ratings edition', p.maddenVersion],
  ];

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Players', path: '/players' }, { name: POSITION_NAMES[group], path: `/positions/${positionSlug(group)}` }, { name: p.fullName, path }]} />
      <JsonLd data={personLd({
        name: p.fullName, path, jobTitle: `${POSITION_NAMES[group]}, American football`, image: p.imageBlobUrl ?? p.imageUrl,
        team: team ? { name: teamName(team), path: `/teams/${team.slug}` } : null,
        heightInches: p.heightInches, weightLbs: p.weightLbs, college: p.college, description: summary,
      })} />

      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end' }}>
        <Avatar name={p.fullName} src={p.imageBlobUrl ?? p.imageUrl} color={color} size={120} />
        <div style={{ flex: '1 1 260px' }}>
          <span className="eyebrow">{p.position}{team ? <> / <Link href={`/teams/${team.slug}`}>{teamName(team)}</Link></> : null}</span>
          <h1 style={{ marginBottom: 8 }}>{p.fullName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <span className="num">{ordinal(ovrRank)}</span> of <span className="num">{poolSize}</span> {GROUP_PLURAL[group]} by overall.
            {' '}17-0 grade <span className="num accent">{grade.toFixed(1)}</span> ({letterGrade(grade)}).
          </p>
        </div>
        <div>
          <span className="eyebrow">Overall</span>
          <div className="big-num" aria-label={`Overall rating ${p.overallRating}`}>{p.overallRating}</div>
        </div>
      </header>

      <p style={{ fontSize: '1.15rem', maxWidth: '68ch', marginTop: 32 }}>{summary}</p>

      <section aria-labelledby="attrs-h" style={{ marginTop: 32 }}>
        <h2 id="attrs-h">Key attributes for a {POSITION_NAMES[group].toLowerCase()}</h2>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Percentages mark the inputs to the site&apos;s {group} formula and their weight. {topAttr ? <>Best weighted attribute: {' '}<strong>{topAttr.value}</strong>, {ordinal(topAttr.rank)} of {topAttr.total} at the position.</> : null}
        </p>
        <AttrGrid keys={keyAttributes(group, attrs)} attrs={attrs} weights={weights} />
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginTop: 40 }}>
        <section aria-labelledby="bio-h">
          <h2 id="bio-h" style={{ fontSize: '1.3rem' }}>Bio</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 20px', margin: 0 }}>
            {facts.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}><dt className="muted">{k}</dt><dd style={{ margin: 0 }}>{v}</dd></div>
            ))}
          </dl>
          <p className="hint" style={{ marginTop: 16 }}>
            Verify elsewhere:{' '}
            <a href={`https://www.nfl.com/search/?query=${q}`} rel="nofollow noopener noreferrer" target="_blank">NFL.com</a>,{' '}
            <a href={`https://www.pro-football-reference.com/search/search.fcgi?search=${q}`} rel="nofollow noopener noreferrer" target="_blank">Pro Football Reference</a>.
          </p>
        </section>

        <section aria-labelledby="rel-h">
          <h2 id="rel-h" style={{ fontSize: '1.3rem' }}>Closest in the {group} ranks</h2>
          {related.length ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {related.map((r) => {
                const rt = r.teamId != null ? teams.get(r.teamId) : undefined;
                return (
                  <li key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '8px 0', borderBottom: '1px solid var(--steel)' }}>
                    <span className="num" style={{ fontWeight: 700, width: 28 }}>{r.overallRating}</span>
                    <Link href={`/players/${r.slug}`}>{r.fullName}</Link>
                    <span className="muted">{rt?.abbreviation ?? 'FA'}</span>
                  </li>
                );
              })}
            </ul>
          ) : <p className="muted">No other {GROUP_PLURAL[group]} loaded yet.</p>}
          <div className="row" style={{ marginTop: 16 }}>
            {rival && <Link className="btn btn-sm" href={comparePath(p.slug, rival.slug)}>Compare with {rival.fullName}</Link>}
            <Link className="btn btn-sm" href={`/positions/${positionSlug(group)}`}>All {GROUP_PLURAL[group]}</Link>
          </div>
        </section>
      </div>

      <PlayCta title={`Would you draft ${p.lastName} in 17-0?`} body={`A ${grade.toFixed(1)} grade at ${group}. Spin six teams and find out if the rest of your roster can keep up.`} />
    </div>
  );
}
