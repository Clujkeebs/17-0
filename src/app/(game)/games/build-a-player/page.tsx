import type { ReelTeam } from '@/components/game/Reel';
import type { Metadata } from 'next';
import { BuildGame } from '@/components/game/BuildGame';
import { getTeams } from '@/lib/server/data';
import { BUILD_POSITIONS, type BuildPosition } from '@/lib/game/build';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Build a Player: steal one attribute from five teams',
  description: 'Pick a position, spin five teams, take one player from each, then assemble a custom player one attribute at a time. Simulate a 17-game season.',
  alternates: { canonical: '/games/build-a-player' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ position?: string }> }) {
  const sp = await searchParams;
  const pos = (sp.position ?? '').toUpperCase();
  let pool: ReelTeam[] = [];
  try { pool = (await getTeams()).map((t) => ({ id: t.id, abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.primaryColor, logoUrl: t.logoUrl })); } catch { /* reel falls back */ }
  
  return <BuildGame reelPool={pool} initialPosition={(BUILD_POSITIONS as readonly string[]).includes(pos) ? (pos as BuildPosition) : null} />;
}
