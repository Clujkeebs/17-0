import type { Metadata } from 'next';
import { auth } from '@/auth';
import { RankEm } from '@/components/minigames/games/RankEm';
import { fantasyRankEm as g } from '@/lib/minigames/fantasy/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: fantasy football game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <RankEm signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
