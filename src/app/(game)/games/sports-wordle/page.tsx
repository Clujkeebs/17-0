import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Wordle } from '@/components/minigames/games/Wordle';
import { sportsWordle as g } from '@/lib/minigames/puzzles/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: daily sports puzzle`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <Wordle signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
