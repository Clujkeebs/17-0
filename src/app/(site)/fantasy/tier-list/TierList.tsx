'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PlayerFace } from '@/components/game/PlayerFace';
import { ShareButton } from '@/components/game/ShareButton';
import type { Slim } from '@/lib/fantasy/slim';

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const;
type TierKey = (typeof TIERS)[number];
type Row = TierKey | 'pool';
/** Ranked tiers plus extras: players you added that are not in the top of the pool, and custom names. */
type Board = Record<TierKey, string[]> & { extra: string[]; names?: Partial<Record<TierKey, string>> };
const EMPTY: Board = { S: [], A: [], B: [], C: [], D: [], F: [], extra: [] };
const KEY = 'gl-tier-list-v2';
const POOL_SIZE = 60;
const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE'] as const;
const DEFAULT_NAMES: Record<TierKey, string> = { S: 'S', A: 'A', B: 'B', C: 'C', D: 'D', F: 'F' };

/** A custom entry (anyone, not just a ranked player) is stored as "c:" plus the name. */
const isCustom = (id: string) => id.startsWith('c:');
const enc = (id: string) => (isCustom(id) ? `c:${encodeURIComponent(id.slice(2)).replace(/\./g, '%2E').replace(/~/g, '%7E')}` : id);
const dec = (id: string) => (isCustom(id) ? `c:${decodeURIComponent(id.slice(2))}` : id);

/** Board <-> short share code: tiers separated by "~", entries by "." (custom names percent-encoded). */
export const encodeBoard = (b: Board) => TIERS.map((t) => b[t].map(enc).join('.')).join('~');
export function decodeBoard(code: string, known: Set<string>): Board {
  const parts = code.split('~');
  const b: Board = { ...EMPTY, extra: [] };
  TIERS.forEach((t, i) => { b[t] = (parts[i] ?? '').split('.').filter(Boolean).map(dec).filter((s) => isCustom(s) || known.has(s)); });
  return b;
}

const norm = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '');

