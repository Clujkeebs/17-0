import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getUserByUsername, getUserStats, nameStyleOf } from '@/lib/server/account';
import { StyledName } from '@/components/StyledName';
import { Avatar } from '@/components/HeaderProfile';
import { ShareButton } from '@/components/game/ShareButton';
import { games } from '@/lib/minigames/games';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ username: string }> };
const ALL_GAMES = [{ slug: '17-0', name: '17-0' }, { slug: 'build-a-player', name: 'Build a Player' }, ...games.map((g) => ({ slug: g.slug, name: g.name }))];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const u = /^[A-Za-z0-9_]{3,20}$/.test(username) ? await getUserByUsername(username).catch(() => null) : null;
  if (!u?.username) return { title: 'Player not found', robots: { index: false } };
  const name = u.name || u.username;
  // Public by the player's choice to share it, but kept out of search results.
  return { title: `${name} on Unbeaten`, description: `${name}'s streaks, records and favorite games.`, robots: { index: false, follow: true }, alternates: { canonical: `/u/${u.username}` } };
}

/** Public profile: only what a player would put on a trading card. No email, no settings, no history list. */
export default async function PublicProfile({ params }: Props) {
  const { username } = await params;
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) notFound();
  const u = await getUserByUsername(username).catch(() => null);
  if (!u?.username) notFound();
  const stats = await getUserStats(u.id);
  const name = u.name || u.username;
  const favs = (u.favoriteGames ?? []).map((slug) => ALL_GAMES.find((g) => g.slug === slug)).filter((g): g is { slug: string; name: string } => !!g);
  return (
    <div className="container section" style={{ maxWidth: 880 }}>
      <span className="eyebrow">Player</span>
      <div className={`profile-head${nameStyleOf(u).banner ? ` banner ${nameStyleOf(u).banner}` : ''}`}>
        <Avatar name={name} src={u.image} size={84} ring={nameStyleOf(u).border} />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0 }}><StyledName name={name} style={nameStyleOf(u)} /></h1>
          <p className="muted num" style={{ margin: '4px 0 0' }}>@{u.username}</p>
        </div>
      </div>
      <div className="row" style={{ gap: 32, margin: '28px 0' }}>
        <div className="stat"><span className="v">{stats.streak}</span><span className="l">Day streak</span></div>
        <div className="stat"><span className="v">{stats.longest}</span><span className="l">Longest streak</span></div>
        <div className="stat"><span className="v">{stats.played}</span><span className="l">Games played</span></div>
        <div className="stat"><span className="v">{stats.bestRecord ?? '--'}</span><span className="l">Best 17-0 record</span></div>
        <div className="stat"><span className="v" style={stats.perfectSeasons > 0 ? { color: 'var(--orange)' } : undefined}>{stats.perfectSeasons}</span><span className="l">Perfect seasons</span></div>
      </div>
      {favs.length > 0 && (
        <section aria-labelledby="fav-h" style={{ marginBottom: 28 }}>
          <h2 id="fav-h">Favorite games</h2>
          <div className="row" style={{ gap: 8 }}>{favs.map((g) => <Link key={g.slug} className="btn" href={`/games/${g.slug}`}>{g.name}</Link>)}</div>
        </section>
      )}
      <div className="row" style={{ gap: 8 }}>
        <ShareButton label="Share profile" text={`${name} on Unbeaten.`} url={`/u/${u.username}`} />
        <Link className="btn" href="/games/17-0">Play 17-0</Link>
      </div>
    </div>
  );
}
