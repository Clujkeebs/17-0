import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { orAtBuild } from '@/lib/seo/safe';
import { F_POS, rankPlayers, type FPos } from '@/lib/fantasy/rank';
import { wide } from '@/lib/fantasy/slim';
import { RankingsBoard } from './RankingsBoard';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy rankings (PPR)', description: 'PPR rankings for every QB, RB, WR and TE, weighted to recent form, with tiers, search and your league size.', alternates: { canonical: '/fantasy/rankings' } };

export default async function Rankings({ searchParams }: { searchParams: Promise<{ pos?: string; sort?: string }> }) {
  const sp = await searchParams;
  const pos = sp.pos?.toUpperCase();
  const sort = sp.sort === 'hot' || sp.sort === 'cold' ? sp.sort : 'rank';
  const initial = F_POS.includes(pos as FPos) ? (pos as FPos) : 'ALL';
  const players = rankPlayers(await orAtBuild(loadFantasyPlayers(), [])).slice(0, 320).map(wide);
  return (
    <div className="container section ft-scope" style={{ maxWidth: 860 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Rankings</p>
      {players.length ? <RankingsBoard players={players} initialPos={initial} initialSort={sort} /> : (
        <>
          <h1>Overall rankings</h1>
          <p>Points are still loading. Check back after the next update.</p>
        </>
      )}
    </div>
  );
}
