import type { Metadata } from 'next';
import { auth } from '@/auth';
import { PickRounds } from '@/components/minigames/games/PickRounds';
import { cfbWhoLed as g } from '@/lib/minigames/college/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: College football stats game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <PickRounds signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
