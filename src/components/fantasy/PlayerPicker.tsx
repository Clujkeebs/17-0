'use client';
import { useState } from 'react';
import { PlayerFace } from '@/components/game/PlayerFace';
import type { Slim } from '@/lib/fantasy/slim';

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');

/** Type a name, pick from the matches. Matches start at the first letter of any word. */
export function PlayerPicker({ players, onPick, label, exclude = [] }: { players: Slim[]; onPick: (p: Slim) => void; label: string; exclude?: string[] }) {
  const [q, setQ] = useState('');
  const id = `pp-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const t = norm(q).trim(), first = t.split(' ')[0];
  const hits = t ? players.filter((p) => !exclude.includes(p.id) && norm(p.name).split(' ').some((w) => w.startsWith(first)) && norm(p.name).includes(t)).slice(0, 6) : [];
  return (
    <div className="pp">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a name"
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) { e.preventDefault(); onPick(hits[0]); setQ(''); } }} />
      {hits.length > 0 && (
        <ul className="ps-list">
          {hits.map((p) => (
            <li key={p.id}>
              <button type="button" className="ps-item" onClick={() => { onPick(p); setQ(''); }}>
                <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={32} />
                <span className="ps-name"><strong>{p.name}</strong><span className="muted">{p.pos}{p.posRank} · {p.team}</span></span>
                <span className="num">{p.value.toFixed(1)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
