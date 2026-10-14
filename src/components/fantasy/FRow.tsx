import Link from 'next/link';
import { PlayerFace } from '@/components/game/PlayerFace';
import type { Ranked } from '@/lib/fantasy/rank';

const n1 = (v: number | null) => (v == null ? '·' : v.toFixed(1));

/** One player line used across the fantasy pages. */
export type FRowPlayer = Pick<Ranked, 'slug' | 'name' | 'img' | 'teamColor' | 'pos' | 'posRank' | 'team' | 'value' | 'recent' | 'ppg'> & { proj?: number | null };
export function FRow({ p, rank, note }: { p: FRowPlayer; rank: number | string; note?: React.ReactNode }) {
  return (
    <li className="f-row">
      <span className="f-rank num">{rank}</span>
      <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={36} />
      <span className="f-who">
        <Link href={`/players/${p.slug}`}><strong>{p.name}</strong></Link>
        <span className="muted">{p.pos}{p.posRank ? p.posRank : ''} · {p.team}{note ? <> · {note}</> : null}</span>
      </span>
      <span className="f-nums num" aria-label={`${p.value.toFixed(1)} PPR points per game`}>
        <strong>{p.value.toFixed(1)}</strong>
        <span className="muted">{[p.recent != null ? `Last 4: ${n1(p.recent)}` : null, p.ppg != null ? `Season: ${n1(p.ppg)}` : null, p.recent == null && p.ppg == null && p.proj != null ? `Projected: ${n1(p.proj)}` : null].filter(Boolean).join(' · ') || 'Projection'}</span>
      </span>
    </li>
  );
}
