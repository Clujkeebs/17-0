import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { F_POS, rankPlayers, type FPos } from '@/lib/fantasy/rank';
import { FRow } from '@/components/fantasy/FRow';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy rankings (PPR)', description: 'PPR rankings for every QB, RB, WR and TE, weighted to recent form.', alternates: { canonical: '/fantasy/rankings' } };

export default async function Rankings({ searchParams }: { searchParams: Promise<{ pos?: string }> }) {
  const pos = (await searchParams).pos?.toUpperCase();
  const filter = F_POS.includes(pos as FPos) ? (pos as FPos) : null;
  const ranked = rankPlayers(await loadFantasyPlayers().catch(() => []));
  const list = (filter ? ranked.filter((p) => p.pos === filter).sort((a, b) => a.posRank - b.posRank) : ranked).slice(0, 150);
  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Rankings</p>
      <h1>{filter ? `${filter} rankings` : 'Overall rankings'}</h1>
      <p className="muted">PPR points per game. L4 is the last four games, Szn the season average. Overall order is value over a replacement starter in a 12-team league.</p>
      <nav className="sport-tabs" aria-label="Position">
        <Link href="/fantasy/rankings" aria-current={!filter ? 'page' : undefined}>All</Link>
        {F_POS.map((p) => <Link key={p} href={`/fantasy/rankings?pos=${p}`} aria-current={filter === p ? 'page' : undefined}>{p}</Link>)}
      </nav>
      {list.length ? <ol className="f-list">{list.map((p) => <FRow key={p.id} p={p} rank={filter ? p.posRank : p.overall} />)}</ol> : <p>Points are still loading. Check back after the next update.</p>}
    </div>
  );
}
