import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { rankPlayers } from '@/lib/fantasy/rank';
import { slim } from '@/lib/fantasy/slim';
import { TierList } from './TierList';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Fantasy tier list maker', description: 'Type player names, drag them into S through F tiers, and share your fantasy football tier list.', alternates: { canonical: '/fantasy/tier-list' } };

export default async function Page({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? null;
  const players = rankPlayers(await loadFantasyPlayers().catch(() => [])).map(slim);
  return (
    <div className="container section" style={{ maxWidth: 900 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Tier list</p>
      <h1>Tier list maker</h1>
      <p className="muted">Football for now. Your list saves on this device; the share link carries the whole list.</p>
      <TierList players={players} initial={t && t.length < 4000 ? t : null} />
    </div>
  );
}
