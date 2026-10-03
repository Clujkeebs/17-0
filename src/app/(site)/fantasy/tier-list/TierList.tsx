'use client';
import { useEffect, useRef, useState } from 'react';
import { PlayerPicker } from '@/components/fantasy/PlayerPicker';
import { PlayerFace } from '@/components/game/PlayerFace';
import { ShareButton } from '@/components/game/ShareButton';
import type { Slim } from '@/lib/fantasy/slim';

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const;
type Tier = (typeof TIERS)[number] | 'pool';
type Board = Record<Tier, string[]>;
const EMPTY: Board = { S: [], A: [], B: [], C: [], D: [], F: [], pool: [] };
const KEY = 'gl-tier-list-v1';

/** Board <-> short share code: tiers separated by "~", player slugs by ".". */
export const encodeBoard = (b: Board) => TIERS.map((t) => b[t].join('.')).join('~');
export function decodeBoard(code: string, known: Set<string>): Board {
  const parts = code.split('~');
  const b: Board = { ...EMPTY, pool: [] };
  TIERS.forEach((t, i) => { b[t] = (parts[i] ?? '').split('.').filter((s) => known.has(s)); });
  return b;
}

export function TierList({ players, initial }: { players: Slim[]; initial: string | null }) {
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  const known = new Set(bySlug.keys());
  const [board, setBoard] = useState<Board>(EMPTY);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ slug: string; x: number; y: number } | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (initial) { setBoard(decodeBoard(initial, known)); loaded.current = true; return; }
    try { const s = localStorage.getItem(KEY); if (s) setBoard({ ...EMPTY, ...JSON.parse(s) }); } catch { /* storage blocked */ }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify(board)); } catch { /* ignore */ } }, [board]);

  const placed = new Set(Object.values(board).flat());
  function move(slug: string, to: Tier) {
    setBoard((b) => {
      const n = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.filter((s) => s !== slug)])) as Board;
      n[to] = [...n[to], slug];
      return n;
    });
    setSelected(null);
  }
  const remove = (slug: string) => setBoard((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.filter((s) => s !== slug)])) as Board);

  // Pointer drag works for mouse and touch: follow the finger, drop on whatever tier row is under it.
  function onPointerDown(e: React.PointerEvent, slug: string) {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
      moved = true; setDrag({ slug, x: ev.clientX, y: ev.clientY });
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      setDrag(null);
      if (!moved) { setSelected((s) => (s === slug ? null : slug)); return; }
      const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-tier]') as HTMLElement | null;
      if (row) move(slug, row.dataset.tier as Tier);
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  }

  const chip = (slug: string) => {
    const p = bySlug.get(slug);
    if (!p) return null;
    return (
      <li key={slug}>
        <button type="button" className={`tl-chip${selected === slug ? ' sel' : ''}${drag?.slug === slug ? ' dragging' : ''}`} onPointerDown={(e) => onPointerDown(e, slug)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected((s) => (s === slug ? null : slug)); } if (e.key === 'Delete' || e.key === 'Backspace') remove(slug); }}
          aria-pressed={selected === slug} aria-label={`${p.name}, ${p.pos}, ${p.team}. ${selected === slug ? 'Selected: choose a tier' : 'Select to move'}`}>
          <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={28} />
          <span>{p.name.split(' ').slice(-1)[0]}</span>
        </button>
      </li>
    );
  };

  const code = encodeBoard(board);
  return (
    <>
      <PlayerPicker players={players} label="Add a player" exclude={players.filter((p) => placed.has(p.slug)).map((p) => p.id)} onPick={(p) => move(p.slug, selected ? 'pool' : 'pool')} />
      <p className="hint">Drag a player to a tier, or tap a player and then tap a tier. Press Delete to remove a selected player.</p>
      <div className="tl-board">
        {TIERS.map((t) => (
          <div key={t} className="tl-row" data-tier={t} onClick={(e) => { if (selected && !(e.target as HTMLElement).closest('.tl-chip')) move(selected, t); }}>
            <button type="button" className={`tl-label tl-${t}`} onClick={() => selected && move(selected, t)} aria-label={selected ? `Move to tier ${t}` : `Tier ${t}`}>{t}</button>
            <ul className="tl-items">{board[t].map(chip)}</ul>
          </div>
        ))}
        <div className="tl-row tl-pool" data-tier="pool" onClick={(e) => { if (selected && !(e.target as HTMLElement).closest('.tl-chip')) move(selected, 'pool'); }}>
          <span className="tl-label">New</span>
          <ul className="tl-items">{board.pool.length ? board.pool.map(chip) : <li className="muted" style={{ fontSize: '.85rem' }}>Players you add land here.</li>}</ul>
        </div>
      </div>
      {drag && (() => { const p = bySlug.get(drag.slug); return p ? <div className="tl-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{p.name.split(' ').slice(-1)[0]}</div> : null; })()}
      <div className="row" style={{ marginTop: 16 }}>
        <ShareButton label="Share tier list" text="My fantasy tier list on Unbeaten." url={`/fantasy/tier-list?t=${encodeURIComponent(code)}`} />
        <button type="button" className="btn" onClick={() => { if (window.confirm('Clear the whole list?')) setBoard(EMPTY); }}>Clear</button>
      </div>
    </>
  );
}
