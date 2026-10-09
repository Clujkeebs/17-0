import type { Metadata } from 'next';
import { auth } from '@/auth';
import { RankEm } from '@/components/minigames/games/RankEm';
import { soccerRankGoals as g } from '@/lib/minigames/soccer/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: soccer game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <RankEm signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
