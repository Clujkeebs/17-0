import type { Metadata } from 'next';
import Link from 'next/link';
import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, schema } from '@/db';
import { PICKEM_POINTS, currentWeek, isLocked, standings } from '@/lib/server/pickem';
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
  const [weekTable, seasonTable] = await Promise.all([standings(cur.season, week, 10).catch(miss), standings(cur.season, undefined, 10).catch(miss)]);
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
              <table className="lb-table"><thead><tr><th scope="col" className="num">#</th><th scope="col">Player</th><th scope="col" className="num">Right</th></tr></thead>
                <tbody>{tb.rows.map((r, i) => <tr key={r.username}><td className="num">{i + 1}</td><td>{r.username}</td><td className="num">{r.won}/{r.made}</td></tr>)}</tbody></table>
            ) : <p className="muted">No finished games with picks yet.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
