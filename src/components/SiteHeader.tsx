import Link from 'next/link';
import { LogoMark } from './Icons';
import { SITE } from '@/lib/site';
import { HeaderProfile } from './HeaderProfile';

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <LogoMark size={30} /><span className="wordmark">Unbeaten</span><span className="brand-rule" aria-hidden="true" /><span className="brand-record num" aria-hidden="true">17-0</span>
        </Link>
        {!minimal && (
          <nav aria-label="Primary">
            <ul className="nav">
              <li className="hide-xxs"><Link href="/games">Games</Link></li>
              <li className="hide-xs"><Link href="/fantasy">Fantasy</Link></li>
              <li className="hide-sm"><Link href="/pickem">Pick &apos;em</Link></li>
              <li className="hide-sm"><Link href="/leaderboard">Leaders</Link></li>
              <li className="hide-sm"><Link href="/shop">Shop</Link></li>
              <li className="hide-sm"><Link href="/players">Players</Link></li>
              <li className="nav-cta"><Link href="/games/17-0">Play 17-0</Link></li>
              <li className="nav-me"><HeaderProfile /></li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
