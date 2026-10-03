import type { ReelTeam } from '@/components/game/Reel';
import type { Metadata } from 'next';
import { SeventeenGame } from '@/components/game/SeventeenGame';
import { getTeams } from '@/lib/server/data';
import { auth } from '@/auth';
import { fantasyReady, todaysResult } from '@/lib/server/games';
import { challengeInfo } from '@/lib/server/challenges';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '17-0: Spin six teams, draft a perfect season',
  description: 'Spin the reel six times, draft a QB, RB, WR, TE, defender and head coach, one from each team, and see if the roster can go 17-0. Daily puzzle resets at midnight ET.',
  alternates: { canonical: '/games/17-0' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ daily?: string; mode?: string; challenge?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;
  const playedTodayId = userId ? await todaysResult(userId, '17-0').catch(() => null) : null;
  const asked = sp.mode === 'casual' ? 'casual' : sp.mode === 'today' || sp.daily === '1' ? 'today' : null;
  // Default: Today when you can still play it ranked, otherwise Casual so the reel spins right away.
  const initialMode = asked ?? (userId && !playedTodayId ? 'today' : 'casual');
  let pool: ReelTeam[] = [];
  try { pool = (await getTeams()).map((t) => ({ id: t.id, abbreviation: t.abbreviation, city: t.city, name: t.name, color: t.primaryColor, logoUrl: t.logoUrl })); } catch { /* reel falls back */ }
  
  const fantasy = await fantasyReady().catch(() => false);
  const challenge = await challengeInfo(sp.challenge, '17-0');
  return <SeventeenGame reelPool={pool} signedIn={!!userId} playedTodayId={playedTodayId} initialMode={initialMode} modeFromLink={!!asked} fantasyReady={fantasy} challenge={challenge} />;
}
