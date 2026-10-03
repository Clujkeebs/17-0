import type { Metadata } from 'next';
import Link from 'next/link';
import { games } from '@/lib/minigames/games';
import { nbaGames } from '@/lib/minigames/nba/games';
import { ArrowIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Games',
  description: 'Free daily football and basketball games. NFL games built on Madden ratings, NBA games built on real stats since 1980. Play Today for the leaderboard, or Casual as much as you like.',
  alternates: { canonical: '/games' },
};

const NBA = [
  { slug: '82-0', name: '82-0', tagline: 'Spin an era, spin a franchise, draft five. Move anyone between positions, then play 82.', meta: 'Draft · 3 min' },
];

const FEATURED = [
  { slug: '17-0', name: '17-0', tagline: 'Six spins, one roster, one season. Can it go unbeaten?', meta: 'Draft · 2 min' },
  { slug: 'build-a-player', name: 'Build a Player', tagline: 'Five spins. Take one trait from each. Grade the player you built.', meta: 'Draft · 1 min' },
];

export default async function GamesHub({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const nba = (await searchParams).sport === 'nba';
  return (
    <div className="container section">
      <p className="eyebrow">Free · New puzzles at midnight ET</p>
      <h1 style={{ maxWidth: '16ch' }}>Every game, every day.</h1>
      <nav className="sport-tabs" aria-label="Sport">
        <Link href="/games" aria-current={!nba ? 'page' : undefined}>Football</Link>
        <Link href="/games?sport=nba" aria-current={nba ? 'page' : undefined}>Basketball</Link>
      </nav>
      <p className="muted" style={{ maxWidth: '58ch', fontSize: '1.1rem' }}>
        Each game has two modes. <strong>Today</strong> is the same puzzle for everyone, one attempt, ranked on the leaderboard (free account needed). <strong>Casual</strong> is unlimited and open to anyone.
      </p>

      {nba ? (
        <div className="hub-featured">
          {NBA.map((g) => (
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
      </>) : (<>
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
