import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import type { ReelTeam } from '@/components/game/Reel';
import { OneSixtyTwoGame } from '@/components/game/OneSixtyTwoGame';
import { MLB_COLORS, mlbLogo, mlbReady } from '@/lib/server/mlb-game';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '162-0: Spin an era, spin a team, draft a perfect MLB season',
  description: 'Eleven spins. Each lands on an MLB era since 1970 and a franchise. Draft a lineup, a starter and a closer, graded on real stats against their league, and see if it goes 162-0.',
  alternates: { canonical: '/games/162-0' },
};

/** Franchises for the reel: each club's most recent name, with its logo. */
async function franchises(): Promise<ReelTeam[]> {
  try {
    const rows = await db.select().from(schema.mlbTeamSeasons).orderBy(desc(schema.mlbTeamSeasons.season));
    const seen = new Map<number, ReelTeam>();
    for (const t of rows) if (!seen.has(t.teamId)) seen.set(t.teamId, { id: t.teamId, abbreviation: t.abbreviation, city: t.location, name: t.name, color: MLB_COLORS[t.teamId] ?? '#1F2A44', logoUrl: mlbLogo(t.teamId) });
    return [...seen.values()];
  } catch { return []; }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const signedIn = !!session?.user?.id;
  const initialMode = sp.mode === 'today' ? 'today' : sp.mode === 'casual' ? 'casual' : signedIn ? 'today' : 'casual';
  const nowReady = await mlbReady('now').catch(() => false);
  return <OneSixtyTwoGame nowReady={nowReady} franchises={await franchises()} signedIn={signedIn} initialMode={initialMode} modeFromLink={sp.mode === 'today' || sp.mode === 'casual'} />;
}
