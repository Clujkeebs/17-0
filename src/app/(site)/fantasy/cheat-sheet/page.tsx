import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { rankPlayers } from '@/lib/fantasy/rank';
import { slim } from '@/lib/fantasy/slim';
import { CheatSheet } from './CheatSheet';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy draft cheat sheet', description: 'Pick your league size and draft slot. See who to target at each of your picks in a PPR snake draft.', alternates: { canonical: '/fantasy/cheat-sheet' } };

export default async function Page() {
  const players = rankPlayers(await loadFantasyPlayers().catch(() => [])).slice(0, 260).map(slim);
  return (
    <div className="container section" style={{ maxWidth: 900 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Draft cheat sheet</p>
      <h1>Draft cheat sheet</h1>
      <p className="muted">Snake draft, PPR. For each of your picks, the players our rankings put right around that spot. Ranked on current values, so it also works for mid-season dynasty or redraft mocks.</p>
      <CheatSheet players={players} />
    </div>
  );
}
