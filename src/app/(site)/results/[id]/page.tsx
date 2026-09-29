import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResult } from '@/lib/server/leaderboard';
import { getTeams } from '@/lib/server/data';
import { NewsletterForm } from '@/components/NewsletterForm';
import { AdSlot } from '@/components/AdSlot';
import { ShareButton } from '@/components/game/ShareButton';
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/game/attributes';
import { SLOT_LABELS, type SlotResult } from '@/lib/game/seventeen';
import type { StatLine } from '@/lib/game/build';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getResult(id).catch(() => null);
  if (!r) return { title: 'Result not found', robots: { index: false } };
  const d = r.resultData as Record<string, unknown>;
  const title = r.gameType === '17-0' ? `Went ${d.wins}-${d.losses} in 17-0` : `Built a ${Number(d.rating).toFixed(1)} ${d.position}`;
  return {
    title, description: 'Think you can beat it? Spin your own roster.',
    robots: { index: false, follow: true },
    alternates: { canonical: `/results/${id}` },
    openGraph: { title, images: [`/api/og/game-result?id=${id}`] },
    twitter: { card: 'summary_large_image', title, images: [`/api/og/game-result?id=${id}`] },
  };
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params;
  const r = await getResult(id).catch(() => null);
  if (!r) notFound();
  const teams = await getTeams().catch(() => []);
  const teamName = (tid: number) => { const t = teams.find((x) => x.id === tid); return t ? `${t.abbreviation}` : ''; };
  const d = r.resultData as Record<string, unknown>;
  const is17 = r.gameType === '17-0';
  const headline = is17 ? `${d.wins}-${d.losses}` : Number(d.rating).toFixed(1);
  const shareText = is17 ? `My roster went ${d.wins}-${d.losses} in 17-0.` : `I built a ${Number(d.rating).toFixed(1)} ${d.position} in Build a Player.`;

  return (
    <div className="container section">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 32 }} className="result-grid">
        <div>
          <span className="eyebrow">{is17 ? '17-0' : 'Build a Player'}{r.isDaily ? ` · Daily ${r.dailyDate}` : ''}</span>
          {/* Share card preview */}
          <figure style={{ margin: '0 0 24px' }}>
            <img src={`/api/og/game-result?id=${r.id}`} alt={`Share card: ${shareText}`} width={1200} height={630} style={{ width: '100%', height: 'auto', aspectRatio: '1200 / 630', border: '1px solid var(--steel)' }} />
          </figure>
          <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
            <p className="big-num" style={{ margin: 0, color: is17 && d.wins === 17 ? 'var(--orange)' : undefined }}>{headline}</p>
            <div className="stack" style={{ paddingBottom: 8 }}>
              {is17 ? (
                <>
                  <span className="stat"><span className="v">{Number(d.teamStrength).toFixed(1)}</span><span className="l">Team strength</span></span>
                  <span className="muted num">Point diff {Number(d.pointDiff) >= 0 ? '+' : ''}{String(d.pointDiff)}</span>
                </>
              ) : (
                <span className="stat"><span className="v">{String(d.letter)}</span><span className="l">{String(d.position)} grade</span></span>
              )}
            </div>
          </div>
          <div className="row" style={{ margin: '20px 0' }}>
            <ShareButton text={shareText} url={`/results/${r.id}`} />
            <Link className="btn btn-primary" href={is17 ? '/games/17-0' : '/games/build-a-player'}>Play again</Link>
            <Link className="btn" href={is17 ? '/games/build-a-player' : '/games/17-0'}>Try {is17 ? 'Build a Player' : '17-0'}</Link>
          </div>
          {r.isDaily && !r.userId && <p className="hint">Sign in before your next daily to get on the <Link href="/leaderboard">leaderboard</Link> and start a streak.</p>}

          <hr className="divider" />

          {is17 ? (
            <>
              <h2>The season</h2>
              <div className="prose">{(d.narrative as string[]).map((s, i) => <p key={i}>{s}</p>)}</div>
              <h2 style={{ marginTop: 32 }}>Slot grades</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th scope="col">Slot</th><th scope="col">Pick</th><th scope="col">Team</th><th scope="col" className="num">Grade</th><th scope="col" className="num">Letter</th></tr></thead>
                  <tbody>
                    {(d.slots as SlotResult[]).map((s) => (
                      <tr key={s.slot}><td className="mono">{SLOT_LABELS[s.slot]}</td><td>{s.name}</td><td className="mono">{teamName(s.teamId)}</td><td className="num">{s.grade.toFixed(1)}</td><td className="num" style={{ fontWeight: 800 }}>{s.letter}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <h2>Simulated season</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 20, marginBottom: 32 }}>
                {(d.stats as StatLine[]).map((s) => <div key={s.key} className="stat"><span className="v">{s.key === 'ypc' ? (s.value / 10).toFixed(1) : s.value.toLocaleString('en-US')}</span><span className="l">{s.key === 'ypc' ? 'Yds / Carry' : s.label}</span></div>)}
              </div>
              <h2>The build</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th scope="col">Attribute</th><th scope="col" className="num">Value</th><th scope="col">Taken from</th></tr></thead>
                  <tbody>
                    {Object.entries(d.attributes as Record<string, number>).map(([k, v]) => {
                      const src = (d.sources as { name: string }[])[(d.choices as Record<string, number>)[k]];
                      return <tr key={k}><td>{ATTRIBUTE_LABELS[k as AttributeKey] ?? k}</td><td className="num">{v}</td><td>{src?.name}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <section className="card card-green" style={{ marginTop: 40 }} aria-labelledby="nl-h">
            <h2 id="nl-h" style={{ fontSize: '1.2rem' }}>Get the daily puzzle in your inbox.</h2>
            <NewsletterForm source="result" />
          </section>
          <AdSlot slot="result-inline" className="section" />
        </div>
      </div>
    </div>
  );
}
