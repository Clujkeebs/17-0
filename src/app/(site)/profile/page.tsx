import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getUserById, getUserStats, nameStyleOf } from '@/lib/server/account';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';
import { ShareButton } from '@/components/game/ShareButton';
import { ProfileEditor } from './ProfileEditor';
import { games } from '@/lib/minigames/games';

const ALL_GAMES = [{ slug: '17-0', name: '17-0' }, { slug: 'build-a-player', name: 'Build a Player' }, ...games.map((g) => ({ slug: g.slug, name: g.name }))];

export const metadata: Metadata = {
  title: 'Your profile',
  description: 'Your daily streak, scores, and recent runs.',
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
};

const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: 'numeric' }), timeZone: 'America/New_York' }).format(d);

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?next=/profile');
  const user = await getUserById(session.user.id);
  if (!user) redirect('/login?next=/profile');
  const stats = await getUserStats(user.id);
  const name = user.name || user.username || 'Unnamed';
  const style = nameStyleOf(user);
  const favs = (user.favoriteGames ?? []).map((slug) => ALL_GAMES.find((g) => g.slug === slug)).filter((g): g is { slug: string; name: string } => !!g);

  return (
    <div className="container section">
      <span className="eyebrow">Profile</span>
      <div className="profile-head">
        <Avatar name={name} src={user.image} size={84} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0 }}><StyledName name={name} style={style} /></h1>
          {user.username && <p className="muted num" style={{ margin: '4px 0 0' }}>@{user.username}</p>}
        </div>
      </div>
      <div className="row" style={{ gap: 8, margin: '16px 0 8px' }}>
        <ProfileEditor displayName={user.name ?? ''} fallbackName={user.username ?? 'Player'} image={user.image} favoriteGames={user.favoriteGames ?? []}
          nameFont={user.nameFont ?? 'classic'} nameColor={user.nameColor ?? 'ink'} longest={stats.longest} owner={style.owner} allGames={ALL_GAMES} />
        {user.username && <ShareButton label="Share profile" text={`${name} on Unbeaten.`} url={`/u/${user.username}`} />}
      </div>
      {favs.length > 0 && (
        <p className="row" style={{ gap: 8, margin: '8px 0 0' }}>
          <span className="muted">Favorites:</span>
          {favs.map((g) => <Link key={g.slug} className="btn btn-sm" href={`/games/${g.slug}`}>{g.name}</Link>)}
        </p>
      )}

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
        <div className="stat"><span className="v">{stats.longest}</span><span className="l">Longest streak</span></div>
        <div className="stat"><span className="v">{stats.played}</span><span className="l">Games played</span></div>
        <div className="stat"><span className="v">{stats.bestRecord ?? '--'}</span><span className="l">Best 17-0 record</span></div>
        <div className="stat"><span className="v" style={stats.perfectSeasons > 0 ? { color: 'var(--orange)' } : undefined}>{stats.perfectSeasons}</span><span className="l">Perfect seasons</span></div>
      </div>

      {stats.byType.length > 0 && (
        <section aria-labelledby="bytype-h" style={{ marginBottom: 32 }}>
          <h2 id="bytype-h">By game</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
            <table>
              <thead><tr><th scope="col">Game</th><th scope="col" className="num">Played</th><th scope="col" className="num">Best</th></tr></thead>
              <tbody>
                {stats.byType.map((t) => (
                  <tr key={t.gameType}><td>{t.gameName}</td><td className="num">{t.n}</td><td className="num">{t.bestSummary}</td></tr>
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
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="grade-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Game</th><th scope="col" className="num">Result</th></tr></thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.createdAt)}</td>
                    <td><span className="pick">{r.gameName}</span><span className="grade-sub">{r.isDaily ? 'Today' : 'Casual'}</span></td>
                    <td className="num">{r.summary ? <Link href={`/results/${r.id}`}>{r.summary}</Link> : <span className="muted">--</span>}</td>
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
