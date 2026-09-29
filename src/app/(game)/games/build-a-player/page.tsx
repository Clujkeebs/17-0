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
  let pool: { abbreviation: string; city: string; name: string; color: string }[] = [];
  try { pool = (await getTeams()).map((t) => ({ abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.primaryColor })); } catch { /* reel falls back */ }
  if (!pool.length) pool = [{ abbreviation: 'NFL', city: '', name: '', color: '#4A5568' }];
  return <BuildGame reelPool={pool} initialPosition={(BUILD_POSITIONS as readonly string[]).includes(pos) ? (pos as BuildPosition) : null} />;
}
