import type { Metadata } from 'next';
import Link from 'next/link';
import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { PlayerPlate } from '@/components/PlayerPlate';
import { looksByUsername } from '@/lib/server/leaderboard';
import type { PlayerLook } from '@/lib/cosmetics';
import { PICKEM_POINTS, currentWeek, isLocked, myRecord, standings } from '@/lib/server/pickem';
import { PickemBoard } from './PickemBoard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: "Pick 'em",
  description: 'Pick the winner of every NFL game this week. Picks lock at kickoff. Points for every right pick, a bonus for a perfect week.',
  alternates: { canonical: '/pickem' },
};

const miss = (e: Error) => { console.error('[pickem] standings', e.message); return []; };

export default async function PickemPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  const cur = await currentWeek().catch(() => null);
  if (!cur) {
    return (
      <div className="container section">
        <span className="eyebrow">NFL Pick &apos;em</span>
        <h1>This week&apos;s games are loading.</h1>
        <p className="muted">The schedule syncs every 20 minutes. Check back shortly.</p>
      </div>
    );
  }
  const week = Math.max(1, Math.min(23, Number(sp.week) || cur.week));
  const games = await db.select().from(schema.pickemGames).where(and(eq(schema.pickemGames.season, cur.season), eq(schema.pickemGames.week, week))).orderBy(schema.pickemGames.kickoff);
  const mine = session?.user?.id && games.length
    ? await db.select().from(schema.pickemPicks).where(and(eq(schema.pickemPicks.userId, session.user.id), inArray(schema.pickemPicks.gameId, games.map((g) => g.id))))
    : [];
  const [weekTable, seasonTable, me] = await Promise.all([
    standings(cur.season, week, 10).catch(miss), standings(cur.season, undefined, 10).catch(miss),
    session?.user?.id ? myRecord(session.user.id, cur.season).catch(() => null) : Promise.resolve(null),
  ]);
  const looks = await looksByUsername([...weekTable, ...seasonTable].map((r) => r.username)).catch(() => new Map<string, PlayerLook>());
  const thisWeek = me?.weeks.find((w) => w.week === week);
  const pct = (r: number, w: number) => (r + w ? `${Math.round((r / (r + w)) * 100)}%` : '·');
  return (
    <div className="container section pickem">
      <span className="eyebrow">NFL Pick &apos;em · {cur.season} season</span>
      <h1>Week {week}</h1>
      <p className="muted" style={{ maxWidth: '62ch' }}>Pick the winner of every game. Picks lock at kickoff. {PICKEM_POINTS.correct} points for every right pick, {PICKEM_POINTS.perfectWeek} more for a perfect week.</p>
      <nav className="row" aria-label="Week" style={{ gap: 8, margin: '12px 0 20px' }}>
        {week > 1 && <Link className="btn btn-sm" href={`/pickem?week=${week - 1}`}>Week {week - 1}</Link>}
        {week !== cur.week && <Link className="btn btn-sm" href="/pickem">This week</Link>}
        <Link className="btn btn-sm" href={`/pickem?week=${week + 1}`}>Week {week + 1}</Link>
      </nav>
      {me && (
        <section className="pk-me" aria-label="Your record">
          <div className="pk-me-main"><span className="pk-me-pct num">{me.pct === null ? '·' : `${Math.round(me.pct * 100)}%`}</span><span className="muted">right this season</span></div>
          <dl className="pk-me-stats">
            <div><dt>Right</dt><dd className="num pk-r">{me.right}</dd></div>
            <div><dt>Wrong</dt><dd className="num pk-w">{me.wrong}</dd></div>
            <div><dt>Week {week}</dt><dd className="num">{thisWeek ? `${thisWeek.right}-${thisWeek.wrong}` : '0-0'}{thisWeek?.pending ? <span className="muted"> · {thisWeek.pending} to play</span> : null}</dd></div>
            <div><dt>Rank</dt><dd className="num">{me.rank ? `#${me.rank} of ${me.of}` : '·'}</dd></div>
            {me.best && <div><dt>Best week</dt><dd className="num">Week {me.best.week} · {me.best.right}-{me.best.wrong}</dd></div>}
          </dl>
          {me.weeks.some((w) => w.right + w.wrong > 0) && (
            <ol className="pk-me-weeks" aria-label="By week">
              {me.weeks.filter((w) => w.right + w.wrong > 0).map((w) => {
                const share = w.right / (w.right + w.wrong);
                return <li key={w.week} title={`Week ${w.week}: ${w.right}-${w.wrong}`}><span className="pk-bar" style={{ height: `${Math.max(6, share * 100)}%` }} /><span className="num">{w.week}</span></li>;
              })}
            </ol>
          )}
        </section>
      )}
      {!session?.user?.id && <div className="card" style={{ marginBottom: 16 }}><p style={{ margin: 0 }}><Link href="/login?next=/pickem">Sign in</Link> to make picks and earn points.</p></div>}
      {games.length ? (
        <PickemBoard signedIn={!!session?.user?.id} picks={Object.fromEntries(mine.map((p) => [p.gameId, p.pick]))}
          games={games.map((g) => ({ id: g.id, kickoff: g.kickoff.toISOString(), home: { abbr: g.homeAbbr, name: g.homeName, logo: g.homeLogo, score: g.homeScore }, away: { abbr: g.awayAbbr, name: g.awayName, logo: g.awayLogo, score: g.awayScore }, status: g.status, winner: g.winner, locked: isLocked(g) }))} />
      ) : <div className="card"><p style={{ margin: 0 }}>No games synced for week {week} yet.</p></div>}
      <div className="pk-tables" id="standings">
        {[{ t: `Week ${week}`, rows: [...weekTable] }, { t: 'Season', rows: [...seasonTable] }].map((tb) => (
          <section key={tb.t}>
            <h2>{tb.t} standings</h2>
            {tb.rows.length ? (
              <table className="lb-table"><thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col" className="num">Right</th><th scope="col" className="num">Wrong</th><th scope="col" className="num">%</th></tr></thead>
                <tbody>{tb.rows.map((r, i) => <tr key={r.username}><td className="num">{i + 1}</td><td>{/^[A-Za-z0-9_]{3,20}$/.test(r.username) ? <PlayerPlate name={r.username} username={r.username} look={looks.get(r.username.toLowerCase())} size={28} /> : r.username}</td><td className="num">{r.won}</td><td className="num">{r.made - r.won}</td><td className="num">{pct(r.won, r.made - r.won)}</td></tr>)}</tbody></table>
            ) : <p className="muted">No finished games with picks yet.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
