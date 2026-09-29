import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserById, getUserStats } from '@/lib/server/account';

export const metadata: Metadata = {
  title: 'Your profile',
  description: 'Your daily streak, scores, and recent runs.',
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
};

const GAME_NAMES: Record<string, string> = { '17-0': '17-0', 'build-a-player': 'Build a Player' };
const gameName = (t: string) => GAME_NAMES[t] ?? t;
const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }).format(d);
const fmt1 = (n: number | null) => (n == null ? '--' : (Math.round(n * 10) / 10).toFixed(1));

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/profile');
  const user = await getUserById(session.user.id);
  if (!user) redirect('/login?next=/profile');
  const stats = await getUserStats(user.id);
  const name = user.name || user.username || 'Unnamed';

  return (
    <div className="container section">
      <span className="eyebrow">Profile</span>
      <h1>{name}</h1>
      {user.username && user.name && <p className="muted num">@{user.username}</p>}

      {!user.username && (
        <div className="card card-green" role="status" style={{ margin: '16px 0' }}>
          <p style={{ margin: 0 }}>You do not have a username yet, so your scores will not show on leaderboards. <Link href="/settings">Pick one in settings</Link>.</p>
        </div>
      )}

      <section aria-labelledby="streak-h" className="card" style={{ margin: '24px 0', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="big-num" aria-hidden="true">
          <span>🔥</span> <span className={stats.streak > 0 ? 'accent' : undefined}>{stats.streak}</span>
        </div>
        <div>
          <h2 id="streak-h" style={{ marginBottom: 4 }}><span className="sr-only">Streak: {stats.streak} </span>Day streak</h2>
          <p className="muted" style={{ margin: 0 }}>
            {stats.streak === 0 ? 'No active streak. Play today to start one.'
              : stats.playedToday ? 'Played today. Come back tomorrow to keep it going.'
              : 'Not played today yet. The streak survives until midnight Eastern.'}
          </p>
        </div>
      </section>

      <div className="row" style={{ gap: 32, marginBottom: 32 }}>
        <div className="stat"><span className="v">{stats.played}</span><span className="l">Games played</span></div>
        <div className="stat"><span className="v">{fmt1(stats.average)}</span><span className="l">Average score</span></div>
        {stats.byType.map((t) => (
          <div className="stat" key={t.gameType}><span className="v">{t.best}</span><span className="l">Best: {gameName(t.gameType)}</span></div>
        ))}
      </div>

      {stats.byType.length > 0 && (
        <section aria-labelledby="bytype-h" style={{ marginBottom: 32 }}>
          <h2 id="bytype-h">By game</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Game</th><th scope="col" className="num">Played</th><th scope="col" className="num">Best</th><th scope="col" className="num">Average</th></tr></thead>
              <tbody>
                {stats.byType.map((t) => (
                  <tr key={t.gameType}><td>{gameName(t.gameType)}</td><td className="num">{t.n}</td><td className="num">{t.best}</td><td className="num">{fmt1(t.avg)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-labelledby="recent-h">
        <h2 id="recent-h">Recent runs</h2>
        {stats.recent.length === 0 ? (
          <p className="muted">Nothing yet. <Link href="/games/17-0">Spin a 17-0 board</Link> and see where the roster lands.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Date</th><th scope="col">Game</th><th scope="col">Mode</th><th scope="col" className="num">Score</th></tr></thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>{gameName(r.gameType)}</td>
                    <td>{r.isDaily ? `Daily ${r.dailyDate ?? ''}` : 'Free play'}</td>
                    <td className="num">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p style={{ marginTop: 32 }}><Link href="/settings" className="btn">Account settings</Link></p>
    </div>
  );
}
