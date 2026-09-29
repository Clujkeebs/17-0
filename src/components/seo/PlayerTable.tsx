import Link from 'next/link';
import type { PlayerRow, TeamRow } from '@/lib/server/data';
import { positionGroup } from '@/lib/game/attributes';
import { teamName } from '@/lib/seo/queries';

/** Ranked player table. Server-rendered, no client JS. */
export function PlayerTable({ players, teams, caption, showRank = true, extra }: {
  players: PlayerRow[];
  teams: Map<number, TeamRow>;
  caption: string;
  showRank?: boolean;
  extra?: { label: string; value: (p: PlayerRow) => string | number };
}) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable table">
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {showRank && <th scope="col" className="num">#</th>}
            <th scope="col">Player</th>
            <th scope="col">Pos</th>
            <th scope="col">Team</th>
            {extra && <th scope="col" className="num">{extra.label}</th>}
            <th scope="col" className="num">OVR</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const t = p.teamId != null ? teams.get(p.teamId) : undefined;
            return (
              <tr key={p.id}>
                {showRank && <td className="num muted">{i + 1}</td>}
                <td><Link href={`/players/${p.slug}`}>{p.fullName}</Link></td>
                <td><Link href={`/positions/${positionGroup(p.position).toLowerCase()}`} className="muted">{p.position}</Link></td>
                <td>{t ? <Link href={`/teams/${t.slug}`} className="muted" title={teamName(t)}>{t.abbreviation}</Link> : <span className="muted">FA</span>}</td>
                {extra && <td className="num">{extra.value(p)}</td>}
                <td className="num" style={{ fontWeight: 700 }}>{p.overallRating}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
