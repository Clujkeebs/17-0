import type { Metadata } from 'next';
import Link from 'next/link';
import { games } from '@/lib/minigames/games';
import { ArrowIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'NFL Games',
  description: 'Free daily NFL games built on Madden 27 ratings. Play Today for the ranked leaderboard, or Casual as much as you like.',
  alternates: { canonical: '/games' },
};

const FEATURED = [
  { slug: '17-0', name: '17-0', tagline: 'Six spins, one roster, one season. Can it go unbeaten?', meta: 'Draft · 2 min' },
  { slug: 'build-a-player', name: 'Build a Player', tagline: 'Five spins. Take one trait from each. Grade the player you built.', meta: 'Draft · 1 min' },
];

export default function GamesHub() {
  return (
    <div className="container section">
      <p className="eyebrow">Free · New puzzles at midnight ET</p>
      <h1 style={{ maxWidth: '16ch' }}>Every game, every day.</h1>
      <p className="muted" style={{ maxWidth: '58ch', fontSize: '1.1rem' }}>
        Each game has two modes. <strong>Today</strong> is the same puzzle for everyone, one attempt, ranked on the leaderboard (free account needed). <strong>Casual</strong> is unlimited and open to anyone.
      </p>

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
      <p className="muted" style={{ marginTop: 32 }}><Link href="/leaderboard">See today&apos;s leaderboards</Link></p>
    </div>
  );
}
