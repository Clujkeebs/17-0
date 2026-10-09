import type { Metadata } from 'next';
import { GameFaq } from '@/components/seo/GameFaq';
import { GAME_FAQ } from '@/content/game-faq';
import { desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { challengeInfo } from '@/lib/server/challenges';
import { todaysResult } from '@/lib/server/games';
import { db, schema } from '@/db';
import type { ReelTeam } from '@/components/game/Reel';
import { EightyTwoGame } from '@/components/game/EightyTwoGame';
import { nbaReady } from '@/lib/server/nba-game';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '82-0: Spin an era, spin a team, draft a perfect NBA season',
  description: 'Five spins. Each lands on an NBA era and a franchise. Draft one player from each, graded on his real stats, set your lineup and see if it goes 82-0.',
  alternates: { canonical: '/games/82-0' },
};

/** Today's franchises for the reel: each team's most recent name and logo. */
async function franchises(): Promise<ReelTeam[]> {
  try {
    const rows = await db.select().from(schema.nbaTeamSeasons).orderBy(desc(schema.nbaTeamSeasons.season));
    const seen = new Map<number, ReelTeam>();
    for (const t of rows) if (!seen.has(t.teamId)) seen.set(t.teamId, { id: t.teamId, abbreviation: t.abbreviation, city: t.location, name: t.name, color: t.color ?? '#555555', logoUrl: t.logoUrl });
    return [...seen.values()];
  } catch { return []; }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; challenge?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const signedIn = !!session?.user?.id;
  // Already played Today? Open on Casual instead of a board you cannot play again.
  const playedTodayId = session?.user?.id ? await todaysResult(session.user.id, '82-0').catch(() => null) : null;
  const initialMode = sp.mode === 'today' ? 'today' : sp.mode === 'casual' ? 'casual' : signedIn && !playedTodayId ? 'today' : 'casual';
  const standardReady = await nbaReady('standard').catch(() => false);
  return (
    <>
      <EightyTwoGame franchises={await franchises()} signedIn={signedIn} playedTodayId={playedTodayId} initialMode={initialMode} modeFromLink={sp.mode === 'today' || sp.mode === 'casual'} challenge={await challengeInfo(sp.challenge, '82-0')} standardReady={standardReady} />
      <GameFaq faq={GAME_FAQ['82-0']} />
    </>
  );
}
