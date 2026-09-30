import type { ReelTeam } from '@/components/game/Reel';
import type { Metadata } from 'next';
import { SeventeenGame } from '@/components/game/SeventeenGame';
import { getTeams } from '@/lib/server/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '17-0: Spin six teams, draft a perfect season',
  description: 'Spin six NFL teams, draft a QB, RB, WR/TE, defender, kicker and head coach, and see if the roster can go 17-0. Daily puzzle resets at midnight ET.',
  alternates: { canonical: '/games/17-0' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ daily?: string }> }) {
  const sp = await searchParams;
  let pool: ReelTeam[] = [];
  try { pool = (await getTeams()).map((t) => ({ id: t.id, abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.primaryColor, logoUrl: t.logoUrl })); } catch { /* reel falls back */ }
  
  return <SeventeenGame reelPool={pool} initialDaily={sp.daily === '1'} />;
}
