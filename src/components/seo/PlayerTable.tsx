import Link from 'next/link';
import { TeamLogo } from '@/components/TeamLogo';
import { Avatar } from '@/components/Avatar';
import { resolvePlayerImage } from '@/lib/server/images';
import type { PlayerRow, TeamRow } from '@/lib/server/data';
import { positionGroup } from '@/lib/game/attributes';
import { teamName } from '@/lib/seo/queries';

/** Ranked player table. Server-rendered; headshots and logos are tiny client islands for the image fallback. */
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
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Avatar name={p.fullName} src={resolvePlayerImage(p)} color={t?.primaryColor ?? '#0A0A0A'} size={32} decorative /><Link href={`/players/${p.slug}`}>{p.fullName}</Link></span></td>
                <td><Link href={`/positions/${positionGroup(p.position).toLowerCase()}`} className="muted">{p.position}</Link></td>
                <td>{t ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TeamLogo abbr={t.abbreviation} src={t.logoUrl} color={t.primaryColor} size={20} /><Link href={`/teams/${t.slug}`} className="muted" title={teamName(t)}>{t.abbreviation}</Link></span> : <span className="muted">FA</span>}</td>
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
