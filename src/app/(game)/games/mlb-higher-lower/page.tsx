import type { Metadata } from 'next';
import { auth } from '@/auth';
import { HigherLower } from '@/components/minigames/games/HigherLower';
import { mlbHigherLower as g } from '@/lib/minigames/mlb/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: MLB stats game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <HigherLower signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
