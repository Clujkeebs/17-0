import Link from 'next/link';
import { ArrowIcon } from '@/components/Icons';

export function PlayCta({ title = 'Can your six picks go 17-0?', body = 'Spin six teams, draft one player from each, and see what the formula thinks of your season.', href = '/games/17-0', label = 'Play 17-0' }: {
  title?: string; body?: string; href?: string; label?: string;
}) {
  return (
    <aside className="card card-green" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', marginTop: 40 }}>
      <div style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: 6 }}>{title}</h2>
        <p style={{ margin: 0 }}>{body}</p>
      </div>
      <Link href={href} className="btn btn-primary">{label} <ArrowIcon size={18} /></Link>
    </aside>
  );
}
