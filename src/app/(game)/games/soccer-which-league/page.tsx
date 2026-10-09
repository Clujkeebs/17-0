import type { Metadata } from 'next';
import { auth } from '@/auth';
import { PickRounds } from '@/components/minigames/games/PickRounds';
import { soccerWhichLeague as g } from '@/lib/minigames/soccer/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: soccer game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <PickRounds signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
