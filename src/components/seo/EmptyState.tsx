import Link from 'next/link';

/** Shown when the ratings table has not been loaded yet (fresh deploy, DB unreachable). */
export function EmptyState({ title = 'Ratings are not loaded yet', body, cta = { href: '/games/17-0', label: 'Play 17-0' } }: {
  title?: string; body?: string; cta?: { href: string; label: string };
}) {
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2 style={{ fontSize: '1.25rem' }}>{title}</h2>
      <p className="muted">{body ?? 'The nightly sync has not filled this table yet. Check back after the next ratings update. The games still work in the meantime.'}</p>
      <Link href={cta.href} className="btn btn-primary">{cta.label}</Link>
    </div>
  );
}
