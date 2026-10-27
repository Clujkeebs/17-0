import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Strands } from '@/components/minigames/games/Strands';
import { sportsStrands as g } from '@/lib/minigames/puzzles/games';
import { GameGuide } from '@/components/game/GameGuide';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: daily sports word search`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return (
    <>
      <Strands signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />
      <GameGuide slug="sports-strands" />
    </>
  );
}
