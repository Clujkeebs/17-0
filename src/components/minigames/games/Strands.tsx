'use client';
import { useEffect, useRef, useState } from 'react';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import { COLS, ROWS, CELLS, touching } from '@/lib/minigames/puzzles/strands-core';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
interface P { theme: string; letters: string[]; cols: number; rows: number; total: number }
interface Found { index: number; cells: number[]; spangram: boolean }
type Guess = { cells: number[] } | { hint: number };
interface D {
  theme: string; letters: string[]; hints: number; order: ('w' | 's' | 'h')[]; ms: number | null;
  words: { word: string; cells: number[]; spangram: boolean; found: boolean }[];
}

export function Strands({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={(a) => <Play {...a} slug={meta.slug} />}
      renderResult={(r) => <Reveal d={r.detail as D} summary={r.summary} />} />
  );
}

/** The middle of a square, in board units (a square is 1 by 1). */
const mid = (cell: number) => ({ x: (cell % COLS) + 0.5, y: Math.floor(cell / COLS) + 0.5 });
const points = (cells: number[]) => cells.map((c) => { const p = mid(c); return `${p.x},${p.y}`; }).join(' ');

/** The board itself: letters in circles with the paths of words drawn between them. Used for play and for the reveal. */
function Board({ letters, lines, tone, sel, hint, onKey, onTap, focus, boardRef, handlers, locked }: {
  letters: string[];
  /** Paths to draw, each with the tone of its word. */
  lines: { cells: number[]; tone: 'word' | 'span' | 'miss' }[];
  tone: (cell: number) => string;
  sel?: number[]; hint?: number[];
  onKey?: (e: React.KeyboardEvent, cell: number) => void;
  /** A press from the keyboard (Enter or Space). Pointer presses are handled by the board's pointer handlers. */
  onTap?: (cell: number) => void;
  focus?: number;
  boardRef?: React.RefObject<HTMLDivElement | null>;
  handlers?: React.HTMLAttributes<HTMLDivElement>;
  locked?: boolean;
}) {
  return (
    <div className={`sx-board${locked ? ' sx-still' : ''}`} ref={boardRef} {...handlers}>
      <svg className="sx-lines" viewBox={`0 0 ${COLS} ${ROWS}`} aria-hidden="true">
        {lines.map((l, i) => <polyline key={i} className={`sx-line sx-${l.tone}`} points={points(l.cells)} />)}
        {sel && sel.length > 1 && <polyline className="sx-line sx-sel" points={points(sel)} />}
      </svg>
      {letters.map((ch, i) => (
        <button key={i} type="button" className={`sx-cell ${tone(i)}${hint?.includes(i) ? ' sx-hint' : ''}`}
          tabIndex={locked ? -1 : i === focus ? 0 : -1} data-cell={i}
          aria-label={`${ch}, row ${Math.floor(i / COLS) + 1}, column ${(i % COLS) + 1}`}
          aria-pressed={sel?.includes(i) ?? false} disabled={locked}
          onKeyDown={onKey ? (e) => onKey(e, i) : undefined}
          onClick={(e) => { if (e.detail === 0) onTap?.(i); }}>
          {ch}
        </button>
      ))}
    </div>
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const [found, setFound] = useState<Found[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [hint, setHint] = useState<{ index: number; cells: number[] } | null>(null);
  const [hints, setHints] = useState(0);
  const [toast, setToast] = useState('');
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [focus, setFocus] = useState(0);
  const path = useRef<number[]>([]);
  const guesses = useRef<Guess[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ on: boolean; moved: boolean; tapLast: boolean; x: number; y: number }>({ on: false, moved: false, tapLast: false, x: 0, y: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const used = new Set(found.flatMap((f) => f.cells));
  const usedRef = useRef(used); usedRef.current = used;
  const doneRef = useRef(false);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const setPath = (p: number[]) => { path.current = p; setSel(p); };
  const say = (m: string) => { setToast(m); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 1700); };
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  async function finish(all: Guess[]) {
    if (doneRef.current) return;
    doneRef.current = true;
    await submit({ guesses: all });
    doneRef.current = false;
  }

  async function check(cells: number[]) {
    if (cells.length < 2 || checking || busy) return;
    if (cells.length < 4) { say('Words are four letters or more'); setPath([]); return; }
    setChecking(true);
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { cells } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { say(body.error ?? 'Could not check that.'); setPath([]); return; }
      const fb = body.feedback as { found: boolean; index?: number; spangram?: boolean; cells?: number[] };
      guesses.current.push({ cells });
      if (fb.found && fb.index != null && fb.cells) {
        if (found.some((f) => f.index === fb.index)) { setPath([]); return; }
        const next = [...found, { index: fb.index, cells: fb.cells, spangram: !!fb.spangram }];
        setFound(next); setPath([]);
        if (hint?.index === fb.index) setHint(null);
        say(fb.spangram ? 'Spangram!' : 'Nice');
        if (next.length === puzzle.total) { await new Promise((r) => setTimeout(r, reduce() ? 200 : 700)); await finish(guesses.current); }
      } else {
        if (!reduce()) { setShake(true); setTimeout(() => setShake(false), 420); }
        say('Not a theme word');
        setPath([]);
      }
    } finally { setChecking(false); }
  }

  async function giveHint() {
    if (checking || busy || hint) return;
    const left = Array.from({ length: puzzle.total }, (_, i) => i).filter((i) => !found.some((f) => f.index === i));
    if (!left.length) return;
    const index = left[Math.floor(Math.random() * left.length)];
    setChecking(true);
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { hint: index } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { say(body.error ?? 'No hint available.'); return; }
      guesses.current.push({ hint: index });
      setHints((h) => h + 1);
      setHint({ index, cells: (body.feedback as { cells: number[] }).cells });
      say('Trace the glowing letters');
    } finally { setChecking(false); }
  }

  /* ---- selecting: drag across letters, or tap them one at a time and tap the last again */
  const extend = (cell: number) => {
    const p = path.current, last = p[p.length - 1];
    if (cell === last || usedRef.current.has(cell)) return false;
    if (p.length >= 2 && cell === p[p.length - 2]) { setPath(p.slice(0, -1)); return true; }
    if (p.includes(cell) || (p.length && !touching(last, cell))) return false;
    setPath([...p, cell]);
    return true;
  };
  /** Which square a point is over. A square counts when the point is inside its circle, so slips between letters do nothing. */
  const cellAt = (clientX: number, clientY: number): number | null => {
    const el = boardRef.current; if (!el) return null;
    const r = el.getBoundingClientRect();
    const fx = ((clientX - r.left) / r.width) * COLS, fy = ((clientY - r.top) / r.height) * ROWS;
    const col = Math.floor(fx), row = Math.floor(fy);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return Math.hypot(fx - col - 0.5, fy - row - 0.5) <= 0.46 ? row * COLS + col : null;
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (checking || busy) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell == null || usedRef.current.has(cell)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { on: true, moved: false, tapLast: false, x: e.clientX, y: e.clientY };
    const p = path.current;
    if (p.length && cell === p[p.length - 1]) drag.current.tapLast = true;
    else if (p.length && !p.includes(cell) && touching(p[p.length - 1], cell)) setPath([...p, cell]);
    else setPath([cell]);
    setFocus(cell);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current; if (!d.on) return;
    // Walk the straight line from the last point so a fast swipe cannot jump over a letter.
    const steps = Math.max(1, Math.ceil(Math.hypot(e.clientX - d.x, e.clientY - d.y) / 12));
    for (let i = 1; i <= steps; i++) {
      const cell = cellAt(d.x + ((e.clientX - d.x) * i) / steps, d.y + ((e.clientY - d.y) * i) / steps);
      if (cell != null && extend(cell)) d.moved = true;
    }
    d.x = e.clientX; d.y = e.clientY;
  };
  const up = () => {
    const d = drag.current; if (!d.on) return;
    d.on = false;
    if (d.tapLast && !d.moved) void check(path.current);
    else if (d.moved && path.current.length >= 2) void check(path.current);
  };
  const tapKey = (cell: number) => {
    if (usedRef.current.has(cell) || checking || busy) return;
    const p = path.current;
    if (p.length && cell === p[p.length - 1]) { void check(p); return; }
    if (p.length && !p.includes(cell) && touching(p[p.length - 1], cell)) setPath([...p, cell]); else setPath([cell]);
  };
  const onKey = (e: React.KeyboardEvent, cell: number) => {
    const r = Math.floor(cell / COLS), c = cell % COLS;
    const to = e.key === 'ArrowRight' ? [r, c + 1] : e.key === 'ArrowLeft' ? [r, c - 1] : e.key === 'ArrowDown' ? [r + 1, c] : e.key === 'ArrowUp' ? [r - 1, c] : null;
    if (to && to[0] >= 0 && to[0] < ROWS && to[1] >= 0 && to[1] < COLS) {
      e.preventDefault();
      const next = to[0] * COLS + to[1];
      setFocus(next);
      boardRef.current?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)?.focus();
    } else if (e.key === 'Escape') setPath([]);
  };

  const foundAt = new Map<number, Found>();
  for (const f of found) for (const c of f.cells) foundAt.set(c, f);
  const tone = (i: number) => {
    const f = foundAt.get(i);
    return f ? (f.spangram ? 'sx-f-span' : 'sx-f-word') : sel.includes(i) ? 'sx-on' : '';
  };

  return (
    <div className="sx">
      <div className="sx-theme"><span>Today&rsquo;s theme</span><strong>{puzzle.theme}</strong></div>
      <p className="sx-count" aria-live="polite"><b>{found.length}</b> of <b>{puzzle.total}</b> theme words found{hints ? ` · ${hints} hint${hints === 1 ? '' : 's'}` : ''}</p>
      <div className="sx-stage">
        <div className="sx-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
        <div className={shake ? 'sx-shake' : undefined}>
          <Board letters={puzzle.letters} focus={focus} onKey={onKey} onTap={tapKey} boardRef={boardRef} sel={sel} hint={hint?.cells} tone={tone}
            lines={found.map((f) => ({ cells: f.cells, tone: f.spangram ? 'span' : 'word' }))}
            handlers={{ onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up }} />
        </div>
      </div>
      <p className="sx-word" aria-hidden="true">{sel.length ? sel.map((c) => puzzle.letters[c]).join('') : ' '}</p>
      <div className="sx-actions">
        <button type="button" className="cx-btn" onClick={giveHint} disabled={checking || busy || !!hint || found.length === puzzle.total}>{hint ? 'Find the lit word' : 'Hint'}</button>
        <button type="button" className="cx-btn" onClick={() => setPath([])} disabled={!sel.length || checking || busy}>Clear</button>
        <button type="button" className="cx-btn cx-submit" onClick={() => void check(path.current)} disabled={sel.length < 2 || checking || busy}>Submit</button>
      </div>
      <p className="sx-giveup"><button type="button" className="btn-link" onClick={() => void finish(guesses.current)} disabled={busy || checking}>Give up and see the answers</button></p>
    </div>
  );
}

