import type { Metadata } from 'next';
import Link from 'next/link';
import { dailyLeaderboard } from '@/lib/server/leaderboard';
import { dailyTeamsPreview } from '@/lib/server/games';
import { ArrowIcon } from '@/components/Icons';
import { HomeBlogCards } from '@/components/HomeBlogCards';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/' } };

const STEPS = [
  { h: 'Spin the reel', p: 'One reel, one team at a time. Everyone gets the same six NFL teams today, in the same order.' },
  { h: 'Draft one from each', p: 'Put one player into an open slot: QB, RB, WR, TE, any defender, or head coach. Then the reel spins again.' },
  { h: 'Let the ratings decide', p: 'Madden ratings feed a weighted formula that projects your seventeen game record.' },
];

export default async function Home() {
  const [top, daily] = await Promise.all([
    dailyLeaderboard('17-0').then((r) => r.slice(0, 3)).catch(() => []),
    dailyTeamsPreview().catch(() => null),
  ]);
  const dateLabel = daily ? new Date(`${daily.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '';
  return (
    <>
      <section className="hero">
        <div className="container">
          {dateLabel && <span className="kicker"><span className="live-dot" aria-hidden="true" /> Today&apos;s puzzle, {dateLabel}</span>}
          <h1 className="hero-h1">Six picks. <span className="soft">One perfect season.</span></h1>
          <p className="hero-sub">Spin six NFL teams, draft one player from each, and find out if your roster can go seventeen and oh.</p>
          <div className="row">
            <Link className="btn btn-primary btn-lg" href="/games/17-0?daily=1">Play today&apos;s 17-0 <ArrowIcon size={18} /></Link>
            <Link className="btn btn-lg" href="/games/build-a-player">Build a Player</Link>
          </div>
          <p className="hero-note">Free. No account needed. About three minutes.</p>
        </div>
      </section>

      {daily && (
        <section className="container today" aria-labelledby="today-h">
          <div className="sec-head">
            <h2 id="today-h">Today&apos;s six.</h2>
            <p>Same teams for everyone. Resets at midnight ET.</p>
          </div>
          <ol className="today-teams">
            {daily.teams.map((t, i) => (
              <li key={t.id} style={{ ['--team' as string]: t.primaryColor }}>
                <span className="today-i num">{i + 1}</span>
                {t.logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img className="today-logo" src={t.logoUrl} alt={`${t.city} ${t.name} logo`} width={72} height={72} loading="lazy" />
                  : <span className="today-logo" aria-hidden="true" />}
                <span className="today-abbr">{t.abbreviation}</span>
                <span className="today-name">{t.city} {t.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="container section" aria-labelledby="how-h">
        <div className="sec-head"><div><span className="eyebrow">How it works</span><h2 id="how-h">Three steps. Seventeen games.</h2></div></div>
        <ol className="steps">
          {STEPS.map((s) => <li key={s.h}><h3>{s.h}</h3><p>{s.p}</p></li>)}
        </ol>
      </section>

      <section className="container" aria-labelledby="games-h">
        <div className="sec-head"><div><span className="eyebrow">The games</span><h2 id="games-h">Two ways to play.</h2></div></div>
        <div className="home-tiles">
          <Link href="/games/17-0" className="tile tile-wide">
            <span className="eyebrow">Daily</span>
            <h3 className="tile-h">17-0</h3>
            <p className="muted" style={{ maxWidth: '40ch' }}>Six spins, six picks, one projected record. QB and defense carry 45 percent of the weight. The tight end carries ten and still costs you a game.</p>
            <div className="mini-reel" aria-hidden="true">{['KC', 'PHI', 'BAL', 'DET', 'SF', 'BUF'].map((a, i) => <span key={a} className={i === 2 ? 'on' : ''}>{a}</span>)}</div>
            <div className="tile-foot">
              <span className="stat"><span className="v">6</span><span className="l">Picks</span></span>
              <span className="stat"><span className="v">1</span><span className="l">Reel</span></span>
              <span className="stat"><span className="v">17</span><span className="l">Games</span></span>
              <span className="tile-cta">Play <ArrowIcon size={16} /></span>
            </div>
          </Link>
          <Link href="/games/build-a-player" className="tile tile-tall">
            <span className="eyebrow">Anytime</span>
            <h3 className="tile-h">Build a Player</h3>
            <p className="muted" style={{ maxWidth: '40ch' }}>Five spins. One trait from each. One guy&apos;s arm, another guy&apos;s poise.</p>
            <div className="bars" aria-hidden="true">
              {[['THP', 97], ['DAC', 91], ['AWR', 95], ['SPD', 78], ['TUP', 88]].map(([k, v]) => (
                <div key={k} className="bar"><span className="num">{k}</span><span className="track"><span style={{ width: `${v}%` }} /></span><span className="num">{v}</span></div>
              ))}
            </div>
            <div className="tile-foot"><span className="tile-cta">Build <ArrowIcon size={16} /></span></div>
          </Link>
        </div>
      </section>

      <section className="container section" aria-labelledby="leaders-h">
        <div className="sec-head">
          <div><span className="eyebrow">Leaderboard</span><h2 id="leaders-h">Today&apos;s top three.</h2></div>
          <Link href="/leaderboard">Full board</Link>
        </div>
        {top.length ? (
          <ol className="leaders">
            {top.map((r) => (
              <li key={r.rank}><span className="rk num">{String(r.rank).padStart(2, '0')}</span><span className="who">{r.username}</span><span className="sc num">{r.summary}</span></li>
            ))}
          </ol>
        ) : (
          <div className="leaders" style={{ paddingTop: 28 }}>
            <p className="muted" style={{ fontSize: '1.15rem' }}>Nobody on the board yet. The top spot is open.</p>
            <Link className="btn" href="/games/17-0?daily=1">Claim it <ArrowIcon size={16} /></Link>
          </div>
        )}
      </section>

      <HomeBlogCards />
    </>
  );
}
