import Link from 'next/link';
import { LogoMark } from './Icons';
import { SITE } from '@/lib/site';

export function SiteHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label={`${SITE.name} home`}>
          <LogoMark /> <span>Gridiron<span className="num">Lab</span></span>
        </Link>
        {!minimal && (
          <nav aria-label="Primary">
            <ul className="nav">
              <li><Link href="/games/17-0">17-0</Link></li>
              <li><Link href="/games/build-a-player">Build</Link></li>
              <li><Link href="/leaderboard">Leaders</Link></li>
              <li className="hide-sm"><Link href="/players">Players</Link></li>
              <li className="hide-sm"><Link href="/blog">Blog</Link></li>
              <li><Link href="/profile">Profile</Link></li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