export function TierList({ players, initial }: { players: Slim[]; initial: string | null }) {
  const bySlug = useMemo(() => new Map(players.map((p) => [p.slug, p])), [players]);
  const [board, setBoard] = useState<Board>(EMPTY);
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState<{ row: Row; index: number } | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<TierKey | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (initial) { setBoard(decodeBoard(initial, new Set(bySlug.keys()))); loaded.current = true; return; }
    try { const s = localStorage.getItem(KEY); if (s) setBoard({ ...EMPTY, ...JSON.parse(s) }); } catch { /* storage blocked */ }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(KEY, JSON.stringify(board)); } catch { /* ignore */ } }, [board]);

  const placed = useMemo(() => new Set(TIERS.flatMap((t) => board[t])), [board]);
  // The pool: the best players not yet ranked, plus anything you added, filtered by position.
  const pool = useMemo(() => {
    const top = players.slice(0, POOL_SIZE).map((p) => p.slug);
    const ids = [...new Set([...board.extra, ...top])].filter((id) => !placed.has(id));
    return pos === 'All' ? ids : ids.filter((id) => !isCustom(id) && bySlug.get(id)?.pos === pos);
  }, [players, board.extra, placed, pos, bySlug]);

  function move(id: string, to: Row, index?: number) {
    setBoard((b) => {
      const n: Board = { ...b, extra: b.extra };
      for (const t of TIERS) n[t] = b[t].filter((s) => s !== id);
      if (to === 'pool') {
        if (!n.extra.includes(id) && (isCustom(id) || !players.slice(0, POOL_SIZE).some((p) => p.slug === id))) n.extra = [id, ...n.extra];
      } else {
        const list = [...n[to]];
        list.splice(index ?? list.length, 0, id);
        n[to] = list;
      }
      return n;
    });
    setSelected(null);
  }
  function remove(id: string) {
    setBoard((b) => {
      const n: Board = { ...b, extra: b.extra.filter((s) => s !== id) };
      for (const t of TIERS) n[t] = b[t].filter((s) => s !== id);
      return n;
    });
    setSelected(null);
  }

  /** Where a drop at (x, y) lands: the row under the pointer, and the slot before the chip under it. */
  function dropTarget(x: number, y: number): { row: Row; index: number } | null {
    const el = document.elementFromPoint(x, y);
    const rowEl = el?.closest('[data-row]') as HTMLElement | null;
    if (!rowEl) return null;
    const row = rowEl.dataset.row as Row;
    const chips = [...rowEl.querySelectorAll<HTMLElement>('[data-chip]')].filter((c) => c.dataset.chip !== drag?.id);
    let index = chips.length;
    for (const [i, c] of chips.entries()) {
      const r = c.getBoundingClientRect();
      if (y < r.top - 4) { index = i; break; }
      if (y <= r.bottom + 4 && x < r.left + r.width / 2) { index = i; break; }
    }
    return { row, index };
  }

  // Pointer drag for mouse and touch: a short hold or a small move starts it, the target row lights up and a
  // marker shows the exact slot. A plain tap selects instead (then tap a tier).
  function onPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    let last = { x: e.clientX, y: e.clientY };
    // Near the top or bottom edge the page scrolls by itself, so the pool can reach any tier on a phone.
    let raf = 0;
    const edge = () => {
      const zone = 70, h = window.innerHeight;
      const dy = last.y < zone ? -Math.ceil((zone - last.y) / 6) : last.y > h - zone ? Math.ceil((last.y - (h - zone)) / 6) : 0;
      if (moved && dy) { window.scrollBy(0, dy); setOver(dropTarget(last.x, last.y)); }
      raf = requestAnimationFrame(edge);
    };
    raf = requestAnimationFrame(edge);
    const onMove = (ev: PointerEvent) => {
      last = { x: ev.clientX, y: ev.clientY };
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 6) return;
      moved = true;
      setDrag({ id, x: ev.clientX, y: ev.clientY });
      setOver(dropTarget(ev.clientX, ev.clientY));
    };
    const onUp = (ev: PointerEvent) => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      setDrag(null); setOver(null);
      if (!moved) { setSelected((s) => (s === id ? null : id)); return; }
      const t = dropTarget(ev.clientX, ev.clientY);
      if (t) move(id, t.row, t.index);
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  }

  const label = (id: string) => (isCustom(id) ? id.slice(2) : bySlug.get(id)?.name ?? id);
  const chip = (id: string, row: Row, i: number) => {
    const p = isCustom(id) ? null : bySlug.get(id);
    if (!isCustom(id) && !p) return null;
    const name = label(id);
    const marker = over && drag && over.row === row && over.index === i;
    return (
      <li key={id} data-chip={id} className={marker ? 'tl-mark' : undefined}>
        <button type="button" className={`tl-chip${selected === id ? ' sel' : ''}${drag?.id === id ? ' dragging' : ''}`} onPointerDown={(e) => onPointerDown(e, id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected((s) => (s === id ? null : id)); } if (e.key === 'Delete' || e.key === 'Backspace') remove(id); }}
          aria-pressed={selected === id} aria-label={`${name}${p ? `, ${p.pos}, ${p.team}` : ''}. ${selected === id ? 'Selected: choose a tier' : 'Select to move'}`}>
          {p ? <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={30} /> : <span className="tl-custom" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
          <span className="tl-name">{p ? p.name.split(' ').slice(-1)[0] : name}</span>
          {p && <span className="tl-pos">{p.pos}</span>}
        </button>
      </li>
    );
  };
  const endMarker = (row: Row, n: number) => (over && drag && over.row === row && over.index >= n ? <li className="tl-mark tl-mark-end" aria-hidden="true" /> : null);

  // Add box: names from the full player list, or any text as a custom entry.
  const qn = norm(q).trim();
  const hits = qn.length >= 2 ? players.filter((p) => norm(p.name).includes(qn) && !placed.has(p.slug)).slice(0, 6) : [];
  function addCustom() {
    const name = q.trim().slice(0, 30);
    if (!name) return;
    const id = `c:${name}`;
    if (!board.extra.includes(id) && !placed.has(id)) setBoard((b) => ({ ...b, extra: [id, ...b.extra] }));
    setQ('');
  }
  function addPlayer(p: Slim) {
    if (!placed.has(p.slug) && !board.extra.includes(p.slug)) setBoard((b) => ({ ...b, extra: [p.slug, ...b.extra] }));
    setQ(''); setPos('All');
  }

  const name = (t: TierKey) => board.names?.[t] || DEFAULT_NAMES[t];
  const code = encodeBoard(board);
  const ranked = TIERS.reduce((n, t) => n + board[t].length, 0);
  return (
    <div className={`tl${drag ? ' is-dragging' : ''}`}>
      <div className="tl-board">
        {TIERS.map((t) => (
          <div key={t} className={`tl-row${over?.row === t && drag ? ' over' : ''}`} data-row={t} onClick={(e) => { if (selected && !(e.target as HTMLElement).closest('.tl-chip, .tl-label')) move(selected, t); }}>
            {editing === t ? (
              <input className={`tl-label tl-${t} tl-edit`} autoFocus maxLength={14} defaultValue={name(t)} aria-label={`Name for tier ${t}`}
                onBlur={(e) => { const v = e.target.value.trim(); setBoard((b) => ({ ...b, names: { ...b.names, [t]: v || undefined } })); setEditing(null); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }} />
            ) : (
              <button type="button" className={`tl-label tl-${t}`} onClick={() => (selected ? move(selected, t) : setEditing(t))} aria-label={selected ? `Move to ${name(t)}` : `Rename tier ${name(t)}`} title={selected ? undefined : 'Tap to rename'}>{name(t)}</button>
            )}
            <ul className="tl-items">{board[t].map((id, i) => chip(id, t, i))}{endMarker(t, board[t].length)}</ul>
          </div>
        ))}
      </div>

      <section className={`tl-pool${over?.row === 'pool' && drag ? ' over' : ''}`} data-row="pool" aria-label="Unranked players" onClick={(e) => { if (selected && placed.has(selected) && !(e.target as HTMLElement).closest('.tl-chip')) move(selected, 'pool'); }}>
        <div className="tl-pool-head">
          <strong>Unranked</strong>
          <div className="tl-pos-filter" role="group" aria-label="Position">
            {POSITIONS.map((p) => <button key={p} type="button" className={`tl-pill${pos === p ? ' on' : ''}`} aria-pressed={pos === p} onClick={() => setPos(p)}>{p}</button>)}
          </div>
        </div>
        <div className="tl-add">
          <label htmlFor="tl-q" className="sr-only">Add a player or anyone else</label>
          <input id="tl-q" type="search" autoComplete="off" placeholder="Add anyone: type a name" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (hits[0] && norm(hits[0].name) === qn) addPlayer(hits[0]); else if (hits.length === 1) addPlayer(hits[0]); else addCustom(); } }} />
          {q.trim().length >= 2 && (
            <ul className="tl-suggest">
              {hits.map((p) => (
                <li key={p.slug}><button type="button" onClick={() => addPlayer(p)}><PlayerFace name={p.name} src={p.img} color={p.teamColor} size={24} />{p.name}<span className="muted"> · {p.pos} · {p.team}</span></button></li>
              ))}
              <li><button type="button" onClick={addCustom}>Add &ldquo;{q.trim().slice(0, 30)}&rdquo; as a custom entry</button></li>
            </ul>
          )}
        </div>
        <ul className="tl-items tl-pool-items">
          {pool.map((id, i) => chip(id, 'pool', i))}
          {!pool.length && <li className="muted" style={{ fontSize: '.85rem' }}>{pos === 'All' ? 'Everyone is ranked. Add more above.' : `No unranked ${pos}s left.`}</li>}
        </ul>
      </section>

      {drag && (() => {
        const p = isCustom(drag.id) ? null : bySlug.get(drag.id);
        return (
          <div className="tl-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">
            {p && <PlayerFace name={p.name} src={p.img} color={p.teamColor} size={26} />}
            <span>{label(drag.id)}</span>
          </div>
        );
      })()}
      <p className="hint">Drag players into tiers (drop between two players to slot them there), or tap a player and then a tier. Tap a tier label to rename it. Select a player and press Delete to send them back.</p>
      <div className="row" style={{ marginTop: 8 }}>
        <ShareButton label="Share tier list" text="My fantasy tier list on Unbeaten." url={`/fantasy/tier-list?t=${encodeURIComponent(code)}`} />
        <button type="button" className="btn" disabled={!ranked && !board.extra.length} onClick={() => { if (window.confirm('Clear the whole list?')) setBoard(EMPTY); }}>Clear</button>
      </div>
    </div>
  );
}
