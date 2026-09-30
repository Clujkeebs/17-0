import type { Metadata } from 'next';
import { auth } from '@/auth';
import { WheresHeFrom } from '@/components/minigames/games/WheresHeFrom';
import { wheresHeFrom as g } from '@/lib/minigames/games/wheres-he-from';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NFL daily puzzle`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <WheresHeFrom signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
