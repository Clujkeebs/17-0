'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
type Dir = 'across' | 'down';
interface W { num: number; dir: Dir; row: number; col: number; len: number; clue: string }
interface P { rows: number; cols: number; words: W[] }
interface D { solved: boolean; ms: number; wrongChecks: number; right: number; total: number; solution: string[]; words: { num: number; dir: Dir; word: string; clue: string }[] }
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

const cellsOf = (w: W) => Array.from({ length: w.len }, (_, i) => [w.row + (w.dir === 'down' ? i : 0), w.col + (w.dir === 'across' ? i : 0)] as const);

export function Crossword({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={(a) => <Play {...a} slug={meta.slug} />}
      renderResult={(r) => <Reveal d={r.detail as D} />} />
  );
}

function Reveal({ d }: { d: D }) {
  const cols = d.solution[0]?.length ?? 0;
  return (
    <div className="xw" style={{ marginTop: 12 }}>
      <p className="muted" style={{ margin: '0 0 10px' }}>{d.solved ? `Solved${d.wrongChecks ? `, with ${d.wrongChecks} check${d.wrongChecks === 1 ? '' : 's'} that found a mistake (10 seconds each)` : ' clean'}.` : `${d.right} of ${d.total} letters right.`}</p>
      <div className="xw-grid" style={{ gridTemplateColumns: `repeat(${cols}, var(--xw-cell))` }} aria-label="Solution">
        {d.solution.flatMap((line, r) => line.split('').map((ch, c) => <div key={`${r}-${c}`} className={ch === '.' ? 'xw-cell xw-block' : 'xw-cell'}>{ch === '.' ? '' : ch}</div>))}
      </div>
      <div className="xw-clues">
        {(['across', 'down'] as Dir[]).map((dir) => (
          <div key={dir}>
            <h3>{dir === 'across' ? 'Across' : 'Down'}</h3>
            <ol>{d.words.filter((w) => w.dir === dir).map((w) => <li key={`${dir}${w.num}`}><b>{w.num}</b> {w.clue} <strong className="xw-ans">{w.word}</strong></li>)}</ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const { rows, cols, words } = puzzle;
  const open = useMemo(() => { const s = new Set<string>(); words.forEach((w) => cellsOf(w).forEach(([r, c]) => s.add(`${r},${c}`))); return s; }, [words]);
  const numAt = useMemo(() => new Map(words.map((w) => [`${w.row},${w.col}`, w.num])), [words]);
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: rows }, () => Array(cols).fill('')));
  const [cur, setCur] = useState<{ r: number; c: number; dir: Dir }>(() => ({ r: words[0].row, c: words[0].col, dir: words[0].dir }));
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const [wrongChecks, setWrongChecks] = useState(0);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const wordAt = useCallback((r: number, c: number, dir: Dir) => words.find((w) => w.dir === dir && cellsOf(w).some(([a, b]) => a === r && b === c)), [words]);
  const active = wordAt(cur.r, cur.c, cur.dir) ?? wordAt(cur.r, cur.c, cur.dir === 'across' ? 'down' : 'across');
  const inActive = new Set(active ? cellsOf(active).map(([r, c]) => `${r},${c}`) : []);

  function tap(r: number, c: number) {
    if (!open.has(`${r},${c}`)) return;
    if (r === cur.r && c === cur.c) { const flip: Dir = cur.dir === 'across' ? 'down' : 'across'; if (wordAt(r, c, flip)) setCur({ r, c, dir: flip }); return; }
    setCur({ r, c, dir: wordAt(r, c, cur.dir) ? cur.dir : cur.dir === 'across' ? 'down' : 'across' });
  }
  function pickClue(w: W) {
    const empty = cellsOf(w).find(([r, c]) => !grid[r][c]) ?? cellsOf(w)[0];
    setCur({ r: empty[0], c: empty[1], dir: w.dir });
  }

  const check = useCallback(async (g: string[][]) => {
    if (checking || busy) return;
    setChecking(true); setMsg('');
    try {
      const rowsOut = g.map((line) => line.map((ch) => ch || ' ').join(''));
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { rows: rowsOut } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(body.error ?? 'Could not check.'); return; }
      const fb = body.feedback as { wrong: number; empty: number; solved: boolean };
      if (fb.solved) { setMsg('Solved.'); await submit({ rows: rowsOut, wrongChecks }); return; }
      setWrongChecks((n) => n + 1);
      setMsg(fb.wrong ? `${fb.wrong} letter${fb.wrong === 1 ? ' is' : 's are'} wrong${fb.empty ? `, ${fb.empty} still empty` : ''}. Plus 10 seconds.` : `${fb.empty} square${fb.empty === 1 ? '' : 's'} still empty. Plus 10 seconds.`);
    } finally { setChecking(false); }
  }, [checking, busy, slug, seed, submit, wrongChecks]);

  const press = useCallback((k: string) => {
    if (busy || checking) return;
    const step = (dr: number, dc: number) => {
      let r = cur.r + dr, c = cur.c + dc;
      while (r >= 0 && c >= 0 && r < rows && c < cols) { if (open.has(`${r},${c}`)) { setCur((x) => ({ ...x, r, c })); return; } r += dr; c += dc; }
    };
    if (k === 'BACK') {
      const g = grid.map((l) => [...l]);
      if (g[cur.r][cur.c]) { g[cur.r][cur.c] = ''; setGrid(g); return; }
      const cells = active ? cellsOf(active) : [];
      const i = cells.findIndex(([a, b]) => a === cur.r && b === cur.c);
      if (i > 0) { const [pr, pc] = cells[i - 1]; g[pr][pc] = ''; setGrid(g); setCur((x) => ({ ...x, r: pr, c: pc })); }
      return;
    }
    if (k === 'UP') return step(-1, 0); if (k === 'DOWN') return step(1, 0); if (k === 'LEFT') return step(0, -1); if (k === 'RIGHT') return step(0, 1);
    if (!/^[A-Z]$/.test(k)) return;
    const full = (x: string[][]) => [...open].every((s) => { const [a, b] = s.split(',').map(Number); return x[a][b]; });
    const wasFull = full(grid);
    const g = grid.map((l) => [...l]);
    g[cur.r][cur.c] = k;
    setGrid(g);
    const cells = active ? cellsOf(active) : [];
    const i = cells.findIndex(([a, b]) => a === cur.r && b === cur.c);
    const next = cells.slice(i + 1).find(([a, b]) => !g[a][b]) ?? cells[i + 1];
    if (next) setCur((x) => ({ ...x, r: next[0], c: next[1] }));
    // The last empty square just got filled: check the board automatically (once, not on every later fix).
    if (!wasFull && full(g)) void check(g);
  }, [busy, checking, cur, rows, cols, open, grid, active, check]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, string> = { Backspace: 'BACK', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT' };
      if (map[e.key]) { e.preventDefault(); press(map[e.key]); } else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
      else if (e.key === ' ') { e.preventDefault(); tapFlip(); }
    };
    const tapFlip = () => { const flip: Dir = cur.dir === 'across' ? 'down' : 'across'; if (wordAt(cur.r, cur.c, flip)) setCur({ ...cur, dir: flip }); };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [press, cur, wordAt]);

  const secs = Math.max(0, Math.round((now - start) / 1000));
  return (
    <div className="xw">
      <div className="xw-top">
        <span className="xw-clock num" aria-label="Time">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
        <span className="row" style={{ gap: 8 }}>
          <button type="button" className="cx-btn" onClick={() => { if (window.confirm('Give up and see the answers?')) void submit({ rows: grid.map((l) => l.map((ch) => ch || ' ').join('')), wrongChecks }); }} disabled={busy || checking}>Give up</button>
          <button type="button" className="cx-btn cx-submit" onClick={() => void check(grid)} disabled={busy || checking}>Check</button>
        </span>
      </div>
      <p className="xw-bar" aria-live="polite">{active ? <><b>{active.num} {active.dir === 'across' ? 'Across' : 'Down'}</b> {active.clue}</> : ''}</p>
      <div className="xw-grid" role="grid" aria-label="Crossword" style={{ gridTemplateColumns: `repeat(${cols}, var(--xw-cell))` }}>
        {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
          const k = `${r},${c}`;
          if (!open.has(k)) return <div key={k} className="xw-cell xw-block" aria-hidden="true" />;
          const on = r === cur.r && c === cur.c;
          return (
            <button key={k} type="button" role="gridcell" className={`xw-cell${on ? ' xw-on' : inActive.has(k) ? ' xw-word' : ''}`} onClick={() => tap(r, c)}
              aria-label={`Row ${r + 1}, column ${c + 1}${grid[r][c] ? `, ${grid[r][c]}` : ', empty'}`}>
              {numAt.has(k) && <span className="xw-num">{numAt.get(k)}</span>}
              {grid[r][c]}
            </button>
          );
        }))}
      </div>
      <p className="hint" aria-live="polite" style={{ textAlign: 'center', minHeight: '1.4em', margin: '8px 0' }}>{msg}</p>
      <div className="wd-kb" aria-label="Keyboard">
        {KEYS.map((row, i) => (
          <div key={row} className="wd-kr">
            {row.split('').map((k) => <button key={k} type="button" className="wd-key" onClick={() => press(k)} disabled={busy || checking}>{k}</button>)}
            {i === 2 && <button type="button" className="wd-key wd-wide" onClick={() => press('BACK')} aria-label="Delete" disabled={busy || checking}>Del</button>}
          </div>
        ))}
      </div>
      <div className="xw-clues">
        {(['across', 'down'] as Dir[]).map((dir) => (
          <div key={dir}>
            <h3>{dir === 'across' ? 'Across' : 'Down'}</h3>
            <ol>
              {words.filter((w) => w.dir === dir).map((w) => (
                <li key={`${dir}${w.num}`}>
                  <button type="button" className={`xw-clue${active === w ? ' on' : ''}`} onClick={() => pickClue(w)}><b>{w.num}</b> {w.clue}</button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
