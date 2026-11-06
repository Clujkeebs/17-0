import type { Metadata } from 'next';
import { auth } from '@/auth';
import { HoopsBuild } from '@/components/minigames/games/CollegeBuild';
import { nbaBuildPlayer as g } from '@/lib/minigames/nba/games';
import { GameGuide } from '@/components/game/GameGuide';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NBA basketball game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return (
    <>
      <HoopsBuild signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo, unit: 'Team' }} />
      <GameGuide slug="nba-build-a-player" />
    </>
  );
}
