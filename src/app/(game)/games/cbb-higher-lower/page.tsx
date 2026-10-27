import type { Metadata } from 'next';
import { auth } from '@/auth';
import { HigherLower } from '@/components/minigames/games/HigherLower';
import { cbbHigherLower as g } from '@/lib/minigames/college/games';
import { GameGuide } from '@/components/game/GameGuide';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: college basketball stats game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return (
    <>
      <HigherLower signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />
      <GameGuide slug="cbb-higher-lower" />
    </>
  );
}
