import type { Metadata } from 'next';
import Link from 'next/link';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { orAtBuild } from '@/lib/seo/safe';
import { rankPlayers } from '@/lib/fantasy/rank';
import { wide } from '@/lib/fantasy/slim';
import { StartSit } from './StartSit';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Fantasy start or sit',
  description: 'Pick two to four players for one spot. Get a clear call on who to start, based on recent form, the season and the projection.',
  alternates: { canonical: '/fantasy/start-sit' },
};

export default async function Page() {
  const players = rankPlayers(await orAtBuild(loadFantasyPlayers(), [])).map(wide);
  return (
    <div className="container section ft-scope" style={{ maxWidth: 900 }}>
      <p className="eyebrow"><Link href="/fantasy">Fantasy</Link> · Start or sit</p>
      <h1>Start or sit</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>
        Add two to four players you are deciding between. We blend the last four games, the season average and the projection into one number for this week, and tell you how clear the call is.
      </p>
      <StartSit players={players} />
    </div>
  );
}
