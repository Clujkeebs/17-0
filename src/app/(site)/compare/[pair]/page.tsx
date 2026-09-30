import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { POSITION_NAMES, type AttributeKey } from '@/lib/game/attributes';
import { ratePlayer } from '@/lib/game/formulas';
import type { PlayerRow } from '@/lib/server/data';
import { pageMeta } from '@/lib/seo/meta';
import { keyAttributes, attrLabel, weightsFor } from '@/lib/seo/positions';
import { comparePath, groupOf, loadPlayer, loadTeamMap, teamName } from '@/lib/seo/queries';
import { lastWord } from '@/lib/seo/text';
import { Avatar } from '@/components/Avatar';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { PlayCta } from '@/components/seo/PlayCta';

export const revalidate = 86400;
export const dynamicParams = true;
export async function generateStaticParams() { return []; }

type Props = { params: Promise<{ pair: string }> };

async function resolvePair(pair: string): Promise<[PlayerRow, PlayerRow] | null> {
  const parts = pair.split('-vs-');
  if (parts.length < 2 || parts.length > 4) return null;
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join('-vs-'), b = parts.slice(i).join('-vs-');
    if (!a || !b || a === b) continue;
    const [pa, pb] = await Promise.all([loadPlayer(a), loadPlayer(b)]);
    if (pa && pb) return [pa, pb];
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pair } = await params;
  const r = await resolvePair(pair);
  if (!r) return pageMeta({ title: 'Comparison not found', description: 'One of those players could not be found.', path: '/compare', noindex: true });
  const [a, b] = r;
  return pageMeta({
    title: `${a.fullName} vs ${b.fullName}: ratings compared`,
    description: `${a.fullName} (${a.overallRating} OVR) against ${b.fullName} (${b.overallRating} OVR), attribute by attribute, with a verdict from the 17-0 position formula.`,
    path: comparePath(a.slug, b.slug),
  });
}

export default async function ComparePage({ params }: Props) {
  const { pair } = await params;
  const r = await resolvePair(pair);
  if (!r) notFound();
  const canonical = comparePath(r[0].slug, r[1].slug);
  if (`/compare/${pair}` !== canonical) permanentRedirect(canonical);
  const [a, b] = r;
  const teams = await loadTeamMap();
  const ga = groupOf(a), gb = groupOf(b);
  const same = ga === gb;
  const keys: AttributeKey[] = [...new Set([...keyAttributes(ga, a.attributes), ...(same ? [] : keyAttributes(gb, b.attributes))])];
  // Grade both on the first player's formula so the comparison is apples to apples.
  const gradeA = ratePlayer(a.attributes ?? {}, ga), gradeB = ratePlayer(b.attributes ?? {}, ga);
  const weights = weightsFor(ga);
  let winsA = 0, winsB = 0;
  const rows = keys.map((k) => {
    const va = a.attributes?.[k], vb = b.attributes?.[k];
    const w = va != null && vb != null && va !== vb ? (va > vb ? 'a' : 'b') : null;
    if (w === 'a') winsA++; else if (w === 'b') winsB++;
    return { k, va, vb, w, diff: va != null && vb != null ? Math.abs(va - vb) : 0 };
  });
  const la = lastWord(a.fullName), lb = lastWord(b.fullName);
  const gradeWinner = gradeA === gradeB ? null : gradeA > gradeB ? la : lb;
  const attrWinner = winsA === winsB ? null : winsA > winsB ? la : lb;
  let verdict: string;
  if (!gradeWinner) verdict = `Dead even on the ${ga} formula at ${gradeA.toFixed(1)}. ${attrWinner ? `${attrWinner} takes more of the head-to-head attributes, ${Math.max(winsA, winsB)} to ${Math.min(winsA, winsB)}.` : 'Call it a coin flip.'}`;
  else if (!attrWinner || attrWinner === gradeWinner) verdict = `${gradeWinner} takes it: ${Math.max(gradeA, gradeB).toFixed(1)} to ${Math.min(gradeA, gradeB).toFixed(1)} on the ${ga} formula${attrWinner ? `, and ${Math.max(winsA, winsB)} of ${rows.length} key attributes` : ''}.`;
  else verdict = `${attrWinner} wins more attributes, but ${gradeWinner} grades higher where the formula puts its weight (${Math.max(gradeA, gradeB).toFixed(1)} to ${Math.min(gradeA, gradeB).toFixed(1)}), and that is the number 17-0 counts.`;

  const side = (p: PlayerRow, grade: number) => {
    const t = p.teamId != null ? teams.get(p.teamId) : undefined;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Avatar name={p.fullName} src={p.imageBlobUrl ?? p.imageUrl} color={t?.primaryColor ?? '#0A0A0A'} size={88} />
        <span className="eyebrow" style={{ margin: 0 }}>{p.position}{t ? `, ${teamName(t)}` : ''}</span>
        <h2 style={{ fontSize: '1.3rem', margin: 0 }}><Link href={`/players/${p.slug}`}>{p.fullName}</Link></h2>
        <div className="big-num" aria-label={`Overall ${p.overallRating}`}>{p.overallRating}</div>
        <span className="muted">{ga} formula grade <span className="num accent">{grade.toFixed(1)}</span></span>
      </div>
    );
  };

  return (
    <div className="container section">
      <Breadcrumbs items={[{ name: 'Compare', path: '/compare' }, { name: `${la} vs ${lb}`, path: canonical }]} />
      <span className="eyebrow">Head to head{same ? `, ${POSITION_NAMES[ga]}` : ''}</span>
      <h1>{a.fullName} vs {b.fullName}</h1>
      <p style={{ fontSize: '1.15rem', maxWidth: '66ch' }}>{verdict}</p>
      {!same && <p className="hint">Different position groups. Both are graded on the {POSITION_NAMES[ga].toLowerCase()} formula here, which flatters {la}.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, margin: '32px 0' }}>
        {side(a, gradeA)}
        {side(b, gradeB)}
      </div>

      <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
        <table>
          <caption className="sr-only">Attribute comparison. The higher value in each row is marked with a plus and the margin.</caption>
          <thead>
            <tr><th scope="col">Attribute</th><th scope="col" className="num">{la}</th><th scope="col" className="num">{lb}</th><th scope="col" className="num">Weight</th></tr>
          </thead>
          <tbody>
            {rows.map(({ k, va, vb, w, diff }) => (
              <tr key={k}>
                <th scope="row" style={{ textTransform: 'none', letterSpacing: 0, fontSize: '.95rem', color: 'var(--bone)', fontWeight: 500 }}>{attrLabel(k)}</th>
                {([['a', va], ['b', vb]] as const).map(([s, v]) => (
                  <td key={s} className="num" style={w === s ? { color: 'var(--orange)', fontWeight: 700 } : undefined}>
                    {v ?? '--'}
                    {w === s ? <span style={{ fontSize: '.8rem', marginLeft: 6 }}>+{diff}<span className="sr-only"> edge</span></span> : null}
                  </td>
                ))}
                <td className="num muted">{weights[k] ? `${Math.round(weights[k]! * 100)}%` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">Attribute edges: {la} {winsA}, {lb} {winsB}. Ties are unmarked.</p>
      <PlayCta />
    </div>
  );
}
