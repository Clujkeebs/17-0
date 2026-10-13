import type { Metadata } from 'next';
import { auth } from '@/auth';
import { HoopsBuild } from '@/components/minigames/games/CollegeBuild';
import { cbbBuildPlayer as g } from '@/lib/minigames/college/games';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: College basketball game`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <HoopsBuild signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
