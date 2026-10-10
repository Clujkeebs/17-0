import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { F_POS, rankPlayers, waiverTargets, type FPos } from '@/lib/fantasy/rank';
import { FRow } from '@/components/fantasy/FRow';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy waiver wire', description: 'The most-added players in fantasy football right now, with how many leagues roster them.', alternates: { canonical: '/fantasy/waivers' } };

const n = (v: number) => v.toLocaleString('en-US');

export default async function Waivers({ searchParams }: { searchParams: Promise<{ pos?: string }> }) {
  const pos = (await searchParams).pos?.toUpperCase();
  const filter = F_POS.includes(pos as FPos) ? (pos as FPos) : null;
  const all = rankPlayers(await loadFantasyPlayers().catch(() => []));
  const list = waiverTargets(filter ? all.filter((p) => p.pos === filter) : all);
  const byAdds = list.some((p) => p.trend > 0);
  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Waiver wire</p>
      <h1>{filter ? `${filter} waiver wire` : 'Waiver wire'}</h1>
      <p className="muted">{byAdds
        ? 'Most added first: adds across Sleeper leagues in the last 24 hours. Rostered is the share of ESPN leagues that have him. Updated every few hours.'
        : 'Nobody is being added yet this week, so these are producing players most leagues have not rostered.'}</p>
      <nav className="sport-tabs" aria-label="Position">
        <Link href="/fantasy/waivers" aria-current={!filter ? 'page' : undefined}>All</Link>
        {F_POS.map((p) => <Link key={p} href={`/fantasy/waivers?pos=${p}`} aria-current={filter === p ? 'page' : undefined}>{p}</Link>)}
      </nav>
      {list.length ? (
        <ol className="f-list">
          {list.map((p, i) => (
            <FRow key={p.id} p={p} rank={i + 1} note={[
              p.trend > 0 ? <strong key="a" className="f-adds">+{n(p.trend)} adds</strong> : null,
              p.rostered != null ? <span key="r">Rostered {p.rostered < 1 ? '<1' : Math.round(p.rostered)}%</span> : null,
            ].filter(Boolean).flatMap((x, k) => (k ? [' · ', x] : [x]))} />
          ))}
        </ol>
      ) : <p>Nothing to show yet. Check back after the next update.</p>}
    </div>
  );
}
