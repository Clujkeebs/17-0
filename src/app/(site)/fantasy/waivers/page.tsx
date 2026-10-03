import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { rankPlayers, waiverTargets } from '@/lib/fantasy/rank';
import { FRow } from '@/components/fantasy/FRow';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy waiver wire', description: 'Producing players most leagues have not rostered, ranked with how fast they are being added.', alternates: { canonical: '/fantasy/waivers' } };

export default async function Waivers() {
  const list = waiverTargets(rankPlayers(await loadFantasyPlayers().catch(() => [])));
  return (
    <div className="container section" style={{ maxWidth: 820 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Waiver wire</p>
      <h1>Waiver wire</h1>
      <p className="muted">Players outside the usual rostered pool who are scoring or being added. Adds are across Sleeper leagues in the last 48 hours.</p>
      {list.length ? <ol className="f-list">{list.map((p, i) => <FRow key={p.id} p={p} rank={i + 1} note={p.trend > 0 ? `+${p.trend.toLocaleString('en-US')} adds` : undefined} />)}</ol> : <p>Nothing to show yet. Check back after the next update.</p>}
    </div>
  );
}
