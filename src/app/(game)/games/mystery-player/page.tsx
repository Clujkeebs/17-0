import type { Metadata } from 'next';
import { auth } from '@/auth';
import { MysteryPlayer } from '@/components/minigames/games/MysteryPlayer';
import { mysteryPlayer as g } from '@/lib/minigames/games/mystery-player';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NFL daily puzzle`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <MysteryPlayer signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
