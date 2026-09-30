'use client';
import { useState } from 'react';
import { MiniGameShell } from '../MiniGameShell';
import { TypeaheadA, type SearchHit } from './TypeaheadA';
import { checkGuess } from './checkA';
import './groupA.css';

interface Team { id: number; abbr: string; name: string; color: string }
interface P { seed: string; teams: Team[]; crits: string[] }
interface D { team: string; crit: string; ok: boolean; pts: number; rarity: number; validCount: number; pick: string | null; others: string[] }
type Meta = { slug: string; name: string; tagline: string; howTo: string[] };

export function Grid({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={({ puzzle, submit, busy }) => <Play puzzle={puzzle} submit={submit} busy={busy} />}
      renderResult={(r) => (
        <ol className="ga-rev">
          {(r.detail as D[]).map((d, i) => (
            <li key={i} className={`ga-in ${d.ok ? 'right' : 'wrong'}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="top">
                <span><strong>{d.team}</strong> × {d.crit}</span>
                <span className="num">{d.ok ? `Right · +${d.pts}` : 'Empty'}</span>
              </div>
              <div>{d.pick ? <strong>{d.pick}</strong> : <span className="muted">No pick</span>} <span className="muted">· {d.validCount} valid {d.validCount === 1 ? 'answer' : 'answers'} · rarity {d.rarity}%</span></div>
              {d.others.length > 0 && <div className="oth">{d.pick ? 'Also worked' : 'Could have used'}: {d.others.join(', ')}{d.validCount - (d.ok ? 1 : 0) > d.others.length ? ', and more' : ''}</div>}
            </li>
          ))}
        </ol>
      )} />
  );
}

function Play({ puzzle, submit, busy }: { puzzle: P; submit: (a: unknown) => Promise<unknown>; busy: boolean }) {
  const [cells, setCells] = useState<(SearchHit | null)[]>(Array(9).fill(null));
  const [sel, setSel] = useState<number | null>(null);
  const [left, setLeft] = useState(9);
  const [msg, setMsg] = useState('Pick a square to start.');
  const [checking, setChecking] = useState(false);
  const used = cells.filter(Boolean).map((c) => c!.id);

  const finish = (next: (SearchHit | null)[]) => void submit(next.map((c) => c?.id ?? null));

  const guess = async (h: SearchHit) => {
    if (sel == null) return;
    setChecking(true);
    try {
      const fb = await checkGuess<{ ok: boolean }>('grid', puzzle.seed, { cell: sel, playerId: h.id });
      const remaining = left - 1;
      const next = [...cells];
      if (fb.ok) { next[sel] = h; setCells(next); setMsg(`Right. ${h.name} fits. ${remaining} ${remaining === 1 ? 'guess' : 'guesses'} left.`); setSel(null); }
      else setMsg(`Wrong. ${h.name} does not fit that square. ${remaining} ${remaining === 1 ? 'guess' : 'guesses'} left.`);
      setLeft(remaining);
      if (remaining === 0 || next.every(Boolean)) finish(next);
    } catch (e) { setMsg((e as Error).message); }
    finally { setChecking(false); }
  };

  const r = sel == null ? null : { t: puzzle.teams[Math.floor(sel / 3)], c: puzzle.crits[sel % 3] };
  return (
    <div>
      <div className="ga-board" role="group" aria-label="The Grid">
        <div />
        {puzzle.crits.map((c) => <div key={c} className="ga-hd">{c}</div>)}
        {puzzle.teams.map((t, ri) => (
          <div key={t.id} style={{ display: 'contents' }}>
            <div className="ga-hd ga-team" title={t.name}><span className="ga-dot" style={{ background: t.color }} aria-hidden /><b>{t.abbr}</b></div>
            {puzzle.crits.map((c, ci) => {
              const i = ri * 3 + ci, f = cells[i];
              return (
                <button key={i} type="button" className={`ga-cell ${f ? 'filled ga-in' : ''}`} aria-pressed={sel === i} disabled={!!f || busy || left === 0}
                  aria-label={f ? `${t.abbr}, ${c}: ${f.name}, correct` : `${t.abbr}, ${c}: empty. Select to guess.`}
                  onClick={() => { setSel(i); setMsg(`${t.abbr} × ${c}. Name a player.`); }}>
                  {f ? <><span className="nm">{f.name}</span><span className="sm">{f.position} · Right</span></> : <span className="sm">{sel === i ? 'Selected' : 'Tap to guess'}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="ga-stats"><span>{left} {left === 1 ? 'guess' : 'guesses'} left</span><span>{used.length}/9 filled</span></div>
      {r && left > 0 && (
        <TypeaheadA key={sel} autoFocus label={`${r.t.abbr} × ${r.c}`} onPick={guess} disabled={checking || busy} usedIds={used} />
      )}
      <p className="ga-live" aria-live="polite">{busy ? 'Scoring' : msg}</p>
      {left > 0 && !busy && <button type="button" className="btn-link" onClick={() => finish(cells)}>Give up and see answers</button>}
    </div>
  );
}
