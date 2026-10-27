import Link from 'next/link';

/** The words on the 404 page. The root not-found wraps them in a header and a main; a page inside a layout that already has both only needs these. */
export function NotFoundBody() {
  return (
    <>
      <span className="eyebrow">Error 404</span>
      <h1 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}>Incomplete pass.</h1>
      <p className="muted" style={{ fontSize: '1.2rem', marginBottom: 32 }}>That page does not exist, or it was cut before the season.</p>
      <div className="row" style={{ justifyContent: 'center' }}><Link className="btn btn-primary" href="/games/17-0">Play 17-0</Link><Link className="btn" href="/players">Browse players</Link></div>
    </>
  );
}
