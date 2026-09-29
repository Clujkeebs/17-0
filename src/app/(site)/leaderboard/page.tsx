import type { Metadata } from 'next';
import Link from 'next/link';
import { allTimeLeaderboard, dailyLeaderboard } from '@/lib/server/leaderboard';
import { dailyDateET } from '@/lib/game/daily';
import { LeaderboardViewed } from '@/components/LeaderboardViewed';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Leaderboard',
  description: "Today's best 17-0 and Build a Player results, plus the all-time table. Resets at midnight ET.",
  alternates: { canonical: '/leaderboard' },
};

type SP = Promise<{ tab?: string; game?: string; page?: string }>;

export default async function Leaderboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = sp.tab === 'all-time' ? 'all-time' : 'daily';
  const game = sp.game === 'build-a-player' ? 'build-a-player' : '17-0';
  const page = Math.max(1, Number(sp.page) || 1);
  let error = false;
  const daily = tab === 'daily' ? await dailyLeaderboard(game).catch(() => { error = true; return []; }) : [];
  const all = tab === 'all-time' ? await allTimeLeaderboard(page).catch(() => { error = true; return { rows: [], total: 0 }; }) : { rows: [], total: 0 };
  const pages = Math.max(1, Math.ceil(all.total / 50));
  const tabLink = (t: string, g = game) => `/leaderboard?tab=${t}&game=${g}`;
  return (
    <div className="container section">
      <LeaderboardViewed tab={tab} />
      <span className="eyebrow">{tab === 'daily' ? `Daily · ${dailyDateET()} · resets midnight ET` : 'All-time'}</span>
      <h1>Leaderboard</h1>
      <nav aria-label="Leaderboard views" className="row" style={{ marginBottom: 24 }}>
        <Link className={`btn btn-sm ${tab === 'daily' && game === '17-0' ? 'btn-primary' : ''}`} href={tabLink('daily', '17-0')} aria-current={tab === 'daily' && game === '17-0' ? 'page' : undefined}>Daily 17-0</Link>
        <Link className={`btn btn-sm ${tab === 'daily' && game === 'build-a-player' ? 'btn-primary' : ''}`} href={tabLink('daily', 'build-a-player')} aria-current={tab === 'daily' && game === 'build-a-player' ? 'page' : undefined}>Daily Build</Link>
        <Link className={`btn btn-sm ${tab === 'all-time' ? 'btn-primary' : ''}`} href={tabLink('all-time')} aria-current={tab === 'all-time' ? 'page' : undefined}>All-time</Link>
      </nav>
      {error && <div role="alert" className="card card-error">The leaderboard is not responding. Scores are safe, try again in a minute.</div>}
      {tab === 'daily' ? (
        daily.length ? (
          <div className="table-wrap"><table>
            <thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col">Result</th><th scope="col" className="num">Score</th></tr></thead>
            <tbody>{daily.map((r) => <tr key={r.rank}><td className="num">{r.rank}</td><td>{r.username}</td><td><Link href={`/results/${r.resultId}`} className="num">{r.summary}</Link></td><td className="num">{r.score.toLocaleString('en-US')}</td></tr>)}</tbody>
          </table></div>
        ) : !error && (
          <div className="card"><p>No daily results yet. Be first. Sign in, play the daily, and your name goes here.</p>
            <Link className="btn btn-primary" href={game === '17-0' ? '/games/17-0?daily=1' : '/games/build-a-player'}>Play the daily</Link></div>
        )
      ) : (
        <>
          <p className="muted">Points: one per win in 17-0, rating divided by ten in Build a Player. Ties go to whoever got there first.</p>
          {all.rows.length ? (
            <div className="table-wrap"><table>
              <thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col" className="num">Points</th><th scope="col" className="num">Games</th></tr></thead>
              <tbody>{all.rows.map((r) => <tr key={r.rank}><td className="num">{r.rank}</td><td>{r.username}</td><td className="num">{r.points}</td><td className="num">{r.games}</td></tr>)}</tbody>
            </table></div>
          ) : !error && <div className="card"><p>The all-time table is empty. Every game you play while signed in counts.</p></div>}
          {pages > 1 && (
            <nav aria-label="Pagination" className="row" style={{ marginTop: 16 }}>
              {page > 1 && <Link className="btn btn-sm" href={`/leaderboard?tab=all-time&page=${page - 1}`}>Previous</Link>}
              <span className="num muted">Page {page} of {pages}</span>
              {page < pages && <Link className="btn btn-sm" href={`/leaderboard?tab=all-time&page=${page + 1}`}>Next</Link>}
            </nav>
          )}
        </>
      )}
      <p className="hint" style={{ marginTop: 24 }}>Only signed-in players appear. Every score is validated on the server.</p>
    </div>
  );
}
