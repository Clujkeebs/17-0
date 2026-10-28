import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { orAtBuild } from '@/lib/seo/safe';
import { rankPlayers } from '@/lib/fantasy/rank';
import { slim } from '@/lib/fantasy/slim';
import { MockDraft } from './MockDraft';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Fantasy mock draft',
  description: 'A free PPR snake mock draft against computer teams that draft like people. Pick your slot, draft a full roster, get a grade.',
  alternates: { canonical: '/fantasy/mock-draft' },
};

export default async function Page() {
  const players = rankPlayers(await orAtBuild(loadFantasyPlayers(), [])).slice(0, 260).map(slim);
  return (
    <div className="container section ft-scope" style={{ maxWidth: 1100 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Mock draft</p>
      <h1>Mock draft</h1>
      <p className="muted" style={{ maxWidth: '64ch' }}>
        A snake draft against computer teams that draft the way people do: stars first, holes filled later, never four quarterbacks. Same rankings as the rest of the hub. Finish and you get a grade, based on where your best lineup lands.
      </p>
      <MockDraft players={players} />
    </div>
  );
}
