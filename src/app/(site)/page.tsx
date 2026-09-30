import type { Metadata } from 'next';
import Link from 'next/link';
import { dailyLeaderboard } from '@/lib/server/leaderboard';
import { dailyTeamsPreview } from '@/lib/server/games';
import { ArrowIcon } from '@/components/Icons';
import { HomeBlogCards } from '@/components/HomeBlogCards';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/' } };

const SLOTS = ['QB', 'RB', 'WR/TE', 'DEF', 'K', 'HC'];

export default async function Home() {
  const [top, daily] = await Promise.all([
    dailyLeaderboard('17-0').then((r) => r.slice(0, 3)).catch(() => []),
    dailyTeamsPreview().catch(() => null),
  ]);
  const dateLabel = daily ? new Date(`${daily.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  return (
    <>
      <section className="hero field">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="kicker"><span className="live-dot" aria-hidden="true" /> Daily puzzle · {dateLabel}</span>
            <h1 className="hero-h1">Six picks.<br />Seventeen games.<br /><span className="accent">One perfect season.</span></h1>
            <p className="hero-sub">Spin six NFL teams. Draft a quarterback, a back, a pass catcher, a defender, a kicker and a head coach. The ratings decide the rest.</p>
            <div className="row">
              <Link className="btn btn-primary btn-lg" href="/games/17-0?daily=1">Play today&apos;s 17-0 <ArrowIcon size={18} /></Link>
              <Link className="btn btn-lg" href="/games/build-a-player">Build a Player</Link>
            </div>
          </div>
          <div className="scoreboard" aria-hidden="true">
            <div className="sb-top"><span>Record</span><span>Wk 18</span></div>
            <div className="sb-num num">17<span className="sb-dash">-</span>0</div>
            <div className="sb-slots">{SLOTS.map((s) => <span key={s}>{s}</span>)}</div>
          </div>
        </div>
      </section>

      {daily && (
        <section className="container today" aria-labelledby="today-h">
          <div className="today-head">
            <h2 id="today-h" className="eyebrow" style={{ margin: 0 }}>Today&apos;s six</h2>
            <span className="muted" style={{ fontSize: '.85rem' }}>Same teams for everyone. Resets midnight ET.</span>
          </div>
          <ol className="today-teams">
            {daily.teams.map((t, i) => (
              <li key={t.id} style={{ ['--team' as string]: t.primaryColor }}>
                <span className="today-i num">{i + 1}</span>
                <span className="today-abbr num">{t.abbreviation}</span>
                <span className="today-name">{t.city} {t.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="container" aria-label="Today's leaders">
        <div className="ticker">
          <span className="eyebrow" style={{ margin: 0 }}>Top 3 today</span>
          {top.length ? top.map((r) => (
            <span key={r.rank} className="ticker-item"><span className="num muted">{r.rank}</span> {r.username} <span className="num accent">{r.summary}</span></span>
          )) : <span className="muted">Nobody on the board yet. The top spot is open.</span>}
          <Link href="/leaderboard" style={{ marginLeft: 'auto' }}>Full board</Link>
        </div>
      </section>

      <section className="container section home-tiles" aria-label="Games">
        <Link href="/games/17-0" className="tile tile-wide">
          <span className="tile-ghost num" aria-hidden="true">17-0</span>
          <span className="eyebrow">Game one</span>
          <h2 className="tile-h">17-0</h2>
          <p className="muted" style={{ maxWidth: '46ch' }}>Six spins, six picks, one projected record. QB and defense carry half the weight. Your kicker carries five percent and still loses you a game.</p>
          <div className="mini-reel" aria-hidden="true">{['KC', 'PHI', 'BAL', 'DET', 'SF', 'BUF'].map((a, i) => <span key={a} className={i === 2 ? 'on' : ''}>{a}</span>)}</div>
          <div className="row" style={{ gap: 32, marginTop: 'auto' }}>
            <span className="stat"><span className="v">6</span><span className="l">Picks</span></span>
            <span className="stat"><span className="v">2</span><span className="l">Re-spins</span></span>
            <span className="stat"><span className="v">17</span><span className="l">Games</span></span>
            <span className="tile-cta">Play <ArrowIcon size={16} /></span>
          </div>
        </Link>
        <Link href="/games/build-a-player" className="tile tile-tall">
          <span className="eyebrow">Game two</span>
          <h2 className="tile-h">Build a Player</h2>
          <p className="muted">Five teams. One attribute at a time. One guy&apos;s arm, another guy&apos;s pocket presence.</p>
          <div className="bars" aria-hidden="true">
            {[['THP', 97], ['DAC', 91], ['AWR', 95], ['SPD', 78], ['TUP', 88]].map(([k, v]) => (
              <div key={k} className="bar"><span className="num">{k}</span><span className="track"><span style={{ width: `${v}%` }} /></span><span className="num">{v}</span></div>
            ))}
          </div>
          <span className="tile-cta" style={{ marginTop: 'auto' }}>Build <ArrowIcon size={16} /></span>
        </Link>
      </section>

      <HomeBlogCards />
    </>
  );
}
