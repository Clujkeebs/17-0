import type { Metadata } from 'next';
import { auth } from '@/auth';
import { RatingMatch } from '@/components/minigames/games/RatingMatch';
import { ratingMatch as g } from '@/lib/minigames/games/group-b';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NFL ratings game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <RatingMatch signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
