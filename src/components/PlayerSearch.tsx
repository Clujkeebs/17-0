'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PlayerFace } from '@/components/game/PlayerFace';

type Hit = { slug: string; name: string; position: string; ovr: number; team: string; teamName: string; teamColor: string; logoUrl: string | null; img: string | null };

/** Results as you type, from the first letter. The surrounding form still works without JavaScript. */
export function PlayerSearch({ initial }: { initial: string }) {
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    const term = q.trim();
    if (!term) { setHits(null); return; }
    const n = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/players/search?q=${encodeURIComponent(term)}`);
        const d = await r.json();
        if (n === seq.current) setHits(d.results ?? []);
      } catch { /* keep the last results */ }
    }, 120);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input id="player-q" name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} placeholder="Type a name, for example Kelce" autoComplete="off"
          aria-describedby="player-q-status" />
        <button className="btn btn-primary" type="submit">Search</button>
      </div>
      <p id="player-q-status" className="hint" aria-live="polite">{!q.trim() ? 'Start typing a name.' : hits == null ? 'Searching' : hits.length ? `${hits.length} ${hits.length === 1 ? 'player' : 'players'}` : 'No active player by that name.'}</p>
      {hits && hits.length > 0 && (
        <ul className="ps-list">
          {hits.map((h) => (
            <li key={h.slug}>
              <Link href={`/players/${h.slug}`} className="ps-item">
                <PlayerFace name={h.name} src={h.img} color={h.teamColor} size={40} />
                <span className="ps-name"><strong>{h.name}</strong><span className="muted">{h.position} · {h.teamName}</span></span>
                <span className="num ps-ovr">{h.ovr}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
