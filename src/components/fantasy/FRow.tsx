import Link from 'next/link';
import { PlayerFace } from '@/components/game/PlayerFace';
import type { Ranked } from '@/lib/fantasy/rank';

const n1 = (v: number | null) => (v == null ? '·' : v.toFixed(1));

/** One player line used across the fantasy pages. */
export function FRow({ p, rank, note }: { p: Ranked; rank: number | string; note?: React.ReactNode }) {
  return (
    <li className="f-row">
      <span className="f-rank num">{rank}</span>
      <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={36} />
      <span className="f-who">
        <Link href={`/players/${p.slug}`}><strong>{p.name}</strong></Link>
        <span className="muted">{p.pos}{p.posRank ? p.posRank : ''} · {p.team}{note ? <> · {note}</> : null}</span>
      </span>
      <span className="f-nums num" aria-label={`${p.value.toFixed(1)} points per game, last four ${n1(p.recent)}, season ${n1(p.ppg)}`}>
        <strong>{p.value.toFixed(1)}</strong>
        <span className="muted">L4 {n1(p.recent)} · Szn {n1(p.ppg)}</span>
      </span>
    </li>
  );
}
