import type { Metadata } from 'next';
import { GameFaq } from '@/components/seo/GameFaq';
import { GAME_FAQ } from '@/content/game-faq';
import { desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { todaysResult } from '@/lib/server/games';
import { db, schema } from '@/db';
import type { ReelTeam } from '@/components/game/Reel';
import { FortyFourGame } from '@/components/game/FortyFourGame';
import { wnbaReady } from '@/lib/server/wnba-game';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '44-0: Spin an era, spin a team, draft a perfect WNBA season',
  description: 'Five spins. Each lands on a WNBA era and a franchise. Draft one player from each, graded on her real stats, set your lineup and see if it goes 44-0. Or draft only from this season.',
  alternates: { canonical: '/games/44-0' },
};

/** The franchises for the reel: each team's most recent name and logo. */
async function franchises(): Promise<ReelTeam[]> {
  try {
    const rows = await db.select().from(schema.wnbaTeamSeasons).orderBy(desc(schema.wnbaTeamSeasons.season));
    const seen = new Map<number, ReelTeam>();
    for (const t of rows) if (!seen.has(t.teamId)) seen.set(t.teamId, { id: t.teamId, abbreviation: t.abbreviation, city: t.location, name: t.name, color: t.color ?? '#555555', logoUrl: t.logoUrl });
    return [...seen.values()];
  } catch { return []; }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const signedIn = !!session?.user?.id;
  // Already played Today? Open on Casual instead of a board you cannot play again.
  const playedTodayId = session?.user?.id ? await todaysResult(session.user.id, '44-0').catch(() => null) : null;
  const initialMode = sp.mode === 'today' ? 'today' : sp.mode === 'casual' ? 'casual' : signedIn && !playedTodayId ? 'today' : 'casual';
  const nowReady = await wnbaReady('now').catch(() => false);
  return (
    <>
      <FortyFourGame nowReady={nowReady} franchises={await franchises()} signedIn={signedIn} playedTodayId={playedTodayId} initialMode={initialMode} modeFromLink={sp.mode === 'today' || sp.mode === 'casual'} />
      <GameFaq faq={GAME_FAQ['44-0']} />
    </>
  );
}
