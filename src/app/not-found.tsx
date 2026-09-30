import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container error-page">
        <span className="eyebrow">Error 404</span>
        <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}>Incomplete pass.</h1>
        <p className="muted" style={{ fontSize: '1.2rem', marginBottom: 32 }}>That page does not exist, or it was cut before the season.</p>
        <div className="row" style={{ justifyContent: 'center' }}><Link className="btn btn-primary" href="/games/17-0">Play 17-0</Link><Link className="btn" href="/players">Browse players</Link></div>
      </main>
    </>
  );
}
