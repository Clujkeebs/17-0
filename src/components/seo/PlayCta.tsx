import Link from 'next/link';
import { ArrowIcon } from '@/components/Icons';

export function PlayCta({ title = 'Can your six picks go 17-0?', body = 'Spin six teams, draft one player from each, and see what the formula thinks of your season.', href = '/games/17-0', label = 'Play 17-0' }: {
  title?: string; body?: string; href?: string; label?: string;
}) {
  return (
    <aside className="play-cta">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <Link href={href} className="btn btn-primary btn-lg">{label} <ArrowIcon size={18} /></Link>
    </aside>
  );
}
