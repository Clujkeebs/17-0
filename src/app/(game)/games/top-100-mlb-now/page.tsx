import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Top100 } from '@/components/minigames/games/Top100';
import { top100Games } from '@/lib/minigames/top100/games';

const g = top100Games.find((x) => x.slug === 'top-100-mlb-now')!;
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: g.name, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <Top100 signedIn={!!session?.user?.id} listKey="mlb-now" meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
