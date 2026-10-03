'use client';
import { useCallback, useEffect, useState } from 'react';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
type Mark = 'hit' | 'near' | 'miss';
interface P { length: number; sport: string; tries: number }
interface Row { word: string; marks: Mark[] }
interface D { word: string; who: { name: string; sport: string; team: string; position: string }; rows: Row[]; solved: boolean }
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export function Wordle({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={(a) => <Play {...a} slug={meta.slug} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <div style={{ marginTop: 8 }}>
            <p className="m-big" style={{ margin: '0 0 12px' }}>{d.who.name}<span className="muted" style={{ fontSize: '.9rem', fontWeight: 400 }}> · {d.who.sport}{d.who.position ? ` · ${d.who.position}` : ''}{d.who.team ? ` · ${d.who.team}` : ''}</span></p>
            <Grid rows={d.rows} length={d.word.length} tries={d.rows.length} current="" />
          </div>
        );
      }} />
  );
}

function Grid({ rows, length, tries, current }: { rows: Row[]; length: number; tries: number; current: string }) {
  return (
    <div className="wd-grid" style={{ gridTemplateColumns: `repeat(${length}, 1fr)` }} role="grid" aria-label="Guesses">
      {Array.from({ length: tries }, (_, r) => {
        const row = rows[r];
        const word = row?.word ?? (r === rows.length ? current : '');
        return (
          <div key={r} role="row" className="wd-row">
            {Array.from({ length }, (_, c) => {
              const ch = word[c] ?? '';
              const m = row?.marks[c];
              return <div key={c} role="gridcell" className={`wd-cell${m ? ` wd-${m}` : ch ? ' wd-typed' : ''}`} aria-label={ch ? `${ch}${m ? ` ${m === 'hit' ? 'correct' : m === 'near' ? 'in the name' : 'not in the name'}` : ''}` : 'empty'}>{ch}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [cur, setCur] = useState('');
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const over = rows.some((r) => r.marks.every((m) => m === 'hit')) || rows.length >= puzzle.tries;
  const keyState: Record<string, Mark> = {};
  for (const r of rows) r.word.split('').forEach((ch, i) => {
    const m = r.marks[i], was = keyState[ch];
    if (m === 'hit' || (m === 'near' && was !== 'hit') || (!was)) keyState[ch] = m;
  });

  const enter = useCallback(async () => {
    if (checking || busy || over) return;
    if (cur.length !== puzzle.length) { setMsg(`${puzzle.length} letters.`); return; }
    setChecking(true); setMsg('');
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { word: cur } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(body.error ?? 'Could not check.'); return; }
      const fb = body.feedback as { word: string; marks: Mark[]; solved: boolean };
      const next = [...rows, { word: fb.word, marks: fb.marks }];
      setRows(next); setCur('');
      if (fb.solved || next.length >= puzzle.tries) await submit({ guesses: next.map((r) => r.word) });
    } finally { setChecking(false); }
  }, [checking, busy, over, cur, puzzle, slug, seed, rows, submit]);

  const press = useCallback((k: string) => {
    if (over) return;
    if (k === 'ENTER') { void enter(); return; }
    if (k === 'BACK') { setCur((c) => c.slice(0, -1)); return; }
    if (/^[A-Z]$/.test(k)) setCur((c) => (c.length < puzzle.length ? c + k : c));
  }, [enter, over, puzzle.length]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Enter') press('ENTER'); else if (e.key === 'Backspace') press('BACK'); else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [press]);

  return (
    <div className="wd">
      <p className="m-kicker" style={{ textAlign: 'center' }}>{puzzle.sport} · {puzzle.length} letters · {puzzle.tries} tries</p>
      <Grid rows={rows} length={puzzle.length} tries={puzzle.tries} current={cur} />
      <p className="hint" aria-live="polite" style={{ textAlign: 'center', minHeight: '1.4em' }}>{msg}</p>
      <div className="wd-kb" aria-label="Keyboard">
        {KEYS.map((row, i) => (
          <div key={row} className="wd-kr">
            {i === 2 && <button type="button" className="wd-key wd-wide" onClick={() => press('ENTER')} disabled={checking || busy}>Enter</button>}
            {row.split('').map((k) => <button key={k} type="button" className={`wd-key${keyState[k] ? ` wd-${keyState[k]}` : ''}`} onClick={() => press(k)} disabled={checking || busy}>{k}</button>)}
            {i === 2 && <button type="button" className="wd-key wd-wide" onClick={() => press('BACK')} aria-label="Delete" disabled={checking || busy}>Del</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
