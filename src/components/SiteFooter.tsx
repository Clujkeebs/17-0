import Link from 'next/link';
import { NewsletterForm } from './NewsletterForm';
import { LogoMark } from './Icons';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div style={{ maxWidth: 440 }}>
            <h2 className="footer-title">The daily puzzle, in your inbox.</h2>
            <p>Six teams, every morning. One email. Unsubscribe in one click.</p>
            <NewsletterForm source="footer" />
          </div>
          <div>
            <span className="eyebrow">Play</span>
            <ul className="footer-links">
              <li><Link href="/games/17-0">17-0</Link></li>
              <li><Link href="/games/build-a-player">Build a Player</Link></li>
              <li><Link href="/leaderboard">Leaderboard</Link></li>
              <li><Link href="/players">Players</Link></li>
              <li><Link href="/teams">Teams</Link></li>
              <li><Link href="/coaches">Coaches</Link></li>
              <li><Link href="/positions">Positions</Link></li>
              <li><Link href="/blog">Blog</Link></li>
            </ul>
          </div>
          <div>
            <span className="eyebrow">Legal</span>
            <ul className="footer-links">
              <li><Link href="/legal/terms">Terms</Link></li>
              <li><Link href="/legal/privacy">Privacy</Link></li>
              <li><Link href="/legal/cookies">Cookies</Link></li>
              <li><Link href="/legal/disclaimer">Disclaimer</Link></li>
              <li><Link href="/legal/dmca">DMCA</Link></li>
              <li><Link href="/legal/accessibility">Accessibility</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>
        </div>
        <hr className="divider" />
        <div className="footer-brand">
          <span className="brand" style={{ gap: 8 }}><LogoMark size={20} /><span className="wordmark" style={{ fontSize: '1.05rem' }}>Unbeaten</span></span>
          <span className="fine">&copy; {new Date().getFullYear()} {SITE.name}. {SITE.mailingAddress}.</span>
        </div>
        <div className="footer-base">
          <p className="fine">
            {SITE.name} is an independent fan project. Not affiliated with, endorsed by, or sponsored by Electronic Arts, EA Sports, the NFL, the NFL Players Association, or any team.
            Player ratings are EA Sports Madden NFL ratings, referenced as factual data. Entertainment only. No real-money play, no prizes, no odds.
          </p>
          <p className="fine">
            Player images sourced from public sports media under fair use for identification purposes. Rights belong to their respective owners. Takedown requests honored within 48 hours.
          </p>
        </div>
      </div>
    </footer>
  );
}
