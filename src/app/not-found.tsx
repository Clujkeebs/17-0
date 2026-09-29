import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container section">
        <p className="big-num accent" aria-hidden="true">404</p>
        <h1>Incomplete pass.</h1>
        <p className="muted">That page does not exist, or it was cut before the season.</p>
        <div className="row"><Link className="btn btn-primary" href="/games/17-0">Play 17-0</Link><Link className="btn" href="/players">Browse players</Link></div>
      </main>
    </>
  );
}
