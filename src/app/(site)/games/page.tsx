import type { Metadata } from 'next';
import Link from 'next/link';
import { games } from '@/lib/minigames/games';
import { nbaGames } from '@/lib/minigames/nba/games';
import { puzzleGames } from '@/lib/minigames/puzzles/games';
import { ArrowIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Free daily football, basketball and baseball games. NFL games built on Madden ratings, NBA and MLB games built on real stats. Play Today for the leaderboard, or Casual as much as you like.',
  alternates: { canonical: '/games' },
};

const NBA = [
  { slug: '82-0', name: '82-0', tagline: 'Spin an era, spin a franchise, draft five. Move anyone between positions, then play 82.', meta: 'Draft · 3 min' },
];

const MLB = [
  { slug: '162-0', name: '162-0', tagline: 'Spin an era since 1970, spin a franchise, eleven times. Fill a lineup, a starter and a closer, then play 162.', meta: 'Draft · 4 min' },
];

const FEATURED = [
  { slug: '17-0', name: '17-0', tagline: 'Six spins, one roster, one season. Can it go unbeaten?', meta: 'Draft · 2 min' },
  { slug: 'build-a-player', name: 'Build a Player', tagline: 'Five spins. Take one trait from each. Grade the player you built.', meta: 'Draft · 1 min' },
];

export default async function GamesHub({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const sport = (await searchParams).sport;
  const nba = sport === 'nba', mlb = sport === 'mlb', puzzles = sport === 'puzzles';
  return (
    <div className="container section">
      <p className="eyebrow">Free · New puzzles at midnight ET</p>
      <h1 style={{ maxWidth: '16ch' }}>Every game, every day.</h1>
      <nav className="sport-tabs" aria-label="Sport">
        <Link href="/games" aria-current={!nba && !mlb && !puzzles ? 'page' : undefined}>Football</Link>
        <Link href="/games?sport=nba" aria-current={nba ? 'page' : undefined}>Basketball</Link>
        <Link href="/games?sport=mlb" aria-current={mlb ? 'page' : undefined}>Baseball</Link>
        <Link href="/games?sport=puzzles" aria-current={puzzles ? 'page' : undefined}>Puzzles</Link>
      </nav>
      <p className="muted" style={{ maxWidth: '58ch', fontSize: '1.1rem' }}>
        Each game has two modes. <strong>Today</strong> is the same puzzle for everyone, one attempt, ranked on the leaderboard (free account needed). <strong>Casual</strong> is unlimited and open to anyone.
      </p>

      {nba || mlb ? (
        <div className="hub-featured">
          {(nba ? NBA : MLB).map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="hub-card hub-feature hub-dark">
              <span className="eyebrow">{g.meta}</span>
              <h2>{g.name}</h2>
              <p>{g.tagline}</p>
              <span className="hub-cta">Play <ArrowIcon size={16} /></span>
            </Link>
          ))}
        </div>
      ) : null}
      {nba ? (<>
        <h2 style={{ marginTop: 56 }}>Daily puzzles</h2>
        <div className="hub-grid">
          {nbaGames.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="hub-card">
              <h3>{g.name}</h3>
              <p>{g.tagline}</p>
              <span className="hub-cta">Play <ArrowIcon size={14} /></span>
            </Link>
          ))}
        </div>
        <h2 style={{ marginTop: 56 }}>Elsewhere</h2>
        <div className="hub-grid">
          <div className="hub-card">
            <span className="eyebrow">Not made by us</span>
            <h3>Hoop Land</h3>
            <p>The retro basketball sim with college and pro leagues. It is an app, not a web game, so it cannot run here. Get it from its official stores.</p>
            <span className="row" style={{ gap: 16 }}>
              <a className="hub-cta" href="https://store.steampowered.com/app/3857620" target="_blank" rel="noopener noreferrer">Steam <ArrowIcon size={14} /></a>
              <a className="hub-cta" href="https://apps.apple.com/app/id1605197976" target="_blank" rel="noopener noreferrer">App Store <ArrowIcon size={14} /></a>
            </span>
          </div>
        </div>
      </>) : mlb ? null : puzzles ? (
        <div className="hub-grid">
          {puzzleGames.map((g) => (
            <Link key={g.slug} href={`/games/${g.slug}`} className="hub-card">
              <span className="eyebrow">New daily</span>
              <h3>{g.name}</h3>
              <p>{g.tagline}</p>
              <span className="hub-cta">Play <ArrowIcon size={14} /></span>
            </Link>
          ))}
        </div>
      ) : (<>
      <div className="hub-featured">
        {FEATURED.map((g, i) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className={`hub-card hub-feature ${i === 0 ? 'hub-dark' : ''}`}>
            <span className="eyebrow">{g.meta}</span>
            <h2>{g.name}</h2>
            <p>{g.tagline}</p>
            <span className="hub-cta">Play <ArrowIcon size={16} /></span>
          </Link>
        ))}
      </div>

      <h2 style={{ marginTop: 56 }}>Daily puzzles</h2>
      <div className="hub-grid">
        {games.map((g) => (
          <Link key={g.slug} href={`/games/${g.slug}`} className="hub-card">
            <h3>{g.name}</h3>
            <p>{g.tagline}</p>
            <span className="hub-cta">Play <ArrowIcon size={14} /></span>
          </Link>
        ))}
      </div>
      <h2 style={{ marginTop: 56 }}>Elsewhere</h2>
      <div className="hub-grid">
        <a href="https://poki.com/en/g/retro-bowl" target="_blank" rel="noopener noreferrer" className="hub-card">
          <span className="eyebrow">New Star Games</span>
          <h3>Retro Bowl</h3>
          <p>The pixel football game by New Star Games. It plays free in the browser on Poki, its official web home. Not made by us.</p>
          <span className="hub-cta">Play on poki.com <ArrowIcon size={14} /></span>
        </a>
      </div>
      </>)}
      <p className="muted" style={{ marginTop: 32 }}><Link href="/leaderboard">See today&apos;s leaderboards</Link></p>
    </div>
  );
}
