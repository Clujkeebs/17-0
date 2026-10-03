import { Celebration } from '@/components/game/Celebration';
import { buildTier, seasonTier } from '@/lib/game/tiers';
import { getMiniGame } from '@/lib/minigames/registry';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TeamLogo } from '@/components/TeamLogo';
import { notFound } from 'next/navigation';
import { getResult } from '@/lib/server/leaderboard';
import { getTeams } from '@/lib/server/data';
import { SideAd } from '@/components/AdSlot';
import { ShareButton } from '@/components/game/ShareButton';
import { ATTRIBUTE_LABELS, type AttributeKey } from '@/lib/game/attributes';
import { SLOT_LABELS, type SlotResult, type GameLine } from '@/lib/game/seventeen';
import type { StatLine } from '@/lib/game/build';
import { seasonLabel, type NbaSlotResult } from '@/lib/game/eightytwo';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getResult(id).catch(() => null);
  if (!r) return { title: 'Result not found', robots: { index: false } };
  const d = r.resultData as Record<string, unknown>;
  const mg = r.gameType !== '17-0' && r.gameType !== 'build-a-player' && r.gameType !== '82-0' ? getMiniGame(r.gameType) : null;
  // Mini results (and any legacy row) have no wins/rating; guard so share cards never crash on a missing field.
  const title = mg
    ? `${mg.name}: ${String(d.summary ?? '')}`
    : r.gameType === '17-0' || r.gameType === '82-0'
      ? `Went ${Number(d.wins ?? 0)}-${Number(d.losses ?? 0)} in ${r.gameType}`
      : Number.isFinite(Number(d.rating))
        ? `Built a ${Number(d.rating).toFixed(1)} ${String(d.position ?? '')}`
        : 'Game result';
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
  const teamCell = (tid: number) => { const t = teams.find((x) => x.id === tid); return t ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TeamLogo abbr={t.abbreviation} src={t.logoUrl} color={t.primaryColor} size={20} />{t.abbreviation}</span> : ''; };
  const d = r.resultData as Record<string, unknown>;
  if (r.gameType === '82-0') return <NbaResultPage r={r} />;
  const mini = r.gameType !== '17-0' && r.gameType !== 'build-a-player' ? getMiniGame(r.gameType) : null;
  if (mini) return <MiniResultPage r={r} name={mini.name} slug={mini.slug} tagline={mini.tagline} />;
  const is17 = r.gameType === '17-0';
  const headline = is17 ? `${d.wins}-${d.losses}` : Number(d.rating).toFixed(1);
  const schedule = is17 && Array.isArray(d.schedule) ? (d.schedule as GameLine[]).filter((g) => g && typeof g.week === 'number') : [];
  const shareText = is17 ? (Number(d.wins) === 17 ? `I went 17-0. Perfect season on Unbeaten. Your turn.` : Number(d.wins) === 16 ? `16-1. One loss from a perfect season in 17-0.` : `My roster went ${d.wins}-${d.losses} in 17-0.`) + (d.hard ? ' Hard mode, no overalls.' : '') : `I built a ${Number(d.rating).toFixed(1)} ${d.position} in Build a Player.`;

  return (
    <div className="container section">
      <div className="with-side-ad">
        <div>
          <span className="eyebrow">{is17 ? '17-0' : 'Build a Player'}{is17 && d.format === 'fantasy' ? ' · Fantasy' : is17 && d.format && d.format !== '6' ? ` · ${String(d.format)}-man roster` : ''}{is17 && d.pool === 'all-time' ? ' · All-time' : ''}{d.hard ? ' · Hard mode' : ''}{r.isDaily ? ` · Daily ${r.dailyDate}` : ''}</span>
          <Celebration tier={is17 ? seasonTier(Number(d.wins)) : buildTier(Number(d.rating))} />
          {/* Share card preview */}
          <figure style={{ margin: '0 0 24px' }}>
            <img src={`/api/og/game-result?id=${r.id}`} alt={`Share card: ${shareText}`} width={1200} height={630} style={{ width: '100%', height: 'auto', aspectRatio: '1200 / 630', border: '1px solid var(--steel)', borderRadius: 18, boxShadow: 'var(--shadow)' }} />
          </figure>
          <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
            <p className="big-num" style={{ margin: 0, color: is17 && d.wins === 17 ? 'var(--orange)' : undefined }}>{headline}</p>
            <div className="stack" style={{ paddingBottom: 8 }}>
              {is17 ? (
                <>
                  <span className="stat"><span className="v">{Number(d.teamStrength).toFixed(1)}</span><span className="l">{d.format === 'fantasy' ? 'Points per week' : 'Team strength'}</span></span>
                  <span className="muted num">Point diff {Number(d.pointDiff) >= 0 ? '+' : ''}{String(d.pointDiff)}</span>
                </>
              ) : (
                <span className="stat"><span className="v">{String(d.letter)}</span><span className="l">{String(d.position)} grade</span></span>
              )}
            </div>
          </div>
          <div className="row" style={{ margin: '20px 0' }}>
            <ShareButton text={shareText} url={`/results/${r.id}`} imageUrl={`/api/og/game-result?id=${r.id}`} fileName={`unbeaten-${r.gameType}.png`} />
            <Link className="btn btn-primary" href={is17 ? '/games/17-0' : '/games/build-a-player'}>Play again</Link>
            <Link className="btn" href={is17 ? '/games/build-a-player' : '/games/17-0'}>Try {is17 ? 'Build a Player' : '17-0'}</Link>
          </div>
          {r.isDaily && !r.userId && <p className="hint">Sign in before your next daily to get on the <Link href="/leaderboard">leaderboard</Link> and start a streak.</p>}

          <hr className="divider" />

          {is17 ? (
            <>
              {schedule.length > 0 && (
                <section aria-labelledby="wbw-h" style={{ marginBottom: 56 }}>
                  <div className="sec-head" style={{ marginBottom: 20 }}>
                    <h2 id="wbw-h">Week by week</h2>
                    <p className="num">{schedule.filter((g) => g.win).length} W &middot; {schedule.filter((g) => !g.win).length} L</p>
                  </div>
                  <ol className="weeks">
                    {schedule.map((g) => (
                      <li key={g.week} className={g.win ? 'w' : 'l'} aria-label={`Week ${g.week}, ${g.home ? 'versus' : 'at'} ${g.opp}: ${g.win ? 'win' : 'loss'}, ${g.us} to ${g.them}`}>
                        <span className="wk num" aria-hidden="true">Wk {g.week}</span>
                        <span className="res" aria-hidden="true">{g.win ? 'W' : 'L'}</span>
                        <span className="sc num" aria-hidden="true">{g.us}-{g.them}</span>
                        <span className="op" aria-hidden="true">{g.home ? 'vs' : '@'} {g.opp}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              <h2>The season</h2>
              <div className="prose">{(d.narrative as string[]).map((s, i) => <p key={i}>{s}</p>)}</div>
              <h2 style={{ marginTop: 32 }}>Slot grades</h2>
              <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="grade-table">
                  <thead><tr><th scope="col">Slot</th><th scope="col">Pick</th><th scope="col" className="num">Grade</th></tr></thead>
                  <tbody>
                    {(d.slots as SlotResult[]).map((s) => (
                      <tr key={s.slot}>
                        <td className="mono">{SLOT_LABELS[s.slot] ?? s.slot}</td>
                        <td><span className="pick">{s.name}</span><span className="pick-team mono">{teamCell(s.teamId)}</span></td>
                        <td className="num"><span className="letter">{s.letter}</span><span className="grade-sub">{s.points !== undefined ? `${s.points.toFixed(1)} pts/g` : s.grade.toFixed(1)}</span></td>
                      </tr>
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
              {Array.isArray(d.traits) ? (
                <>
                  <p className="muted">Score <strong className="num">{Number(d.rating).toFixed(1)}</strong>{typeof d.best === 'number' ? <> out of a best possible <strong className="num">{Number(d.best).toFixed(1)}</strong> from these five teams.</> : null}</p>
                  <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
                    <table className="grade-table">
                      <thead><tr><th scope="col">Trait</th><th scope="col">Taken from</th><th scope="col" className="num">Rating</th></tr></thead>
                      <tbody>
                        {(d.traits as { key: string; label: string; value: number; weight: number; donor: string; teamId: number }[]).map((t) => (
                          <tr key={t.key}>
                            <td><span className="pick">{t.label}</span><span className="grade-sub num">{Math.round(t.weight * 100)}% weight</span></td>
                            <td><span className="pick">{t.donor}</span><span className="pick-team mono">{teamCell(t.teamId)}</span></td>
                            <td className="num"><span className="letter">{t.value}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
                  <table>
                    <thead><tr><th scope="col">Attribute</th><th scope="col" className="num">Value</th><th scope="col">Taken from</th></tr></thead>
                    <tbody>
                      {Object.entries((d.attributes ?? {}) as Record<string, number>).map(([k, v]) => {
                        const src = ((d.sources ?? []) as { name: string }[])[((d.choices ?? {}) as Record<string, number>)[k]];
                        return <tr key={k}><td>{ATTRIBUTE_LABELS[k as AttributeKey] ?? k}</td><td className="num">{v}</td><td>{src?.name}</td></tr>;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
        <SideAd />
      </div>
    </div>
  );
}

function MiniResultPage({ r, name, slug, tagline }: { r: { id: string; isDaily: boolean; dailyDate: string | null; resultData: unknown }; name: string; slug: string; tagline: string }) {
  const d = r.resultData as { summary?: string; perfect?: boolean };
  const text = `${name}: ${d.summary}${r.isDaily ? ` (Today, ${r.dailyDate})` : ''}. Beat it on Unbeaten.`;
  return (
    <div className="container section with-side-ad mini-result">
      <div style={{ maxWidth: 880 }}>
      <span className="eyebrow">{name}{r.isDaily ? ` · Today ${r.dailyDate}` : ' · Casual'}</span>
      <figure style={{ margin: '0 0 24px' }}>
        <img src={`/api/og/game-result?id=${r.id}`} alt={`Score card: ${text}`} width={1200} height={630} style={{ width: '100%', height: 'auto', aspectRatio: '1200 / 630', border: '1px solid var(--steel)', borderRadius: 16 }} />
      </figure>
      <p className="big-num" style={{ margin: '0 0 8px', color: d.perfect ? 'var(--orange)' : undefined }}>{d.summary}</p>
      <p className="muted">{tagline}</p>
      <div style={{ margin: '20px 0' }}><ShareButton text={text} url={`/results/${r.id}`} imageUrl={`/api/og/game-result?id=${r.id}`} fileName={`unbeaten-${slug}.png`} /></div>
      <div className="row"><Link className="btn btn-primary" href={`/games/${slug}`}>Play {name}</Link><Link className="btn" href="/games">More games</Link></div>
      </div>
      <SideAd />
    </div>
  );
}

function NbaResultPage({ r }: { r: { id: string; isDaily: boolean; dailyDate: string | null; resultData: unknown } }) {
  const d = r.resultData as { wins: number; losses: number; teamStrength: number; hard?: boolean; edition?: string; narrative: string[]; slots: NbaSlotResult[]; teams?: { slot: string; team: string; logoUrl: string | null }[] };
  const text = d.wins === 82 ? 'I went 82-0. Perfect season on Unbeaten. Your turn.' : `My lineup went ${d.wins}-${d.losses} in 82-0.${d.hard ? ' Hard mode, no stats.' : ''}`;
  return (
    <div className="container section">
      <div style={{ maxWidth: 880 }}>
        <span className="eyebrow">82-0 · {d.edition === 'standard' ? 'Standard (2K)' : 'Classic'}{d.hard ? ' · Hard mode' : ''}{r.isDaily ? ` · Daily ${r.dailyDate}` : ''}</span>
        <figure style={{ margin: '0 0 24px' }}>
          <img src={`/api/og/game-result?id=${r.id}`} alt={`Share card: ${text}`} width={1200} height={630} style={{ width: '100%', height: 'auto', aspectRatio: '1200 / 630', border: '1px solid var(--steel)', borderRadius: 18, boxShadow: 'var(--shadow)' }} />
        </figure>
        <div className="row" style={{ alignItems: 'flex-end', gap: 24 }}>
          <p className="big-num" style={{ margin: 0, color: d.wins === 82 ? 'var(--orange)' : undefined }}>{d.wins}-{d.losses}</p>
          <span className="stat" style={{ paddingBottom: 8 }}><span className="v">{Number(d.teamStrength).toFixed(1)}</span><span className="l">Lineup strength</span></span>
        </div>
        <div className="row" style={{ margin: '20px 0' }}>
          <ShareButton text={text} url={`/results/${r.id}`} imageUrl={`/api/og/game-result?id=${r.id}`} fileName="unbeaten-82-0.png" />
          <Link className="btn btn-primary" href="/games/82-0">Play again</Link>
          <Link className="btn" href="/games?sport=nba">More basketball</Link>
        </div>
        <hr className="divider" />
        <h2>The season</h2>
        <div className="prose">{d.narrative.map((x, i) => <p key={i}>{x}</p>)}</div>
        <h2 style={{ marginTop: 32 }}>Lineup grades</h2>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="grade-table">
            <thead><tr><th scope="col">Spot</th><th scope="col">Pick</th><th scope="col" className="num">Grade</th></tr></thead>
            <tbody>
              {d.slots.map((x) => {
                const t = d.teams?.find((y) => y.slot === x.slot);
                return (
                  <tr key={x.slot}>
                    <td className="mono">{x.slot}</td>
                    <td><span className="pick">{x.name}</span><span className="pick-team mono">{t?.team ?? ''} · {d.edition === 'standard' ? '2K' : seasonLabel(x.season)}{x.fit < 1 ? ` · out of position (${Math.round((1 - x.fit) * 100)}% off)` : ''}</span></td>
                    <td className="num"><span className="letter">{x.letter}</span><span className="grade-sub">{x.grade.toFixed(1)}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint" style={{ marginTop: 16 }}>{d.edition === 'standard' ? <>Grades are each player&apos;s current NBA 2K overall (ratings via <a href="https://www.nba2klab.com/nba2k-player-ratings" rel="noopener noreferrer" target="_blank">NBA2KLab</a>).</> : <>Grades come from each player&apos;s real per-game stats (ESPN) in his best season with that franchise in that era.</>}</p>
      </div>
    </div>
  );
}
