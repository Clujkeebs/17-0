import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowIcon } from '@/components/Icons';
import { PlayerFace } from '@/components/game/PlayerFace';
import { loadFantasyPlayers } from '@/lib/server/fantasy-data';
import { rankPlayers, waiverTargets, type Ranked } from '@/lib/fantasy/rank';
import '@/components/fantasy/fantasy.css';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Fantasy football tools',
  description: 'Free PPR rankings that follow recent form, a mock draft, start or sit, a waiver wire, a trade calculator, a draft cheat sheet, a draft order randomizer and a tier list maker.',
  alternates: { canonical: '/fantasy' },
};

const TOOLS = [
  { href: '/fantasy/mock-draft', name: 'Mock draft', p: 'A snake draft against computer teams that draft like people. Finish and get a grade.', fresh: true },
  { href: '/fantasy/start-sit', name: 'Start or sit', p: 'Two to four players, one spot. A clear call from recent form, the season and the projection.', fresh: true },
  { href: '/fantasy/rankings', name: 'Rankings', p: 'Every QB, RB, WR and TE on PPR points per game, with tiers, search and your league size.' },
  { href: '/fantasy/waivers', name: 'Waiver wire', p: 'Producing players most leagues have not picked up, and who is getting added fastest.' },
  { href: '/fantasy/trade', name: 'Trade calculator', p: 'Put players on each side. See who wins it on rest-of-season value.' },
  { href: '/fantasy/cheat-sheet', name: 'Draft cheat sheet', p: 'Your league size and pick. Who to target at each of your picks, printable.' },
  { href: '/fantasy/draft-order', name: 'Draft order randomizer', p: 'Paste the team names. Get a fair, shareable draft order.' },
  { href: '/fantasy/tier-list', name: 'Tier list maker', p: 'Type names, drag them into S through F, share your list.' },
  { href: '/games/fantasy-start-em', name: "Start 'Em (game)", p: 'Two players at the same spot. Who is scoring more per game? Ten calls, daily leaderboard.' },
  { href: '/games/fantasy-rank-em', name: "Rank 'Em (game)", p: 'Five players at one position. Put them in points per game order.' },
];

/** Last four games against the season, in points a game. Needs both numbers and a few games. */
const swing = (p: Ranked) => (p.recent != null && p.ppg != null && p.games >= 3 ? p.recent - p.ppg : null);

type Row = { p: Ranked; right: string; note?: string };
function Board({ title, href, sub, rows }: { title: string; href: string; sub: string; rows: Row[] }) {
  if (rows.length < 3) return null;
  return (
    <section className="fh-card" aria-label={title}>
      <h2><Link href={href}>{title}</Link></h2>
      <p className="fh-sub muted">{sub}</p>
      <ol className="fh-list">
        {rows.map(({ p, right, note }) => (
          <li key={p.id}>
            <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={32} />
            <span className="f-who"><Link href={`/players/${p.slug}`}><strong>{p.name}</strong></Link><span className="muted">{p.pos} · {p.team}{note ? ` · ${note}` : ''}</span></span>
            <span className="fh-num num">{right}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function FantasyHub() {
  const ranked = rankPlayers(await loadFantasyPlayers().catch(() => []));
  const top = ranked.slice(0, 5).map((p) => ({ p, right: p.value.toFixed(1), note: `#${p.overall}` }));
  const added = waiverTargets(ranked, 5);
  const trending = added.some((p) => p.trend > 0);
  const waiver = added.map((p) => ({ p, right: p.trend > 0 ? `+${p.trend.toLocaleString('en-US')}` : p.value.toFixed(1), note: p.rostered != null ? `${p.rostered < 1 ? '<1' : Math.round(p.rostered)}% rostered` : undefined }));
  const moving = ranked.filter((p) => (p.ppg ?? 0) >= 8 && swing(p) != null);
  const up = [...moving].sort((a, b) => swing(b)! - swing(a)!).slice(0, 5).filter((p) => swing(p)! > 1).map((p) => ({ p, right: `+${swing(p)!.toFixed(1)}`, note: `L4 ${p.recent!.toFixed(1)}` }));
  const down = [...moving].filter((p) => (p.ppg ?? 0) >= 12).sort((a, b) => swing(a)! - swing(b)!).slice(0, 5).filter((p) => swing(p)! < -1).map((p) => ({ p, right: swing(p)!.toFixed(1), note: `L4 ${p.recent!.toFixed(1)}` }));
  return (
    <div className="container section ft-scope">
      <p className="eyebrow">Fantasy football · PPR</p>
      <h1 style={{ maxWidth: '18ch' }}>Fantasy tools that keep up.</h1>
      <p className="muted" style={{ maxWidth: '60ch', fontSize: '1.1rem' }}>
        Values are PPR points per game from Sleeper: the last four games count most, the season average steadies it, and early on the season projection fills in. Updated after every game day.
      </p>
      <div className="fh-board">
        <Board title="Top of the board" href="/fantasy/rankings" sub="Value over a replacement starter, 12 teams" rows={top} />
        <Board title={trending ? 'Most added' : 'Waiver targets'} href="/fantasy/waivers" sub={trending ? 'Adds across Sleeper leagues in the last day' : 'Producing, and barely rostered'} rows={waiver} />
        <Board title="Heating up" href="/fantasy/rankings?sort=hot" sub="Last four games, up on the season (points a game)" rows={up} />
        <Board title="Cooling off" href="/fantasy/rankings?sort=cold" sub="Last four games, down on the season" rows={down} />
      </div>
      <div className="hub-grid" style={{ marginTop: 24 }}>
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="hub-card">
            <h3>{t.name}{t.fresh && <span className="fh-new">New</span>}</h3><p>{t.p}</p><span className="hub-cta">Open <ArrowIcon size={14} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
