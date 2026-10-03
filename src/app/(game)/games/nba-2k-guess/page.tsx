import type { Metadata } from 'next';
import { auth } from '@/auth';
import { GuessTheOvr } from '@/components/minigames/games/GuessTheOvr';
import { nba2kGuess as g } from '@/lib/minigames/nba/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NBA 2K ratings game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <GuessTheOvr signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} ratingName="NBA 2K" />;
}
