'use client';
import { useState } from 'react';
import { MiniGameShell, type RenderArgs } from '../MiniGameShell';
import './puzzles.css';

type Meta = { slug: string; name: string; tagline: string; howTo: string[] };
interface P { tiles: { id: string; name: string }[] }
interface Solved { label: string; level: number; ids: string[] }
interface D { groups: { label: string; level: number; names: string[]; found: boolean }[]; mistakes: number }

/** First name small, last name (with any suffix) large, so long names wrap at word breaks. */
function split(full: string) {
  const parts = full.split(' ');
  const suffix = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(parts.at(-1) ?? '') ? parts.length - 2 : parts.length - 1;
  return <><span className="cx-first">{parts.slice(0, suffix).join(' ')}</span><span className={`cx-last${(parts[suffix] ?? '').length > 8 ? ' cx-long' : ''}`}>{parts.slice(suffix).join(' ')}</span></>;
}

export function Connections({ signedIn, meta }: { signedIn: boolean; meta: Meta }) {
  return (
    <MiniGameShell<P> {...meta} signedIn={signedIn}
      render={(a) => <Play {...a} slug={meta.slug} />}
      renderResult={(r) => {
        const d = r.detail as D;
        return (
          <div className="cx-solved" style={{ marginTop: 12 }}>
            {[...d.groups].sort((a, b) => a.level - b.level).map((g) => (
              <div key={g.label} className={`cx-group cx-l${g.level}${g.found ? '' : ' cx-missed'}`}>
                <strong>{g.label}</strong><span>{g.names.join(', ')}</span>
              </div>
            ))}
          </div>
        );
      }} />
  );
}

function Play({ puzzle, submit, busy, seed, slug }: RenderArgs<P> & { slug: string }) {
  const [order, setOrder] = useState(puzzle.tiles.map((t) => t.id));
  const [sel, setSel] = useState<string[]>([]);
  const [solved, setSolved] = useState<Solved[]>([]);
  const [guesses, setGuesses] = useState<string[][]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [msg, setMsg] = useState('');
  const [checking, setChecking] = useState(false);
  const name = (id: string) => puzzle.tiles.find((t) => t.id === id)?.name ?? '';
  const done = new Set(solved.flatMap((g) => g.ids));
  const left = order.filter((id) => !done.has(id));

  function toggle(id: string) {
    setMsg('');
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 4 ? [...s, id] : s));
  }

  async function guess() {
    if (sel.length !== 4 || checking) return;
    const key = [...sel].sort().join('|');
    if (guesses.some((g) => [...g].sort().join('|') === key)) { setMsg('Already guessed.'); return; }
    setChecking(true); setMsg('');
    try {
      const res = await fetch(`/api/mini/${slug}/check`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seed, guess: { ids: sel } }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setMsg(body.error ?? 'Could not check.'); return; }
      const fb = body.feedback as { correct: boolean; label?: string; level?: number; ids?: string[]; oneAway?: boolean };
      const nextGuesses = [...guesses, sel];
      setGuesses(nextGuesses);
      if (fb.correct) {
        const next = [...solved, { label: fb.label!, level: fb.level!, ids: fb.ids! }];
        setSolved(next); setSel([]);
        if (next.length === 4) await submit({ guesses: nextGuesses });
      } else {
        const m = mistakes + 1;
        setMistakes(m);
        setMsg(fb.oneAway ? 'One away.' : 'Not a group.');
        if (m >= 4) await submit({ guesses: nextGuesses });
      }
    } finally { setChecking(false); }
  }

  return (
    <div className="cx">
      <div className="cx-solved">
        {solved.map((g) => <div key={g.label} className={`cx-group cx-l${g.level}`}><strong>{g.label}</strong><span>{g.ids.map(name).join(', ')}</span></div>)}
      </div>
      <div className="cx-grid" role="group" aria-label="Players">
        {left.map((id) => (
          <button key={id} type="button" className={`cx-tile${sel.includes(id) ? ' on' : ''}`} aria-pressed={sel.includes(id)} onClick={() => toggle(id)} disabled={busy || checking} lang="en" aria-label={name(id)}>{split(name(id))}</button>
        ))}
      </div>
      <p className="cx-mistakes" aria-label={`${4 - mistakes} mistakes left`}>Mistakes left {Array.from({ length: 4 }, (_, i) => <span key={i} className={`cx-dot${i < 4 - mistakes ? ' on' : ''}`} />)}</p>
      <p className="hint" aria-live="polite" style={{ minHeight: '1.4em', margin: '4px 0' }}>{msg}</p>
      <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
        <button type="button" className="btn btn-sm" onClick={() => setOrder((o) => [...o].sort(() => Math.random() - 0.5))} disabled={busy || checking}>Shuffle</button>
        <button type="button" className="btn btn-sm" onClick={() => setSel([])} disabled={!sel.length || busy || checking}>Deselect</button>
        <button type="button" className="btn btn-sm btn-primary" onClick={guess} disabled={sel.length !== 4 || busy || checking}>Submit</button>
      </div>
    </div>
  );
}
