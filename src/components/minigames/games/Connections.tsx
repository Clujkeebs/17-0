'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
interface P { tiles: { id: string; name: string }[] }
interface Solved { label: string; level: number; ids: string[]; names?: string[] }
interface D { groups: { label: string; level: number; names: string[]; found: boolean }[]; mistakes: number; rows?: number[][] }

const SQUARE = ['🟨', '🟩', '🟦', '🟪'];
/**
 * Shrinks each tile's text until it fits its box (whole words only, never broken mid-word). Runs after layout,
 * on every board change and on resize, so a long name on a narrow phone still reads cleanly.
 */
function useFitTiles(grid: React.RefObject<HTMLDivElement | null>, dep: unknown) {
  useLayoutEffect(() => {
    const fit = () => {
      grid.current?.querySelectorAll<HTMLElement>('.cx-tile').forEach((t) => {
        t.style.fontSize = ''; t.style.overflowWrap = '';
        let size = parseFloat(getComputedStyle(t).fontSize);
        while ((t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1) && size > 8) { size -= 0.5; t.style.fontSize = `${size}px`; }
        // Last resort on the narrowest phones: let a very long single word break rather than spill out.
        if (t.scrollWidth > t.clientWidth + 1) t.style.overflowWrap = 'anywhere';
      });
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [grid, dep]);
}

/** Long tiles start a step smaller; useFitTiles takes care of the rest. */
const sizeOf = (s: string) => {
  const longest = Math.max(...s.split(/\s+/).map((w) => w.length));
  return longest >= 10 || s.length > 18 ? ' xs' : longest >= 8 || s.length > 12 ? ' sm' : '';
};

export function Connections({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={(a) => <Play {...a} slug={meta.slug} />}
      renderResult={(r) => <Reveal d={r.detail as D} summary={r.summary} />} />
  );
}

/** The finished board: every group in color (missed ones marked), and the guess grid to copy. */
function Reveal({ d, summary }: { d: D; summary: string }) {
  const [copied, setCopied] = useState(false);
  const grid = (d.rows ?? []).map((r) => r.map((l) => SQUARE[l] ?? '⬜').join('')).join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(`Sports Connections\n${summary}\n${grid}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  return (
    <div className="cx" style={{ marginTop: 12 }}>
      <div className="cx-solved">
        {[...d.groups].sort((a, b) => a.level - b.level).map((g) => (
          <div key={g.label} className={`cx-group cx-l${g.level}${g.found ? '' : ' cx-missed'}`}>
            <strong>{g.label}</strong><span>{g.names.join(', ')}</span>
          </div>
        ))}
      </div>
      {grid && (
        <div className="cx-share">
          <pre aria-label="Your guesses by color">{grid}</pre>
          <button type="button" className="cx-btn" onClick={copy}>{copied ? 'Copied' : 'Copy grid'}</button>
        </div>
      )}
    </div>
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const [order, setOrder] = useState(puzzle.tiles.map((t) => t.id));
  const [sel, setSel] = useState<string[]>([]);
  const [solved, setSolved] = useState<Solved[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [toast, setToast] = useState('');
  const [checking, setChecking] = useState(false);
  const [hop, setHop] = useState(false);
  const [shake, setShake] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);
  const name = (id: string) => puzzle.tiles.find((t) => t.id === id)?.name ?? '';
  const done = new Set(solved.flatMap((g) => g.ids));
  const left = order.filter((id) => !done.has(id));
  useFitTiles(gridRef, left.join());
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const reduce = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function say(m: string) {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }
  function toggle(id: string) {
    if (checking) return;
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));
  }

  async function guess() {
    if (sel.length !== 4 || checking) return;
    const key = [...sel].sort().join('|');
    if (guesses.some((g) => [...g].sort().join('|') === key)) { say('Already guessed!'); return; }
    setChecking(true);
    try {
      if (!reduce()) { setHop(true); await wait(560); setHop(false); }
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { ids: sel } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { say(body.error ?? 'Could not check.'); return; }
      const fb = body.feedback as { correct: boolean; label?: string; level?: number; ids?: string[]; oneAway?: boolean };
      const nextGuesses = [...guesses, sel];
      setGuesses(nextGuesses);
      if (fb.correct) {
        const next = [...solved, { label: fb.label!, level: fb.level!, ids: fb.ids! }];
        setSolved(next); setSel([]);
        if (next.length === 4) { await wait(500); await submit({ guesses: nextGuesses }); }
      } else {
        const m = mistakes + 1;
        if (!reduce()) { setShake(true); setTimeout(() => setShake(false), 450); }
        setMistakes(m);
        if (fb.oneAway) say('One away...');
        if (m >= 4) { say('Next time!'); await wait(900); await submit({ guesses: nextGuesses }); }
      }
    } finally { setChecking(false); }
  }

  return (
    <div className="cx">
      <p className="cx-lede">Create four groups of four!</p>
      <div className="cx-board">
        <div className="cx-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
        <div className="cx-solved">
          {[...solved].map((g) => <div key={g.label} className={`cx-group cx-l${g.level} cx-in`}><strong>{g.label}</strong><span>{g.ids.map(name).join(', ')}</span></div>)}
        </div>
        <div className="cx-grid" role="group" aria-label="Tiles" ref={gridRef}>
          {left.map((id) => {
            const on = sel.includes(id);
            const n = name(id);
            return (
              <button key={id} type="button" className={`cx-tile${on ? ' on' : ''}${on && hop ? ' hop' : ''}${on && shake ? ' shake' : ''}${sizeOf(n)}`}
                style={on && hop ? { animationDelay: `${sel.indexOf(id) * 90}ms` } : undefined}
                aria-pressed={on} onClick={() => toggle(id)} disabled={busy}>{n}</button>
            );
          })}
        </div>
      </div>
      <p className="cx-mistakes"><span>Mistakes remaining:</span> <span className="cx-dots" role="img" aria-label={`${4 - mistakes} of 4`}>{Array.from({ length: 4 }, (_, i) => <span key={i} className={`cx-dot${i < 4 - mistakes ? ' on' : ''}`} />)}</span></p>
      <div className="cx-actions">
        <button type="button" className="cx-btn" onClick={() => setOrder((o) => [...o].sort(() => Math.random() - 0.5))} disabled={busy || checking}>Shuffle</button>
        <button type="button" className="cx-btn" onClick={() => setSel([])} disabled={!sel.length || busy || checking}>Deselect all</button>
        <button type="button" className="cx-btn cx-submit" onClick={guess} disabled={sel.length !== 4 || busy || checking}>Submit</button>
      </div>
    </div>
  );
}
