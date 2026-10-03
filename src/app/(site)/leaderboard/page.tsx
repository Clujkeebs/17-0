import type { Metadata } from 'next';
import Link from 'next/link';
import { allTimeLeaderboard, gameLeaderboard, PERIODS, type Period } from '@/lib/server/leaderboard';
import { dailyDateET } from '@/lib/game/daily';
import { GAMES, SPORTS, gameEntry, gamesFor, type Sport } from '@/lib/game-registry';
import { LeaderboardViewed } from '@/components/LeaderboardViewed';
import { StyledName } from '@/components/StyledName';

const isHandle = (u: string) => /^[A-Za-z0-9_]{3,20}$/.test(u) && !u.startsWith('deleted-user-');
const Player = ({ u, style }: { u: string; style?: import('@/lib/cosmetics').NameStyle }) => isHandle(u) ? <Link href={`/u/${u}`} className="lb-name"><StyledName name={u} style={style} /></Link> : <span>{u}</span>;

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Leaderboards',
  description: 'Every game has a board: today, this week and all time. Ranked results only, validated on the server. Resets at midnight ET.',
  alternates: { canonical: '/leaderboard' },
};

type SP = Promise<{ tab?: string; game?: string; page?: string; hard?: string; period?: string; sport?: string; view?: string }>;
const PERIOD_LABEL: Record<Period, string> = { today: 'Today', week: 'This week', all: 'All time' };

export default async function Leaderboard({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  // Old links: ?tab=all-time is the overall table, ?tab=daily is Today.
  const overall = sp.view === 'overall' || sp.tab === 'all-time';
  const entry = gameEntry(sp.game ?? '') ?? (sp.sport ? gamesFor(sp.sport as Sport)[0] : undefined) ?? GAMES[0];
  const sport = entry.sport;
  const period: Period = PERIODS.includes(sp.period as Period) ? (sp.period as Period) : 'today';
  const hardOnly = sp.hard === '1' && !!entry.hard;
  const page = Math.max(1, Number(sp.page) || 1);
  let error = false;
  const rows = overall ? [] : await gameLeaderboard(entry.slug, period, hardOnly).catch(() => { error = true; return []; });
  const all = overall ? await allTimeLeaderboard(page).catch(() => { error = true; return { rows: [], total: 0 }; }) : { rows: [], total: 0 };
  const pages = Math.max(1, Math.ceil(all.total / 50));
  const href = (o: { game?: string; period?: Period; hard?: boolean }) => {
    const g = o.game ?? entry.slug, p = o.period ?? period, h = o.hard ?? hardOnly;
    return `/leaderboard?game=${g}&period=${p}${h && gameEntry(g)?.hard ? '&hard=1' : ''}`;
  };
  return (
    <div className="container section lb">
      <LeaderboardViewed tab={overall ? 'all-time' : period} />
      <span className="eyebrow">{overall ? 'Overall' : `${entry.name} · ${PERIOD_LABEL[period]}${period === 'today' ? ` · ${dailyDateET()} · resets midnight ET` : ''}`}</span>
      <h1>Leaderboards</h1>

      <nav aria-label="Sport" className="sport-tabs">
        {SPORTS.filter((s) => gamesFor(s.key).length).map((s) => (
          <Link key={s.key} href={href({ game: gamesFor(s.key)[0].slug })} aria-current={!overall && sport === s.key ? 'page' : undefined}>{s.label}</Link>
        ))}
        <Link href="/leaderboard?view=overall" aria-current={overall ? 'page' : undefined}>Overall</Link>
      </nav>

      {!overall && (
        <>
          <nav aria-label="Game" className="lb-games">
            {gamesFor(sport).map((g) => (
              <Link key={g.slug} className={`lb-chip${g.slug === entry.slug ? ' on' : ''}`} href={href({ game: g.slug, hard: false })} aria-current={g.slug === entry.slug ? 'page' : undefined}>{g.name}</Link>
            ))}
            {sport === 'nfl' && <Link className="lb-chip" href="/pickem#standings">Pick &apos;em</Link>}
          </nav>
          <div className="row lb-filters">
            <nav aria-label="Period" className="seg">
              {PERIODS.map((p) => <Link key={p} href={href({ period: p })} className={p === period ? 'on' : ''} aria-current={p === period ? 'page' : undefined}>{PERIOD_LABEL[p]}</Link>)}
            </nav>
            {entry.hard && (
              <nav aria-label="Difficulty" className="seg">
                <Link href={href({ hard: false })} className={!hardOnly ? 'on' : ''} aria-current={!hardOnly ? 'page' : undefined}>All runs</Link>
                <Link href={href({ hard: true })} className={hardOnly ? 'on' : ''} aria-current={hardOnly ? 'page' : undefined}>Hard mode only</Link>
              </nav>
            )}
          </div>
        </>
      )}

      {error && <div role="alert" className="card card-error">The leaderboard is not responding. Scores are safe, try again in a minute.</div>}

      {!overall ? (
        rows.length ? (
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table className="lb-table">
            <thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col" className="num">Result</th>{period !== 'today' && <th scope="col" className="num">Date</th>}</tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.rank} className={r.rank <= 3 ? `lb-top lb-${r.rank}` : undefined}>
                <td className="num"><span className="lb-rank">{r.rank}</span></td>
                <td><Player u={r.username} style={r.style} />{r.hard && <span className="tag-hard">Hard</span>}</td>
                <td className="num"><Link href={`/results/${r.resultId}`}>{r.summary}</Link></td>
                {period !== 'today' && <td className="num muted">{r.date}</td>}
              </tr>
            ))}</tbody>
          </table></div>
        ) : !error && (
          <div className="card"><p>{hardOnly ? 'Nobody has a Hard mode run here yet. Turn it on in the game and claim the top spot.' : period === 'today' ? 'No ranked results today yet. Be first: sign in, play Today, and your name goes here.' : 'No ranked results yet. Play Today while signed in and your best run lands here.'}</p>
            <Link className="btn btn-primary" href={`/games/${entry.slug}?mode=today`}>Play {entry.name}</Link></div>
        )
      ) : (
        <>
          <p className="muted">Points across every game: one per 17-0 win, rating divided by ten in Build a Player. Ties go to whoever got there first.</p>
          {all.rows.length ? (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table"><table className="lb-table">
              <thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col" className="num">Points</th><th scope="col" className="num">Games</th></tr></thead>
              <tbody>{all.rows.map((r) => <tr key={r.rank} className={r.rank <= 3 ? `lb-top lb-${r.rank}` : undefined}><td className="num"><span className="lb-rank">{r.rank}</span></td><td><Player u={r.username} style={r.style} /></td><td className="num">{r.points}</td><td className="num">{r.games}</td></tr>)}</tbody>
            </table></div>
          ) : !error && <div className="card"><p>The overall table is empty. Every game you play while signed in counts.</p></div>}
          {pages > 1 && (
            <nav aria-label="Pagination" className="row" style={{ marginTop: 16 }}>
              {page > 1 && <Link className="btn btn-sm" href={`/leaderboard?view=overall&page=${page - 1}`}>Previous</Link>}
              <span className="num muted">Page {page} of {pages}</span>
              {page < pages && <Link className="btn btn-sm" href={`/leaderboard?view=overall&page=${page + 1}`}>Next</Link>}
            </nav>
          )}
        </>
      )}
      <p className="hint" style={{ marginTop: 24 }}>Only signed-in players appear, and only ranked (Today) results count. Every score is validated on the server.</p>
    </div>
  );
}