/** The finished board: every word drawn (missed ones in grey), the words listed, and a spoiler-free line to share. */
function Reveal({ d, summary }: { d: D; summary: string }) {
  const [copied, setCopied] = useState(false);
  const line = d.order.map((o) => (o === 's' ? '🟡' : o === 'h' ? '💡' : '🔵')).join('');
  const missed = d.words.filter((w) => !w.found).length;
  const cellTone = new Map<number, string>();
  for (const w of d.words) for (const c of w.cells) cellTone.set(c, w.found ? (w.spangram ? 'sx-f-span' : 'sx-f-word') : 'sx-f-miss');
  async function copy() {
    try { await navigator.clipboard.writeText(`Sports Strands\n${d.theme}\n${summary}\n${line}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  return (
    <div className="sx" style={{ marginTop: 12 }}>
      <div className="sx-theme"><span>Theme</span><strong>{d.theme}</strong></div>
      <div className="sx-stage">
        <Board letters={d.letters} locked tone={(i) => cellTone.get(i) ?? ''}
          lines={d.words.map((w) => ({ cells: w.cells, tone: w.found ? (w.spangram ? 'span' : 'word') : 'miss' }))} />
      </div>
      <ul className="sx-list">
        {d.words.map((w) => <li key={w.word} className={w.found ? (w.spangram ? 'span' : 'word') : 'miss'}>{w.word}{w.spangram ? ' · spangram' : ''}{w.found ? '' : ' · missed'}</li>)}
      </ul>
      <div className="cx-share">
        <pre aria-label="Your run">{line || '·'}</pre>
        <button type="button" className="cx-btn" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      {missed > 0 && <p className="muted" style={{ marginTop: 8 }}>{missed} word{missed === 1 ? '' : 's'} missed.</p>}
    </div>
  );
}

// Keeps the compiler honest about the board size the CSS assumes.
export const STRANDS_CELLS = CELLS;
