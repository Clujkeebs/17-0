import type { ReelTeam } from '@/components/game/Reel';
import type { Metadata } from 'next';
import { BuildGame } from '@/components/game/BuildGame';
import { getTeams } from '@/lib/server/data';
import { BUILD_POSITIONS, type BuildPosition } from '@/lib/game/build';
import { dailyDateET } from '@/lib/game/daily';
import { auth } from '@/auth';
import { todaysResult } from '@/lib/server/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Build a Player: steal one trait from five teams',
  description: 'Pick a position and spin five teams. Take one weighted trait from one player per spin, then see your score, letter grade, the best possible build, and a simulated season.',
  alternates: { canonical: '/games/build-a-player' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ position?: string; mode?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const playedTodayId = userId ? await todaysResult(userId, 'build-a-player').catch(() => null) : null;
  const initialMode = sp.mode === 'casual' || sp.position ? 'casual' : sp.mode === 'today' ? 'today' : userId && !playedTodayId ? 'today' : 'casual';
  const pos = (sp.position ?? '').toUpperCase();
  let pool: ReelTeam[] = [];
  try { pool = (await getTeams()).map((t) => ({ id: t.id, abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.primaryColor, logoUrl: t.logoUrl })); } catch { /* reel falls back */ }
  
  const day = Math.floor(Date.parse(`${dailyDateET()}T12:00:00Z`) / 86400000);
  const positionOfDay = BUILD_POSITIONS[day % BUILD_POSITIONS.length];
  return <BuildGame reelPool={pool} signedIn={!!userId} playedTodayId={playedTodayId} initialMode={initialMode} modeFromLink={sp.mode === 'casual' || sp.mode === 'today' || !!sp.position} positionOfDay={positionOfDay} initialPosition={(BUILD_POSITIONS as readonly string[]).includes(pos) ? (pos as BuildPosition) : null} />;
}
