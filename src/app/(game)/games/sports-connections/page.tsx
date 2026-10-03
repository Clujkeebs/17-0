import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Connections } from '@/components/minigames/games/Connections';
import { sportsConnections as g } from '@/lib/minigames/puzzles/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: daily sports puzzle`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <Connections signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
