import Link from 'next/link';
import { LogoMark } from './Icons';
import { SITE } from '@/lib/site';
import { HeaderProfile } from './HeaderProfile';
import { SiteNav, type NavItem } from './SiteNav';
import { SPORTS, gamesFor } from '@/lib/game-registry';

/** The big draft games lead each sport; the rest of the list follows in hub order. */
const FEATURED: Record<string, string[]> = { nfl: ['17-0', 'build-a-player'], nba: ['82-0'], mlb: ['162-0'], soccer: [], puzzles: [] };

function menus(): NavItem[] {
  const games: NavItem = {
    label: 'Games', href: '/games',
    sections: SPORTS.filter((s) => gamesFor(s.key).length).map((s) => {
      const list = gamesFor(s.key);
      const lead = list.filter((g) => FEATURED[s.key]?.includes(g.slug));
      const rest = list.filter((g) => !FEATURED[s.key]?.includes(g.slug)).slice(0, 6 - lead.length);
      return { title: s.label, href: `/games?sport=${s.key}`, links: [...lead, ...rest].map((g) => ({ label: g.name, href: `/games/${g.slug}`, strong: lead.includes(g) })), more: list.length > lead.length + rest.length ? `All ${list.length}` : undefined };
    }),
  };
  const fantasy: NavItem = {
    label: 'Fantasy', href: '/fantasy',
    sections: [{ title: 'Fantasy football', href: '/fantasy', links: [
      { label: 'Rankings', href: '/fantasy/rankings' }, { label: 'Waiver wire', href: '/fantasy/waivers' }, { label: 'Trade calculator', href: '/fantasy/trade' },
      { label: 'Draft cheat sheet', href: '/fantasy/cheat-sheet' }, { label: 'Tier list maker', href: '/fantasy/tier-list' }, { label: 'Draft order', href: '/fantasy/draft-order' },
    ] }],
  };
  const more: NavItem = {
    label: 'More', sections: [{ title: 'Browse', links: [
      { label: 'Players', href: '/players' }, { label: 'Teams', href: '/teams' }, { label: 'Coaches', href: '/coaches' }, { label: 'Positions', href: '/positions' }, { label: 'Blog', href: '/blog' },
    ] }],
  };
  return [games, fantasy, { label: "Pick 'em", href: '/pickem' }, { label: 'Leaders', href: '/leaderboard' }, { label: 'Shop', href: '/shop' }, more];
}

/** One header on every page, games included: always there, menus open on hover (desktop) or tap (phone). */
export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="site-header">
      <div className="container sh-row">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <LogoMark size={30} /><span className="wordmark">Unbeaten</span><span className="brand-rule" aria-hidden="true" /><span className="brand-record num" aria-hidden="true">17-0</span>
        </Link>
        {!minimal && <SiteNav items={menus()} />}
        {!minimal && <Link href="/games/17-0" className="sh-cta">Play 17-0</Link>}
        {!minimal && <div className="sh-me"><HeaderProfile /></div>}
      </div>
    </header>
  );
}
