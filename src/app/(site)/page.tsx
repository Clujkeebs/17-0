import type { Metadata } from 'next';
import Link from 'next/link';
import { dailyLeaderboard } from '@/lib/server/leaderboard';
import { ArrowIcon } from '@/components/Icons';
import { HomeBlogCards } from '@/components/HomeBlogCards';
import { SITE } from '@/lib/site';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function Home() {
  const top = await dailyLeaderboard('17-0').then((r) => r.slice(0, 3)).catch(() => []);
  return (
    <>
      <section className="container section home-hero">
        <div>
          <span className="eyebrow">Daily NFL roster puzzle</span>
          <h1 style={{ maxWidth: '14ch' }}>{SITE.tagline}</h1>
          <p className="muted" style={{ maxWidth: '52ch', fontSize: '1.08rem' }}>
            Spin six teams. Draft a quarterback, a back, a pass catcher, a defender, a kicker and a head coach. The ratings decide the rest.
          </p>
          <div className="row">
            <Link className="btn btn-primary" href="/games/17-0?daily=1">Play today&apos;s 17-0 <ArrowIcon size={16} /></Link>
            <Link className="btn" href="/games/build-a-player">Build a Player</Link>
          </div>
        </div>
        <p className="big-num accent home-num" aria-hidden="true">17<span style={{ color: 'var(--steel)' }}>-</span>0</p>
      </section>

      <section className="container" aria-label="Today's leaders">
        <div className="ticker">
          <span className="eyebrow" style={{ margin: 0 }}>Today&apos;s top 3</span>
          {top.length ? top.map((r) => (
            <span key={r.rank} className="ticker-item"><span className="num muted">{r.rank}</span> {r.username} <span className="num accent">{r.summary}</span></span>
          )) : <span className="muted">Nobody on the board yet today. The top spot is open.</span>}
          <Link href="/leaderboard" style={{ marginLeft: 'auto' }}>Full board</Link>
        </div>
      </section>

      <section className="container section home-tiles" aria-label="Games">
        <Link href="/games/17-0" className="tile tile-wide">
          <span className="eyebrow">Game one</span>
          <h2>17-0</h2>
          <p className="muted">Six spins, six picks, one projected record. QB and defense carry half the weight. Your kicker carries five percent and still loses you a game.</p>
          <div className="row" style={{ gap: 32, marginTop: 'auto' }}>
            <span className="stat"><span className="v">6</span><span className="l">Picks</span></span>
            <span className="stat"><span className="v">2</span><span className="l">Re-spins</span></span>
            <span className="stat"><span className="v">17</span><span className="l">Games</span></span>
          </div>
        </Link>
        <Link href="/games/build-a-player" className="tile tile-tall">
          <span className="eyebrow">Game two</span>
          <h2>Build a Player</h2>
          <p className="muted">Five teams. Take one attribute at a time. Stitch together a quarterback with one guy&apos;s arm and another guy&apos;s pocket presence.</p>
          <p className="big-num" style={{ fontSize: '4rem', marginTop: 'auto' }}>99<span className="muted" style={{ fontSize: '1rem' }}> max</span></p>
        </Link>
      </section>

      <hr className="divider container" />
      <HomeBlogCards />
    </>
  );
}
