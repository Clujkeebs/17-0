import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Fantasy football tools',
  description: 'Free PPR rankings that follow recent form, a waiver wire, a trade calculator, a draft cheat sheet, a draft order randomizer and a tier list maker.',
  alternates: { canonical: '/fantasy' },
};

const TOOLS = [
  { href: '/fantasy/rankings', name: 'Rankings', p: 'Every QB, RB, WR and TE, ranked on PPR points per game. Recent form counts most.' },
  { href: '/fantasy/waivers', name: 'Waiver wire', p: 'Producing players most leagues have not picked up, and who is getting added fastest.' },
  { href: '/fantasy/trade', name: 'Trade calculator', p: 'Put players on each side. See who wins it on rest-of-season value.' },
  { href: '/fantasy/cheat-sheet', name: 'Draft cheat sheet', p: 'Your league size and pick. Who to target at each of your picks.' },
  { href: '/fantasy/draft-order', name: 'Draft order randomizer', p: 'Paste the team names. Get a fair, shareable draft order.' },
  { href: '/fantasy/tier-list', name: 'Tier list maker', p: 'Type names, drag them into S through F, share your list.' },
  { href: '/games/fantasy-start-em', name: "Start 'Em (game)", p: 'Two players at the same spot. Who is scoring more per game? Ten calls, daily leaderboard.' },
  { href: '/games/fantasy-rank-em', name: "Rank 'Em (game)", p: 'Five players at one position. Put them in points per game order.' },
];

export default function FantasyHub() {
  return (
    <div className="container section">
      <p className="eyebrow">Fantasy football · PPR</p>
      <h1 style={{ maxWidth: '18ch' }}>Fantasy tools that keep up.</h1>
      <p className="muted" style={{ maxWidth: '60ch', fontSize: '1.1rem' }}>
        Values are PPR points per game from Sleeper: the last four games count most, the season average steadies it, and early on the season projection fills in. Updated after every game day.
      </p>
      <div className="hub-grid" style={{ marginTop: 32 }}>
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="hub-card">
            <h3>{t.name}</h3><p>{t.p}</p><span className="hub-cta">Open <ArrowIcon size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
