import type { Metadata } from 'next';
import { auth } from '@/auth';
import { UnbeatenBowl } from '@/components/minigames/games/UnbeatenBowl';
import { unbeatenBowl as g } from '@/lib/minigames/bowl/game';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: retro football on real NFL rosters`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <UnbeatenBowl signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
