import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { rankPlayers } from '@/lib/fantasy/rank';
import { slim } from '@/lib/fantasy/slim';
import { TradeCalc } from './TradeCalc';

export const revalidate = 600;
export const metadata: Metadata = { title: 'Fantasy trade calculator', description: 'Compare both sides of a fantasy football trade on rest-of-season PPR value.', alternates: { canonical: '/fantasy/trade' } };

export default async function Trade() {
  const players = rankPlayers(await loadFantasyPlayers().catch(() => [])).map(slim);
  return (
    <div className="container section" style={{ maxWidth: 900 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Trade calculator</p>
      <h1>Trade calculator</h1>
      <p className="muted">Two average players do not add up to one star: each player counts for how far he sits above a replacement starter at his position.</p>
      <TradeCalc players={players} />
    </div>
  );
}
