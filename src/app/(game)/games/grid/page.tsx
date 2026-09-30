import type { Metadata } from 'next';
import { auth } from '@/auth';
import { Grid } from '@/components/minigames/games/Grid';
import { grid as g } from '@/lib/minigames/games/grid';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: `${g.name}: NFL daily puzzle`, description: g.tagline, alternates: { canonical: `/games/${g.slug}` } };

export default async function Page() {
  const session = await auth().catch(() => null);
  return <Grid signedIn={!!session?.user?.id} meta={{ slug: g.slug, name: g.name, tagline: g.tagline, howTo: g.howTo }} />;
}
